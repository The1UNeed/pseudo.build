"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/app/components/BrandMark";
import {
  DragEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  UIEvent as ReactUIEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronUp,
  CircleAlert,
  Code,
  CloudOff,
  Ellipsis,
  FileCode,
  FilePlus,
  Folder,
  GitBranch,
  LoaderCircle,
  LogIn,
  PanelLeft,
  Palette,
  Play,
  Save,
  Settings,
  Shuffle,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import {
  getNodePath,
  type WorkspaceEditorPanelInstance,
} from "@pseudobuild/workspace";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { Dialog } from "@/app/components/Dialog";
import { PracticeQuestionBanner } from "@/app/components/PracticeQuestionBanner";
import { WorkspaceSidebar } from "@/app/components/WorkspaceSidebar";
import ManualContent from "@/app/[locale]/(public)/manual/ManualContent";
import { usePracticeQuestion } from "@/app/hooks/usePracticeQuestion";
import { useWorkspaceSession } from "@/app/hooks/useWorkspaceSession";
import {
  Show,
  SignInButton,
  UserButton,
  isCloudAuthConfigured,
  useAuth,
} from "@/lib/auth-components";
import { getTouchLayout } from "@/lib/appleTouch";
import type { Diagnostic } from "@/compiler/types";
import { useDictionary, useLocale } from "@/i18n/context";
import { localePath } from "@/i18n/config";
import { LocaleSwitcher } from "@/i18n/LocaleSwitcher";
import {
  getClientAppPlatform,
  getWorkspacePersistenceMode,
  platformUsesCloudSaving,
} from "@/lib/platform";
import {
  applyResolvedTheme,
  getSystemTheme,
  loadThemeMode,
  resolveTheme,
  saveThemeMode,
  type ThemeMode,
} from "@/lib/theme";
import { SYNTAX_OPTIONS, resolveSyntax } from "@/lib/pseudocodeLanguages";
import type { WorkspaceSyntaxId } from "@pseudobuild/workspace";

/* ── constants ── */
const DEFAULT_SOURCE = `DECLARE Number : INTEGER
DECLARE Total : INTEGER

FOR Number <- 1 TO 5
    Total <- Total + Number
NEXT Number

OUTPUT "Total = ", Total`;

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_TERMINAL_HEIGHT = 160;
const MIN_TERMINAL_HEIGHT = 96;
const MAX_TERMINAL_HEIGHT = 460;
const SIDEBAR_WIDTH_STORAGE_KEY = "pseudocode-compiler-sidebar-width";
const TERMINAL_HEIGHT_STORAGE_KEY = "pseudocode-compiler-terminal-height";
const AUTO_SAVE_INTERVAL_STORAGE_KEY = "pseudocode-compiler-autosave-minutes";
const FLOWCHART_MODE_STORAGE_KEY = "pseudocode-compiler-flowchart-mode-enabled";
const DEFAULT_AUTO_SAVE_INTERVAL_MINUTES = 5;
const MIN_AUTO_SAVE_INTERVAL_MINUTES = 1;
const MAX_AUTO_SAVE_INTERVAL_MINUTES = 60;
const MANUAL_SAVE_STATUS_TIMEOUT_MS = 2200;
const PSEUDO_EXTENSION = ".pseudo";
// Shared so editors without compile results don't get a new array (and reset markers) every render.
const EMPTY_DIAGNOSTICS: Diagnostic[] = [];
const DIALOG_CARD_CLASS =
  "w-[calc(100%-2rem)] border border-[var(--separator)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-[var(--shadow-modal)]";

type TouchTab = "editor" | "files" | "output" | "settings";
type ManualSaveStatus = "idle" | "saving" | "saved" | "error";

function LazyPanelFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center bg-[var(--bg)] text-sm font-medium text-[var(--text2)]">
      <LoaderCircle className="mr-2 animate-spin" size={16} />
      {label}
    </div>
  );
}

function EditorLoadingFallback() {
  return <LazyPanelFallback label={useDictionary().editor.loading.editor} />;
}

function FlowchartLoadingFallback() {
  return <LazyPanelFallback label={useDictionary().editor.loading.flowchart} />;
}

const MonacoPseudocodeEditor = dynamic(
  () =>
    import("@/app/components/MonacoPseudocodeEditor").then(
      (module) => module.MonacoPseudocodeEditor,
    ),
  {
    ssr: false,
    loading: () => <EditorLoadingFallback />,
  },
);

const FlowchartEditor = memo(
  dynamic(() => import("@/app/components/flowchart/FlowchartEditor"), {
    ssr: false,
    loading: () => <FlowchartLoadingFallback />,
  }),
);

/* ── dialog state types ── */

interface RenameDialogState {
  nodeId: string;
  currentName: string;
  isDocument: boolean;
}

interface DeleteDialogState {
  nodeIds: string[];
  message: string;
}

function getDocumentEditableName(name: string): string {
  return name.endsWith(PSEUDO_EXTENSION) ? name.slice(0, -PSEUDO_EXTENSION.length) : name;
}

function normalizeDocumentEditableName(name: string): string {
  return getDocumentEditableName(name.trim());
}

function getSubmittedRenameValue(renameDialog: RenameDialogState, value: string): string {
  const trimmed = value.trim();
  return renameDialog.isDocument ? `${normalizeDocumentEditableName(trimmed)}${PSEUDO_EXTENSION}` : trimmed;
}

function clampAutoSaveIntervalMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_AUTO_SAVE_INTERVAL_MINUTES;
  }

  return Math.min(
    MAX_AUTO_SAVE_INTERVAL_MINUTES,
    Math.max(MIN_AUTO_SAVE_INTERVAL_MINUTES, Math.round(value)),
  );
}

function loadAutoSaveIntervalMinutes(): number {
  if (typeof window === "undefined") {
    return DEFAULT_AUTO_SAVE_INTERVAL_MINUTES;
  }

  const stored = window.localStorage.getItem(AUTO_SAVE_INTERVAL_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_AUTO_SAVE_INTERVAL_MINUTES;
  }

  return clampAutoSaveIntervalMinutes(Number(stored));
}

function saveAutoSaveIntervalMinutes(value: number): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTO_SAVE_INTERVAL_STORAGE_KEY, String(value));
}

function loadFlowchartModeEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(FLOWCHART_MODE_STORAGE_KEY) === "true";
}

function saveFlowchartModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FLOWCHART_MODE_STORAGE_KEY, String(enabled));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function loadStoredNumber(key: string, fallback: number, min: number, max: number): number {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }

  return clampNumber(Number(stored), min, max);
}

function saveStoredNumber(key: string, value: number): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(Math.round(value)));
}

function getMaxTerminalHeight(viewportHeight: number): number {
  return Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, viewportHeight - 220));
}

/* ── component ── */

export default function HomePage() {
  const locale = useLocale();
  const t = useDictionary().editor;
  const themeOptions: Array<{ value: ThemeMode; label: string; description: string }> = [
    { value: "system", label: t.settings.system, description: t.settings.systemDescription },
    { value: "dark", label: t.settings.dark, description: t.settings.darkDescription },
    { value: "light", label: t.settings.light, description: t.settings.lightDescription },
  ];
  const appLegalLinks = [
    { href: localePath(locale, "/terms"), label: t.legal.userAgreement },
    { href: localePath(locale, "/privacy"), label: t.legal.privacy },
    { href: localePath(locale, "/security"), label: t.legal.security },
    { href: "https://github.com/The1UNeed/pseudo.build", label: t.legal.github },
  ];
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const authLoading = !authLoaded;
  const [appPlatform] = useState(() => getClientAppPlatform());
  const cloudSavingRequired = platformUsesCloudSaving(appPlatform);
  const workspacePersistenceMode = getWorkspacePersistenceMode({
    platform: appPlatform,
    signedIn: Boolean(isSignedIn),
  });
  const getCloudAuthToken = useCallback(async () => {
    if (typeof getToken !== "function") {
      return null;
    }

    return await getToken({ template: "convex", skipCache: true });
  }, [getToken]);
  const workspaceAuthTokenProvider =
    workspacePersistenceMode === "cloud" ? getCloudAuthToken : undefined;
  const canSaveWorkspace = workspacePersistenceMode !== "memory";
  const isDesktopShell = appPlatform === "desktop";
  const [autoSaveIntervalMinutes, setAutoSaveIntervalMinutes] = useState(
    () => loadAutoSaveIntervalMinutes(),
  );

  const {
    workspace,
    activeDocument,
    compileDiagnostics,
    terminalOutputs,
    pendingInput,
    isRunning,
    runningTerminalPanelId,
    saveError,
    hasPendingSave,
    isSaving,
    appNotice,
    dismissNotice,
    setPendingInputText,
    submitPendingInput,
    cancelPendingInput,
    runNow,
    preloadRunRuntime,
    saveWorkspaceNow,
    clearTerminal,
    selectDocument,
    handleDocumentSourceChange,
    toggleFolder,
    expandFolder,
    createFolderInWorkspace,
    syntaxId,
    setSyntaxId,
    createDocumentInWorkspace,
    renameNodeInWorkspace,
    deleteNodesInWorkspace,
    moveNodesInWorkspace,
    setEditorActiveDocument,
    moveEditorDocumentTab,
    closeEditorDocumentTab,
  } = useWorkspaceSession(DEFAULT_SOURCE, {
    autoSaveDelayMs: autoSaveIntervalMinutes * 60 * 1000,
    getCloudAuthToken: workspaceAuthTokenProvider,
    persistenceMode: workspacePersistenceMode,
    cloudSyncLoading: cloudSavingRequired ? authLoading : false,
  });

  /* ── local state ── */

  const [renameDialog, setRenameDialog] = useState<RenameDialogState | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    loadStoredNumber(
      SIDEBAR_WIDTH_STORAGE_KEY,
      DEFAULT_SIDEBAR_WIDTH,
      MIN_SIDEBAR_WIDTH,
      MAX_SIDEBAR_WIDTH,
    ),
  );
  const [terminalHeight, setTerminalHeight] = useState(() =>
    loadStoredNumber(
      TERMINAL_HEIGHT_STORAGE_KEY,
      DEFAULT_TERMINAL_HEIGHT,
      MIN_TERMINAL_HEIGHT,
      MAX_TERMINAL_HEIGHT,
    ),
  );
  const [showTerminal, setShowTerminal] = useState(true);
  const [touchTab, setTouchTab] = useState<TouchTab>("editor");
  const [touchSidebarVisible, setTouchSidebarVisible] = useState(true);
  const [touchOutputVisible, setTouchOutputVisible] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showManualPanel, setShowManualPanel] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [showCreateFileDialog, setShowCreateFileDialog] = useState(false);
  const [createFileName, setCreateFileName] = useState("main");
  const [createFileParentId, setCreateFileParentId] = useState<string | undefined>(undefined);
  const [showFlowchartPrompt, setShowFlowchartPrompt] = useState(false);
  const [flowchartFileName, setFlowchartFileName] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [flowchartModeEnabled, setFlowchartModeEnabled] = useState(() =>
    loadFlowchartModeEnabled(),
  );
  const [manualSaveStatus, setManualSaveStatus] = useState<ManualSaveStatus>("idle");
  const manualSaveStatusTimerRef = useRef<number | null>(null);

  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() => getSystemTheme());

  const clearManualSaveStatusTimer = useCallback(() => {
    if (manualSaveStatusTimerRef.current !== null) {
      window.clearTimeout(manualSaveStatusTimerRef.current);
      manualSaveStatusTimerRef.current = null;
    }
  }, []);

  const showTemporaryManualSaveStatus = useCallback(
    (status: Exclude<ManualSaveStatus, "idle" | "saving">) => {
      clearManualSaveStatusTimer();
      setManualSaveStatus(status);
      manualSaveStatusTimerRef.current = window.setTimeout(() => {
        setManualSaveStatus("idle");
        manualSaveStatusTimerRef.current = null;
      }, MANUAL_SAVE_STATUS_TIMEOUT_MS);
    },
    [clearManualSaveStatusTimer],
  );

  useEffect(() => {
    return () => clearManualSaveStatusTimer();
  }, [clearManualSaveStatusTimer]);

  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const [coarsePointer, setCoarsePointer] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches,
  );
  const maxTerminalHeight = getMaxTerminalHeight(viewportSize.height);

  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const desktopTerminalScrollRef = useRef<HTMLDivElement | null>(null);
  const touchOutputScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollOutputRef = useRef(true);
  const sidebarWidthRef = useRef(sidebarWidth);
  const terminalHeightRef = useRef(terminalHeight);
  const sidebarResizeFrameRef = useRef<number | null>(null);
  const terminalResizeFrameRef = useRef<number | null>(null);
  const pendingSidebarWidthRef = useRef(sidebarWidth);
  const pendingTerminalHeightRef = useRef(terminalHeight);

  /* ── derived workspace data ── */

  const editorPanel = useMemo<WorkspaceEditorPanelInstance | null>(() => {
    if (!workspace) return null;
    const entry = Object.entries(workspace.panelInstances).find(
      ([, p]) => p.kind === "editor",
    );
    return entry ? (entry[1] as WorkspaceEditorPanelInstance) : null;
  }, [workspace]);

  const editorPanelId = editorPanel?.id ?? null;

  const terminalPanelId = useMemo(() => {
    if (!workspace) return null;
    const entry = Object.entries(workspace.panelInstances).find(
      ([, p]) => p.kind === "terminal",
    );
    return entry?.[0] ?? null;
  }, [workspace]);

  const editorActiveDoc = useMemo(() => {
    if (!workspace || !editorPanel?.activeDocumentId) return null;
    const node = workspace.nodes[editorPanel.activeDocumentId];
    return node?.type === "document" ? node : null;
  }, [workspace, editorPanel]);
  const currentDocument = editorActiveDoc ?? activeDocument;
  const { currentQuestion, openRandomQuestion } = usePracticeQuestion(
    workspace,
    currentDocument?.name,
    createDocumentInWorkspace,
    selectDocument,
  );
  const practiceBanner = currentQuestion ? (
    <PracticeQuestionBanner
      question={currentQuestion}
      onAnother={() => openRandomQuestion(currentQuestion.id)}
    />
  ) : null;

  const breadcrumbs = useMemo(() => {
    if (!workspace || !currentDocument) return [];
    return getNodePath(workspace, currentDocument.id);
  }, [workspace, currentDocument]);

  const terminalOutput = terminalPanelId
    ? (terminalOutputs[terminalPanelId] ?? "")
    : "";
  const resolvedTheme = resolveTheme(themeMode, systemTheme);
  const shouldWarnBeforeUnload = hasPendingSave || saveError !== null;
  const flowchartVisible = flowchartModeEnabled && showFlowchart;
  const currentSource = currentDocument?.source ?? "";
  // The flowchart stays mounted while hidden; only feed it source updates while it is visible.
  const [flowchartSource, setFlowchartSource] = useState(currentSource);
  if (flowchartVisible && flowchartSource !== currentSource) {
    setFlowchartSource(currentSource);
  }
  const currentDocumentRef = useRef(currentDocument);

  /* ── effects ── */

  useEffect(() => {
    currentDocumentRef.current = currentDocument;
  }, [currentDocument]);

  useEffect(() => {
    if (renameDialog) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renameDialog]);

  useEffect(() => {
    if (showCreateFileDialog) {
      createFileInputRef.current?.focus();
      createFileInputRef.current?.select();
    }
  }, [showCreateFileDialog]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const handlePointerChange = (event: MediaQueryListEvent) => {
      setCoarsePointer(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    pointerQuery.addEventListener("change", handlePointerChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      pointerQuery.removeEventListener("change", handlePointerChange);
    };
  }, []);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
    saveThemeMode(themeMode);
  }, [resolvedTheme, themeMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !shouldWarnBeforeUnload) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t.save.leaveWarning;
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldWarnBeforeUnload, t.save.leaveWarning]);

  const scrollOutputToBottom = useCallback(() => {
    if (!shouldAutoScrollOutputRef.current) {
      return;
    }

    for (const element of [desktopTerminalScrollRef.current, touchOutputScrollRef.current]) {
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }
  }, []);

  const handleOutputScroll = useCallback((event: ReactUIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    shouldAutoScrollOutputRef.current = distanceFromBottom <= 24;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollOutputToBottom();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    isRunning,
    pendingInput.panelId,
    pendingInput.prompt,
    runningTerminalPanelId,
    scrollOutputToBottom,
    showTerminal,
    terminalOutput,
    touchOutputVisible,
    touchTab,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncViewport = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
    };
  }, []);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
    pendingSidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    terminalHeightRef.current = terminalHeight;
    pendingTerminalHeightRef.current = terminalHeight;
  }, [terminalHeight]);

  useEffect(() => {
    return () => {
      if (sidebarResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(sidebarResizeFrameRef.current);
      }
      if (terminalResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(terminalResizeFrameRef.current);
      }
    };
  }, []);

  /* ── resize handlers ── */

  const scheduleSidebarWidth = useCallback((nextWidth: number) => {
    pendingSidebarWidthRef.current = clampNumber(nextWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);
    if (sidebarResizeFrameRef.current !== null) {
      return;
    }

    sidebarResizeFrameRef.current = window.requestAnimationFrame(() => {
      sidebarResizeFrameRef.current = null;
      setSidebarWidth(pendingSidebarWidthRef.current);
    });
  }, []);

  const scheduleTerminalHeight = useCallback(
    (nextHeight: number) => {
      pendingTerminalHeightRef.current = clampNumber(
        nextHeight,
        MIN_TERMINAL_HEIGHT,
        maxTerminalHeight,
      );
      if (terminalResizeFrameRef.current !== null) {
        return;
      }

      terminalResizeFrameRef.current = window.requestAnimationFrame(() => {
        terminalResizeFrameRef.current = null;
        setTerminalHeight(pendingTerminalHeightRef.current);
      });
    },
    [maxTerminalHeight],
  );

  const handleSidebarResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.focus();
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const startX = event.clientX;
      const startW = sidebarWidthRef.current;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (e: PointerEvent) => {
        scheduleSidebarWidth(startW + e.clientX - startX);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        const finalWidth = pendingSidebarWidthRef.current;
        setSidebarWidth(finalWidth);
        saveStoredNumber(SIDEBAR_WIDTH_STORAGE_KEY, finalWidth);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [scheduleSidebarWidth],
  );

  const handleTerminalResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.focus();
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const startY = event.clientY;
      const startH = terminalHeightRef.current;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";

      const onMove = (e: PointerEvent) => {
        scheduleTerminalHeight(startH + startY - e.clientY);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        const finalHeight = pendingTerminalHeightRef.current;
        setTerminalHeight(finalHeight);
        saveStoredNumber(TERMINAL_HEIGHT_STORAGE_KEY, finalHeight);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [scheduleTerminalHeight],
  );

  const handleSidebarResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 16 : -16;
      const nextWidth = clampNumber(sidebarWidthRef.current + delta, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);
      setSidebarWidth(nextWidth);
      saveStoredNumber(SIDEBAR_WIDTH_STORAGE_KEY, nextWidth);
    },
    [],
  );

  const handleTerminalResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? 16 : -16;
      const nextHeight = clampNumber(
        terminalHeightRef.current + delta,
        MIN_TERMINAL_HEIGHT,
        maxTerminalHeight,
      );
      setTerminalHeight(nextHeight);
      saveStoredNumber(TERMINAL_HEIGHT_STORAGE_KEY, nextHeight);
    },
    [maxTerminalHeight],
  );

  /* ── actions ── */

  const handleRun = useCallback(() => {
    shouldAutoScrollOutputRef.current = true;
    setShowTerminal(true);
    preloadRunRuntime();
    runNow();
  }, [preloadRunRuntime, runNow]);

  const handleSaveWorkspace = useCallback(() => {
    if ((cloudSavingRequired && authLoading) || isSaving) {
      return;
    }

    if (!canSaveWorkspace) {
      setShowSignInPrompt(true);
      return;
    }

    clearManualSaveStatusTimer();
    setManualSaveStatus("saving");
    void saveWorkspaceNow().then((saved) => {
      showTemporaryManualSaveStatus(saved ? "saved" : "error");
    });
  }, [
    authLoading,
    canSaveWorkspace,
    clearManualSaveStatusTimer,
    cloudSavingRequired,
    isSaving,
    saveWorkspaceNow,
    showTemporaryManualSaveStatus,
  ]);

  const handleClearTerminal = useCallback(() => {
    shouldAutoScrollOutputRef.current = true;
    if (terminalPanelId) clearTerminal(terminalPanelId);
  }, [clearTerminal, terminalPanelId]);
  const handleThemeModeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  const handleAutoSaveIntervalChange = useCallback((value: number) => {
    const nextValue = clampAutoSaveIntervalMinutes(value);
    setAutoSaveIntervalMinutes(nextValue);
    saveAutoSaveIntervalMinutes(nextValue);
  }, []);

  const handleFlowchartModeEnabledChange = useCallback((enabled: boolean) => {
    setFlowchartModeEnabled(enabled);
    saveFlowchartModeEnabled(enabled);
    if (!enabled) {
      setShowFlowchart(false);
    }
  }, []);

  const handleToggleFlowchart = useCallback(() => {
    if (!flowchartModeEnabled) {
      setShowSettingsPanel(true);
      return;
    }
    if (!currentDocument) {
      setShowFlowchartPrompt(true);
      return;
    }
    setShowFlowchart((prev) => !prev);
  }, [currentDocument, flowchartModeEnabled]);

  const syncFlowchartCodeToWorkspace = useCallback(
    (
      code: string,
      options?: {
        createDocumentWhenEmpty?: boolean;
        revealCodeView?: boolean;
      },
    ) => {
      // Read the document through a ref so these callbacks stay stable and the memoized
      // flowchart doesn't re-render or re-run its sync effect on every keystroke.
      const doc = currentDocumentRef.current;
      if (doc) {
        if (doc.source !== code) {
          handleDocumentSourceChange(doc.id, code);
        }
      } else if (code.trim().length > 0 || options?.createDocumentWhenEmpty) {
        createDocumentInWorkspace(undefined, { source: code });
      }

      if (options?.revealCodeView) {
        setShowFlowchart(false);
      }
    },
    [createDocumentInWorkspace, handleDocumentSourceChange],
  );

  const handleFlowchartCodeChange = useCallback(
    (code: string) => {
      syncFlowchartCodeToWorkspace(code);
    },
    [syncFlowchartCodeToWorkspace],
  );

  const handleGenerateCode = useCallback(
    (code: string) => {
      syncFlowchartCodeToWorkspace(code, {
        createDocumentWhenEmpty: true,
        revealCodeView: true,
      });
    },
    [syncFlowchartCodeToWorkspace],
  );
  // Browser-only values; the workspace loading gate renders first, so this can't cause a hydration mismatch.
  const touchLayout = getTouchLayout(viewportSize.width, coarsePointer);
  const isTouchTablet = touchLayout === "tablet";
  const isTouchPhone = touchLayout === "phone";

  const handleTouchRun = useCallback(() => {
    if (isTouchTablet) {
      setTouchOutputVisible(true);
    }
    if (isTouchPhone) {
      setTouchTab("output");
    }
    handleRun();
  }, [handleRun, isTouchPhone, isTouchTablet]);

  const handlePhoneBack = useCallback(() => {
    setTouchTab((current) => (current === "editor" ? "files" : "editor"));
  }, []);

  const handleTouchDocumentSelect = useCallback(
    (documentId: string) => {
      selectDocument(documentId);
      if (isTouchPhone) {
        setTouchTab("editor");
      }
    },
    [isTouchPhone, selectDocument],
  );

  const touchSafeAreaStyle = {
    paddingTop: "env(safe-area-inset-top, 0px)",
    paddingRight: "env(safe-area-inset-right, 0px)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    paddingLeft: "env(safe-area-inset-left, 0px)",
  } as const;

  const currentSyntax = resolveSyntax(syntaxId);

  const handleSyntaxChange = (nextSyntaxId: WorkspaceSyntaxId) => {
    setSyntaxId(nextSyntaxId);
  };

  const renderSyntaxSettings = (compact = false) => (
    <div className={compact ? "mt-6 space-y-4" : "space-y-4"}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--text3)]">
          {t.settings.examBoard}
        </p>
        <h3 className="mt-2 text-[22px] font-semibold text-[var(--text)]">{t.settings.syntax}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text2)]">
          {t.settings.syntaxDescription}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--separator)] bg-[var(--surface2)] px-4 py-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--text)]">{t.settings.examSyntax}</span>
          <select
            value={currentSyntax.id}
            aria-label={t.settings.examSyntax}
            onChange={(event) => handleSyntaxChange(event.target.value as WorkspaceSyntaxId)}
            className="h-9 max-w-[220px] rounded-lg border border-[var(--separator)] bg-[var(--bg)] px-3 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            {SYNTAX_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-[var(--text3)]">
          {currentSyntax.board} {currentSyntax.syllabus}. {currentSyntax.description}
        </p>
      </div>
    </div>
  );

  const renderThemeSettings = (compact = false) => (
    <div className={compact ? "mt-6 space-y-4" : "space-y-4"}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--text3)]">
          {t.settings.appearance}
        </p>
        <h3 className="mt-2 text-[22px] font-semibold text-[var(--text)]">{t.settings.theme}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text2)]">
          {t.settings.themeDescription}
        </p>
      </div>

      <div className="flex rounded-xl border border-[var(--separator)] bg-[var(--surface2)] p-1">
        {themeOptions.map((option) => {
          const selected = themeMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleThemeModeChange(option.value)}
              aria-pressed={selected}
              className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                selected
                  ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                  : "text-[var(--text2)] hover:text-[var(--text)]"
              }`}
            >
              <span className="block text-center">{option.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--text3)]">
        {t.settings.activeAppearance}{" "}
        <span className="font-semibold text-[var(--text2)]">
          {resolvedTheme === "dark" ? t.settings.dark : t.settings.light}
        </span>
      </p>
    </div>
  );

  const renderSaveSettings = (compact = false) => (
    <div className={compact ? "mt-6 space-y-4" : "space-y-4"}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--text3)]">
          {t.settings.saving}
        </p>
        <h3 className="mt-2 text-[22px] font-semibold text-[var(--text)]">{t.settings.autosave}</h3>
      </div>

      <div className="rounded-xl border border-[var(--separator)] bg-[var(--surface2)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--text)]">{t.settings.autosaveInterval}</span>
          <select
            value={autoSaveIntervalMinutes}
            aria-label={t.settings.autosaveIntervalMinutes}
            onChange={(event) => handleAutoSaveIntervalChange(Number(event.target.value))}
            className="h-9 rounded-lg border border-[var(--separator)] bg-[var(--bg)] px-3 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            {[1, 2, 3, 5, 10, 15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{t.settings.minute(minutes)}</option>)}
          </select>
        </div>
        <p className="mt-2 text-xs text-[var(--text3)]">
          {t.settings.autosaveEvery(autoSaveIntervalMinutes)}
        </p>
      </div>
    </div>
  );

  // The flowchart can't render on touch layouts, so its switch is hidden there.
  const renderBetaSettings = (compact = false) => touchLayout ? null : (
    <div className={compact ? "mt-6 space-y-4" : "space-y-4"}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--text3)]">
          {t.settings.featurePreviews}
        </p>
        <h3 className="mt-2 text-[22px] font-semibold text-[var(--text)]">{t.settings.betaFeatures}</h3>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--separator)] bg-[var(--surface2)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text)]">{t.settings.flowchartMode}</span>
            <span className="rounded-full border border-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
              {t.common.beta}
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-5 text-[var(--text2)]">
            {t.settings.flowchartDescription}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={flowchartModeEnabled}
          aria-label={t.settings.enableFlowchartBeta}
          onClick={() => handleFlowchartModeEnabledChange(!flowchartModeEnabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            flowchartModeEnabled ? "bg-[var(--accent)]" : "bg-[var(--separator)]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              flowchartModeEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );

  const renderAccountControl = (compact = false) => {
    if (!cloudSavingRequired) {
      return null;
    }

    if (authLoading) {
      return (
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[var(--text3)]"
          aria-label={t.auth.checkingStatus}
          disabled
        >
          <LogIn size={18} />
          <span className={compact ? "sr-only" : "max-w-[8rem] truncate text-xs font-medium"}>
            {t.auth.checking}
          </span>
        </button>
      );
    }

    if (!isCloudAuthConfigured()) {
      return (
        <button
          type="button"
          className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] font-semibold text-[var(--on-accent)] shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            compact ? "h-8 w-8 px-0" : "h-8 px-3 text-xs"
          }`}
          onClick={() => {
            window.location.assign(localePath(locale, "/login"));
          }}
        >
          <LogIn size={compact ? 16 : 14} />
          <span className={compact ? "sr-only" : "max-w-[5rem] truncate"}>
            {t.auth.logIn}
          </span>
        </button>
      );
    }

    return (
      <div className="flex items-center">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] font-semibold text-[var(--on-accent)] shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                compact ? "h-8 w-8 px-0" : "h-8 px-3 text-xs"
              }`}
            >
              <LogIn size={compact ? 16 : 14} />
              <span className={compact ? "sr-only" : "max-w-[5rem] truncate"}>
                {t.auth.logIn}
              </span>
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <div className="flex h-7 items-center">
            <UserButton>
              <UserButton.UserProfilePage
                label={t.auth.appearance}
                url="appearance"
                labelIcon={<Palette size={16} />}
              >
                <div className="p-2">
                  {renderSyntaxSettings()}
                  {renderThemeSettings()}
                </div>
              </UserButton.UserProfilePage>
              <UserButton.UserProfilePage
                label={t.auth.general}
                url="general"
                labelIcon={<Settings size={16} />}
              >
                <div className="space-y-6 p-2">
                  {renderSaveSettings()}
                  {renderBetaSettings()}
                </div>
              </UserButton.UserProfilePage>
              <UserButton.MenuItems>
                <UserButton.Action label="manageAccount" />
                <UserButton.Action label="signOut" />
              </UserButton.MenuItems>
            </UserButton>
          </div>
        </Show>
      </div>
    );
  };

  const renderSaveControl = () => {
    const blocked = (cloudSavingRequired && authLoading) || isSaving;
    const isCloudSave = workspacePersistenceMode === "cloud";
    const showSaving = isSaving || manualSaveStatus === "saving";
    const showSaved = !showSaving && !hasPendingSave && manualSaveStatus === "saved";
    const showError = !showSaving && manualSaveStatus === "error";
    const saveStatusLabel = showSaving ? t.save.saving : showSaved ? t.save.saved : showError ? t.save.failed : null;
    const saveStatusClass = showSaved
      ? "text-[var(--green)]"
      : showError
        ? "text-[var(--red)]"
        : "text-[var(--text2)]";
    const saveTitle = showError
      ? t.save.failedTitle
      : canSaveWorkspace
        ? isCloudSave
          ? t.save.cloudTitle
          : t.save.localTitle
        : t.save.signInTitle;

    return (
      <button
        type="button"
        className={`flex h-7 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition ${
          saveStatusLabel ? "min-w-7 px-2.5" : "w-7"
        } ${
          canSaveWorkspace
            ? `${saveStatusClass} hover:bg-[var(--hover)]`
            : "cursor-not-allowed border border-[var(--separator)] bg-[var(--surface2)] text-[var(--text3)] opacity-70"
        } ${blocked ? "opacity-60" : ""}`}
        aria-label={t.save.saveWorkspace}
        aria-disabled={!canSaveWorkspace || blocked}
        disabled={blocked}
        title={saveTitle}
        onClick={handleSaveWorkspace}
      >
        {showSaving ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : showSaved ? (
          <Check size={17} />
        ) : showError ? (
          <CircleAlert size={17} />
        ) : (
          <Save size={18} />
        )}
        {saveStatusLabel ? <span>{saveStatusLabel}</span> : null}
      </button>
    );
  };

  const openManualPage = () => {
    setShowManualPanel(true);
  };

  const closeFlowchartPrompt = () => {
    setShowFlowchartPrompt(false);
    setFlowchartFileName("");
  };

  const renderManualDialog = () =>
    showManualPanel ? (
      <Dialog
        labelledBy="workspace-manual-title"
        onClose={() => setShowManualPanel(false)}
        className="h-full max-h-none w-full max-w-6xl overflow-auto border-0 bg-[#f7f8f3] p-0 shadow-[var(--shadow-modal)] md:h-[calc(100%-2.5rem)] md:w-[calc(100%-2.5rem)] md:rounded-[24px] md:border md:border-[#d7ddd0]"
      >
        <h2 id="workspace-manual-title" className="sr-only">
          {t.manual.title}
        </h2>
        <ManualContent isModal onClose={() => setShowManualPanel(false)} />
      </Dialog>
    ) : null;

  const renderFlowchartPromptDialog = () =>
    showFlowchartPrompt ? (
      <Dialog
        labelledBy="flowchart-prompt-title"
        onClose={closeFlowchartPrompt}
        className={`${DIALOG_CARD_CLASS} max-w-sm rounded-xl`}
      >
        <div className="flex items-center gap-3 text-[var(--text3)]">
          <GitBranch size={20} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t.flowchart.name}</span>
        </div>
        <h2
          id="flowchart-prompt-title"
          className="mt-3 text-xl font-semibold text-[var(--text)]"
        >
          {t.flowchart.createFirst}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text2)]">
          {t.flowchart.createFirstDescription}
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const name = flowchartFileName.trim();
            if (!name) return;
            createDocumentInWorkspace(undefined, { name });
            closeFlowchartPrompt();
            setShowFlowchart(true);
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--text2)]">{t.files.fileName}</span>
            <input
              data-autofocus
              aria-label={t.files.fileName}
              value={flowchartFileName}
              onChange={(event) => setFlowchartFileName(event.target.value)}
              placeholder="main.pseudo"
              className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--surface3)]"
              onClick={closeFlowchartPrompt}
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
              disabled={!flowchartFileName.trim()}
            >
              {t.files.createAndOpen}
            </button>
          </div>
        </form>
      </Dialog>
    ) : null;

  const renderCreateFileDialog = () =>
    showCreateFileDialog ? (
      <Dialog
        labelledBy="create-file-dialog-title"
        onClose={closeCreateFileDialog}
        className={`${DIALOG_CARD_CLASS} max-w-sm rounded-xl`}
      >
        <div className="flex items-center gap-3 text-[var(--text3)]">
          <FilePlus size={20} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t.files.explorer}</span>
        </div>
        <h2
          id="create-file-dialog-title"
          className="mt-3 text-xl font-semibold text-[var(--text)]"
        >
          {t.files.createNewFile}
        </h2>
        <form className="mt-5 space-y-4" onSubmit={submitCreateFile}>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--text2)]">{t.files.fileName}</span>
            <div className="flex h-10 w-full overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--bg)] focus-within:border-[var(--accent)]">
              <input
                ref={createFileInputRef}
                data-autofocus
                aria-label={t.files.fileName}
                value={createFileName}
                onChange={(event) => setCreateFileName(normalizeDocumentEditableName(event.target.value))}
                placeholder="main"
                className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[var(--text)] outline-none"
              />
              <span className="flex shrink-0 items-center border-l border-[var(--separator)] bg-[var(--surface2)] px-3 text-sm text-[var(--text3)]">
                {PSEUDO_EXTENSION}
              </span>
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--surface3)]"
              onClick={closeCreateFileDialog}
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
              disabled={!createFileName.trim()}
            >
              {t.files.createFile}
            </button>
          </div>
        </form>
      </Dialog>
    ) : null;

  const renderSignInPromptDialog = () =>
    showSignInPrompt ? (
      <Dialog
        labelledBy="sign-in-save-dialog-title"
        onClose={() => setShowSignInPrompt(false)}
        className={`${DIALOG_CARD_CLASS} max-w-sm rounded-xl`}
      >
        <div className="flex items-center gap-2 text-[var(--text3)]">
          <CloudOff size={18} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t.auth.signedOut}</span>
        </div>
        <h2
          id="sign-in-save-dialog-title"
          className="mt-3 text-xl font-semibold text-[var(--text)]"
        >
          {t.auth.signInToSave}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text2)]">
          {t.auth.signInDescription}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm text-[var(--text2)] transition hover:bg-[var(--surface3)]"
            onClick={() => setShowSignInPrompt(false)}
          >
            {t.auth.notNow}
          </button>
          <SignInButton mode="modal">
            {/* Close this modal first: Clerk's sign-in modal would otherwise sit under the inert page. */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm font-semibold text-[var(--text2)] transition hover:bg-[var(--surface3)] hover:text-[var(--text)]"
              onClick={() => setShowSignInPrompt(false)}
            >
              <LogIn size={15} />
              {t.auth.logIn}
            </button>
          </SignInButton>
        </div>
      </Dialog>
    ) : null;

  const renderRenameDialog = () =>
    renameDialog ? (
      <Dialog
        labelledBy="rename-dialog-title"
        onClose={() => setRenameDialog(null)}
        className={`${DIALOG_CARD_CLASS} max-w-md rounded-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{t.files.explorer}</p>
            <h2
              id="rename-dialog-title"
              className="mt-2 text-xl font-semibold text-[var(--text)]"
            >
              {t.files.renameItem}
            </h2>
            <p className="mt-2 text-sm text-[var(--text2)]">
              {t.files.currentName} {renameDialog.currentName}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--surface3)]"
            onClick={() => setRenameDialog(null)}
          >
            {t.common.cancel}
          </button>
        </div>
        <form className="mt-5 space-y-4" onSubmit={submitRename}>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--text2)]">{t.files.itemName}</span>
            <div className="flex h-10 w-full overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--bg)] focus-within:border-[var(--accent)]">
              <input
                ref={renameInputRef}
                data-autofocus
                aria-label={t.files.itemName}
                value={renameValue}
                onChange={(event) =>
                  setRenameValue(
                    renameDialog.isDocument
                      ? normalizeDocumentEditableName(event.target.value)
                      : event.target.value,
                  )
                }
                className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[var(--text)] outline-none"
              />
              {renameDialog.isDocument ? (
                <span className="flex shrink-0 items-center border-l border-[var(--separator)] bg-[var(--surface2)] px-3 text-sm text-[var(--text3)]">
                  {PSEUDO_EXTENSION}
                </span>
              ) : null}
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--surface3)]"
              onClick={() => setRenameDialog(null)}
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
              disabled={!renameValue.trim()}
            >
              {t.files.saveName}
            </button>
          </div>
        </form>
      </Dialog>
    ) : null;

  const renderDeleteDialog = () =>
    deleteDialog ? (
      <Dialog
        labelledBy="delete-dialog-title"
        onClose={() => setDeleteDialog(null)}
        className={`${DIALOG_CARD_CLASS} max-w-md rounded-xl`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--red)]">{t.files.explorer}</p>
        <h2
          id="delete-dialog-title"
          className="mt-2 text-xl font-semibold text-[var(--text)]"
        >
          {t.files.confirmDelete}
        </h2>
        <p className="mt-3 text-sm text-[var(--text2)]">{deleteDialog.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--surface3)]"
            onClick={() => setDeleteDialog(null)}
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--red)] px-3 py-1.5 text-sm font-semibold text-[var(--on-red)]"
            onClick={confirmDelete}
          >
            {t.common.delete}
          </button>
        </div>
      </Dialog>
    ) : null;

  const renderSettingsDialog = () =>
    showSettingsPanel ? (
      <Dialog
        labelledBy="settings-dialog-title"
        onClose={() => setShowSettingsPanel(false)}
        className={`${DIALOG_CARD_CLASS} max-w-lg rounded-[var(--radius-3xl)]`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">{t.toolbar.settings}</p>
            <h2
              id="settings-dialog-title"
              className="mt-2 text-2xl font-semibold text-[var(--text)]"
            >
              {t.toolbar.settings}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-3 py-1.5 text-sm text-[var(--text2)] hover:bg-[var(--surface3)]"
            onClick={() => setShowSettingsPanel(false)}
          >
            {t.common.close}
          </button>
        </div>
        <div className="mt-5 space-y-6">
          {renderSyntaxSettings()}
          {renderThemeSettings()}
          {renderSaveSettings()}
          {renderBetaSettings()}
        </div>
        <div className="mt-6 border-t border-[var(--separator)] pt-4 text-center">
          <p className="text-xs text-[var(--text3)]">
            {t.legal.notice(new Date().getFullYear())}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
            {appLegalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                {link.label}
              </a>
            ))}
            <LocaleSwitcher />
          </div>
        </div>
      </Dialog>
    ) : null;

  const renderStarterPanel = (compact = false) => (
    <div
      className={`flex h-full min-h-0 items-center justify-center px-5 ${
        compact ? "py-8" : "py-12"
      }`}
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--surface)] p-8 shadow-[var(--shadow-xl)]">
        <div className="relative flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)]">
            <Image
              src="/branding/app-icon-128.png"
              alt="Pseudo Build"
              width={44}
              height={44}
              className="h-11 w-11"
            />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-[var(--text)]">
            {t.empty.welcome}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text2)]">
            {t.empty.description}
          </p>
          <div className="mt-7 flex w-full flex-col gap-2.5">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-110"
                  onClick={() => openCreateFileDialog()}
            >
              <FilePlus size={16} />
              {t.files.createNewFile}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--separator)] bg-[var(--surface2)] px-5 text-sm font-medium text-[var(--text2)] transition hover:bg-[var(--surface3)] hover:text-[var(--text)]"
              onClick={() => createFolderInWorkspace()}
            >
              <Folder size={16} />
              {t.files.createFolder}
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  const renderTouchOutputSurface = (title: string, onClose?: () => void) => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--surface)]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--separator)] px-4">
        <span className="text-[13px] font-semibold text-[var(--text2)]">{title}</span>
        <div className="flex-1" />
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text3)] transition hover:bg-[var(--hover)] hover:text-[var(--text2)]"
          aria-label={t.terminal.clearOutput}
          onClick={handleClearTerminal}
        >
          <Trash2 size={16} />
        </button>
        {onClose ? (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text3)] transition hover:bg-[var(--hover)] hover:text-[var(--text2)]"
            aria-label={t.terminal.close(title)}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div
        ref={touchOutputScrollRef}
        data-testid="touch-output-scroll-region"
        role="log"
        aria-live="polite"
        aria-label={title}
        tabIndex={0}
        onScroll={handleOutputScroll}
        className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-2 touch-pan-y"
      >
        <pre className="min-w-full whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.5]">
          {terminalOutput ? (
            <span className="text-[var(--text2)]">{terminalOutput}</span>
          ) : (
            <span className="text-[var(--text3)]">{t.terminal.ready}</span>
          )}
        </pre>
      </div>

      {pendingInput.panelId === terminalPanelId && pendingInput.prompt ? (
        <form
          className="shrink-0 border-t border-[var(--separator)] px-4 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitPendingInput();
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span id="terminal-input-prompt" className="font-mono text-xs text-[var(--green)]">
              {pendingInput.prompt}
            </span>
            <input
              value={pendingInput.text}
              onChange={(event) => setPendingInputText(event.target.value)}
              autoFocus
              aria-label={t.terminal.input}
              aria-describedby="terminal-input-prompt"
              className="h-8 min-w-[140px] flex-1 rounded-lg border border-[var(--separator)] bg-[var(--bg)] px-2 font-mono text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
              placeholder={t.terminal.inputPlaceholder}
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--on-accent)]"
            >
              {t.terminal.send}
            </button>
            <button
              type="button"
              className="rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text2)] transition hover:bg-[var(--hover)]"
              onClick={cancelPendingInput}
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      ) : null}

      {isRunning &&
        runningTerminalPanelId === terminalPanelId &&
        !(pendingInput.panelId === terminalPanelId && pendingInput.prompt) && (
          <div className="shrink-0 border-t border-[var(--separator)] px-4 py-1.5">
            <p className="text-[11px] text-[var(--green)]">{t.terminal.running}</p>
          </div>
        )}
    </div>
  );

  /* ── dialog handlers ── */

  // Sidebar callbacks are memoized so the memoized sidebar skips page renders that don't change the workspace.
  const handleRenameNode = useCallback(
    (nodeId: string) => {
      const node = workspace?.nodes[nodeId];
      if (!node) return;
      const isDocument = node.type === "document";
      setRenameDialog({ nodeId: node.id, currentName: node.name, isDocument });
      setRenameValue(isDocument ? getDocumentEditableName(node.name) : node.name);
    },
    [workspace],
  );

  const handleDeleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (!workspace) return;
      const ids = Array.from(new Set(nodeIds)).filter((id) => !!workspace.nodes[id]);
      if (ids.length === 0) return;
      setDeleteDialog({
        nodeIds: ids,
        message:
          ids.length === 1
            ? t.files.deleteOne(workspace.nodes[ids[0]].name)
            : t.files.deleteMany(ids.length),
      });
    },
    [t, workspace],
  );

  const openCreateFileDialog = (options?: { parentId?: string; initialName?: string }) => {
    setCreateFileParentId(options?.parentId);
    setCreateFileName(getDocumentEditableName(options?.initialName ?? "main.pseudo"));
    setShowCreateFileDialog(true);
  };

  const handleCreateDocumentFromSidebar = useCallback((parentId?: string) => {
    setCreateFileParentId(parentId);
    setCreateFileName(getDocumentEditableName("Untitled.pseudo"));
    setShowCreateFileDialog(true);
  }, []);

  const closeCreateFileDialog = () => {
    setShowCreateFileDialog(false);
    setCreateFileName("main");
    setCreateFileParentId(undefined);
  };

  const submitCreateFile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const baseName = normalizeDocumentEditableName(createFileName);
    if (!baseName) return;
    const name = `${baseName}${PSEUDO_EXTENSION}`;
    createDocumentInWorkspace(createFileParentId, { name });
    closeCreateFileDialog();
  };

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!renameDialog) return;
    const name = getSubmittedRenameValue(renameDialog, renameValue);
    if (!name) return;
    if (renameNodeInWorkspace(renameDialog.nodeId, name)) {
      setRenameDialog(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteDialog) return;
    if (deleteNodesInWorkspace(deleteDialog.nodeIds)) {
      setDeleteDialog(null);
    }
  };

  /* ── tab drag-and-drop ── */

  const handleTabDrop = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    if (!editorPanelId) return;
    const payload = event.dataTransfer.getData("application/x-editor-tab");
    if (!payload) return;
    event.preventDefault();
    try {
      const parsed = JSON.parse(payload) as { panelId: string; documentId: string };
      if (typeof parsed.panelId === "string" && typeof parsed.documentId === "string") {
        moveEditorDocumentTab(parsed.panelId, editorPanelId, parsed.documentId, targetIndex);
      }
    } catch {
      /* ignore malformed drag data */
    }
  };

  /* ── loading state ── */

  if (!workspace) {
    return (
      <main className="min-h-dvh bg-[var(--bg)]">
        <div className="flex min-h-dvh items-center justify-center px-4 py-10">
          <section className="w-full max-w-lg rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
          {t.loading.workspaceEyebrow}
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--text)]">
          {t.loading.workspace}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text2)]">
          {t.loading.preparing}
            </p>
          </section>
        </div>
      </main>
    );
  }

  /* ── render ── */

  if (touchLayout) {
    const phoneTabItems = [
      { key: "editor" as const, label: t.touchTabs.editor, icon: Code },
      { key: "files" as const, label: t.touchTabs.files, icon: Folder },
      { key: "output" as const, label: t.touchTabs.output, icon: Terminal },
      { key: "settings" as const, label: t.touchTabs.settings, icon: Settings },
    ];

    return (
      <main
        className="w-screen overflow-hidden bg-[var(--bg)]"
        style={{ height: "100dvh", minHeight: "100svh" }}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden" style={touchSafeAreaStyle}>
          {(saveError || appNotice) && (
            <div className="shrink-0 border-b border-[var(--separator)] bg-[var(--surface)] px-4 py-1.5">
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                {saveError && <span className="text-[var(--red)]">{saveError}</span>}
                {appNotice && (
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        appNotice.tone === "error" ? "text-[var(--red)]" : "text-[var(--text2)]"
                      }
                    >
                      {appNotice.message}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-2.5 py-1 text-[11px] text-[var(--text2)] transition hover:bg-[var(--surface3)]"
                      onClick={dismissNotice}
                    >
                {t.common.dismiss}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {isTouchTablet ? (
            <>
              <header className="flex h-[52px] shrink-0 items-center bg-[var(--titlebar)] px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)] transition hover:bg-[var(--hover)]"
                    aria-label={touchSidebarVisible ? t.toolbar.hideSidebar : t.toolbar.showSidebar}
                    onClick={() => setTouchSidebarVisible((current) => !current)}
                  >
                    <PanelLeft size={22} />
                  </button>
                  <div className="h-6 w-px bg-[var(--separator)]" />
                  <FileCode size={18} className="text-[var(--accent)]" />
                  <span className="truncate text-[17px] font-semibold text-[var(--text)]">
                    {currentDocument?.name ?? t.files.noFileSelected}
                  </span>
                </div>

                <div className="flex flex-1 items-center justify-center">
                  <p className="text-[13px] font-medium text-[var(--text2)]">{t.toolbar.editor}</p>
                </div>

                <div className="flex flex-1 items-center justify-end gap-3">
                  {renderSaveControl()}
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)] transition hover:bg-[var(--hover)]"
                    aria-label={t.toolbar.openSettings}
                    onClick={() => setShowSettingsPanel(true)}
                  >
                    <Settings size={22} />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--green)] text-[var(--on-green)] transition hover:brightness-110 disabled:opacity-50"
                    aria-label={isRunning ? t.toolbar.running : t.toolbar.run}
                    onPointerEnter={preloadRunRuntime}
                    onFocus={preloadRunRuntime}
                    onClick={handleTouchRun}
                    disabled={isRunning || !currentDocument}
                  >
                    <Play size={22} fill="currentColor" />
                  </button>
                  {renderAccountControl(true)}
                </div>
              </header>

              <div className="h-px shrink-0 bg-[var(--separator)]" />

              <div className="flex min-h-0 flex-1">
                {touchSidebarVisible ? (
                  <>
                    <div
                      className="min-h-0 shrink-0 overflow-hidden bg-[var(--sidebar)]"
                      style={{ width: sidebarWidth }}
                    >
                      <WorkspaceSidebar
                        workspace={workspace}
                        onSelectDocument={handleTouchDocumentSelect}
                        onToggleFolder={toggleFolder}
                        onExpandFolder={expandFolder}
                        onCreateFolder={createFolderInWorkspace}
                        onCreateDocument={handleCreateDocumentFromSidebar}
                        onRenameNode={handleRenameNode}
                        onDeleteNodes={handleDeleteNodes}
                        onMoveNodes={moveNodesInWorkspace}
                      />
                    </div>
                    <div
                      role="separator"
                      aria-label={t.terminal.resizeSidebar}
                      aria-orientation="vertical"
                      tabIndex={0}
                      className="relative w-3 shrink-0 cursor-col-resize touch-none"
                      onPointerDown={handleSidebarResize}
                      onKeyDown={handleSidebarResizeKeyDown}
                    >
                      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--separator)]" />
                    </div>
                  </>
                ) : null}

                <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg)]">
                  <div className="flex h-8 shrink-0 items-center px-4">
                    <Breadcrumbs path={breadcrumbs} />
                  </div>
                  {practiceBanner}
                  <div className="h-px shrink-0 bg-[var(--separator)]" />

                  <div className="min-h-0 flex-1">
                    {currentDocument ? (
                      <MonacoPseudocodeEditor
                        documentKey={currentDocument.id}
                        value={currentDocument.source}
                        onChange={(value) => handleDocumentSourceChange(currentDocument.id, value)}
                        diagnostics={
                          activeDocument?.id === currentDocument.id ? compileDiagnostics : EMPTY_DIAGNOSTICS
                        }
                        theme={resolvedTheme}
                        syntaxId={syntaxId}
                      />
                    ) : (
                      renderStarterPanel(true)
                    )}
                  </div>

                  <div className="h-px shrink-0 bg-[var(--separator)]" />

                  {touchOutputVisible ? (
                    <>
                      <div
                        role="separator"
                        aria-label={t.terminal.resizeOutput}
                        aria-orientation="horizontal"
                        tabIndex={0}
                        className="relative h-3 shrink-0 cursor-row-resize touch-none"
                        onPointerDown={handleTerminalResize}
                        onKeyDown={handleTerminalResizeKeyDown}
                      >
                        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--separator)]" />
                      </div>
                      <div
                        className="min-h-0 shrink-0 overflow-hidden"
                        style={{
                          height: clampNumber(
                            terminalHeight,
                            MIN_TERMINAL_HEIGHT,
                            maxTerminalHeight,
                          ),
                        }}
                      >
                        {renderTouchOutputSurface(t.terminal.output, () => setTouchOutputVisible(false))}
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="flex h-9 shrink-0 items-center gap-2 px-4 text-left text-[var(--text2)] transition hover:bg-[var(--surface)]"
                      onClick={() => setTouchOutputVisible(true)}
                    >
                      <span className="text-[13px] font-semibold">{t.terminal.output}</span>
                      <div className="flex-1" />
                      <ChevronUp size={16} className="rotate-180 text-[var(--text3)]" />
                    </button>
                  )}
                </section>
              </div>
            </>
          ) : (
            <>
              <header className="flex h-12 shrink-0 items-center gap-3 bg-[var(--titlebar)] px-4">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)] transition hover:bg-[var(--hover)]"
                  aria-label={touchTab === "editor" ? t.toolbar.openFiles : t.toolbar.backToEditor}
                  onClick={handlePhoneBack}
                >
                  <ChevronLeft size={24} />
                </button>
                <span className="truncate text-[17px] font-semibold text-[var(--text)]">
                  {currentDocument?.name ?? t.files.createAFile}
                </span>
                <div className="flex-1" />
                {renderSaveControl()}
                <button
                  type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)] transition hover:bg-[var(--hover)]"
            aria-label={t.toolbar.openManual}
            onClick={openManualPage}
          >
            <Ellipsis size={22} />
          </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--green)] text-[var(--on-green)] transition hover:brightness-110 disabled:opacity-50"
                  aria-label={isRunning ? t.toolbar.running : t.toolbar.run}
                  onPointerEnter={preloadRunRuntime}
                  onFocus={preloadRunRuntime}
                  onClick={handleTouchRun}
                  disabled={isRunning || !currentDocument}
                >
                  <Play size={22} fill="currentColor" />
                </button>
                {renderAccountControl(true)}
              </header>

              <div className="h-px shrink-0 bg-[var(--separator)]" />

              <section className="flex min-h-0 flex-1 flex-col bg-[var(--bg)]">
                {practiceBanner}
                <div className="min-h-0 flex-1">
                  {touchTab === "editor" ? (
                    currentDocument ? (
                      <MonacoPseudocodeEditor
                        documentKey={currentDocument.id}
                        value={currentDocument.source}
                        onChange={(value) => handleDocumentSourceChange(currentDocument.id, value)}
                        diagnostics={
                          activeDocument?.id === currentDocument.id ? compileDiagnostics : EMPTY_DIAGNOSTICS
                        }
                        theme={resolvedTheme}
                        syntaxId={syntaxId}
                      />
                    ) : (
                      renderStarterPanel(true)
                    )
                  ) : null}

                  {touchTab === "files" ? (
                    <WorkspaceSidebar
                      workspace={workspace}
                      onSelectDocument={handleTouchDocumentSelect}
                      onToggleFolder={toggleFolder}
                      onExpandFolder={expandFolder}
                      onCreateFolder={createFolderInWorkspace}
                      onCreateDocument={handleCreateDocumentFromSidebar}
                      onRenameNode={handleRenameNode}
                      onDeleteNodes={handleDeleteNodes}
                      onMoveNodes={moveNodesInWorkspace}
                    />
                  ) : null}

                  {touchTab === "output" ? renderTouchOutputSurface(t.terminal.output) : null}

                  {touchTab === "settings" ? (
                    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] px-6 py-8">
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--text3)]">
                        {t.settings.heading}
                      </p>
                      <h2 className="mt-3 text-[28px] font-semibold text-[var(--text)]">
                        Pseudo Build
                      </h2>
                      <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--text2)]">
                        {t.settings.touchDescription}
                      </p>
                      {renderSyntaxSettings(true)}
                      {renderThemeSettings(true)}
                      {renderSaveSettings(true)}
                      {renderBetaSettings(true)}
                      <button
                        type="button"
                        className="mt-6 inline-flex h-10 items-center justify-center self-start rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-110"
                        onClick={openManualPage}
                      >
                        {t.toolbar.openManual}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div
                  className="shrink-0 bg-[var(--bg)] px-4 pt-3"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 21px)" }}
                >
                  <div className="flex h-[50px] items-center rounded-[var(--radius-3xl)] border border-[var(--separator)] bg-[var(--surface)] p-1">
                    {phoneTabItems.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = touchTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          className={`flex h-full flex-1 flex-col items-center justify-center gap-[3px] rounded-[var(--radius-2xl)] transition ${
                            isActive
                              ? "bg-[var(--accent)] text-[var(--on-accent)]"
                              : "text-[var(--text3)]"
                          }`}
                          aria-label={tab.label}
                          onClick={() => setTouchTab(tab.key)}
                        >
                          <Icon size={18} />
                          <span className="text-[9px] font-semibold tracking-[0.5px]">
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </>
          )}

          {renderRenameDialog()}
          {renderDeleteDialog()}
          {renderSettingsDialog()}
          {renderSignInPromptDialog()}
          {renderCreateFileDialog()}
          {renderFlowchartPromptDialog()}
          {renderManualDialog()}
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* ════════════ Title Bar ════════════ */}
      <header
        className={`flex h-[52px] shrink-0 items-center px-4 bg-[var(--titlebar)] ${
          isDesktopShell ? "app-drag-region" : ""
        }`}
      >
        {/* Spacer for native traffic lights (desktop) / brand label (web) */}
        <div className={`flex items-center gap-2 ${isDesktopShell ? "w-[80px]" : "w-auto"}`}>
          {isDesktopShell ? null : (
            <Link
              href="/"
              className="flex items-center gap-2 transition hover:opacity-80"
              aria-label={t.toolbar.home}
            >
              <BrandMark size={20} />
              <span className="text-xs font-semibold tracking-[0.12em] text-[var(--text2)]">
                Pseudo Build
              </span>
            </Link>
          )}
        </div>

        <div className="flex-1" />
        <p className="text-[13px] font-medium text-[var(--text2)]">{t.toolbar.editor}</p>
        <div className="flex-1" />

        {/* Toolbar */}
        <div className="app-no-drag flex items-center gap-1.5">
          {renderSaveControl()}
          <Link
            href={localePath(locale, "/practice")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text3)] transition hover:text-[var(--text2)]"
            aria-label={t.toolbar.openPractice}
            title={t.toolbar.practice}
          >
            <Shuffle size={18} />
          </Link>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text3)] transition hover:text-[var(--text2)]"
            aria-label={t.toolbar.manual}
            onClick={openManualPage}
          >
            <BookOpen size={18} />
          </button>
          {flowchartModeEnabled ? (
            <button
              type="button"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                flowchartVisible
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "text-[var(--text3)] hover:text-[var(--text2)]"
              }`}
              aria-label={flowchartVisible ? t.toolbar.switchToCode : t.toolbar.switchToFlowchart}
              title={flowchartVisible ? t.toolbar.switchToCode : t.toolbar.switchToFlowchart}
              onClick={handleToggleFlowchart}
            >
              <GitBranch size={18} />
            </button>
          ) : null}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text3)] transition hover:text-[var(--text2)]"
            aria-label={t.toolbar.openSettings}
            title={t.toolbar.settings}
            onClick={() => setShowSettingsPanel(true)}
          >
            <Settings size={18} />
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--green)] text-[var(--on-green)] transition hover:brightness-110 disabled:opacity-50"
            aria-label={isRunning ? t.toolbar.running : t.toolbar.run}
            onPointerEnter={preloadRunRuntime}
            onFocus={preloadRunRuntime}
            onClick={handleRun}
            disabled={isRunning || !currentDocument}
          >
            <Play size={18} fill="currentColor" />
          </button>
          {renderAccountControl()}
        </div>
      </header>

      {/* ════════════ Title Divider ════════════ */}
      <div className="h-px shrink-0 bg-[var(--separator)]" />

      {/* ════════════ Notice Bar ════════════ */}
      {(saveError || appNotice) && (
        <div className="shrink-0 border-b border-[var(--separator)] bg-[var(--surface)] px-4 py-1.5">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {saveError && <span className="text-[var(--red)]">{saveError}</span>}
            {appNotice && (
              <div className="flex items-center gap-3">
                <span
                  className={
                    appNotice.tone === "error" ? "text-[var(--red)]" : "text-[var(--text2)]"
                  }
                >
                  {appNotice.message}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--separator)] bg-[var(--surface2)] px-2.5 py-1 text-[11px] text-[var(--text2)] transition hover:bg-[var(--surface3)]"
                  onClick={dismissNotice}
                >
                {t.common.dismiss}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ Body ════════════ */}
      <div className="flex min-h-0 flex-1">
        {/* ──── Sidebar ──── */}
        <div className="shrink-0 overflow-hidden" style={{ width: sidebarWidth }}>
          <WorkspaceSidebar
            workspace={workspace}
            onSelectDocument={selectDocument}
            onToggleFolder={toggleFolder}
            onExpandFolder={expandFolder}
            onCreateFolder={createFolderInWorkspace}
            onCreateDocument={handleCreateDocumentFromSidebar}
            onRenameNode={handleRenameNode}
            onDeleteNodes={handleDeleteNodes}
            onMoveNodes={moveNodesInWorkspace}
          />
        </div>

        {/* ──── Sidebar Resize Handle ──── */}
        <div
          role="separator"
          aria-label={t.terminal.resizeSidebar}
          aria-orientation="vertical"
          tabIndex={0}
          className="group relative w-2 shrink-0 cursor-col-resize touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
          onPointerDown={handleSidebarResize}
          onKeyDown={handleSidebarResizeKeyDown}
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--separator)] transition-colors group-hover:bg-[var(--accent)]" />
        </div>

        {/* ──── Editor Area ──── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {flowchartModeEnabled ? (
              <div
                inert={!flowchartVisible}
                className={`absolute inset-0 z-20 min-h-0 min-w-0 transition-transform duration-500 ease-in-out ${
                  flowchartVisible ? "translate-x-0" : "translate-x-full pointer-events-none"
                }`}
              >
                <FlowchartEditor
                  source={flowchartSource}
                  isVisible={flowchartVisible}
                  syntaxId={syntaxId}
                  onCodeChange={handleFlowchartCodeChange}
                  onGenerateCode={handleGenerateCode}
                />
              </div>
            ) : null}

            {/* Code View */}
            <div
              inert={flowchartVisible}
              className={`absolute inset-0 flex min-h-0 min-w-0 flex-col transition-transform duration-500 ease-in-out ${
                flowchartVisible ? "-translate-x-full pointer-events-none" : "translate-x-0"
              }`}
            >
              {/* Tab Bar */}
              {editorPanel && (
                <div
                  role="tablist"
                  aria-label={t.toolbar.editor}
                  className="flex h-[38px] shrink-0 items-center gap-0.5 overflow-x-auto px-2"
                >
                  {editorPanel.openDocumentIds.map((documentId, index) => {
                    const doc = workspace.nodes[documentId];
                    if (!doc || doc.type !== "document") return null;
                    const isActive = documentId === editorPanel.activeDocumentId;
                    return (
                      <div
                        key={documentId}
                        draggable
                        role="presentation"
                        className={`group flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg pr-2 text-[12px] font-medium transition ${
                          isActive
                            ? "bg-[var(--surface2)] text-[var(--text)]"
                            : "text-[var(--text3)] hover:bg-[var(--hover)] hover:text-[var(--text2)]"
                        }`}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(
                            "application/x-editor-tab",
                            JSON.stringify({ panelId: editorPanel.id, documentId }),
                          );
                          event.dataTransfer.setData("text/plain", doc.name);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleTabDrop(event, index)}
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className="flex h-full min-w-0 items-center gap-1.5 rounded-lg pl-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
                          onClick={() => setEditorActiveDocument(editorPanel.id, documentId)}
                        >
                          <FileCode
                            size={14}
                            className={isActive ? "text-[var(--accent)]" : "text-[var(--text3)]"}
                          />
                          <span className="truncate">{doc.name}</span>
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-0.5 text-[var(--text3)] opacity-0 hover:bg-[var(--hover)] hover:text-[var(--text)] focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={t.files.closeDocument(doc.name)}
                          onClick={(event) => {
                            event.stopPropagation();
                            closeEditorDocumentTab(editorPanel.id, documentId);
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                  {/* Drop target at end of tab bar */}
                  <div
                    className="h-[38px] min-w-[32px] flex-1"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleTabDrop(event, editorPanel.openDocumentIds.length)}
                  />
                </div>
              )}

              {/* Breadcrumb */}
              <div className="flex h-7 shrink-0 items-center px-4">
                <Breadcrumbs path={breadcrumbs} />
              </div>
              {practiceBanner}

              {/* Editor Separator */}
              <div className="h-px shrink-0 bg-[var(--separator)]" />

              {/* Editor Content */}
              <div className="min-h-0 flex-1">
                {editorActiveDoc ? (
                  <MonacoPseudocodeEditor
                    documentKey={editorActiveDoc.id}
                    value={editorActiveDoc.source}
                    onChange={(value) => handleDocumentSourceChange(editorActiveDoc.id, value)}
                    diagnostics={
                      activeDocument?.id === editorActiveDoc.id ? compileDiagnostics : EMPTY_DIAGNOSTICS
                    }
                    theme={resolvedTheme}
                    syntaxId={syntaxId}
                  />
                ) : (
                  renderStarterPanel()
                )}
              </div>
            </div>
          </div>

          {/* Terminal Resize Handle */}
          {showTerminal && (
            <div
              role="separator"
              aria-label={t.terminal.resizeTerminal}
              aria-orientation="horizontal"
              tabIndex={0}
              className="group relative h-2 shrink-0 cursor-row-resize touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
              onPointerDown={handleTerminalResize}
              onKeyDown={handleTerminalResizeKeyDown}
            >
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--separator)] transition-colors group-hover:bg-[var(--accent)]" />
            </div>
          )}

          {/* Terminal Panel */}
          {showTerminal && (
            <div
              className="flex shrink-0 flex-col overflow-hidden bg-[var(--surface)]"
              style={{
                height: clampNumber(
                  terminalHeight,
                  MIN_TERMINAL_HEIGHT,
                  maxTerminalHeight,
                ),
              }}
            >
              {/* Terminal Header */}
              <div className="flex h-8 shrink-0 items-center gap-2 px-3">
                <span className="text-[11px] font-semibold tracking-[0.5px] text-[var(--text2)]">
                    {t.terminal.terminal}
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                      className="flex items-center justify-center rounded-lg text-[var(--text3)] transition hover:text-[var(--text2)]"
                      aria-label={t.terminal.closeTerminal}
                  onClick={() => setShowTerminal(false)}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Terminal Content */}
              <div
                ref={desktopTerminalScrollRef}
                data-testid="terminal-scroll-region"
                role="log"
                aria-live="polite"
                aria-label={t.terminal.terminal}
                tabIndex={0}
                onScroll={handleOutputScroll}
                className="min-h-0 flex-1 overflow-auto overscroll-contain px-3 py-2 touch-pan-y"
              >
                <pre className="min-w-full whitespace-pre-wrap break-words font-mono text-xs leading-5">
                  {terminalOutput ? (
                    <>
                      <span className="text-[var(--green)]">$ </span>
                      <span className="text-[var(--text2)]">{terminalOutput}</span>
                    </>
                  ) : (
                    <span className="text-[var(--text3)]">{t.terminal.ready}</span>
                  )}
                </pre>
              </div>

              {/* Pending Input */}
              {pendingInput.panelId === terminalPanelId && pendingInput.prompt && (
                <form
                  className="shrink-0 border-t border-[var(--separator)] px-3 py-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitPendingInput();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span id="terminal-input-prompt" className="font-mono text-xs text-[var(--green)]">
                      {pendingInput.prompt}
                    </span>
                    <input
                      value={pendingInput.text}
                      onChange={(event) => setPendingInputText(event.target.value)}
                      autoFocus
                      aria-label={t.terminal.input}
                      aria-describedby="terminal-input-prompt"
                      className="h-7 flex-1 rounded-lg border border-[var(--separator)] bg-[var(--bg)] px-2 font-mono text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                      placeholder={t.terminal.inputPlaceholder}
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-medium text-[var(--on-accent)]"
                    >
                      {t.terminal.send}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1 text-[11px] text-[var(--text2)] hover:bg-[var(--hover)]"
                      onClick={cancelPendingInput}
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </form>
              )}

              {/* Running indicator */}
              {isRunning &&
                runningTerminalPanelId === terminalPanelId &&
                !(pendingInput.panelId === terminalPanelId && pendingInput.prompt) && (
                  <div className="shrink-0 border-t border-[var(--separator)] px-3 py-1.5">
                    <p className="text-[11px] text-[var(--green)]">{t.terminal.running}</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {renderSettingsDialog()}
      {renderRenameDialog()}
      {renderDeleteDialog()}
      {renderSignInPromptDialog()}
      {renderCreateFileDialog()}
      {renderFlowchartPromptDialog()}
      {renderManualDialog()}
    </main>
  );
}
