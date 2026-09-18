import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Removes every record owned by a Clerk user and leaves a tombstone so an open tab can't recreate them.
 * Called from the Clerk `user.deleted` webhook.
 */
export const deleteByClerkUserId = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.object({ deletedUsers: v.number(), deletedWorkspaces: v.number() }),
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();
    const tombstone = await ctx.db
      .query("deletedUsers")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
      .unique();

    if (user) {
      await ctx.db.delete("users", user._id);
    }
    if (workspace) {
      await ctx.db.delete("workspaces", workspace._id);
    }
    if (!tombstone) {
      await ctx.db.insert("deletedUsers", { clerkUserId, deletedAt: Date.now() });
    }

    return { deletedUsers: user ? 1 : 0, deletedWorkspaces: workspace ? 1 : 0 };
  },
});
