import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth, verifyToken } from "@clerk/nextjs/server";
import { getWorkspaceRequestAuth } from "./workspaceAuth";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  verifyToken: vi.fn(),
}));

const authMock = vi.mocked(auth);
const verifyTokenMock = vi.mocked(verifyToken);

describe("getWorkspaceRequestAuth", () => {
  beforeEach(() => {
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
    authMock.mockReset();
    verifyTokenMock.mockReset();
  });

  it("uses Clerk middleware auth when it is available", async () => {
    authMock.mockResolvedValue({
      userId: "user_session",
      sessionClaims: { email: "session@example.com" },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    await expect(getWorkspaceRequestAuth(new Request("https://app.test/api/workspace"))).resolves.toEqual({
      userId: "user_session",
      claims: { email: "session@example.com" },
    });
    expect(verifyTokenMock).not.toHaveBeenCalled();
  });

  it("verifies a bearer token when middleware auth is missing", async () => {
    authMock.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    verifyTokenMock.mockResolvedValue({
      sub: "user_token",
      email: "token@example.com",
    } as unknown as Awaited<ReturnType<typeof verifyToken>>);

    const request = new Request("https://app.test/api/workspace", {
      headers: {
        authorization: "Bearer session-token",
      },
    });

    await expect(getWorkspaceRequestAuth(request)).resolves.toEqual({
      userId: "user_token",
      claims: {
        sub: "user_token",
        email: "token@example.com",
      },
    });
    expect(verifyTokenMock).toHaveBeenCalledWith("session-token", { secretKey: "sk_test" });
  });

  it("rejects requests without middleware auth or bearer token", async () => {
    authMock.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    await expect(getWorkspaceRequestAuth(new Request("https://app.test/api/workspace"))).resolves.toBeNull();
    expect(verifyTokenMock).not.toHaveBeenCalled();
  });
});
