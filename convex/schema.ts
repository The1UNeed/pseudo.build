import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.union(v.string(), v.null()),
    lastName: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  }).index("by_clerk_user", ["clerkUserId"]),
  workspaces: defineTable({
    clerkUserId: v.string(),
    workspaceJson: v.string(),
    // Optional so rows written before revisions existed still validate. A missing value means 0.
    revision: v.optional(v.number()),
    updatedAt: v.number(),
    // Fixed one-minute write window used by the per-user save rate limit.
    writeWindowStart: v.optional(v.number()),
    writeWindowCount: v.optional(v.number()),
  }).index("by_clerk_user", ["clerkUserId"]),
  // Written by the Clerk `user.deleted` webhook so a still-valid session can't recreate the rows.
  deletedUsers: defineTable({
    clerkUserId: v.string(),
    deletedAt: v.number(),
  }).index("by_clerk_user", ["clerkUserId"]),
});
