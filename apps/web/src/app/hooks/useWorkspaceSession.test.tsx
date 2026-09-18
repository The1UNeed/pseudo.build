import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  createDocument,
  createEmptyWorkspace,
  getActiveDocument,
  getChildNodes,
  type WorkspaceState,
} from "@pseudobuild/workspace";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { editorEn } from "@/i18n/messages/editor.en";
import type { WorkspacePersistenceMode } from "@/lib/platform";
import { useWorkspaceSession } from "./useWorkspaceSession";

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
vi.mock("@/runtime/executeRuntime", () => ({ pseudocodeRuntimeRunner: { run: vi.fn() } }));
vi.mock("@/runtime/compilePseudocodeInWorker", () => ({
  compilePseudocodeInWorker: vi.fn(),
  getCompileCacheKey: () => "k",
  preloadPseudocodeCompiler: () => {},
}));

const now = "2026-03-15T00:00:00.000Z";
const sync = editorEn.sync;
const ws = (source: string) => createDocument(createEmptyWorkspace(now), { id: "d1", name: "main", source, now });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const tokenA = async () => `header.${btoa(JSON.stringify({ sub: "user_a" })).replace(/=+$/, "")}.signature`;
const sourceOf = (workspace: WorkspaceState | null | undefined) => (workspace ? getActiveDocument(workspace)?.source : null);
const storedRecord = (key: string) => store.get(key) as { workspace: WorkspaceState; dirty: boolean; revision: number };

interface FakeServer {
  workspace: WorkspaceState | null;
  revision: number;
  getStatus: number;
  putStatus: number;
  puts: Array<{ source: string | null | undefined; baseRevision: number }>;
  inFlight: number;
  maxInFlight: number;
  beforePut?: () => Promise<void>;
}
let server: FakeServer;

beforeEach(() => {
  store.clear();
  control.failOpen = false;
  control.failPut = false;
  server = { workspace: null, revision: 0, getStatus: 200, putStatus: 200, puts: [], inFlight: 0, maxInFlight: 0 };
  globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    if ((init?.method ?? "GET") === "GET") {
      return server.getStatus === 200
        ? json({ workspace: server.workspace, revision: server.revision })
        : json({ error: "blip" }, server.getStatus);
    }
    const body = JSON.parse(String(init?.body)) as { workspace: WorkspaceState; baseRevision: number };
    server.inFlight += 1;
    server.maxInFlight = Math.max(server.maxInFlight, server.inFlight);
    server.puts.push({ source: sourceOf(body.workspace), baseRevision: body.baseRevision });
    await server.beforePut?.();
    server.inFlight -= 1;
    if (server.putStatus !== 200) {
      return json({ error: "boom", code: "upstream_error" }, server.putStatus);
    }
    if (body.baseRevision !== server.revision) {
      return json({ error: "changed", code: "revision_conflict", revision: server.revision }, 409);
    }
    server.workspace = body.workspace;
    server.revision += 1;
    return json({ ok: true, revision: server.revision });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "visibilityState");
});

function renderSession(mode: WorkspacePersistenceMode = "cloud") {
  return renderHook(
    ({ mode: currentMode }: { mode: WorkspacePersistenceMode }) =>
      useWorkspaceSession("DEFAULT", {
        persistenceMode: currentMode,
        getCloudAuthToken: currentMode === "cloud" ? tokenA : undefined,
        autoSaveDelayMs: 5 * 60 * 1000,
      }),
    { initialProps: { mode } },
  );
}

async function renderLoaded(mode: WorkspacePersistenceMode = "cloud") {
  const rendered = renderSession(mode);
  await waitFor(() => expect(rendered.result.current.workspace).not.toBeNull());
  return rendered;
}

describe("useWorkspaceSession sync", () => {
  it("WS-3: writes typing to IndexedDB shortly after it stops, before the cloud autosave", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    const { result } = await renderLoaded();

    act(() => result.current.handleDocumentSourceChange("d1", "typed"));

    await waitFor(() => expect(sourceOf(storedRecord("user:user_a")?.workspace)).toBe("typed"), { timeout: 2000 });
    expect(storedRecord("user:user_a")).toMatchObject({ dirty: true, revision: 1 });
    expect(server.puts).toHaveLength(0);
    expect(result.current.hasPendingSave).toBe(true);
  });

  it("WS-3: flushes pending edits when the page is hidden", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    const { result } = await renderLoaded();

    act(() => result.current.handleDocumentSourceChange("d1", "typed"));
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(server.puts).toEqual([{ source: "typed", baseRevision: 1 }]));
    await waitFor(() => expect(storedRecord("user:user_a")).toMatchObject({ dirty: false, revision: 2 }));
    expect(result.current.hasPendingSave).toBe(false);
  });

  it("WS-2/WS-3: sign-out flushes the unsaved edit, then clears the synced account cache", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    const { result, rerender } = await renderLoaded();

    act(() => result.current.handleDocumentSourceChange("d1", "cloud v2 typed 4 minutes ago"));
    rerender({ mode: "memory" });

    await waitFor(() => expect(server.puts.map((put) => put.source)).toEqual(["cloud v2 typed 4 minutes ago"]));
    await waitFor(() => expect(store.has("user:user_a")).toBe(false));
    expect(result.current.activeDocument).toBeNull();
  });

  it("WS-6: imports guest documents into a Guest folder at sign-in and uploads them", async () => {
    server.workspace = ws("existing cloud workspace");
    server.revision = 1;
    const { result, rerender } = await renderLoaded("memory");
    act(() => {
      result.current.createDocumentInWorkspace(undefined, { name: "homework", source: "guest work" });
    });

    rerender({ mode: "cloud" });

    await waitFor(() => expect(sourceOf(result.current.workspace)).toBe("existing cloud workspace"));
    const merged = result.current.workspace!;
    const guestFolder = Object.values(merged.nodes).find((node) => node.name === sync.guestFolder)!;
    expect(getChildNodes(merged, guestFolder.id)).toMatchObject([{ name: "homework.pseudo", source: "guest work" }]);
    expect(result.current.appNotice).toEqual({ tone: "info", message: sync.guestImported });
    await waitFor(() => expect(server.revision).toBe(2));
  });

  it("WS-7: falls back to an empty workspace with a notice when IndexedDB is unavailable", async () => {
    control.failOpen = true;
    const { result } = await renderLoaded("local");

    expect(result.current.activeDocument).toBeNull();
    expect(result.current.appNotice).toEqual({ tone: "error", message: sync.storageUnavailable });
  });

  it("WS-1: a failed cloud load shows an error and uploads nothing", async () => {
    server.getStatus = 500;
    store.set("user:user_a", { workspace: ws("device copy"), dirty: false, revision: 1 });
    const { result } = await renderLoaded();

    expect(sourceOf(result.current.workspace)).toBe("device copy");
    expect(result.current.appNotice).toEqual({ tone: "error", message: sync.cloudLoadFailed });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.puts).toHaveLength(0);
  });

  it("WS-5: sends one save at a time and finishes with the latest state", async () => {
    server.workspace = ws("v0");
    server.revision = 1;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.beforePut = () => (server.puts.length === 1 ? gate : Promise.resolve());
    const { result } = await renderLoaded();

    const saves: Array<Promise<boolean>> = [];
    act(() => result.current.handleDocumentSourceChange("d1", "one"));
    act(() => {
      saves.push(result.current.saveWorkspaceNow());
    });
    await waitFor(() => expect(server.inFlight).toBe(1));
    act(() => result.current.handleDocumentSourceChange("d1", "two"));
    act(() => {
      saves.push(result.current.saveWorkspaceNow());
    });
    act(() => result.current.handleDocumentSourceChange("d1", "three"));
    act(() => {
      saves.push(result.current.saveWorkspaceNow());
    });
    release();
    await act(async () => {
      expect(await Promise.all(saves)).toEqual([true, true, true]);
    });

    expect(server.maxInFlight).toBe(1);
    expect(server.puts.map((put) => put.source)).toEqual(["one", "three"]);
    expect(sourceOf(server.workspace)).toBe("three");
  });

  it("WS-5: on a revision conflict keeps local edits, copies the other version's files, and retries", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    const { result } = await renderLoaded();
    server.workspace = ws("saved on another device");
    server.revision = 2;

    act(() => result.current.handleDocumentSourceChange("d1", "mine"));
    let saved = false;
    await act(async () => {
      saved = await result.current.saveWorkspaceNow();
    });

    expect(saved).toBe(true);
    expect(server.puts.map((put) => put.baseRevision)).toEqual([1, 2]);
    expect(sourceOf(server.workspace)).toBe("mine");
    const copyFolder = Object.values(server.workspace!.nodes).find((node) => node.name === sync.conflictFolder)!;
    expect(getChildNodes(server.workspace!, copyFolder.id)).toMatchObject([{ source: "saved on another device" }]);
    expect(result.current.appNotice).toEqual({ tone: "info", message: sync.conflict });
  });

  it("WS-4: still uploads when the IndexedDB write fails", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    const { result } = await renderLoaded();
    control.failPut = true;

    act(() => result.current.handleDocumentSourceChange("d1", "typed"));
    let saved = false;
    await act(async () => {
      saved = await result.current.saveWorkspaceNow();
    });

    expect(saved).toBe(true);
    expect(sourceOf(server.workspace)).toBe("typed");
    expect(result.current.saveError).toBeNull();
  });

  it("WS-4: a failed upload keeps the edit on this device, and the next load uploads it instead of overwriting it", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    server.putStatus = 500;
    const first = await renderLoaded();

    act(() => first.result.current.handleDocumentSourceChange("d1", "typed offline"));
    await act(async () => {
      expect(await first.result.current.saveWorkspaceNow()).toBe(false);
    });
    expect(first.result.current.saveError).toBe(sync.saveFailedKept);
    expect(storedRecord("user:user_a")).toMatchObject({ dirty: true, revision: 1 });

    first.unmount();
    await waitFor(() => expect(server.puts).toHaveLength(2));
    server.putStatus = 200;

    const second = await renderLoaded();
    expect(sourceOf(second.result.current.workspace)).toBe("typed offline");
    await waitFor(() => expect(sourceOf(server.workspace)).toBe("typed offline"));
  });

  it("WS-8: pauses cloud saving before sending a workspace over a limit and names the limit", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    const { result } = await renderLoaded();

    act(() => result.current.updateWorkspaceVirtualFiles({ "big.txt": Array.from({ length: 5001 }, () => "r") }));
    let saved = true;
    await act(async () => {
      saved = await result.current.saveWorkspaceNow();
    });

    expect(saved).toBe(false);
    expect(result.current.saveError).toContain("too many virtual file lines (5001/5000)");
    expect(server.puts).toHaveLength(0);
  });

  it("WS-5: another tab refreshes after a save when it has nothing unsaved", async () => {
    server.workspace = ws("cloud v1");
    server.revision = 1;
    const tabA = await renderLoaded();
    const tabB = await renderLoaded();

    act(() => tabA.result.current.handleDocumentSourceChange("d1", "saved in tab A"));
    await act(async () => {
      await tabA.result.current.saveWorkspaceNow();
    });

    await waitFor(() => expect(sourceOf(tabB.result.current.workspace)).toBe("saved in tab A"));
  });
});
