import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { getWorkspaceRequestAuth } from "./workspaceAuth";
import { buildWorkspaceSyncUser } from "./workspaceUser";

const isElectronBuild = process.env.BUILD_TARGET === "electron";
const hasClerkServerConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);
const shouldUseCloudWorkspaceSync = !isElectronBuild && hasClerkServerConfig;

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_URL.");
  }

  return new ConvexHttpClient(convexUrl);
}

function getWorkspaceSyncSecret() {
  const serverSecret = process.env.WORKSPACE_SYNC_SECRET;
  if (!serverSecret) {
    throw new Error("Missing WORKSPACE_SYNC_SECRET.");
  }

  return serverSecret;
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

  const workspace = await getConvexClient().query(api.workspaces.getCurrent, {
    serverSecret: getWorkspaceSyncSecret(),
    clerkUserId: requestAuth.userId,
  });

  return NextResponse.json({ workspace });
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

  const body = (await request.json()) as { workspace?: unknown };

  if (!("workspace" in body)) {
    return NextResponse.json({ error: "Missing workspace payload." }, { status: 400 });
  }

  await getConvexClient().mutation(api.workspaces.saveCurrent, {
    serverSecret: getWorkspaceSyncSecret(),
    user: buildWorkspaceSyncUser(requestAuth.userId, requestAuth.claims),
    workspace: body.workspace,
  });

  return NextResponse.json({ ok: true });
}
