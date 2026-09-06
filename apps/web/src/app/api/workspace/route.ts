import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import {
  DEFAULT_WORKSPACE_PERSISTENCE_LIMITS,
  getUtf8ByteLength,
  validateWorkspaceForPersistence,
} from "@pseudobuild/workspace";
import { api } from "../../../../../../convex/_generated/api";
import { getWorkspaceRequestAuth } from "./workspaceAuth";
import { buildWorkspaceSyncUser } from "./workspaceUser";

const isElectronBuild = process.env.BUILD_TARGET === "electron";
const hasClerkServerConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);
const shouldUseCloudWorkspaceSync = !isElectronBuild && hasClerkServerConfig;
const maxWorkspaceRequestBytes = DEFAULT_WORKSPACE_PERSISTENCE_LIMITS.maxSerializedBytes + 4096;

function getConvexClient(authToken: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_URL.");
  }

  return new ConvexHttpClient(convexUrl, { auth: authToken });
}

async function readWorkspaceRequestBody(request: Request) {
  const rawBody = await request.text();
  if (getUtf8ByteLength(rawBody) > maxWorkspaceRequestBytes) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Workspace payload is too large." }, { status: 413 }),
    };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Workspace payload must be valid JSON." }, { status: 400 }),
    };
  }

  if (!body || typeof body !== "object" || !Object.prototype.hasOwnProperty.call(body, "workspace")) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Missing workspace payload." }, { status: 400 }),
    };
  }

  const workspace = (body as { workspace: unknown }).workspace;
  const validation = validateWorkspaceForPersistence(workspace);
  if (!validation.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: validation.message },
        { status: validation.reason === "too_large" ? 413 : 400 },
      ),
    };
  }

  return {
    ok: true as const,
    workspaceJson: validation.serializedWorkspace,
  };
}

export async function GET(request: Request) {
  if (isElectronBuild) {
    return NextResponse.json({ workspace: null }, { status: 404 });
  }

  if (!shouldUseCloudWorkspaceSync) {
    return NextResponse.json({ error: "Cloud workspace sync is not configured." }, { status: 503 });
  }

  const requestAuth = await getWorkspaceRequestAuth(request);
  if (!requestAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!requestAuth.convexToken) {
    return NextResponse.json({ error: "Workspace authentication token is not configured." }, { status: 503 });
  }

  const workspace = await getConvexClient(requestAuth.convexToken).query(api.workspaces.getCurrent, {});

  return NextResponse.json({ workspace }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  if (isElectronBuild) {
    return NextResponse.json(
      { error: "Workspace cloud sync is unavailable in desktop builds." },
      { status: 404 },
    );
  }

  if (!shouldUseCloudWorkspaceSync) {
    return NextResponse.json({ error: "Cloud workspace sync is not configured." }, { status: 503 });
  }

  const requestAuth = await getWorkspaceRequestAuth(request);
  if (!requestAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!requestAuth.convexToken) {
    return NextResponse.json({ error: "Workspace authentication token is not configured." }, { status: 503 });
  }

  const body = await readWorkspaceRequestBody(request);
  if (!body.ok) {
    return body.response;
  }

  await getConvexClient(requestAuth.convexToken).mutation(api.workspaces.saveCurrent, {
    user: buildWorkspaceSyncUser(requestAuth.claims),
    workspaceJson: body.workspaceJson,
  });

  return NextResponse.json({ ok: true });
}
