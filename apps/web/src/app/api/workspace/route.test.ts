import { createDefaultWorkspace } from "@igcse/workspace";
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

describe("/api/workspace", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    authMock.mockReset();
    convexClientMock.mockClear();
    mutationMock.mockReset();
    queryMock.mockReset();
  });

  it("saves a valid workspace through an authenticated Convex client", async () => {
    const workspace = createDefaultWorkspace({ sampleSource: 'OUTPUT "Cloud"' });
    authMock.mockResolvedValue({
      userId: "user_123",
      convexToken: "convex-token",
      claims: { email: "alex@example.com" },
    });
    mutationMock.mockResolvedValue("workspace_id");

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://app.test/api/workspace", {
        method: "PUT",
        body: JSON.stringify({ workspace }),
      }),
    );

    expect(response.status).toBe(200);
    expect(convexClientMock).toHaveBeenCalledWith("https://example.convex.cloud", {
      auth: "convex-token",
    });
    expect(mutationMock).toHaveBeenCalledWith("workspaces:saveCurrent", {
      user: {
        email: "alex@example.com",
        firstName: null,
        lastName: null,
      },
      workspaceJson: expect.any(String),
    });
  });

  it("rejects malformed workspace bodies before Convex mutation", async () => {
    authMock.mockResolvedValue({
      userId: "user_123",
      convexToken: "convex-token",
      claims: { email: "alex@example.com" },
    });

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://app.test/api/workspace", {
        method: "PUT",
        body: JSON.stringify({ workspace: { version: 2, rootFolderId: "root" } }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it("rejects oversized workspace bodies before Convex mutation", async () => {
    const workspace = createDefaultWorkspace({ sampleSource: "A".repeat(300_000) });
    authMock.mockResolvedValue({
      userId: "user_123",
      convexToken: "convex-token",
      claims: { email: "alex@example.com" },
    });

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://app.test/api/workspace", {
        method: "PUT",
        body: JSON.stringify({ workspace }),
      }),
    );

    expect(response.status).toBe(413);
    expect(mutationMock).not.toHaveBeenCalled();
  });
});
