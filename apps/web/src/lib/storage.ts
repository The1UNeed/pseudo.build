import { openDB } from "idb";
import type { WorkspaceDocumentNode, WorkspaceState } from "@pseudobuild/workspace";
import {
  createEmptyWorkspace,
  importDocuments,
  migratePersistedWorkspace,
  validateWorkspaceState,
} from "@pseudobuild/workspace";
import type { WorkspacePersistenceMode } from "@/lib/platform";

const DB_NAME = "igcse-pseudocode-workspace";
const STORE_NAME = "workspace";
// The cache used to live under one key shared by every account. It is unowned, so it is only ever
// adopted as the device's local-mode workspace and never uploaded to an account.
const UNOWNED_LEGACY_KEY = "current";
const LOCAL_CACHE_KEY = "local";
const ACCOUNT_CACHE_PREFIX = "user:";
const LEGACY_WORKSPACE_KEY = "igcse-pseudocode-workspace-v1";
const LEGACY_SOURCE_KEY = "igcse-editor-source-v2";
const RESET_WORKSPACE_ON_LOAD = process.env.NEXT_PUBLIC_RESET_WORKSPACE_ON_DEV === "1";
const DEV_RESET_SESSION_KEY = "igcse-reset-workspace-on-dev-applied";
// Browsers reject keepalive requests with bodies over 64 KiB.
const KEEPALIVE_MAX_BODY_LENGTH = 60_000;

type GetAuthToken = () => Promise<string | null>;

/** What IndexedDB stores per cache key. */
export interface LocalWorkspaceRecord {
  workspace: WorkspaceState;
  /** True while the copy has changes the cloud hasn't confirmed. Always false in local mode. */
  dirty: boolean;
  /** The cloud revision this copy is based on. */
  revision: number;
}

export interface LoadWorkspaceOptions {
  mode?: WorkspacePersistenceMode;
  getAuthToken?: GetAuthToken;
  conflictFolderName?: string;
}

export type WorkspaceLoadIssue = "cloud_unavailable" | "storage_unavailable" | "conflict";

export interface LoadedWorkspace {
  workspace: WorkspaceState;
  /** IndexedDB key for this session, or null when nothing should be cached locally. */
  cacheKey: string | null;
  revision: number;
  /** True when the loaded workspace still has to be uploaded. */
  dirty: boolean;
  issue: WorkspaceLoadIssue | null;
}

export type CloudLoadResult = { ok: true; workspace: unknown; revision: number } | { ok: false };

export type CloudSaveResult =
  | { ok: true; revision: number }
  | { ok: false; status: number; code: string; message: string; revision?: number; retryAfterMs?: number };

function shouldResetWorkspaceForDevSession(): boolean {
  if (!RESET_WORKSPACE_ON_LOAD || typeof window === "undefined") {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(DEV_RESET_SESSION_KEY) === "1") {
      return false;
    }

    window.sessionStorage.setItem(DEV_RESET_SESSION_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

async function getDatabase() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    },
  });
}

function toRecord(raw: unknown): LocalWorkspaceRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Partial<LocalWorkspaceRecord>;
  const workspace = validateWorkspaceState(candidate.workspace);
  if (!workspace) {
    return null;
  }
  return {
    workspace,
    dirty: candidate.dirty === true,
    revision: typeof candidate.revision === "number" ? candidate.revision : 0,
  };
}

/** Reads the Clerk user id from the token so each account gets its own cache. The token is verified server-side. */
function getTokenSubject(token: string | null): string | null {
  const payload = token?.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: unknown };
    return typeof claims.sub === "string" && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
}

async function readToken(getAuthToken?: GetAuthToken) {
  try {
    return (await getAuthToken?.()) ?? null;
  } catch {
    return null;
  }
}

export async function writeLocalWorkspace(cacheKey: string, record: LocalWorkspaceRecord): Promise<void> {
  const database = await getDatabase();
  await database.put(STORE_NAME, record, cacheKey);
}

/** Removes account caches the cloud already has. Caches with unsynced changes stay, still keyed to their owner. */
export async function clearSyncedAccountCaches(): Promise<void> {
  const database = await getDatabase();
  for (const key of await database.getAllKeys(STORE_NAME)) {
    if (String(key).startsWith(ACCOUNT_CACHE_PREFIX) && !toRecord(await database.get(STORE_NAME, key))?.dirty) {
      await database.delete(STORE_NAME, key);
    }
  }
}

/** Keeps `local` and copies in the documents from `server` that differ, so neither side of a conflict is lost. */
export function mergeConflict(local: WorkspaceState, server: WorkspaceState, folderName: string): WorkspaceState {
  return importDocuments(local, server, folderName, {
    skip: (document) => {
      const mine = local.nodes[document.id];
      return mine?.type === "document" && (mine as WorkspaceDocumentNode).source === document.source;
    },
  });
}

export async function loadWorkspace(sampleSource: string, options: LoadWorkspaceOptions = {}): Promise<LoadedWorkspace> {
  const mode = options.mode ?? "local";
  const empty = { cacheKey: null, revision: 0, dirty: false, issue: null };

  if (mode === "memory") {
    // Signed out: drop account caches that are safely in the cloud.
    await clearSyncedAccountCaches().catch(() => {});
    return { ...empty, workspace: createEmptyWorkspace() };
  }

  if (mode === "local") {
    try {
      return { ...empty, cacheKey: LOCAL_CACHE_KEY, workspace: await loadLocalModeWorkspace(sampleSource) };
    } catch {
      return { ...empty, workspace: createEmptyWorkspace(), issue: "storage_unavailable" };
    }
  }

  const token = await readToken(options.getAuthToken);
  const getAuthToken = async () => token;
  const subject = getTokenSubject(token);
  const cacheKey = subject ? `${ACCOUNT_CACHE_PREFIX}${subject}` : null;
  const local = cacheKey
    ? toRecord(await getDatabase().then((database) => database.get(STORE_NAME, cacheKey)).catch(() => null))
    : null;
  const cloud = await fetchCloudWorkspace(getAuthToken);

  if (!cloud.ok) {
    // A failed load is not "no cloud workspace". Show what this device has and upload nothing.
    return {
      workspace: local?.workspace ?? createEmptyWorkspace(),
      cacheKey,
      revision: local?.revision ?? 0,
      dirty: local?.dirty ?? false,
      issue: "cloud_unavailable",
    };
  }

  const server = cloud.workspace ? migratePersistedWorkspace(cloud.workspace, { sampleSource }) : null;
  let result: LoadedWorkspace;
  if (!server) {
    // Confirmed empty account: this user's own cache (if any) becomes the first upload.
    result = { workspace: local?.workspace ?? createEmptyWorkspace(), cacheKey, revision: cloud.revision, dirty: Boolean(local), issue: null };
  } else if (local?.dirty && local.revision === cloud.revision) {
    result = { workspace: local.workspace, cacheKey, revision: cloud.revision, dirty: true, issue: null };
  } else if (local?.dirty) {
    const merged = mergeConflict(local.workspace, server, options.conflictFolderName ?? "Cloud copy");
    result = { workspace: merged, cacheKey, revision: cloud.revision, dirty: true, issue: merged === local.workspace ? null : "conflict" };
  } else {
    result = { workspace: server, cacheKey, revision: cloud.revision, dirty: false, issue: null };
  }

  if (cacheKey) {
    await writeLocalWorkspace(cacheKey, { workspace: result.workspace, dirty: result.dirty, revision: result.revision }).catch(
      () => {},
    );
  }
  return result;
}

async function loadLocalModeWorkspace(sampleSource: string): Promise<WorkspaceState> {
  const database = await getDatabase();

  if (shouldResetWorkspaceForDevSession()) {
    const emptyWorkspace = createEmptyWorkspace();
    await database.put(STORE_NAME, { workspace: emptyWorkspace, dirty: false, revision: 0 }, LOCAL_CACHE_KEY);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LEGACY_WORKSPACE_KEY);
      window.localStorage.removeItem(LEGACY_SOURCE_KEY);
    }
    return emptyWorkspace;
  }

  const record = toRecord(await database.get(STORE_NAME, LOCAL_CACHE_KEY));
  if (record) {
    return record.workspace;
  }

  const persisted = await database.get(STORE_NAME, UNOWNED_LEGACY_KEY);
  const legacyWorkspaceRaw =
    typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_WORKSPACE_KEY) : null;
  const legacySource =
    typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_SOURCE_KEY) : null;

  let legacyWorkspace: unknown = null;
  if (legacyWorkspaceRaw) {
    try {
      legacyWorkspace = JSON.parse(legacyWorkspaceRaw);
    } catch {
      legacyWorkspace = null;
    }
  }

  const state =
    persisted || legacyWorkspace || legacySource
      ? migratePersistedWorkspace(persisted ?? legacyWorkspace, {
          sampleSource,
          legacySource,
        })
      : createEmptyWorkspace();

  await database.put(STORE_NAME, { workspace: state, dirty: false, revision: 0 }, LOCAL_CACHE_KEY);
  return state;
}

async function getCloudRequestHeaders(baseHeaders: Record<string, string>, getAuthToken?: GetAuthToken) {
  const token = await readToken(getAuthToken);
  return token ? { ...baseHeaders, Authorization: `Bearer ${token}` } : baseHeaders;
}

/** Succeeds only for a 200 whose body has a `workspace` key (object or null) and a numeric `revision`. */
export async function fetchCloudWorkspace(getAuthToken?: GetAuthToken): Promise<CloudLoadResult> {
  try {
    const response = await fetch("/api/workspace", {
      method: "GET",
      credentials: "same-origin",
      headers: await getCloudRequestHeaders({ Accept: "application/json" }, getAuthToken),
    });
    if (response.status !== 200) {
      return { ok: false };
    }

    const data = (await response.json()) as { workspace?: unknown; revision?: unknown } | null;
    if (!data || data.workspace === undefined || typeof data.revision !== "number") {
      return { ok: false };
    }
    return { ok: true, workspace: data.workspace, revision: data.revision };
  } catch {
    return { ok: false };
  }
}

export async function saveWorkspaceToCloud(
  state: WorkspaceState,
  baseRevision: number,
  options: { getAuthToken?: GetAuthToken; keepalive?: boolean } = {},
): Promise<CloudSaveResult> {
  try {
    const body = JSON.stringify({ workspace: state, baseRevision });
    const response = await fetch("/api/workspace", {
      method: "PUT",
      credentials: "same-origin",
      keepalive: Boolean(options.keepalive) && body.length < KEEPALIVE_MAX_BODY_LENGTH,
      headers: await getCloudRequestHeaders({ "Content-Type": "application/json" }, options.getAuthToken),
      body,
    });
    const data = ((await response.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    if (response.ok && typeof data.revision === "number") {
      return { ok: true, revision: data.revision };
    }
    return {
      ok: false,
      status: response.status,
      code: typeof data.code === "string" ? data.code : "upstream_error",
      message: typeof data.error === "string" ? data.error : "Unable to save workspace.",
      ...(typeof data.revision === "number" ? { revision: data.revision } : {}),
      ...(typeof data.retryAfterMs === "number" ? { retryAfterMs: data.retryAfterMs } : {}),
    };
  } catch {
    return { ok: false, status: 0, code: "network_error", message: "Network error." };
  }
}
