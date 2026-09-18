import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import {
  DEFAULT_WORKSPACE_PERSISTENCE_LIMITS,
  getUtf8ByteLength,
  validateWorkspaceForPersistence,
} from "@pseudobuild/workspace";
import { api } from "../../../../../../convex/_generated/api";
import { getWorkspaceRequestAuth } from "./workspaceAuth";

const isElectronBuild = process.env.BUILD_TARGET === "electron";
const hasClerkServerConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);
const shouldUseCloudWorkspaceSync = !isElectronBuild && hasClerkServerConfig;
const maxWorkspaceRequestBytes = DEFAULT_WORKSPACE_PERSISTENCE_LIMITS.maxSerializedBytes + 4096;
const noStore = { "Cache-Control": "private, no-store" };

// Status for each typed error code thrown by convex/workspaces.ts. Anything else is an upstream failure.
const statusByConvexErrorCode: Record<string, number> = {
  unauthenticated: 401,
  account_deleted: 401,
  invalid_workspace: 400,
  too_large: 413,
  revision_conflict: 409,
  rate_limited: 429,
  corrupt_workspace: 500,
};

function errorResponse(status: number, code: string, error: string, extra: Record<string, number> = {}) {
  return NextResponse.json({ error, code, ...extra }, { status, headers: noStore });
}

function convexErrorResponse(error: unknown) {
  const data = (error as { data?: unknown } | null)?.data as Record<string, unknown> | undefined;
  const code = typeof data?.code === "string" ? data.code : null;
  if (!data || !code || !(code in statusByConvexErrorCode)) {
    // Log only the error message, never the request payload.
    console.error("Workspace sync: Convex request failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return errorResponse(502, "upstream_error", "Workspace sync is temporarily unavailable.");
  }

  const extra: Record<string, number> = {};
  for (const key of ["revision", "retryAfterMs"] as const) {
    if (typeof data[key] === "number") {
      extra[key] = data[key];
    }
  }
  return errorResponse(
    statusByConvexErrorCode[code],
    code,
    typeof data.message === "string" ? data.message : code,
    extra,
  );
}

function getConvexClient(authToken: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_URL.");
  }

  return new ConvexHttpClient(convexUrl, { auth: authToken });
}

async function requireConvexToken(request: Request) {
  if (isElectronBuild) {
    return { ok: false as const, response: errorResponse(404, "unavailable", "Workspace cloud sync is unavailable in desktop builds.") };
  }

  if (!shouldUseCloudWorkspaceSync) {
    return { ok: false as const, response: errorResponse(503, "not_configured", "Cloud workspace sync is not configured.") };
  }

  const requestAuth = await getWorkspaceRequestAuth(request);
  if (!requestAuth) {
    return { ok: false as const, response: errorResponse(401, "unauthenticated", "Unauthorized") };
  }

  if (!requestAuth.convexToken) {
    return {
      ok: false as const,
      response: errorResponse(503, "not_configured", "Workspace authentication token is not configured."),
    };
  }

  return { ok: true as const, token: requestAuth.convexToken };
}

async function readWorkspaceRequestBody(request: Request) {
  const rawBody = await request.text();
  if (getUtf8ByteLength(rawBody) > maxWorkspaceRequestBytes) {
    return { ok: false as const, response: errorResponse(413, "too_large", "Workspace payload is too large.") };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return { ok: false as const, response: errorResponse(400, "invalid_request", "Workspace payload must be valid JSON.") };
  }

  if (!body || typeof body !== "object" || !Object.prototype.hasOwnProperty.call(body, "workspace")) {
    return { ok: false as const, response: errorResponse(400, "invalid_request", "Missing workspace payload.") };
  }

  const { workspace, baseRevision } = body as { workspace: unknown; baseRevision?: unknown };
  if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 0) {
    return { ok: false as const, response: errorResponse(400, "invalid_request", "Missing baseRevision.") };
  }

  const validation = validateWorkspaceForPersistence(workspace);
  if (!validation.ok) {
    return {
      ok: false as const,
      response:
        validation.reason === "too_large"
          ? errorResponse(413, "too_large", validation.message)
          : errorResponse(400, "invalid_workspace", validation.message),
    };
  }

  return { ok: true as const, workspaceJson: validation.serializedWorkspace, baseRevision };
}

/** Responds `{ workspace: object | null, revision: number }`. */
export async function GET(request: Request) {
  const auth = await requireConvexToken(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { workspaceJson, revision } = await getConvexClient(auth.token).query(api.workspaces.getCurrent, {});
    const workspace = workspaceJson === null ? null : (JSON.parse(workspaceJson) as unknown);
    return NextResponse.json({ workspace, revision }, { headers: noStore });
  } catch (error) {
    return convexErrorResponse(error);
  }
}

/** Accepts `{ workspace, baseRevision }` and responds `{ ok: true, revision }`, or 409 with the current revision. */
export async function PUT(request: Request) {
  const auth = await requireConvexToken(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await readWorkspaceRequestBody(request);
  if (!body.ok) {
    return body.response;
  }

  try {
    const { revision } = await getConvexClient(auth.token).mutation(api.workspaces.saveCurrent, {
      workspaceJson: body.workspaceJson,
      baseRevision: body.baseRevision,
    });
    return NextResponse.json({ ok: true, revision }, { headers: noStore });
  } catch (error) {
    return convexErrorResponse(error);
  }
}
