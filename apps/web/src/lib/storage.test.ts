import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDocument,
  createEmptyWorkspace,
  getActiveDocument,
  getChildNodes,
  type WorkspaceState,
} from "@pseudobuild/workspace";

const { store, control } = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  control: { failOpen: false, failPut: false },
}));

vi.mock("idb", () => ({
  openDB: vi.fn(async () => {
    if (control.failOpen) {
      throw new Error("IndexedDB unavailable (private mode)");
    }
    return {
      get: async (_store: string, key: string) => (store.has(key) ? structuredClone(store.get(key)) : undefined),
      put: async (_store: string, value: unknown, key: string) => {
        if (control.failPut) {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        store.set(key, structuredClone(value));
      },
      delete: async (_store: string, key: string) => {
        store.delete(key);
      },
      getAllKeys: async () => [...store.keys()],
    };
  }),
}));

const now = "2026-03-15T00:00:00.000Z";
const ws = (source: string) => createDocument(createEmptyWorkspace(now), { id: "d1", name: "main", source, now });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const jwt = (sub: string) => `header.${btoa(JSON.stringify({ sub })).replace(/=+$/, "")}.signature`;
const tokenFor = (sub: string) => async () => jwt(sub);
const record = (workspace: WorkspaceState, dirty = false, revision = 0) => ({ workspace, dirty, revision });
const storedSource = (key: string) =>
  getActiveDocument((store.get(key) as { workspace: WorkspaceState } | undefined)?.workspace ?? createEmptyWorkspace())
    ?.source;

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
  };
}

describe("workspace storage", () => {
  beforeEach(() => {
    store.clear();
    control.failOpen = false;
    control.failPut = false;
    Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
    Object.defineProperty(window, "sessionStorage", { configurable: true, value: memoryStorage() });
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    vi.resetModules();
  });

  it("loads and saves the local-mode workspace", async () => {
    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace('OUTPUT "Hello"', { mode: "local" });
    expect(loaded.cacheKey).toBe("local");

    await storage.writeLocalWorkspace("local", record(ws('OUTPUT "Saved"')));
    const reloaded = await storage.loadWorkspace('OUTPUT "Fallback"', { mode: "local" });

    expect(getActiveDocument(reloaded.workspace)?.source).toBe('OUTPUT "Saved"');
  });

  it("keeps memory-mode workspaces out of storage", async () => {
    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace('OUTPUT "Hello"', { mode: "memory" });

    expect(loaded.cacheKey).toBeNull();
    expect(store.size).toBe(0);
  });

  it("falls back to the default workspace when the legacy cache is malformed", async () => {
    store.set("current", { version: 999 });
    const storage = await import("@/lib/storage");

    const loaded = await storage.loadWorkspace('OUTPUT "Fallback"', { mode: "local" });

    expect(getActiveDocument(loaded.workspace)?.source).toBe('OUTPUT "Fallback"');
  });

  it("adopts the unowned legacy cache in local mode but never in an account", async () => {
    store.set("current", ws("legacy shared cache"));
    const storage = await import("@/lib/storage");

    const local = await storage.loadWorkspace("DEFAULT", { mode: "local" });
    expect(getActiveDocument(local.workspace)?.source).toBe("legacy shared cache");

    vi.mocked(fetch).mockResolvedValueOnce(json({ workspace: null, revision: 0 }));
    const cloud = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });
    expect(getActiveDocument(cloud.workspace)).toBeNull();
    expect(cloud.dirty).toBe(false);
  });

  it("resets only once per dev session when the dev reset flag is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_RESET_WORKSPACE_ON_DEV", "1");
    store.set("local", record(ws('OUTPUT "Persisted"')));
    window.localStorage.setItem("igcse-editor-source-v2", 'OUTPUT "Legacy"');

    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace('OUTPUT "Fallback"', { mode: "local" });

    expect(getActiveDocument(loaded.workspace)).toBeNull();
    expect(window.localStorage.getItem("igcse-editor-source-v2")).toBeNull();

    await storage.writeLocalWorkspace("local", record(ws('OUTPUT "Saved"')));
    const reloaded = await storage.loadWorkspace('OUTPUT "Fallback"', { mode: "local" });
    expect(getActiveDocument(reloaded.workspace)?.source).toBe('OUTPUT "Saved"');

    vi.unstubAllEnvs();
  });

  it("WS-1: a failed cloud load keeps the device copy and uploads nothing", async () => {
    store.set("user:user_a", record(ws("stale local cache from last week"), false, 1));
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ error: "convex blip" }, 500));

    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });

    expect(loaded.issue).toBe("cloud_unavailable");
    expect(getActiveDocument(loaded.workspace)?.source).toBe("stale local cache from last week");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/workspace", expect.objectContaining({ method: "GET" }));
  });

  it.each([
    ["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["invalid JSON", () => Promise.resolve(new Response("<html>", { status: 200 }))],
    ["a body without a workspace key", () => Promise.resolve(json({ revision: 0 }))],
  ])("WS-1: treats %s on a new device as a failure, not an empty account", async (_label, respond) => {
    vi.mocked(fetch).mockImplementation(respond as () => Promise<Response>);

    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });

    expect(loaded).toMatchObject({ issue: "cloud_unavailable", dirty: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("WS-2: never shows one account's cache to another account", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json({ workspace: ws("USER A PRIVATE CODE"), revision: 3 }));
    const storage = await import("@/lib/storage");
    await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });
    expect(storedSource("user:user_a")).toBe("USER A PRIVATE CODE");

    fetchMock.mockResolvedValueOnce(json({ workspace: null, revision: 0 }));
    const loadedForB = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_b") });

    expect(getActiveDocument(loadedForB.workspace)).toBeNull();
    expect(loadedForB).toMatchObject({ cacheKey: "user:user_b", dirty: false });
    expect(fetchMock.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
  });

  it("marks the account's own cache for upload only after a confirmed empty cloud response", async () => {
    store.set("user:user_a", record(ws("written offline"), true, 0));
    vi.mocked(fetch).mockResolvedValueOnce(json({ workspace: null, revision: 0 }));

    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });

    expect(loaded).toMatchObject({ dirty: true, revision: 0, issue: null });
    expect(getActiveDocument(loaded.workspace)?.source).toBe("written offline");
  });

  it("WS-4: keeps a dirty local copy that is newer than the cloud copy", async () => {
    store.set("user:user_a", record(ws("v2 newer edits"), true, 3));
    vi.mocked(fetch).mockResolvedValueOnce(json({ workspace: ws("v1"), revision: 3 }));

    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });

    expect(getActiveDocument(loaded.workspace)?.source).toBe("v2 newer edits");
    expect(loaded.dirty).toBe(true);
  });

  it("WS-4: merges a dirty local copy with a newer cloud copy instead of overwriting either", async () => {
    store.set("user:user_a", record(ws("mine"), true, 2));
    vi.mocked(fetch).mockResolvedValueOnce(json({ workspace: ws("theirs"), revision: 3 }));

    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace("DEFAULT", {
      mode: "cloud",
      getAuthToken: tokenFor("user_a"),
      conflictFolderName: "Cloud copy",
    });

    const folder = Object.values(loaded.workspace.nodes).find((node) => node.name === "Cloud copy")!;
    expect(getActiveDocument(loaded.workspace)?.source).toBe("mine");
    expect(getChildNodes(loaded.workspace, folder.id)).toMatchObject([{ source: "theirs" }]);
    expect(loaded).toMatchObject({ issue: "conflict", dirty: true, revision: 3 });
    expect(store.get("user:user_a")).toMatchObject({ dirty: true, revision: 3 });
  });

  it("replaces a clean local copy with the cloud copy", async () => {
    store.set("user:user_a", record(ws("old"), false, 1));
    vi.mocked(fetch).mockResolvedValueOnce(json({ workspace: ws("new"), revision: 2 }));

    const storage = await import("@/lib/storage");
    const loaded = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });

    expect(getActiveDocument(loaded.workspace)?.source).toBe("new");
    expect(store.get("user:user_a")).toMatchObject({ dirty: false, revision: 2 });
  });

  it("WS-7: resolves with an empty workspace when IndexedDB is unavailable", async () => {
    control.failOpen = true;
    const storage = await import("@/lib/storage");

    const local = await storage.loadWorkspace("DEFAULT", { mode: "local" });
    expect(local).toMatchObject({ issue: "storage_unavailable", cacheKey: null });

    vi.mocked(fetch).mockResolvedValueOnce(json({ workspace: ws("cloud"), revision: 1 }));
    const cloud = await storage.loadWorkspace("DEFAULT", { mode: "cloud", getAuthToken: tokenFor("user_a") });
    expect(getActiveDocument(cloud.workspace)?.source).toBe("cloud");
  });

  it("WS-2: signing out clears synced account caches and keeps unsynced ones", async () => {
    store.set("user:user_a", record(ws("synced"), false, 1));
    store.set("user:user_b", record(ws("unsynced"), true, 1));
    store.set("local", record(ws("local")));

    const storage = await import("@/lib/storage");
    await storage.loadWorkspace("DEFAULT", { mode: "memory" });

    expect([...store.keys()].sort()).toEqual(["local", "user:user_b"]);
  });

  it("sends the bearer token and base revision, and reports conflicts with the current revision", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, revision: 5 }))
      .mockResolvedValueOnce(json({ error: "changed", code: "revision_conflict", revision: 7 }, 409))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const storage = await import("@/lib/storage");
    const workspace = ws("cloud");
    expect(await storage.saveWorkspaceToCloud(workspace, 4, { getAuthToken: async () => "session-token" })).toEqual({
      ok: true,
      revision: 5,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workspace",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer session-token" }),
        body: JSON.stringify({ workspace, baseRevision: 4 }),
      }),
    );

    expect(await storage.saveWorkspaceToCloud(workspace, 4)).toMatchObject({
      ok: false,
      status: 409,
      code: "revision_conflict",
      revision: 7,
    });
    expect(await storage.saveWorkspaceToCloud(workspace, 4)).toMatchObject({ ok: false, code: "network_error" });
  });
});
