import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const MAX_WORKSPACE_JSON_BYTES = 512 * 1024;
const MAX_WORKSPACE_DEPTH = 24;
const MAX_WORKSPACE_OBJECT_ENTRIES = 3000;
const MAX_WORKSPACE_ARRAY_ITEMS = 3000;
const MAX_WORKSPACE_STRING_BYTES = 256 * 1024;
const MAX_WORKSPACE_NODES = 500;

function getUtf8ByteLength(value: string) {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);
    if (codePoint < 0x80) {
      bytes += 1;
    } else if (codePoint < 0x800) {
      bytes += 2;
    } else if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

async function requireAuthenticatedClerkUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new Error("Unauthorized workspace sync request.");
  }
  return identity.subject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWorkspaceNode(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    (value.parentId !== null && typeof value.parentId !== "string") ||
    typeof value.name !== "string" ||
    typeof value.order !== "number" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  if (value.type === "folder") {
    return true;
  }

  return value.type === "document" && typeof value.source === "string";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLayoutNode(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type === "stack") {
    return (
      typeof value.id === "string" &&
      Array.isArray(value.panelIds) &&
      value.panelIds.every(isString) &&
      (value.activePanelId === null || typeof value.activePanelId === "string")
    );
  }

  if (value.type === "split") {
    return (
      typeof value.id === "string" &&
      (value.axis === "horizontal" || value.axis === "vertical") &&
      Array.isArray(value.sizes) &&
      value.sizes.every(isFiniteNumber) &&
      Array.isArray(value.children) &&
      value.children.length > 0 &&
      value.children.every(isLayoutNode)
    );
  }

  return false;
}

function isPanelInstance(panelId: string, value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.id !== panelId ||
    typeof value.id !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  if (value.kind === "editor") {
    return (
      Array.isArray(value.openDocumentIds) &&
      value.openDocumentIds.every(isString) &&
      (value.activeDocumentId === null || typeof value.activeDocumentId === "string")
    );
  }

  if (value.kind === "files") {
    return value.selectedFileName === undefined || typeof value.selectedFileName === "string";
  }

  return value.kind === "explorer" || value.kind === "terminal" || value.kind === "diagnostics";
}

function arePanelInstances(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([panelId, panel]) => isPanelInstance(panelId, panel));
}

function inspectWorkspacePayloadLimits(raw: unknown) {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: raw, depth: 0 }];
  let objectEntries = 0;
  let arrayItems = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const { value, depth } = current;
    if (depth > MAX_WORKSPACE_DEPTH) {
      throw new Error("Workspace payload is too deeply nested.");
    }

    if (typeof value === "string" && getUtf8ByteLength(value) > MAX_WORKSPACE_STRING_BYTES) {
      throw new Error("Workspace payload contains an oversized string.");
    }

    if (!value || typeof value !== "object") {
      continue;
    }

    if (Array.isArray(value)) {
      arrayItems += value.length;
      if (arrayItems > MAX_WORKSPACE_ARRAY_ITEMS) {
        throw new Error("Workspace payload has too many array items.");
      }
      for (const item of value) {
        stack.push({ value: item, depth: depth + 1 });
      }
      continue;
    }

    const entries = Object.entries(value);
    objectEntries += entries.length;
    if (objectEntries > MAX_WORKSPACE_OBJECT_ENTRIES) {
      throw new Error("Workspace payload has too many object fields.");
    }
    for (const [, entryValue] of entries) {
      stack.push({ value: entryValue, depth: depth + 1 });
    }
  }
}

function parseWorkspaceJson(workspaceJson: string) {
  if (getUtf8ByteLength(workspaceJson) > MAX_WORKSPACE_JSON_BYTES) {
    throw new Error("Workspace payload is too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(workspaceJson) as unknown;
  } catch {
    throw new Error("Workspace payload must be valid JSON.");
  }

  inspectWorkspacePayloadLimits(parsed);

  if (!isRecord(parsed) || parsed.version !== 2 || typeof parsed.rootFolderId !== "string") {
    throw new Error("Workspace payload has an invalid schema.");
  }

  const nodes = parsed.nodes;
  if (!isRecord(nodes) || Object.keys(nodes).length > MAX_WORKSPACE_NODES) {
    throw new Error("Workspace payload has an invalid node set.");
  }

  for (const node of Object.values(nodes)) {
    if (!isWorkspaceNode(node)) {
      throw new Error("Workspace payload has an invalid node.");
    }
  }

  if (!arePanelInstances(parsed.panelInstances) || !isLayoutNode(parsed.layout)) {
    throw new Error("Workspace payload has an invalid layout.");
  }

  return parsed;
}

function readStoredWorkspace(workspaceDoc: { workspaceJson?: string; workspace?: unknown } | null | undefined) {
  if (!workspaceDoc) {
    return null;
  }

  if (typeof workspaceDoc.workspaceJson === "string") {
    try {
      return parseWorkspaceJson(workspaceDoc.workspaceJson);
    } catch {
      return null;
    }
  }

  if (workspaceDoc.workspace === undefined) {
    return null;
  }

  const legacyWorkspaceJson = JSON.stringify(workspaceDoc.workspace);
  if (!legacyWorkspaceJson) {
    return null;
  }

  try {
    return parseWorkspaceJson(legacyWorkspaceJson);
  } catch {
    return null;
  }
}

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireAuthenticatedClerkUser(ctx);

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();

    return readStoredWorkspace(workspace);
  },
});

export const saveCurrent = mutation({
  args: {
    user: v.object({
      email: v.string(),
      firstName: v.union(v.string(), v.null()),
      lastName: v.union(v.string(), v.null()),
    }),
    workspaceJson: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuthenticatedClerkUser(ctx);
    parseWorkspaceJson(args.workspaceJson);

    const now = Date.now();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.user.email,
        firstName: args.user.firstName,
        lastName: args.user.lastName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("users", {
        ...args.user,
        clerkUserId,
        updatedAt: now,
      });
    }

    const existingWorkspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingWorkspace) {
      await ctx.db.patch(existingWorkspace._id, {
        workspace: undefined,
        workspaceJson: args.workspaceJson,
        updatedAt: now,
      });
      return existingWorkspace._id;
    }

    return await ctx.db.insert("workspaces", {
      clerkUserId,
      workspaceJson: args.workspaceJson,
      updatedAt: now,
    });
  },
});
