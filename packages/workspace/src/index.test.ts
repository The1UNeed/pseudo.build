import { describe, expect, it } from "vitest";
import {
  createEmptyWorkspace,
  createDefaultWorkspace,
  createDocument,
  createFolder,
  deleteNode,
  deleteNodes,
  DEFAULT_WORKSPACE_PERSISTENCE_LIMITS,
  flattenVisibleNodes,
  getChildNodes,
  getActiveDocument,
  getNodePath,
  importDocuments,
  migratePersistedWorkspace,
  moveNode,
  moveNodes,
  renameNode,
  reorderNode,
  ROOT_FOLDER_ID,
  ROOT_FOLDER_NAME,
  setActiveDocument,
  updateDocumentSource,
  updateVirtualFiles,
  validateWorkspaceForPersistence,
  validateWorkspaceState,
} from "./index";

const SAMPLE_SOURCE = `OUTPUT "Hello"`;
const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("workspace helpers", () => {
  it("uses the explorer root name for the synthetic project root", () => {
    const state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });

    expect(state.nodes[state.rootFolderId].name).toBe(ROOT_FOLDER_NAME);
  });

  it("creates folders and documents with unique sibling names", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE, now: "2026-03-15T00:00:00.000Z" });
    state = createFolder(state, { name: "New Folder", id: "folder-a", now: "2026-03-15T00:01:00.000Z" });
    state = createFolder(state, { name: "New Folder", id: "folder-b", now: "2026-03-15T00:02:00.000Z" });
    state = createDocument(state, { name: "Untitled", id: "doc-2", now: "2026-03-15T00:03:00.000Z" });
    state = createDocument(state, { name: "Untitled", id: "doc-3", now: "2026-03-15T00:04:00.000Z" });

    expect(state.nodes["folder-a"].name).toBe("New Folder");
    expect(state.nodes["folder-b"].name).toBe("New Folder 2");
    expect(state.nodes["doc-2"].name).toBe("Untitled.pseudo");
    expect(state.nodes["doc-3"].name).toBe("Untitled 2.pseudo");
  });

  it("rejects moving a folder into its own descendant", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });
    state = createFolder(state, { name: "Parent", id: "folder-parent" });
    state = createFolder(state, { parentId: "folder-parent", name: "Child", id: "folder-child" });

    expect(() => moveNode(state, "folder-parent", "folder-child")).toThrow(
      "A folder cannot be moved into its own descendant.",
    );
  });

  it("allows deleting the last remaining document", () => {
    const state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });
    const documentId = getActiveDocument(state)?.id;

    expect(documentId).toBeDefined();
    const next = deleteNode(state, documentId!);
    expect(getActiveDocument(next)).toBeNull();
    expect(Object.values(next.nodes).filter((node) => node.type === "document")).toHaveLength(0);
  });

  it("supports move and reorder within folders", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });
    state = createFolder(state, { name: "Archive", id: "folder-archive" });
    state = createDocument(state, { name: "A", id: "doc-a" });
    state = createDocument(state, { name: "B", id: "doc-b" });

    state = moveNode(state, "doc-a", "folder-archive");
    state = reorderNode(state, "doc-b", 0);

    expect(state.nodes["doc-a"].parentId).toBe("folder-archive");
    expect(state.nodes["doc-b"].order).toBe(0);
  });

  it("moves multiple selected nodes together while preserving their order", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });
    state = createDocument(state, { name: "One", id: "doc-one" });
    state = createDocument(state, { name: "Two", id: "doc-two" });
    state = createDocument(state, { name: "Three", id: "doc-three" });

    state = moveNodes(state, ["doc-one", "doc-two"], state.rootFolderId, 2);

    expect(getChildNodes(state, state.rootFolderId).map((node) => node.id).slice(0, 4)).toEqual([
      "doc-main",
      "doc-three",
      "doc-one",
      "doc-two",
    ]);
  });

  it("deletes multiple nodes in one operation", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });
    state = createFolder(state, { name: "Archive", id: "folder-archive" });
    state = createDocument(state, { parentId: "folder-archive", name: "Nested", id: "doc-nested" });
    state = createDocument(state, { name: "Spare", id: "doc-spare" });

    state = deleteNodes(state, ["folder-archive", "doc-nested"]);

    expect(state.nodes["folder-archive"]).toBeUndefined();
    expect(state.nodes["doc-nested"]).toBeUndefined();
    expect(state.nodes["doc-spare"]).toBeDefined();
  });

  it("updates active document and source", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });
    state = createDocument(state, { name: "Test", id: "doc-test", source: "OUTPUT 1" });
    state = setActiveDocument(state, "doc-test");
    state = updateDocumentSource(state, "doc-test", "OUTPUT 2");

    expect(getActiveDocument(state)?.id).toBe("doc-test");
    expect(getActiveDocument(state)?.source).toBe("OUTPUT 2");
  });

  it("supports an empty workspace until a file is created", () => {
    let state = createEmptyWorkspace("2026-03-15T00:00:00.000Z");

    expect(getActiveDocument(state)).toBeNull();

    state = createDocument(state, { id: "doc-first", name: "First" });

    expect(getActiveDocument(state)?.id).toBe("doc-first");
  });

  it("renames with sibling de-duplication", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });
    state = createDocument(state, { name: "Alpha", id: "doc-alpha" });
    state = createDocument(state, { name: "Beta", id: "doc-beta" });
    state = renameNode(state, "doc-beta", "Alpha");

    expect(state.nodes["doc-beta"].name).toBe("Alpha 2.pseudo");
  });
});

describe("workspace migration", () => {
  it("migrates a legacy source string into a default workspace", () => {
    const state = migratePersistedWorkspace(null, {
      sampleSource: SAMPLE_SOURCE,
      legacySource: 'OUTPUT "Legacy"',
      now: "2026-03-15T00:00:00.000Z",
    });

    expect(getActiveDocument(state)?.name).toBe("main.pseudo");
    expect(getActiveDocument(state)?.source).toBe('OUTPUT "Legacy"');
  });

  it("migrates a legacy workspace snapshot", () => {
    const state = migratePersistedWorkspace(
      { source: 'OUTPUT "Saved"', stdinText: "", virtualFiles: {} },
      { sampleSource: SAMPLE_SOURCE },
    );

    expect(getActiveDocument(state)?.source).toBe('OUTPUT "Saved"');
  });

  it("creates a default workspace when persisted data is missing", () => {
    const state = migratePersistedWorkspace(undefined, { sampleSource: SAMPLE_SOURCE });

    expect(state.rootFolderId).toBe(ROOT_FOLDER_ID);
    expect(getActiveDocument(state)?.source).toBe(SAMPLE_SOURCE);
  });

  it("normalizes persisted root folders to the explorer root name", () => {
    const state = validateWorkspaceState({
      version: 2,
      rootFolderId: ROOT_FOLDER_ID,
      activeDocumentId: "doc-main",
      nodes: {
        [ROOT_FOLDER_ID]: {
          id: ROOT_FOLDER_ID,
          type: "folder",
          parentId: null,
          name: "Workspace",
          order: 0,
          createdAt: "2026-03-15T00:00:00.000Z",
          updatedAt: "2026-03-15T00:00:00.000Z",
        },
        "doc-main": {
          id: "doc-main",
          type: "document",
          parentId: ROOT_FOLDER_ID,
          name: "main.pseudo",
          source: SAMPLE_SOURCE,
          order: 0,
          createdAt: "2026-03-15T00:00:00.000Z",
          updatedAt: "2026-03-15T00:00:00.000Z",
        },
      },
      expandedFolderIds: [ROOT_FOLDER_ID],
      recentDocumentIds: ["doc-main"],
      virtualFiles: {},
      panelInstances: {
        "panel-editor-main": {
          id: "panel-editor-main",
          kind: "editor",
          openDocumentIds: ["doc-main"],
          activeDocumentId: "doc-main",
          createdAt: "2026-03-15T00:00:00.000Z",
          updatedAt: "2026-03-15T00:00:00.000Z",
        },
      },
      layout: {
        id: "stack-editor",
        type: "stack",
        panelIds: ["panel-editor-main"],
        activePanelId: "panel-editor-main",
      },
      lastFocusedEditorPanelId: "panel-editor-main",
      lastFocusedTerminalPanelId: null,
    });

    expect(state?.nodes[ROOT_FOLDER_ID].name).toBe(ROOT_FOLDER_NAME);
  });

  it("rejects unknown future versions", () => {
    const invalid = validateWorkspaceState({
      version: 999,
      rootFolderId: ROOT_FOLDER_ID,
      activeDocumentId: "doc-main",
      nodes: {},
    });

    expect(invalid).toBeNull();
  });

  it("accepts a bounded valid workspace for cloud persistence", () => {
    const workspace = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE });

    const result = validateWorkspaceForPersistence(workspace);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.serializedWorkspace)).toMatchObject({
        version: 2,
        rootFolderId: ROOT_FOLDER_ID,
      });
    }
  });

  it("rejects malformed cloud persistence payloads", () => {
    const result = validateWorkspaceForPersistence({ version: 2, rootFolderId: ROOT_FOLDER_ID });

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects oversized cloud persistence payloads", () => {
    const workspace = createDefaultWorkspace({ sampleSource: "A".repeat(300_000) });

    const result = validateWorkspaceForPersistence(workspace);

    expect(result).toMatchObject({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects cloud persistence payloads with too many nodes", () => {
    let workspace = createEmptyWorkspace("2026-03-15T00:00:00.000Z");
    for (let index = 0; index < 501; index += 1) {
      workspace = createDocument(workspace, {
        id: `doc-${index}`,
        name: `Doc ${index}`,
        now: "2026-03-15T00:00:00.000Z",
      });
    }

    const result = validateWorkspaceForPersistence(workspace);

    expect(result).toMatchObject({
      ok: false,
      reason: "too_large",
      limit: "maxNodes",
    });
  });

  it("accepts a workspace at the advertised node and virtual file line limits", () => {
    const now = "2026-03-15T00:00:00.000Z";
    let workspace = createEmptyWorkspace(now);
    for (let index = 0; index < DEFAULT_WORKSPACE_PERSISTENCE_LIMITS.maxNodes - 1; index += 1) {
      workspace = createDocument(workspace, { id: `doc-${index}`, name: `Doc ${index}`, source: "OUTPUT 1", now });
    }
    workspace = updateVirtualFiles(
      workspace,
      { "data.txt": Array.from({ length: DEFAULT_WORKSPACE_PERSISTENCE_LIMITS.maxVirtualFileLines }, (_, i) => `r${i}`) },
      now,
    );

    expect(Object.keys(workspace.nodes)).toHaveLength(DEFAULT_WORKSPACE_PERSISTENCE_LIMITS.maxNodes);
    expect(validateWorkspaceForPersistence(workspace).ok).toBe(true);

    const tooManyLines = updateVirtualFiles(
      workspace,
      { "data.txt": Array.from({ length: DEFAULT_WORKSPACE_PERSISTENCE_LIMITS.maxVirtualFileLines + 1 }, () => "r") },
      now,
    );
    expect(validateWorkspaceForPersistence(tooManyLines)).toMatchObject({ ok: false, limit: "maxVirtualFileLines" });
  });
});

describe("workspace tree repair", () => {
  const now = "2026-03-15T00:00:00.000Z";

  it("moves nodes with a dangling or non-folder parent to the root", () => {
    const corrupt = cloneJson(createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE, now }));
    const withSecond = createDocument(corrupt, { id: "doc-2", name: "two", now });
    const raw = cloneJson(withSecond);
    raw.nodes["doc-main"].parentId = "missing-folder";
    raw.nodes["doc-2"].parentId = "doc-main";

    const repaired = validateWorkspaceState(raw)!;

    expect(repaired.nodes["doc-main"].parentId).toBe(ROOT_FOLDER_ID);
    expect(repaired.nodes["doc-2"].parentId).toBe(ROOT_FOLDER_ID);
    expect(getNodePath(repaired, "doc-main").map((node) => node.id)).toEqual([ROOT_FOLDER_ID, "doc-main"]);
  });

  it("breaks parent cycles so every folder is reachable and getNodePath terminates", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE, now });
    state = createFolder(state, { id: "fa", name: "A", now });
    state = createFolder(state, { id: "fb", name: "B", parentId: "fa", now });
    const raw = cloneJson(state);
    raw.nodes["fa"].parentId = "fb";

    expect(getNodePath(raw, "fa").map((node) => node.id)).toEqual(["fb", "fa"]);

    const repaired = validateWorkspaceState(raw)!;
    const visible = flattenVisibleNodes({ ...repaired, expandedFolderIds: [ROOT_FOLDER_ID, "fa", "fb"] });
    expect(visible.map((entry) => entry.node.id)).toEqual(expect.arrayContaining(["fa", "fb"]));
    expect(getNodePath(repaired, "fb")[0].id).toBe(ROOT_FOLDER_ID);
    expect(getNodePath(repaired, "fa")[0].id).toBe(ROOT_FOLDER_ID);
  });

  it("repairs id and key mismatches and rejects unknown node types", () => {
    const raw = cloneJson(createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE, now }));
    raw.nodes["doc-main"].id = "something-else";
    expect(validateWorkspaceState(raw)?.nodes["doc-main"].id).toBe("doc-main");

    (raw.nodes["doc-main"] as unknown as { type: string }).type = "file";
    expect(validateWorkspaceState(raw)).toBeNull();
  });

  it("returns an empty path for unknown ids", () => {
    expect(getNodePath(createEmptyWorkspace(now), "missing")).toEqual([]);
  });
});

describe("workspace edge cases", () => {
  const now = "2026-03-15T00:00:00.000Z";

  it("treats the .pseudo extension case-insensitively", () => {
    let state = createEmptyWorkspace(now);
    state = createDocument(state, { id: "a", name: "Main.PSEUDO", now });
    state = createDocument(state, { id: "b", name: "other.pseudo", now });
    state = renameNode(state, "b", "OTHER.Pseudo", now);

    expect(state.nodes["a"].name).toBe("Main.PSEUDO");
    expect(state.nodes["b"].name).toBe("OTHER.Pseudo");
  });

  it("skips stale ids in batch deletes and moves", () => {
    let state = createDefaultWorkspace({ sampleSource: SAMPLE_SOURCE, now });
    state = createDocument(state, { id: "keep", name: "k", now });
    state = createFolder(state, { id: "folder", name: "F", now });

    const moved = moveNodes(state, ["keep", "already-gone"], "folder");
    expect(moved.nodes["keep"].parentId).toBe("folder");

    const deleted = deleteNodes(moved, ["keep", "already-gone"]);
    expect(deleted.nodes["keep"]).toBeUndefined();
  });

  it("imports non-empty documents into a new folder without changing the active document", () => {
    const target = createDefaultWorkspace({ sampleSource: "cloud", now });
    let source = createEmptyWorkspace(now);
    source = createDocument(source, { id: "g1", name: "main", source: "guest work", now });
    source = createDocument(source, { id: "g2", name: "empty", source: "  ", now });

    const merged = importDocuments(target, source, "Guest", { now });
    const folder = Object.values(merged.nodes).find((node) => node.type === "folder" && node.name === "Guest")!;
    const imported = getChildNodes(merged, folder.id);

    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({ name: "main.pseudo", source: "guest work" });
    expect(getActiveDocument(merged)?.source).toBe("cloud");
    expect(importDocuments(target, createEmptyWorkspace(now), "Guest")).toBe(target);
  });
});
