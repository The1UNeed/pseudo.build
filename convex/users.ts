import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/** Removes every record owned by a Clerk user. Called from the Clerk `user.deleted` webhook. */
export const deleteByClerkUserId = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .collect();
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .collect();

    for (const record of [...users, ...workspaces]) {
      await ctx.db.delete(record._id);
    }

    return { deletedUsers: users.length, deletedWorkspaces: workspaces.length };
  },
});
