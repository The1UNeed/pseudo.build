import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContext, useState } from "react";
import { createDefaultWorkspace, createDocument, createEmptyWorkspace, createFolder, getChildNodes, setActiveDocument, type WorkspaceState } from "@pseudobuild/workspace";
import type { WorkspacePersistenceMode } from "@/lib/platform";
import type { CloudSaveResult, LoadedWorkspace, LocalWorkspaceRecord } from "@/lib/storage";
import { editorEn } from "@/i18n/messages/editor.en";

const { loadWorkspaceMock, writeLocalWorkspaceMock, saveWorkspaceToCloudMock, compilePseudocodeMock, runMock, authState } = vi.hoisted(() => ({
  loadWorkspaceMock: vi.fn<(_sampleSource: string, options?: { mode?: WorkspacePersistenceMode }) => Promise<LoadedWorkspace>>(),
  writeLocalWorkspaceMock: vi.fn<(cacheKey: string, record: LocalWorkspaceRecord) => Promise<void>>(),
  saveWorkspaceToCloudMock: vi.fn<(state: WorkspaceState, baseRevision: number, options?: object) => Promise<CloudSaveResult>>(),
  compilePseudocodeMock: vi.fn(),
  runMock: vi.fn(),
  authState: {
    user: null as null | {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    },
    loading: false,
  },
}));
const localStore = new Map<string, string>();
const FLOWCHART_MODE_STORAGE_KEY = "pseudocode-compiler-flowchart-mode-enabled";
const UserButtonContext = createContext({ openSettings: () => {} });
const UserButtonProfilePageContext = createContext(false);

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-components", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  Show: ({ children, when }: { children: React.ReactNode; when: "signed-in" | "signed-out" }) => {
    const signedIn = Boolean(authState.user);
    return (when === "signed-in" && signedIn) || (when === "signed-out" && !signedIn)
      ? children
      : null;
  },
  isCloudAuthConfigured: () => true,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: Object.assign(
    ({ children }: { children?: React.ReactNode }) => {
      const [settingsOpen, setSettingsOpen] = useState(false);

      return (
        <UserButtonContext.Provider value={{ openSettings: () => setSettingsOpen(true) }}>
          <UserButtonProfilePageContext.Provider value={false}>
            <button type="button" aria-label="User profile" />
            {children}
          </UserButtonProfilePageContext.Provider>
          {settingsOpen ? (
            <div role="dialog" aria-label="Settings">
              <UserButtonProfilePageContext.Provider value={true}>
                {children}
              </UserButtonProfilePageContext.Provider>
            </div>
          ) : null}
        </UserButtonContext.Provider>
      );
    },
    {
      Action: ({
        label,
        labelIcon,
        onClick,
      }: {
        label: string;
        labelIcon?: React.ReactNode;
        onClick?: () => void;
      }) =>
        label === "manageAccount" ? (
          <UserButtonContext.Consumer>
            {({ openSettings }) => (
              <button type="button" onClick={openSettings}>
                Settings
              </button>
            )}
          </UserButtonContext.Consumer>
        ) : onClick ? (
          <button type="button" onClick={onClick}>
            {labelIcon}
            {label}
          </button>
        ) : null,
      MenuItems: ({ children }: { children: React.ReactNode }) => (
        <UserButtonProfilePageContext.Consumer>
          {(renderProfilePage) => (renderProfilePage ? null : <>{children}</>)}
        </UserButtonProfilePageContext.Consumer>
      ),
      UserProfilePage: ({ children }: { children: React.ReactNode }) => (
        <UserButtonProfilePageContext.Consumer>
          {(renderProfilePage) => (renderProfilePage ? <>{children}</> : null)}
        </UserButtonProfilePageContext.Consumer>
      ),
    },
  ),
  useAuth: () => ({
    getToken: async () => "session-token",
    isLoaded: !authState.loading,
    isSignedIn: Boolean(authState.user),
    userId: authState.user?.id ?? null,
  }),
}));

vi.mock("@/lib/storage", () => ({
  loadWorkspace: loadWorkspaceMock,
  writeLocalWorkspace: writeLocalWorkspaceMock,
  saveWorkspaceToCloud: saveWorkspaceToCloudMock,
  fetchCloudWorkspace: vi.fn(async () => ({ ok: false })),
  mergeConflict: (local: WorkspaceState) => local,
}));

/** Makes loadWorkspace resolve to `workspace`, with the cache key the real loader uses for each mode. */
function mockLoadedWorkspace(workspace: WorkspaceState) {
  loadWorkspaceMock.mockImplementation(async (_sampleSource, options) => ({
    workspace,
    cacheKey: options?.mode === "memory" ? null : options?.mode === "cloud" ? "user:user_123" : "local",
    revision: 0,
    dirty: false,
    issue: null,
  }));
}

/** The workspace most recently written to this device's storage. */
function lastLocallySavedWorkspace(): WorkspaceState {
  const record = writeLocalWorkspaceMock.mock.lastCall?.[1];
  if (!record) {
    throw new Error("Nothing was written locally yet.");
  }
  return record.workspace;
}

vi.mock("@/compiler", () => ({
  compilePseudocode: compilePseudocodeMock,
}));

vi.mock("@/runtime/executeRuntime", () => ({
  pseudocodeRuntimeRunner: {
    run: runMock,
  },
}));

vi.mock("@/app/components/MonacoPseudocodeEditor", () => ({
  MonacoPseudocodeEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Mock editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("@/app/components/flowchart/FlowchartEditor", () => ({
  default: ({
    source,
    onCodeChange,
    onGenerateCode,
  }: {
    source?: string;
    onCodeChange?: (code: string) => void;
    onGenerateCode?: (code: string) => void;
  }) => (
    <div>
      <output aria-label="Mock flowchart source">{source ?? ""}</output>
      <button type="button" onClick={() => onCodeChange?.('OUTPUT "Live from blocks"')}>
        Mock Live Flowchart
      </button>
      <button type="button" onClick={() => onGenerateCode?.('OUTPUT "Generated from blocks"')}>
        Mock Generate Flowchart
      </button>
    </div>
  ),
}));

import HomePage from "@/app/[locale]/app/page";

// jsdom has HTMLDialogElement but no showModal().
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
}

function createWorkspaceFixture(activeDocumentId = "doc-main") {
  let workspace = createDefaultWorkspace({
    sampleSource: 'OUTPUT "Main"',
    now: "2026-03-15T00:00:00.000Z",
  });
  workspace = createDocument(workspace, {
    parentId: workspace.rootFolderId,
    name: "Helper",
    source: 'OUTPUT "Helper"',
    id: "doc-helper",
    now: "2026-03-15T00:01:00.000Z",
  });
  return setActiveDocument(workspace, activeDocumentId);
}

function setDesktopRuntime() {
  Object.defineProperty(window as Window & { electron?: { isDesktop?: boolean } }, "electron", {
    configurable: true,
    value: { isDesktop: true },
  });
}

function setDeployedBrowserRuntime() {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL("https://pseudocode-compiler-preview.vercel.app/"),
  });
}

function setLocalBrowserRuntime() {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL("http://localhost:3000/"),
  });
}

function createDataTransferMock() {
  const store = new Map<string, string>();

  return {
    effectAllowed: "all",
    dropEffect: "move",
    setData: (type: string, value: string) => {
      store.set(type, value);
    },
    getData: (type: string) => store.get(type) ?? "",
  };
}

function mockRowRect(element: Element, top = 0, height = 40) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: 0,
      y: top,
      top,
      left: 0,
      bottom: top + height,
      right: 320,
      width: 320,
      height,
      toJSON: () => "",
    }),
  });
}

function getExplorerButton(name: string): HTMLElement {
  return screen.getByRole("treeitem", { name });
}

function getExplorerRow(name: string): HTMLElement {
  return getExplorerButton(name);
}

function getExplorerHeaderButton(name: string): HTMLElement {
  const match = screen
    .getAllByRole("button", { name })
    .find((button) => !button.closest('[data-workspace-row="true"]'));
  if (!match) {
    throw new Error(`Explorer header button "${name}" not found.`);
  }
  return match;
}

function enableFlowchartModeBeta() {
  localStore.set(FLOWCHART_MODE_STORAGE_KEY, "true");
}

describe("HomePage workspace flow", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    setDeployedBrowserRuntime();
    loadWorkspaceMock.mockReset();
    writeLocalWorkspaceMock.mockReset();
    writeLocalWorkspaceMock.mockResolvedValue();
    saveWorkspaceToCloudMock.mockReset();
    saveWorkspaceToCloudMock.mockResolvedValue({ ok: true, revision: 1 });
    compilePseudocodeMock.mockReset();
    runMock.mockReset();
    authState.user = {
      id: "user_123",
      email: "alex@example.com",
      firstName: "Alex",
      lastName: null,
    };
    authState.loading = false;
    Object.defineProperty(window as Window & { electron?: { isDesktop?: boolean } }, "electron", {
      configurable: true,
      value: undefined,
    });
    localStore.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => localStore.get(key) ?? null,
        setItem: (key: string, value: string) => {
          localStore.set(key, value);
        },
        removeItem: (key: string) => {
          localStore.delete(key);
        },
        clear: () => {
          localStore.clear();
        },
      },
    });
  });

  it("opens a practice starter file from the query string", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("https://pseudocode-compiler-preview.vercel.app/app?practice=pass-or-fail"),
    });
    mockLoadedWorkspace(createEmptyWorkspace("2026-03-15T00:00:00.000Z"));
    render(<HomePage />);

    expect(await screen.findByRole("treeitem", { name: "practice.q.pass-or-fail.pseudo" })).toBeInTheDocument();
    expect((screen.getByRole("textbox", { name: "Mock editor" }) as HTMLTextAreaElement).value).toContain(
      "DECLARE Mark : INTEGER",
    );
    expect(screen.getByText("Pass or fail from a mark")).toBeInTheDocument();
  });

  it("opens documents and updates the editor content", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    expect(await screen.findByRole("textbox", { name: "Mock editor" })).toHaveValue('OUTPUT "Main"');

    fireEvent.click(getExplorerButton("Helper.pseudo"));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Mock editor" })).toHaveValue('OUTPUT "Helper"');
    });
  });

  it("opens the manual inside the workspace", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    const editor = await screen.findByRole("textbox", { name: "Mock editor" });
    fireEvent.click(screen.getByRole("button", { name: "Manual" }));

    const manualDialog = await screen.findByRole("dialog", { name: "Pseudocode manual" });
    expect(within(manualDialog).getByText("Detailed Pseudocode Guidelines")).toBeInTheDocument();

    fireEvent.click(within(manualDialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Pseudocode manual" })).not.toBeInTheDocument();
    });
    expect(editor).toHaveValue('OUTPUT "Main"');
  });

  it("uses the shared create file dialog from the sidebar while keeping the pseudo extension fixed", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    fireEvent.click(getExplorerHeaderButton("Create File"));
    const createDialog = await screen.findByRole("dialog", { name: "Create New File" });

    const nameInput = within(createDialog).getByLabelText("File name");
    expect(nameInput).toHaveValue("Untitled");
    expect(within(createDialog).getByText(".pseudo")).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Renamed Doc.pseudo" } });
    expect(nameInput).toHaveValue("Renamed Doc");
    fireEvent.click(within(createDialog).getByRole("button", { name: "Create File" }));
    await waitFor(() => {
      expect(getExplorerButton("Renamed Doc.pseudo")).toBeInTheDocument();
    });
    await waitFor(() => {
      const names = Object.values(lastLocallySavedWorkspace().nodes).map((node) => node.name);
      expect(names).toContain("Renamed Doc.pseudo");
    });
  });

  it("creates the first desktop file from the starter dialog and opens the editor", async () => {
    setDesktopRuntime();
    mockLoadedWorkspace(createEmptyWorkspace("2026-03-15T00:00:00.000Z"));
    render(<HomePage />);

    expect(await screen.findByText("Welcome to Pseudo Build")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create New File" }));
    const dialog = await screen.findByRole("dialog", { name: "Create New File" });
    fireEvent.change(within(dialog).getByLabelText("File name"), {
      target: { value: "main.pseudo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create File" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Mock editor" })).toHaveValue("");
    });
  });

  it("live updates the editor when flowchart code changes", async () => {
    enableFlowchartModeBeta();
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    expect(await screen.findByRole("textbox", { name: "Mock editor" })).toHaveValue('OUTPUT "Main"');

    fireEvent.click(screen.getByRole("button", { name: "Switch to flowchart view" }));
    fireEvent.click(screen.getByRole("button", { name: "Mock Live Flowchart" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Mock editor", hidden: true })).toHaveValue(
        'OUTPUT "Live from blocks"',
      );
    });
  });

  it("keeps the flowchart connected to the current pseudocode source", async () => {
    enableFlowchartModeBeta();
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    const editor = await screen.findByRole("textbox", { name: "Mock editor" });

    fireEvent.click(screen.getByRole("button", { name: "Switch to flowchart view" }));
    expect(screen.getByLabelText("Mock flowchart source")).toHaveTextContent('OUTPUT "Main"');

    fireEvent.change(editor, { target: { value: 'OUTPUT "Updated from editor"' } });

    await waitFor(() => {
      expect(screen.getByLabelText("Mock flowchart source")).toHaveTextContent(
        'OUTPUT "Updated from editor"',
      );
    });
  });

  it("keeps the flowchart visible while terminal output appears underneath", async () => {
    enableFlowchartModeBeta();
    mockLoadedWorkspace(createWorkspaceFixture());
    compilePseudocodeMock.mockReturnValue({
      success: true,
      diagnostics: [],
      astJson: "{}",
    });
    runMock.mockResolvedValue({
      success: true,
      stdout: "Hello from flowchart",
      stderr: "",
      diagnostics: [],
      virtualFiles: {},
    });

    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    fireEvent.click(screen.getByRole("button", { name: "Switch to flowchart view" }));
    expect(screen.getByLabelText("Mock flowchart source")).toHaveTextContent('OUTPUT "Main"');

    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Mock flowchart source")).toBeInTheDocument();
      expect(screen.getByText(/Hello from flowchart/)).toBeInTheDocument();
    });
  });

  it("requires enabling Flowchart mode beta from settings before opening it", async () => {
    authState.user = null;
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    await screen.findByRole("textbox", { name: "Mock editor" });

    expect(
      screen.queryByRole("button", { name: "Switch to flowchart view" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));

    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    expect(within(dialog).getByText("Beta features")).toBeInTheDocument();
    expect(within(dialog).getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mock Live Flowchart" })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("switch", { name: "Enable Flowchart mode beta" }));

    expect(localStore.get(FLOWCHART_MODE_STORAGE_KEY)).toBe("true");
    expect(
      screen.getByRole("button", { name: "Switch to flowchart view" }),
    ).toBeInTheDocument();
  });

  it("lets the user pick an exam syntax from settings", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    const syntaxSelect = within(dialog).getByLabelText("Exam syntax");
    expect(syntaxSelect).toHaveValue("cambridge-igcse");

    fireEvent.change(syntaxSelect, { target: { value: "ib-dp" } });

    await waitFor(() => {
      expect(lastLocallySavedWorkspace().syntaxId).toBe("ib-dp");
    });
  });

  it("reorders documents through workspace controls", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    fireEvent.contextMenu(getExplorerButton("Helper.pseudo"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move Up" }));

    await waitFor(() => {
      const savedState = lastLocallySavedWorkspace();
      const order = getChildNodes(savedState, savedState.rootFolderId).map((node) => node.name);
      expect(order.slice(0, 2)).toEqual(["Helper.pseudo", "main.pseudo"]);
    });
  });

  it("opens explorer actions from a touch long press", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    const helperRow = getExplorerRow("Helper.pseudo");

    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(helperRow, {
        pointerType: "touch",
        pointerId: 1,
        clientX: 96,
        clientY: 148,
      });

      await act(async () => {
        vi.advanceTimersByTime(430);
      });

      fireEvent.pointerUp(helperRow, {
        pointerType: "touch",
        pointerId: 1,
        clientX: 96,
        clientY: 148,
      });

      expect(screen.getByRole("menu", { name: "Explorer actions" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("deletes the selected item from the explorer context menu", async () => {
    let workspace = createWorkspaceFixture();
    workspace = createDocument(workspace, {
      parentId: workspace.rootFolderId,
      name: "Third",
      source: 'OUTPUT "Third"',
      id: "doc-third",
      now: "2026-03-15T00:02:00.000Z",
    });
    mockLoadedWorkspace(workspace);
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    fireEvent.contextMenu(getExplorerButton("Helper.pseudo"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(screen.getByText('Delete "Helper.pseudo"?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      const savedState = lastLocallySavedWorkspace();
      expect(Object.values(savedState.nodes).filter((node) => node.type === "document")).toHaveLength(2);
      expect(savedState.nodes["doc-helper"]).toBeUndefined();
      expect(savedState.nodes["doc-third"]).toBeDefined();
    });
  });

  it("closes the delete dialog with Escape and returns focus to the explorer row", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    const helperRow = getExplorerRow("Helper.pseudo");
    act(() => helperRow.focus());
    fireEvent.click(helperRow);
    fireEvent.keyDown(helperRow, { key: "Delete" });

    const dialog = await screen.findByRole("dialog", { name: "Confirm Delete" });
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(helperRow).toHaveFocus();
    expect(getExplorerRow("Helper.pseudo")).toBeInTheDocument();
  });

  it("closes the rename dialog with Escape after opening it from the context menu", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    const helperRow = getExplorerRow("Helper.pseudo");
    fireEvent.contextMenu(helperRow);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));

    const dialog = await screen.findByRole("dialog", { name: "Rename Item" });
    const nameInput = within(dialog).getByRole("textbox", { name: "Item name" });
    expect(nameInput).toHaveFocus();

    fireEvent.keyDown(nameInput, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(helperRow).toHaveFocus();
  });

  it("uses the phone layout on narrow windows regardless of user agent and hides the flowchart switch", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    enableFlowchartModeBeta();
    mockLoadedWorkspace(createWorkspaceFixture());

    try {
      render(<HomePage />);
      await screen.findByRole("textbox", { name: "Mock editor" });

      fireEvent.click(screen.getByRole("button", { name: "SETTINGS" }));
      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.queryByRole("switch", { name: "Enable Flowchart mode beta" })).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });

  it("drags a file into a folder", async () => {
    let workspace = createWorkspaceFixture();
    workspace = createFolder(workspace, {
      parentId: workspace.rootFolderId,
      name: "Archive",
      id: "folder-archive",
      now: "2026-03-15T00:02:00.000Z",
    });
    mockLoadedWorkspace(workspace);
    const { container } = render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    const fileRow = getExplorerRow("main.pseudo");
    const folderRow = getExplorerRow("Archive");

    mockRowRect(folderRow, 0, 40);
    const dataTransfer = createDataTransferMock();

    fireEvent.dragStart(fileRow, { dataTransfer });
    fireEvent.dragOver(folderRow, { dataTransfer, clientY: 20 });
    fireEvent.drop(folderRow, { dataTransfer, clientY: 20 });

    await waitFor(() => {
      const savedState = lastLocallySavedWorkspace();
      expect(savedState.nodes["doc-main"].parentId).toBe("folder-archive");
    });

    container.remove();
  });

  it("drags a folder into another folder", async () => {
    let workspace = createWorkspaceFixture();
    workspace = createFolder(workspace, {
      parentId: workspace.rootFolderId,
      name: "Source",
      id: "folder-source",
      now: "2026-03-15T00:02:00.000Z",
    });
    workspace = createFolder(workspace, {
      parentId: workspace.rootFolderId,
      name: "Target",
      id: "folder-target",
      now: "2026-03-15T00:03:00.000Z",
    });
    mockLoadedWorkspace(workspace);
    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    const sourceRow = getExplorerRow("Source");
    const targetRow = getExplorerRow("Target");

    mockRowRect(targetRow, 0, 40);
    const dataTransfer = createDataTransferMock();

    fireEvent.dragStart(sourceRow, { dataTransfer });
    fireEvent.dragOver(targetRow, { dataTransfer, clientY: 20 });
    fireEvent.drop(targetRow, { dataTransfer, clientY: 20 });

    await waitFor(() => {
      const savedState = lastLocallySavedWorkspace();
      expect(savedState.nodes["folder-source"].parentId).toBe("folder-target");
    });
  });

  it("compiles and runs the active document and clears pending input on switch", async () => {
    const workspace = createWorkspaceFixture("doc-helper");
    mockLoadedWorkspace(workspace);
    compilePseudocodeMock.mockReturnValue({
      success: true,
      diagnostics: [],
      astJson: "{}",
    });
    runMock.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "INPUT requested but no stdin lines remain",
      diagnostics: [],
      virtualFiles: {},
    });

    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Mock editor" })).toHaveValue('OUTPUT "Helper"');
    });

    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(compilePseudocodeMock).toHaveBeenLastCalledWith({
      source: 'OUTPUT "Helper"',
      filename: "Helper.pseudo",
      strict: true,
      syntaxId: "cambridge-igcse",
    });

    expect(await screen.findByLabelText("Terminal input")).toBeInTheDocument();

    fireEvent.click(getExplorerButton("main.pseudo"));
    await waitFor(() => {
      expect(screen.queryByLabelText("Terminal input")).not.toBeInTheDocument();
    });
  });

  it("lets the terminal scroll region keep its position when the user scrolls away from the bottom", async () => {
    mockLoadedWorkspace(createWorkspaceFixture("doc-helper"));
    compilePseudocodeMock.mockReturnValue({
      success: true,
      diagnostics: [],
      astJson: "{}",
    });
    runMock
      .mockResolvedValueOnce({
        success: false,
        stdout: "Line 1\nLine 2\nLine 3",
        stderr: "INPUT requested but no stdin lines remain",
        diagnostics: [],
        virtualFiles: {},
      })
      .mockResolvedValueOnce({
        success: true,
        stdout: "Line 1\nLine 2\nLine 3\nLine 4",
        stderr: "",
        diagnostics: [],
        virtualFiles: {},
      });

    render(<HomePage />);
    await screen.findByRole("textbox", { name: "Mock editor" });

    const scrollRegion = screen.getByTestId("terminal-scroll-region");
    let scrollTop = 0;

    Object.defineProperty(scrollRegion, "scrollHeight", {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(scrollRegion, "clientHeight", {
      configurable: true,
      get: () => 100,
    });
    Object.defineProperty(scrollRegion, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByLabelText("Terminal input")).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollTop).toBe(400);
    });

    act(() => {
      scrollTop = 40;
      fireEvent.scroll(scrollRegion);
    });

    fireEvent.change(screen.getByLabelText("Terminal input"), {
      target: { value: "42" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(runMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/\bLine 4\b/)).toBeInTheDocument();
    });

    expect(scrollTop).toBe(40);
  });

  it("warns before refresh only while workspace changes are pending save", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    const editor = await screen.findByRole("textbox", { name: "Mock editor" });

    vi.useFakeTimers();
    try {
      fireEvent.change(editor, { target: { value: 'OUTPUT "Changed"' } });

      const pendingEvent = new Event("beforeunload", { cancelable: true });
      Object.defineProperty(pendingEvent, "returnValue", {
        configurable: true,
        writable: true,
        value: "",
      });

      expect(window.dispatchEvent(pendingEvent)).toBe(false);
      expect(pendingEvent.defaultPrevented).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(saveWorkspaceToCloudMock).toHaveBeenCalled();

      const savedEvent = new Event("beforeunload", { cancelable: true });
      Object.defineProperty(savedEvent, "returnValue", {
        configurable: true,
        writable: true,
        value: "",
      });

      expect(window.dispatchEvent(savedEvent)).toBe(true);
      expect(savedEvent.defaultPrevented).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets the user set the autosave interval from settings", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    const editor = await screen.findByRole("textbox", { name: "Mock editor" });
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));

    const intervalInput = await screen.findByRole("combobox", {
      name: "Autosave interval minutes",
    });
    expect(intervalInput).toHaveValue("5");

    fireEvent.change(intervalInput, { target: { value: "1" } });
    expect(localStore.get("pseudocode-compiler-autosave-minutes")).toBe("1");

    vi.useFakeTimers();
    try {
      fireEvent.change(editor, { target: { value: 'OUTPUT "One minute"' } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(59_999);
      });
      // Typing reaches this device after about 500 ms; only the cloud upload waits for the interval.
      expect(writeLocalWorkspaceMock).toHaveBeenCalled();
      expect(saveWorkspaceToCloudMock).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(saveWorkspaceToCloudMock).toHaveBeenCalledWith(expect.anything(), 0, expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not warn before refresh when the workspace is still empty", async () => {
    mockLoadedWorkspace(createEmptyWorkspace("2026-03-15T00:00:00.000Z"));
    render(<HomePage />);

    expect(await screen.findByText("Welcome to Pseudo Build")).toBeInTheDocument();

    const event = new Event("beforeunload", { cancelable: true });
    Object.defineProperty(event, "returnValue", {
      configurable: true,
      writable: true,
      value: "",
    });

    expect(window.dispatchEvent(event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("shows Clerk sign-in controls and asks for sign-in before cloud saving", async () => {
    authState.user = null;
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    await screen.findByRole("textbox", { name: "Mock editor" });
    expect(loadWorkspaceMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ mode: "memory" }));
    const signInButton = screen.getByRole("button", { name: "Log In" });
    expect(signInButton).toHaveClass("bg-[var(--accent)]", "text-[var(--on-accent)]");
    expect(screen.queryByText(/Need an account/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save workspace" }));

    const dialog = await screen.findByRole("dialog", { name: "Sign in to save" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Log In" })).toBeInTheDocument();
    expect(writeLocalWorkspaceMock).not.toHaveBeenCalled();
    expect(saveWorkspaceToCloudMock).not.toHaveBeenCalled();
  });

  it("saves locally in the desktop shell without showing browser sign-in controls", async () => {
    authState.user = null;
    setDesktopRuntime();
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    await screen.findByRole("textbox", { name: "Mock editor" });
    expect(loadWorkspaceMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ mode: "local" }));
    expect(screen.queryByRole("button", { name: "Log In" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save workspace" }));

    await waitFor(() => {
      expect(writeLocalWorkspaceMock).toHaveBeenCalledWith("local", expect.objectContaining({ dirty: false }));
    });
    expect(saveWorkspaceToCloudMock).not.toHaveBeenCalled();
  });

  it("saves locally on localhost without showing browser sign-in controls", async () => {
    authState.user = null;
    setLocalBrowserRuntime();
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    await screen.findByRole("textbox", { name: "Mock editor" });
    expect(loadWorkspaceMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ mode: "local" }));
    expect(screen.queryByRole("button", { name: "Log In" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save workspace" }));

    await waitFor(() => {
      expect(writeLocalWorkspaceMock).toHaveBeenCalledWith("local", expect.objectContaining({ dirty: false }));
    });
    expect(saveWorkspaceToCloudMock).not.toHaveBeenCalled();
  });

  it("saves the workspace to cloud when signed in", async () => {
    authState.user = {
      id: "user_123",
      email: "alex@example.com",
      firstName: "Alex",
      lastName: null,
    };
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    await screen.findByRole("textbox", { name: "Mock editor" });
    fireEvent.click(screen.getByRole("button", { name: "Save workspace" }));

    await waitFor(() => {
      expect(saveWorkspaceToCloudMock).toHaveBeenCalledWith(
        expect.anything(),
        0,
        expect.objectContaining({ getAuthToken: expect.any(Function) }),
      );
    });

    expect(screen.getByRole("button", { name: "User profile" })).toBeInTheDocument();
  });

  it("shows a loading save control while autosave is in progress", async () => {
    let resolveSave: ((result: CloudSaveResult) => void) | null = null;
    saveWorkspaceToCloudMock.mockImplementation(
      () =>
        new Promise<CloudSaveResult>((resolve) => {
          resolveSave = resolve;
        }),
    );
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    const editor = await screen.findByRole("textbox", { name: "Mock editor" });

    vi.useFakeTimers();
    try {
      fireEvent.change(editor, { target: { value: 'OUTPUT "Autosaving"' } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(screen.getAllByText("Saving").length).toBeGreaterThan(0);

      await act(async () => {
        resolveSave?.({ ok: true, revision: 1 });
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.queryAllByText("Saving")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows saved after a successful manual save", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    render(<HomePage />);

    await screen.findByRole("textbox", { name: "Mock editor" });
    fireEvent.click(screen.getByRole("button", { name: "Save workspace" }));

    await waitFor(() => {
      expect(screen.getAllByText("Saved").length).toBeGreaterThan(0);
    });
  });

  it("shows an error after a failed manual save", async () => {
    mockLoadedWorkspace(createWorkspaceFixture());
    saveWorkspaceToCloudMock.mockResolvedValue({
      ok: false,
      status: 503,
      code: "upstream_error",
      message: "Convex unavailable",
    });
    render(<HomePage />);

    await screen.findByRole("textbox", { name: "Mock editor" });
    fireEvent.click(screen.getByRole("button", { name: "Save workspace" }));

    await waitFor(() => {
      expect(screen.getAllByText("Save failed").length).toBeGreaterThan(0);
    });
    expect(screen.getByText(editorEn.sync.saveFailedKept)).toBeInTheDocument();
  });
});
