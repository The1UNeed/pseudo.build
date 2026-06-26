import { auth, verifyToken } from "@clerk/nextjs/server";

interface WorkspaceRequestAuth {
  userId: string;
  convexToken: string | null;
  claims: Record<string, unknown> | null;
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function getWorkspaceRequestAuth(request: Request): Promise<WorkspaceRequestAuth | null> {
  const authState = await auth();
  if (authState.userId) {
    return {
      userId: authState.userId,
      convexToken: await authState.getToken({ template: "convex" }),
      claims: (authState.sessionClaims as Record<string, unknown> | null | undefined) ?? null,
    };
  }

  const bearerToken = getBearerToken(request);
  if (!bearerToken) {
    console.warn("Workspace API unauthorized: no Clerk session or bearer token.");
    return null;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.warn("Workspace API unauthorized: CLERK_SECRET_KEY is missing.");
    return null;
  }

  try {
    const claims = await verifyToken(bearerToken, { secretKey });
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    if (!userId) {
      console.warn("Workspace API unauthorized: verified Clerk token has no subject.");
      return null;
    }

    return {
      userId,
      convexToken: bearerToken,
      claims: claims as Record<string, unknown>,
    };
  } catch (error) {
    console.warn("Workspace API bearer token verification failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}
