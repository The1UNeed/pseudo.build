import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
  DEFAULT_WORKSPACE_PERSISTENCE_LIMITS,
  getUtf8ByteLength,
  validateWorkspaceForPersistence,
} from "../packages/workspace/src/index";

export const WORKSPACE_WRITES_PER_MINUTE = 60;
const WRITE_WINDOW_MS = 60_000;

export type WorkspaceErrorCode =
  | "unauthenticated"
  | "account_deleted"
  | "invalid_workspace"
  | "too_large"
  | "revision_conflict"
  | "rate_limited"
  | "corrupt_workspace";

function fail(
  code: WorkspaceErrorCode,
  message: string,
  extra: { revision?: number; retryAfterMs?: number } = {},
): never {
  throw new ConvexError({ code, message, ...extra });
}

// Rows are keyed on the Clerk user id (`identity.subject`). That is safe because auth.config.ts trusts a
// single issuer, and it is the id the Clerk deletion webhook sends.
async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    fail("unauthenticated", "Unauthorized workspace sync request.");
  }
  return identity;
}

async function getWorkspaceRow(ctx: QueryCtx | MutationCtx, clerkUserId: string) {
  return await ctx.db
    .query("workspaces")
    .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
    .unique();
}

function isParsableWorkspaceJson(workspaceJson: string) {
  try {
    const parsed = JSON.parse(workspaceJson) as unknown;
    return Boolean(parsed) && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export const getCurrent = query({
  args: {},
  returns: v.object({
    workspaceJson: v.union(v.string(), v.null()),
    revision: v.number(),
  }),
  handler: async (ctx) => {
    const { subject } = await requireIdentity(ctx);
    const row = await getWorkspaceRow(ctx, subject);
    if (!row) {
      return { workspaceJson: null, revision: 0 };
    }

    // Never report a stored but unreadable workspace as "no workspace": the client would upload over it.
    if (!isParsableWorkspaceJson(row.workspaceJson)) {
      fail("corrupt_workspace", "The stored workspace could not be read.");
    }

    return { workspaceJson: row.workspaceJson, revision: row.revision ?? 0 };
  },
});

export const saveCurrent = mutation({
  args: {
    workspaceJson: v.string(),
    baseRevision: v.number(),
  },
  returns: v.object({ revision: v.number() }),
  handler: async (ctx, { workspaceJson, baseRevision }) => {
    const identity = await requireIdentity(ctx);
    const clerkUserId = identity.subject;

    const tombstone = await ctx.db
      .query("deletedUsers")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();
    if (tombstone) {
      fail("account_deleted", "This account has been deleted.");
    }

    const now = Date.now();
    const row = await getWorkspaceRow(ctx, clerkUserId);
    const windowStart = row?.writeWindowStart ?? 0;
    const inWindow = now - windowStart < WRITE_WINDOW_MS;
    const writeCount = inWindow ? (row?.writeWindowCount ?? 0) + 1 : 1;
    if (writeCount > WORKSPACE_WRITES_PER_MINUTE) {
      fail("rate_limited", "Too many workspace saves. Try again shortly.", {
        retryAfterMs: windowStart + WRITE_WINDOW_MS - now,
      });
    }

    const currentRevision = row?.revision ?? 0;
    if (baseRevision !== currentRevision) {
      fail("revision_conflict", "The workspace was changed elsewhere.", { revision: currentRevision });
    }

    if (getUtf8ByteLength(workspaceJson) > DEFAULT_WORKSPACE_PERSISTENCE_LIMITS.maxSerializedBytes) {
      fail("too_large", "Workspace payload is too large.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(workspaceJson);
    } catch {
      fail("invalid_workspace", "Workspace payload must be valid JSON.");
    }
    const validation = validateWorkspaceForPersistence(parsed);
    if (!validation.ok) {
      fail(validation.reason === "too_large" ? "too_large" : "invalid_workspace", validation.message);
    }

    const profile = {
      email: typeof identity.email === "string" ? identity.email : "",
      firstName: typeof identity.givenName === "string" ? identity.givenName : null,
      lastName: typeof identity.familyName === "string" ? identity.familyName : null,
    };
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) {
      await ctx.db.insert("users", { clerkUserId, ...profile, updatedAt: now });
    } else if (
      user.email !== profile.email ||
      user.firstName !== profile.firstName ||
      user.lastName !== profile.lastName
    ) {
      await ctx.db.patch("users", user._id, { ...profile, updatedAt: now });
    }

    const revision = currentRevision + 1;
    const fields = {
      workspaceJson: validation.serializedWorkspace,
      revision,
      updatedAt: now,
      writeWindowStart: inWindow ? windowStart : now,
      writeWindowCount: writeCount,
    };
    if (row) {
      await ctx.db.patch("workspaces", row._id, fields);
    } else {
      await ctx.db.insert("workspaces", { clerkUserId, ...fields });
    }

    return { revision };
  },
});
