"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closeEditorTab,
  closePanel,
  createDocument,
  createEmptyWorkspace,
  createFolder,
  createPanel,
  deleteNodes,
  dockPanel,
  ensureTerminalPanel,
  focusPanel,
  getActiveDocument,
  getNodePath,
  importDocuments,
  migratePersistedWorkspace,
  moveEditorTab,
  moveNodes,
  openDocumentInFocusedEditor,
  renameNode,
  resizeSplit,
  resetWorkspaceLayout,
  setDocumentCompileSummary,
  setEditorPanelActiveDocument,
  setExpandedFolders,
  setFilesPanelSelection,
  splitEditorPanel,
  type CompileSummary,
  type WorkspaceDockPosition,
  type WorkspacePanelKind,
  type WorkspaceState,
  updateDocumentSource,
  updateVirtualFiles,
  validateWorkspaceForPersistence,
  workspaceHasFolder,
} from "@pseudobuild/workspace";
import type { Diagnostic } from "@/compiler/types";
import { useDictionary } from "@/i18n/context";
import type { editorEn } from "@/i18n/messages/editor.en";
import {
  fetchCloudWorkspace,
  loadWorkspace,
  mergeConflict,
  saveWorkspaceToCloud,
  writeLocalWorkspace,
  type LoadedWorkspace,
  type WorkspaceLoadIssue,
} from "@/lib/storage";
import type { WorkspacePersistenceMode } from "@/lib/platform";
import { pseudocodeRuntimeRunner } from "@/runtime/executeRuntime";
import {
  compilePseudocodeInWorker,
  getCompileCacheKey,
  preloadPseudocodeCompiler,
} from "@/runtime/compilePseudocodeInWorker";

const INPUT_REQUEST_ERROR_TEXT = "INPUT requested but no stdin lines remain";
const MAX_INTERACTIVE_INPUTS = 200;
const TERMINAL_PROMPT = ">";
const DEFAULT_AUTO_SAVE_DELAY_MS = 5 * 60 * 1000;
// Typing reaches IndexedDB shortly after it stops. The (long) autosave delay only applies to cloud uploads.
const LOCAL_WRITE_DELAY_MS = 500;
const IMMEDIATE_CLOUD_SAVE_DELAY_MS = 1000;
const WORKSPACE_CHANNEL_NAME = "pseudo-build-workspace";

type SyncMessages = typeof editorEn.sync;

/** Mutable sync state for one load of the workspace. A new session starts whenever the persistence mode changes. */
interface SyncSession {
  mode: WorkspacePersistenceMode;
  getAuthToken?: () => Promise<string | null>;
  loaded: boolean;
  closed: boolean;
  cacheKey: string | null;
  revision: number;
  /** Changes the cloud hasn't confirmed yet (cloud mode only). */
  cloudDirty: boolean;
  /** Changes not yet written to IndexedDB. */
  localPending: boolean;
  localFailed: boolean;
  lastError: string | null;
  localTimer: number | null;
  cloudTimer: number | null;
  cloudDeadline: number;
  localWrites: Promise<void>;
  cloudSave: Promise<void> | null;
  cloudQueued: boolean;
  /** The workspace when the session closed, so pending writes can still be flushed. */
  finalWorkspace: WorkspaceState | null;
}

function createSyncSession(mode: WorkspacePersistenceMode, getAuthToken?: () => Promise<string | null>): SyncSession {
  return {
    mode,
    getAuthToken,
    loaded: false,
    closed: false,
    cacheKey: null,
    revision: 0,
    cloudDirty: false,
    localPending: false,
    localFailed: false,
    lastError: null,
    localTimer: null,
    cloudTimer: null,
    cloudDeadline: 0,
    localWrites: Promise.resolve(),
    cloudSave: null,
    cloudQueued: false,
    finalWorkspace: null,
  };
}

function getLoadIssueNotice(issue: WorkspaceLoadIssue, messages: SyncMessages): AppNotice {
  if (issue === "conflict") {
    return { tone: "info", message: messages.conflict };
  }
  return { tone: "error", message: issue === "cloud_unavailable" ? messages.cloudLoadFailed : messages.storageUnavailable };
}

function notifyOtherTabs(tabId: string, cacheKey: string | null) {
  if (cacheKey === null || typeof BroadcastChannel === "undefined") {
    return;
  }
  const channel = new BroadcastChannel(WORKSPACE_CHANNEL_NAME);
  channel.postMessage({ tabId, cacheKey });
  channel.close();
}

export interface AppNotice {
  tone: "error" | "info";
  message: string;
}

interface WorkspaceSessionOptions {
  autoSaveDelayMs?: number;
  cloudSyncEnabled?: boolean;
  cloudSyncLoading?: boolean;
  getCloudAuthToken?: () => Promise<string | null>;
  persistenceMode?: WorkspacePersistenceMode;
}

interface PendingTerminalInput {
  panelId: string | null;
  prompt: string | null;
  text: string;
}

function isInputRequestRuntimeError(stderr: string): boolean {
  return stderr.includes(INPUT_REQUEST_ERROR_TEXT);
}

function formatDiagnostics(diagnostics: Diagnostic[]): string {
  if (diagnostics.length === 0) {
    return "";
  }
  return diagnostics
    .map(
      (diagnostic) =>
        `[${diagnostic.code}] ${diagnostic.severity.toUpperCase()} L${diagnostic.line}:C${diagnostic.column} ${diagnostic.message}`,
    )
    .join("\n");
}

function summarizeDiagnostics(diagnostics: Diagnostic[]): CompileSummary {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  return {
    severity: errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success",
    errorCount,
    warningCount,
    updatedAt: new Date().toISOString(),
  };
}

export function useWorkspaceSession(defaultSource: string, options: WorkspaceSessionOptions = {}) {
  const persistenceMode =
    options.persistenceMode ?? (options.cloudSyncEnabled ? "cloud" : "local");
  const cloudSyncLoading = options.cloudSyncLoading ?? false;
  const autoSaveDelayMs = Math.max(1000, options.autoSaveDelayMs ?? DEFAULT_AUTO_SAVE_DELAY_MS);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [compileDiagnostics, setCompileDiagnostics] = useState<Diagnostic[]>([]);
  const [terminalOutputs, setTerminalOutputs] = useState<Record<string, string>>({});
  const [pendingInput, setPendingInput] = useState<PendingTerminalInput>({
    panelId: null,
    prompt: null,
    text: "",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [runningTerminalPanelId, setRunningTerminalPanelId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasPendingSave, setHasPendingSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null);
  const [tabId] = useState(() => Math.random().toString(36).slice(2));
  const syncMessages = useDictionary().editor.sync;

  const workspaceRef = useRef<WorkspaceState | null>(null);
  const sessionRef = useRef<SyncSession | null>(null);
  const flushPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const syncMessagesRef = useRef(syncMessages);
  const defaultSourceRef = useRef(defaultSource);
  const getCloudAuthTokenRef = useRef(options.getCloudAuthToken);
  const pendingInputResolverRef = useRef<((value: string | null) => void) | null>(null);

  useEffect(() => {
    getCloudAuthTokenRef.current = options.getCloudAuthToken;
  }, [options.getCloudAuthToken]);

  useEffect(() => {
    syncMessagesRef.current = syncMessages;
    defaultSourceRef.current = defaultSource;
  }, [defaultSource, syncMessages]);

  const getCurrentCloudAuthToken = useCallback(async () => {
    return await (getCloudAuthTokenRef.current?.() ?? null);
  }, []);

  const isActiveSession = useCallback((session: SyncSession) => {
    return sessionRef.current === session && !session.closed;
  }, []);

  const getSessionWorkspace = useCallback(
    (session: SyncSession) => (isActiveSession(session) ? workspaceRef.current : session.finalWorkspace),
    [isActiveSession],
  );

  const setSessionWorkspace = useCallback(
    (session: SyncSession, nextWorkspace: WorkspaceState) => {
      if (isActiveSession(session)) {
        workspaceRef.current = nextWorkspace;
        setWorkspace(nextWorkspace);
      } else {
        session.finalWorkspace = nextWorkspace;
      }
    },
    [isActiveSession],
  );

  const reportSyncError = useCallback(
    (session: SyncSession, message: string) => {
      session.lastError = message;
      if (isActiveSession(session)) {
        setSaveError(message);
      }
    },
    [isActiveSession],
  );

  /** Writes the latest workspace to IndexedDB. Writes are chained so an older record never lands last. */
  const flushLocal = useCallback(
    (session: SyncSession) => {
      if (session.localTimer !== null) {
        window.clearTimeout(session.localTimer);
        session.localTimer = null;
      }
      const workspaceToWrite = getSessionWorkspace(session);
      if (!session.loaded || !session.localPending || !workspaceToWrite || session.mode === "memory") {
        return session.localWrites;
      }
      const { cacheKey } = session;
      if (cacheKey === null) {
        if (session.mode === "local") {
          reportSyncError(session, syncMessagesRef.current.storageUnavailable);
        }
        return session.localWrites;
      }

      session.localPending = false;
      const record = {
        workspace: workspaceToWrite,
        dirty: session.mode === "cloud" && session.cloudDirty,
        revision: session.revision,
      };
      session.localWrites = session.localWrites.then(async () => {
        try {
          await writeLocalWorkspace(cacheKey, record);
          session.localFailed = false;
          if (session.mode === "local" && !session.localPending && isActiveSession(session)) {
            session.lastError = null;
            setSaveError(null);
            setHasPendingSave(false);
            setLastSavedAt(Date.now());
          }
        } catch {
          session.localFailed = true;
          if (session.mode === "local") {
            reportSyncError(session, syncMessagesRef.current.localSaveFailed);
          }
        }
      });
      return session.localWrites;
    },
    [getSessionWorkspace, isActiveSession, reportSyncError],
  );

  /** Uploads the latest workspace. One request runs at a time, and calls made meanwhile coalesce into one follow-up. */
  const uploadToCloud = useCallback(
    (session: SyncSession, keepalive = false): Promise<void> => {
      if (session.cloudTimer !== null) {
        window.clearTimeout(session.cloudTimer);
        session.cloudTimer = null;
      }
      if (session.mode !== "cloud" || !session.loaded) {
        return Promise.resolve();
      }
      if (session.cloudSave) {
        session.cloudQueued = true;
        return session.cloudSave;
      }

      const messages = syncMessagesRef.current;
      const run = async () => {
        let conflicts = 0;
        while (session.cloudDirty) {
          session.cloudQueued = false;
          const uploaded = getSessionWorkspace(session);
          if (!uploaded) {
            return;
          }
          const validation = validateWorkspaceForPersistence(uploaded);
          if (!validation.ok) {
            reportSyncError(session, messages.tooLarge(validation.message));
            return;
          }

          if (isActiveSession(session)) {
            setIsSaving(true);
          }
          const result = await saveWorkspaceToCloud(uploaded, session.revision, {
            getAuthToken: session.getAuthToken,
            keepalive,
          });

          if (result.ok) {
            session.revision = result.revision;
            session.cloudDirty = getSessionWorkspace(session) !== uploaded;
            session.localPending = true;
            session.lastError = null;
            await flushLocal(session);
            notifyOtherTabs(tabId, session.cacheKey);
            if (isActiveSession(session)) {
              setSaveError(null);
              setHasPendingSave(session.cloudDirty);
              setLastSavedAt(Date.now());
            }
            if (!session.cloudQueued) {
              return;
            }
            continue;
          }

          // Someone else saved first: keep this version, copy in the other version's changed files, and retry.
          if (result.code === "revision_conflict" && conflicts < 2) {
            conflicts += 1;
            const cloud = await fetchCloudWorkspace(session.getAuthToken);
            const local = getSessionWorkspace(session);
            if (cloud.ok && local) {
              session.revision = cloud.revision;
              if (cloud.workspace) {
                const server = migratePersistedWorkspace(cloud.workspace, { sampleSource: defaultSourceRef.current });
                const merged = mergeConflict(local, server, messages.conflictFolder);
                if (merged !== local) {
                  setSessionWorkspace(session, merged);
                  if (isActiveSession(session)) {
                    setAppNotice({ tone: "info", message: messages.conflict });
                  }
                }
              }
              session.localPending = true;
              await flushLocal(session);
              continue;
            }
          }

          reportSyncError(
            session,
            session.cacheKey !== null && !session.localFailed ? messages.saveFailedKept : messages.saveFailed,
          );
          return;
        }
      };

      session.cloudSave = run().finally(() => {
        session.cloudSave = null;
        if (isActiveSession(session)) {
          setIsSaving(false);
        }
      });
      return session.cloudSave;
    },
    [flushLocal, getSessionWorkspace, isActiveSession, reportSyncError, setSessionWorkspace, tabId],
  );

  const scheduleLocalWrite = useCallback(
    (session: SyncSession, delay: number) => {
      if (session.localTimer !== null) {
        window.clearTimeout(session.localTimer);
      }
      session.localTimer = window.setTimeout(() => void flushLocal(session), delay);
    },
    [flushLocal],
  );

  /** Schedules an upload, keeping an earlier deadline so continuous typing can't postpone it forever. */
  const scheduleCloudUpload = useCallback(
    (session: SyncSession, delay: number) => {
      const deadline = Date.now() + delay;
      if (session.cloudTimer !== null) {
        if (session.cloudDeadline <= deadline) {
          return;
        }
        window.clearTimeout(session.cloudTimer);
      }
      session.cloudDeadline = deadline;
      session.cloudTimer = window.setTimeout(() => {
        session.cloudTimer = null;
        void uploadToCloud(session);
      }, delay);
    },
    [uploadToCloud],
  );

  useEffect(() => {
    if (cloudSyncLoading) {
      return;
    }

    const previous = sessionRef.current;
    // Guest work only lives in memory, so carry it into the signed-in workspace instead of dropping it.
    const guestWorkspace = previous?.mode === "memory" && persistenceMode !== "memory" ? previous.finalWorkspace : null;
    const session = createSyncSession(
      persistenceMode,
      getCloudAuthTokenRef.current ? getCurrentCloudAuthToken : undefined,
    );
    sessionRef.current = session;
    workspaceRef.current = null;
    const messages = syncMessagesRef.current;
    const loadOptions = {
      mode: persistenceMode,
      getAuthToken: session.getAuthToken,
      conflictFolderName: messages.conflictFolder,
    };

    queueMicrotask(() => {
      if (session.closed) {
        return;
      }
      setWorkspace(null);
      setHasPendingSave(false);
      setSaveError(null);
      setIsSaving(false);
    });

    void (async () => {
      await flushPromiseRef.current;
      const loaded = await loadWorkspace(defaultSource, loadOptions).catch(
        (): LoadedWorkspace => ({
          workspace: createEmptyWorkspace(),
          cacheKey: null,
          revision: 0,
          dirty: false,
          issue: "storage_unavailable",
        }),
      );
      if (session.closed) {
        return;
      }

      session.loaded = true;
      session.cacheKey = loaded.cacheKey;
      session.revision = loaded.revision;
      session.cloudDirty = persistenceMode === "cloud" && loaded.dirty;
      let nextWorkspace = loaded.workspace;
      let notice = loaded.issue ? getLoadIssueNotice(loaded.issue, messages) : null;
      if (guestWorkspace) {
        const imported = importDocuments(nextWorkspace, guestWorkspace, messages.guestFolder);
        if (imported !== nextWorkspace) {
          nextWorkspace = imported;
          session.cloudDirty = persistenceMode === "cloud";
          session.localPending = true;
          notice ??= { tone: "info", message: messages.guestImported };
        }
      }

      workspaceRef.current = nextWorkspace;
      setWorkspace(nextWorkspace);
      setHasPendingSave(session.cloudDirty || session.localPending);
      setLastSavedAt(null);
      if (notice) {
        setAppNotice(notice);
      }
      void flushLocal(session);
      // After a failed load nothing is uploaded until the user changes something.
      if (loaded.issue !== "cloud_unavailable") {
        void uploadToCloud(session);
      }
    })();

    const flushSession = (keepalive: boolean) =>
      Promise.all([flushLocal(session), uploadToCloud(session, keepalive)]).then(
        () => undefined,
        () => undefined,
      );
    const handlePageHide = () => void flushSession(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushSession(true);
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Another tab saved this workspace. Refresh when this tab has nothing unsaved; otherwise the next save resolves it.
    const isIdle = () => session.loaded && !session.cloudDirty && !session.localPending && !session.cloudSave;
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(WORKSPACE_CHANNEL_NAME);
    if (channel) {
      channel.onmessage = (event: MessageEvent<{ tabId?: unknown; cacheKey?: unknown } | null>) => {
        if (event.data?.tabId === tabId || session.cacheKey === null || event.data?.cacheKey !== session.cacheKey || !isIdle()) {
          return;
        }
        void loadWorkspace(defaultSource, loadOptions).then((loaded) => {
          if (!isActiveSession(session) || !isIdle() || loaded.issue || loaded.dirty) {
            return;
          }
          session.revision = loaded.revision;
          workspaceRef.current = loaded.workspace;
          setWorkspace(loaded.workspace);
        });
      };
    }

    return () => {
      session.closed = true;
      session.finalWorkspace = workspaceRef.current;
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel?.close();
      flushPromiseRef.current = flushSession(false);
      const resolver = pendingInputResolverRef.current;
      if (resolver) {
        pendingInputResolverRef.current = null;
        resolver(null);
      }
    };
  }, [
    cloudSyncLoading,
    defaultSource,
    flushLocal,
    getCurrentCloudAuthToken,
    isActiveSession,
    persistenceMode,
    tabId,
    uploadToCloud,
  ]);

  const commitWorkspace = useCallback(
    (nextWorkspace: WorkspaceState, mode: "immediate" | "debounced") => {
      workspaceRef.current = nextWorkspace;
      setWorkspace(nextWorkspace);

      const session = sessionRef.current;
      if (!session?.loaded || session.closed) {
        return;
      }

      setHasPendingSave(true);
      if (session.mode === "memory") {
        setSaveError(null);
        setLastSavedAt(null);
        return;
      }

      session.localPending = true;
      session.cloudDirty = session.mode === "cloud";
      scheduleLocalWrite(session, mode === "debounced" ? LOCAL_WRITE_DELAY_MS : 0);
      if (session.mode === "cloud") {
        scheduleCloudUpload(session, mode === "debounced" ? autoSaveDelayMs : IMMEDIATE_CLOUD_SAVE_DELAY_MS);
      }
    },
    [autoSaveDelayMs, scheduleCloudUpload, scheduleLocalWrite],
  );

  const resolvePendingInput = useCallback((value: string | null) => {
    const resolver = pendingInputResolverRef.current;
    if (!resolver) {
      return;
    }
    pendingInputResolverRef.current = null;
    setPendingInput({
      panelId: null,
      prompt: null,
      text: "",
    });
    resolver(value);
  }, []);

  const waitForTerminalInput = useCallback((panelId: string, prompt: string) => {
    const existingResolver = pendingInputResolverRef.current;
    if (existingResolver) {
      pendingInputResolverRef.current = null;
      existingResolver(null);
    }
    setPendingInput({
      panelId,
      prompt,
      text: "",
    });
    return new Promise<string | null>((resolve) => {
      pendingInputResolverRef.current = resolve;
    });
  }, []);

  const showAppError = useCallback((message: string) => {
    setAppNotice({
      tone: "error",
      message,
    });
  }, []);

  const dismissNotice = useCallback(() => setAppNotice(null), []);

  const saveWorkspaceNow = useCallback(async () => {
    const session = sessionRef.current;
    if (!workspaceRef.current || !session?.loaded || session.closed) {
      showAppError("Open or create a workspace before saving.");
      return false;
    }
    if (session.mode === "memory") {
      return false;
    }

    setIsSaving(true);
    session.lastError = null;
    session.localPending = true;
    session.cloudDirty = session.mode === "cloud";
    await Promise.all([flushLocal(session), uploadToCloud(session)]);
    if (isActiveSession(session)) {
      setIsSaving(false);
    }
    return session.lastError === null && !session.cloudDirty && (session.mode === "cloud" || !session.localFailed);
  }, [flushLocal, isActiveSession, showAppError, uploadToCloud]);

  const applyWorkspaceUpdate = useCallback(
    (updater: (current: WorkspaceState) => WorkspaceState, mode: "immediate" | "debounced") => {
      const current = workspaceRef.current;
      if (!current) {
        return null;
      }

      try {
        const next = updater(current);
        commitWorkspace(next, mode);
        return next;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update the workspace.";
        showAppError(message);
        return null;
      }
    },
    [commitWorkspace, showAppError],
  );

  const activeDocument = useMemo(() => {
    return workspace ? getActiveDocument(workspace) : null;
  }, [workspace]);

  const breadcrumbs = useMemo(() => {
    return workspace && activeDocument ? getNodePath(workspace, activeDocument.id) : [];
  }, [workspace, activeDocument]);

  const activeDocumentId = activeDocument?.id ?? null;
  const activeDocumentName = activeDocument?.name ?? "";
  const terminalPanelIds = useMemo(() => {
    if (!workspace) {
      return [];
    }
    return Object.entries(workspace.panelInstances)
      .filter(([, panel]) => panel.kind === "terminal")
      .map(([panelId]) => panelId)
      .sort();
  }, [workspace]);

  useEffect(() => {
    if (!activeDocumentId) {
      return;
    }
    let cancelled = false;
    resolvePendingInput(null);
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setCompileDiagnostics([]);
    });
    return () => {
      cancelled = true;
    };
  }, [activeDocumentId, resolvePendingInput]);

  useEffect(() => {
    if (!workspace || !activeDocumentName) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setTerminalOutputs((current) => {
        const next: Record<string, string> = {};
        for (const panelId of terminalPanelIds) {
          next[panelId] = current[panelId] ?? `Terminal ready for ${activeDocumentName}.`;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeDocumentName, terminalPanelIds, workspace]);

  const updateTerminalOutput = useCallback((panelId: string, text: string) => {
    setTerminalOutputs((current) => ({
      ...current,
      [panelId]: text,
    }));
  }, []);

  const updateWorkspaceCompileSummary = useCallback(
    (documentId: string, diagnostics: Diagnostic[]) => {
      applyWorkspaceUpdate(
        (current) => setDocumentCompileSummary(current, documentId, summarizeDiagnostics(diagnostics)),
        "immediate",
      );
    },
    [applyWorkspaceUpdate],
  );

  const compileSource = useCallback(async (workspaceState?: WorkspaceState) => {
    const currentWorkspace = workspaceState ?? workspaceRef.current;
    if (!currentWorkspace) {
      return null;
    }

    const document = getActiveDocument(currentWorkspace);
    if (!document) {
      return null;
    }
    const cacheKey = getCompileCacheKey(document.id, document.name, document.source);
    const compileRun = await compilePseudocodeInWorker(
      {
        source: document.source,
        filename: document.name,
        strict: true,
      },
      cacheKey,
    );

    return {
      document,
      result: compileRun.result,
      stale: compileRun.stale,
      cached: compileRun.cached,
    };
  }, []);

  const ensureTerminalTarget = useCallback(() => {
    let targetPanelId: string | null = null;
    const nextWorkspace = applyWorkspaceUpdate((current) => {
      const ensured = ensureTerminalPanel(current);
      targetPanelId = ensured.panelId;
      return ensured.state;
    }, "immediate");

    if (!nextWorkspace || !targetPanelId) {
      return null;
    }

    return {
      workspace: nextWorkspace,
      panelId: targetPanelId,
    };
  }, [applyWorkspaceUpdate]);

  const compileNow = useCallback(async () => {
    const target = ensureTerminalTarget();
    if (!target) {
      return null;
    }

    const payload = await compileSource(target.workspace);
    if (!payload) {
      updateTerminalOutput(target.panelId, "Create your first file to compile and run code.");
      return null;
    }

    if (payload.stale) {
      return null;
    }

    const { document, result } = payload;
    setCompileDiagnostics(result.diagnostics);
    updateWorkspaceCompileSummary(document.id, result.diagnostics);

    updateTerminalOutput(
      target.panelId,
      result.success
        ? result.diagnostics.length > 0
          ? `Compile succeeded with notes for ${document.name}.\n\n${formatDiagnostics(result.diagnostics)}`
          : `Compile succeeded for ${document.name}.`
        : `Compile failed for ${document.name}.\n\n${formatDiagnostics(result.diagnostics)}`,
    );

    return {
      panelId: target.panelId,
      document,
      result,
    };
  }, [compileSource, ensureTerminalTarget, updateTerminalOutput, updateWorkspaceCompileSummary]);

  const runNow = useCallback(async () => {
    const target = ensureTerminalTarget();
    if (!target) {
      return;
    }

    const payload = await compileSource(target.workspace);
    if (!payload) {
      updateTerminalOutput(target.panelId, "Create your first file to compile and run code.");
      return;
    }

    if (payload.stale) {
      return;
    }

    const { document, result: compileResult } = payload;
    setCompileDiagnostics(compileResult.diagnostics);
    updateWorkspaceCompileSummary(document.id, compileResult.diagnostics);

    if (!compileResult.success || !compileResult.astJson) {
      updateTerminalOutput(target.panelId, `Compile failed for ${document.name}.\n\n${formatDiagnostics(compileResult.diagnostics)}`);
      return;
    }

    const astJson = compileResult.astJson;
    setIsRunning(true);
    setRunningTerminalPanelId(target.panelId);
    updateTerminalOutput(target.panelId, "");

    const stdinLines: string[] = [];
    // One RANDOM seed per Run click, reused by every INPUT replay so earlier values stay stable.
    const seed = Math.floor(Math.random() * 2 ** 32);
    const transcript: string[] = [];
    let renderedStdout = "";
    let latestVirtualFiles = target.workspace.virtualFiles;

    const syncStdoutToTranscript = (stdout: string) => {
      const normalizedStdout = stdout.replace(/\r\n/g, "\n");
      if (normalizedStdout === renderedStdout) {
        return;
      }

      let delta = normalizedStdout;
      if (normalizedStdout.startsWith(renderedStdout)) {
        delta = normalizedStdout.slice(renderedStdout.length);
      }

      if (delta.startsWith("\n")) {
        delta = delta.slice(1);
      }

      if (delta.length > 0) {
        transcript.push(...delta.split("\n"));
        updateTerminalOutput(target.panelId, transcript.join("\n"));
      }

      renderedStdout = normalizedStdout;
    };

    try {
      let runResult = await pseudocodeRuntimeRunner.run({
        astJson,
        stdinLines: [...stdinLines],
        seed,
        virtualFiles: latestVirtualFiles,
      });

      while (isInputRequestRuntimeError(runResult.stderr)) {
        syncStdoutToTranscript(runResult.stdout);

        if (stdinLines.length >= MAX_INTERACTIVE_INPUTS) {
          updateTerminalOutput(
            target.panelId,
            [...transcript, `Stopped after ${MAX_INTERACTIVE_INPUTS} INPUT requests to avoid an infinite input loop.`].join(
              "\n",
            ),
          );
          return;
        }

        const nextInput = await waitForTerminalInput(target.panelId, TERMINAL_PROMPT);
        if (nextInput === null) {
          updateTerminalOutput(target.panelId, [...transcript, "Run cancelled."].join("\n"));
          return;
        }

        stdinLines.push(nextInput);
        transcript.push(`${TERMINAL_PROMPT} ${nextInput}`);
        updateTerminalOutput(target.panelId, transcript.join("\n"));

        runResult = await pseudocodeRuntimeRunner.run({
          astJson,
          stdinLines: [...stdinLines],
          seed,
          virtualFiles: latestVirtualFiles,
        });
      }

      syncStdoutToTranscript(runResult.stdout);
      latestVirtualFiles = runResult.virtualFiles;

      if (runResult.stderr.trim().length > 0) {
        transcript.push(...runResult.stderr.trim().split("\n"));
      } else if (runResult.diagnostics.length > 0) {
        transcript.push(...formatDiagnostics(runResult.diagnostics).split("\n"));
      }

      if (transcript.length === 0) {
        transcript.push("Program finished with no output.");
      }

      updateTerminalOutput(target.panelId, transcript.join("\n"));
      applyWorkspaceUpdate((current) => updateVirtualFiles(current, latestVirtualFiles), "immediate");
    } finally {
      resolvePendingInput(null);
      setIsRunning(false);
      setRunningTerminalPanelId(null);
    }
  }, [
    applyWorkspaceUpdate,
    compileSource,
    ensureTerminalTarget,
    resolvePendingInput,
    updateTerminalOutput,
    updateWorkspaceCompileSummary,
    waitForTerminalInput,
  ]);

  const preloadRunRuntime = useCallback(() => {
    preloadPseudocodeCompiler();
    if (typeof pseudocodeRuntimeRunner.preload === "function") {
      void pseudocodeRuntimeRunner.preload().catch(() => {
        /* Runtime errors are shown when the user runs code. */
      });
    }
  }, []);

  const selectDocument = useCallback(
    (documentId: string) => {
      applyWorkspaceUpdate((current) => openDocumentInFocusedEditor(current, documentId), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const handleDocumentSourceChange = useCallback(
    (documentId: string, source: string) => {
      setCompileDiagnostics([]);
      applyWorkspaceUpdate((current) => updateDocumentSource(current, documentId, source), "debounced");
    },
    [applyWorkspaceUpdate],
  );

  const toggleFolder = useCallback(
    (folderId: string) => {
      applyWorkspaceUpdate((current) => {
        const expanded = new Set(current.expandedFolderIds ?? []);
        if (expanded.has(folderId)) {
          expanded.delete(folderId);
        } else {
          expanded.add(folderId);
        }
        expanded.add(current.rootFolderId);
        return setExpandedFolders(current, Array.from(expanded));
      }, "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const expandFolder = useCallback(
    (folderId: string) => {
      applyWorkspaceUpdate((current) => {
        const expanded = new Set(current.expandedFolderIds ?? []);
        if (expanded.has(folderId)) {
          return current;
        }
        expanded.add(current.rootFolderId);
        expanded.add(folderId);
        return setExpandedFolders(current, Array.from(expanded));
      }, "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const createFolderInWorkspace = useCallback(
    (parentId?: string) => {
      applyWorkspaceUpdate(
        (current) =>
          createFolder(current, {
            parentId: parentId && workspaceHasFolder(current, parentId) ? parentId : current.rootFolderId,
          }),
        "immediate",
      );
    },
    [applyWorkspaceUpdate],
  );

  const createDocumentInWorkspace = useCallback(
    (
      parentId?: string,
      options?: {
        name?: string;
        source?: string;
      },
    ) => {
      let createdDocumentId: string | null = null;
      const nextWorkspace = applyWorkspaceUpdate(
        (current) => {
          const next = createDocument(current, {
            parentId: parentId && workspaceHasFolder(current, parentId) ? parentId : current.rootFolderId,
            name: options?.name,
            source: options?.source ?? "",
          });
          createdDocumentId = next.activeDocumentId;
          return next;
        },
        "immediate",
      );
      return createdDocumentId ? nextWorkspace?.nodes[createdDocumentId] ?? null : null;
    },
    [applyWorkspaceUpdate],
  );

  const renameNodeInWorkspace = useCallback(
    (nodeId: string, name: string) => {
      return !!applyWorkspaceUpdate((current) => renameNode(current, nodeId, name), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const deleteNodesInWorkspace = useCallback(
    (nodeIds: string[]) => {
      return !!applyWorkspaceUpdate((current) => deleteNodes(current, nodeIds), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const moveNodesInWorkspace = useCallback(
    (nodeIds: string[], targetFolderId: string, targetIndex: number) => {
      return !!applyWorkspaceUpdate((current) => moveNodes(current, nodeIds, targetFolderId, targetIndex), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const focusWorkspacePanel = useCallback(
    (panelId: string) => {
      applyWorkspaceUpdate((current) => focusPanel(current, panelId), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const createWorkspacePanel = useCallback(
    (kind: WorkspacePanelKind) => {
      applyWorkspaceUpdate((current) => createPanel(current, kind).state, "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const dockWorkspacePanel = useCallback(
    (panelId: string, targetStackId: string, position: WorkspaceDockPosition, targetIndex?: number) => {
      applyWorkspaceUpdate(
        (current) => dockPanel(current, panelId, targetStackId, position, targetIndex),
        "immediate",
      );
    },
    [applyWorkspaceUpdate],
  );

  const closeWorkspacePanel = useCallback(
    (panelId: string) => {
      if (runningTerminalPanelId === panelId) {
        showAppError("A terminal panel cannot be closed while a run is still active.");
        return;
      }
      applyWorkspaceUpdate((current) => closePanel(current, panelId), "immediate");
    },
    [applyWorkspaceUpdate, runningTerminalPanelId, showAppError],
  );

  const resizeWorkspaceSplit = useCallback(
    (splitId: string, sizes: number[]) => {
      applyWorkspaceUpdate((current) => resizeSplit(current, splitId, sizes), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const resetDockLayout = useCallback(() => {
    applyWorkspaceUpdate((current) => resetWorkspaceLayout(current), "immediate");
  }, [applyWorkspaceUpdate]);

  const splitEditor = useCallback(
    (panelId: string, direction: "right" | "bottom") => {
      applyWorkspaceUpdate((current) => splitEditorPanel(current, panelId, direction).state, "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const setEditorActiveDocument = useCallback(
    (panelId: string, documentId: string) => {
      applyWorkspaceUpdate((current) => setEditorPanelActiveDocument(current, panelId, documentId), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const moveEditorDocumentTab = useCallback(
    (fromPanelId: string, toPanelId: string, documentId: string, targetIndex?: number) => {
      applyWorkspaceUpdate(
        (current) => moveEditorTab(current, fromPanelId, toPanelId, documentId, targetIndex),
        "immediate",
      );
    },
    [applyWorkspaceUpdate],
  );

  const closeEditorDocumentTab = useCallback(
    (panelId: string, documentId: string) => {
      applyWorkspaceUpdate((current) => closeEditorTab(current, panelId, documentId), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const updateFilesPanelSelection = useCallback(
    (panelId: string, fileName: string | undefined) => {
      applyWorkspaceUpdate((current) => setFilesPanelSelection(current, panelId, fileName), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const updateWorkspaceVirtualFiles = useCallback(
    (virtualFiles: Record<string, string[]>) => {
      applyWorkspaceUpdate((current) => updateVirtualFiles(current, virtualFiles), "immediate");
    },
    [applyWorkspaceUpdate],
  );

  const clearTerminal = useCallback(
    (panelId?: string) => {
      const current = workspaceRef.current;
      if (!current || !activeDocument) {
        return;
      }

      const resolvedPanelId =
        panelId ??
        current.lastFocusedTerminalPanelId ??
        Object.entries(current.panelInstances).find(([, panel]) => panel.kind === "terminal")?.[0] ??
        null;

      if (!resolvedPanelId) {
        return;
      }

      resolvePendingInput(null);
      updateTerminalOutput(
        resolvedPanelId,
        activeDocument ? `Terminal ready for ${activeDocument.name}.` : "Create your first file to run code.",
      );
    },
    [activeDocument, resolvePendingInput, updateTerminalOutput],
  );

  const submitPendingInput = useCallback(() => {
    resolvePendingInput(pendingInput.text);
  }, [pendingInput.text, resolvePendingInput]);

  const setPendingInputText = useCallback((value: string) => {
    setPendingInput((current) => ({
      ...current,
      text: value,
    }));
  }, []);

  return {
    workspace,
    activeDocument,
    breadcrumbs,
    compileDiagnostics,
    terminalOutputs,
    pendingInput,
    isRunning,
    runningTerminalPanelId,
    saveError,
    hasPendingSave,
    isSaving,
    lastSavedAt,
    appNotice,
    dismissNotice,
    setPendingInputText,
    submitPendingInput,
    cancelPendingInput: () => resolvePendingInput(null),
    compileNow,
    runNow,
    preloadRunRuntime,
    saveWorkspaceNow,
    clearTerminal,
    selectDocument,
    handleDocumentSourceChange,
    toggleFolder,
    expandFolder,
    createFolderInWorkspace,
    createDocumentInWorkspace,
    renameNodeInWorkspace,
    deleteNodesInWorkspace,
    moveNodesInWorkspace,
    focusWorkspacePanel,
    createWorkspacePanel,
    dockWorkspacePanel,
    closeWorkspacePanel,
    resizeWorkspaceSplit,
    resetDockLayout,
    splitEditor,
    setEditorActiveDocument,
    moveEditorDocumentTab,
    closeEditorDocumentTab,
    updateFilesPanelSelection,
    updateWorkspaceVirtualFiles,
  };
}
