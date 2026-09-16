import { createDefaultWorkspace } from "@pseudobuild/workspace";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, convexClientMock, mutationMock, queryMock } = vi.hoisted(() => {
  const mutationMock = vi.fn();
  const queryMock = vi.fn();
  return {
    authMock: vi.fn(),
    convexClientMock: vi.fn(function ConvexHttpClient() {
      return {
        mutation: mutationMock,
        query: queryMock,
      };
    }),
    mutationMock,
    queryMock,
  };
});

vi.mock("convex/browser", () => ({
  ConvexHttpClient: convexClientMock,
}));

vi.mock("../../../../../../convex/_generated/api", () => ({
  api: {
    workspaces: {
      getCurrent: "workspaces:getCurrent",
      saveCurrent: "workspaces:saveCurrent",
    },
  },
}));

vi.mock("./workspaceAuth", () => ({
  getWorkspaceRequestAuth: authMock,
}));

function convexError(data: Record<string, unknown>) {
  return Object.assign(new Error("ConvexError"), { data });
}

function putRequest(body: unknown) {
  return new Request("https://app.test/api/workspace", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("/api/workspace", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    authMock.mockReset();
    authMock.mockResolvedValue({
      userId: "user_123",
      convexToken: "convex-token",
      claims: { email: "alex@example.com" },
    });
    convexClientMock.mockClear();
    mutationMock.mockReset();
    queryMock.mockReset();
  });

  it("saves a valid workspace with its base revision and no client-supplied profile", async () => {
    const workspace = createDefaultWorkspace({ sampleSource: 'OUTPUT "Cloud"' });
    mutationMock.mockResolvedValue({ revision: 4 });

    const { PUT } = await import("./route");
    const response = await PUT(putRequest({ workspace, baseRevision: 3 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, revision: 4 });
    expect(convexClientMock).toHaveBeenCalledWith("https://example.convex.cloud", {
      auth: "convex-token",
    });
    expect(mutationMock).toHaveBeenCalledWith("workspaces:saveCurrent", {
      workspaceJson: expect.any(String),
      baseRevision: 3,
    });
  });

  it("returns the stored workspace and its revision", async () => {
    const workspace = createDefaultWorkspace({ sampleSource: 'OUTPUT "Cloud"' });
    queryMock.mockResolvedValue({ workspaceJson: JSON.stringify(workspace), revision: 7 });

    const { GET } = await import("./route");
    const response = await GET(new Request("https://app.test/api/workspace"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ workspace, revision: 7 });
  });

  it("maps a corrupt stored workspace to a 500 instead of an empty workspace", async () => {
    queryMock.mockRejectedValue(convexError({ code: "corrupt_workspace", message: "unreadable" }));

    const { GET } = await import("./route");
    const response = await GET(new Request("https://app.test/api/workspace"));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: "corrupt_workspace" });
  });

  it.each([
    [{ code: "revision_conflict", message: "changed", revision: 9 }, 409, { revision: 9 }],
    [{ code: "rate_limited", message: "slow down", retryAfterMs: 1200 }, 429, { retryAfterMs: 1200 }],
    [{ code: "unauthenticated", message: "no" }, 401, {}],
    [{ code: "account_deleted", message: "gone" }, 401, {}],
    [{ code: "invalid_workspace", message: "bad" }, 400, {}],
    [{ code: "too_large", message: "big" }, 413, {}],
  ])("maps Convex error %o to a typed JSON response", async (data, status, extra) => {
    mutationMock.mockRejectedValue(convexError(data));

    const { PUT } = await import("./route");
    const response = await PUT(putRequest({ workspace: createDefaultWorkspace({ sampleSource: "x" }), baseRevision: 0 }));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: data.message, code: data.code, ...extra });
  });

  it("maps unexpected Convex failures to 502 without logging the payload", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mutationMock.mockRejectedValue(new Error("fetch failed"));

    const { PUT } = await import("./route");
    const response = await PUT(
      putRequest({ workspace: createDefaultWorkspace({ sampleSource: "SECRET SOURCE" }), baseRevision: 0 }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "upstream_error" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("SECRET SOURCE");
    consoleError.mockRestore();
  });

  it("returns 401 with a code when the request is not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET(new Request("https://app.test/api/workspace"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "unauthenticated" });
  });

  it("rejects a missing base revision before Convex mutation", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(putRequest({ workspace: createDefaultWorkspace({ sampleSource: "x" }) }));

    expect(response.status).toBe(400);
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it("rejects malformed workspace bodies before Convex mutation", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(putRequest({ workspace: { version: 2, rootFolderId: "root" }, baseRevision: 0 }));

    expect(response.status).toBe(400);
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it("rejects oversized workspace bodies before Convex mutation", async () => {
    const workspace = createDefaultWorkspace({ sampleSource: "A".repeat(300_000) });

    const { PUT } = await import("./route");
    const response = await PUT(putRequest({ workspace, baseRevision: 0 }));

    expect(response.status).toBe(413);
    expect(mutationMock).not.toHaveBeenCalled();
  });
});
