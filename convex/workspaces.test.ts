import { convexTest } from "convex-test";
import { Webhook } from "svix";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultWorkspace } from "../packages/workspace/src/index";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { WORKSPACE_WRITES_PER_MINUTE } from "./workspaces";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./**/*.ts");
const alice = { subject: "user_a", email: "a@example.com", givenName: "Alice" };
const bob = { subject: "user_b", email: "b@example.com" };
const webhookSecret = `whsec_${btoa("pseudo-build-test-webhook-secret")}`;

function workspaceJson(source: string) {
  return JSON.stringify(createDefaultWorkspace({ sampleSource: source, now: "2026-03-15T00:00:00.000Z" }));
}

function sourceOf(json: string | null) {
  return json ? (JSON.parse(json) as { nodes: Record<string, { source?: string }> }).nodes["doc-main"]?.source : null;
}

async function errorCode(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  return (error as { data?: { code?: string } } | null)?.data?.code ?? null;
}

function signedWebhook(body: unknown) {
  const payload = JSON.stringify(body);
  const id = "msg_test";
  const timestamp = new Date();
  return {
    method: "POST",
    body: payload,
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": new Webhook(webhookSecret).sign(id, timestamp, payload),
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("workspaces", () => {
  it("keeps each user's row private", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(alice).mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("A"), baseRevision: 0 });

    expect(await t.withIdentity(bob).query(api.workspaces.getCurrent, {})).toEqual({ workspaceJson: null, revision: 0 });
    await t.withIdentity(bob).mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("B"), baseRevision: 0 });

    const aliceRow = await t.withIdentity(alice).query(api.workspaces.getCurrent, {});
    expect(sourceOf(aliceRow.workspaceJson)).toBe("A");
    expect(aliceRow.revision).toBe(1);
  });

  it("rejects unauthenticated reads and writes", async () => {
    const t = convexTest(schema, modules);
    expect(await errorCode(t.query(api.workspaces.getCurrent, {}))).toBe("unauthenticated");
    expect(
      await errorCode(t.mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("x"), baseRevision: 0 })),
    ).toBe("unauthenticated");
  });

  it("rejects a stale base revision and returns the current one", async () => {
    const t = convexTest(schema, modules).withIdentity(alice);
    expect(await t.mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("v1"), baseRevision: 0 })).toEqual({
      revision: 1,
    });

    const stale = await t
      .mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("stale"), baseRevision: 0 })
      .catch((error: { data: unknown }) => error.data);
    expect(stale).toMatchObject({ code: "revision_conflict", revision: 1 });
    expect(sourceOf((await t.query(api.workspaces.getCurrent, {})).workspaceJson)).toBe("v1");

    expect(await t.mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("v2"), baseRevision: 1 })).toEqual({
      revision: 2,
    });
  });

  it("rate limits writes per user and recovers after the window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T00:00:00.000Z"));
    const t = convexTest(schema, modules).withIdentity(alice);
    const json = workspaceJson("x");

    for (let revision = 0; revision < WORKSPACE_WRITES_PER_MINUTE; revision += 1) {
      await t.mutation(api.workspaces.saveCurrent, { workspaceJson: json, baseRevision: revision });
    }
    expect(
      await errorCode(
        t.mutation(api.workspaces.saveCurrent, { workspaceJson: json, baseRevision: WORKSPACE_WRITES_PER_MINUTE }),
      ),
    ).toBe("rate_limited");

    vi.setSystemTime(new Date("2026-09-15T00:01:01.000Z"));
    expect(
      await t.mutation(api.workspaces.saveCurrent, { workspaceJson: json, baseRevision: WORKSPACE_WRITES_PER_MINUTE }),
    ).toEqual({ revision: WORKSPACE_WRITES_PER_MINUTE + 1 });
  });

  it("validates payloads with the shared validator and takes the profile from the token", async () => {
    const t = convexTest(schema, modules);
    const asAlice = t.withIdentity(alice);
    expect(await errorCode(asAlice.mutation(api.workspaces.saveCurrent, { workspaceJson: "{", baseRevision: 0 }))).toBe(
      "invalid_workspace",
    );

    const fileNode = JSON.parse(workspaceJson("x"));
    fileNode.nodes["doc-main"].type = "file";
    expect(
      await errorCode(
        asAlice.mutation(api.workspaces.saveCurrent, { workspaceJson: JSON.stringify(fileNode), baseRevision: 0 }),
      ),
    ).toBe("invalid_workspace");

    await asAlice.mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("ok"), baseRevision: 0 });
    const users = await t.run(async (ctx) => await ctx.db.query("users").take(10));
    expect(users).toMatchObject([{ clerkUserId: "user_a", email: "a@example.com", firstName: "Alice", lastName: null }]);
  });

  it("reports corrupt stored JSON instead of an empty workspace", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("workspaces", { clerkUserId: "user_a", workspaceJson: "{broken", updatedAt: 0 });
    });
    expect(await errorCode(t.withIdentity(alice).query(api.workspaces.getCurrent, {}))).toBe("corrupt_workspace");
  });
});

describe("Clerk webhook", () => {
  it("rejects a bad signature", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SECRET", webhookSecret);
    const t = convexTest(schema, modules);
    const request = signedWebhook({ type: "user.deleted", data: { id: "user_a" } });
    const response = await t.fetch("/clerk/webhook", {
      ...request,
      headers: { ...request.headers, "svix-signature": "v1,aW52YWxpZA==" },
    });
    expect(response.status).toBe(400);
  });

  it("deletes both rows on user.deleted and blocks re-creation", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SECRET", webhookSecret);
    const t = convexTest(schema, modules);
    await t.withIdentity(alice).mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("A"), baseRevision: 0 });
    await t.withIdentity(bob).mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("B"), baseRevision: 0 });

    const response = await t.fetch("/clerk/webhook", signedWebhook({ type: "user.deleted", data: { id: "user_a" } }));
    expect(response.status).toBe(200);

    const remaining = await t.run(async (ctx) => ({
      users: (await ctx.db.query("users").take(10)).map((row) => row.clerkUserId),
      workspaces: (await ctx.db.query("workspaces").take(10)).map((row) => row.clerkUserId),
    }));
    expect(remaining).toEqual({ users: ["user_b"], workspaces: ["user_b"] });

    expect(
      await errorCode(
        t.withIdentity(alice).mutation(api.workspaces.saveCurrent, { workspaceJson: workspaceJson("again"), baseRevision: 0 }),
      ),
    ).toBe("account_deleted");
    expect(await t.mutation(internal.users.deleteByClerkUserId, { clerkUserId: "user_a" })).toEqual({
      deletedUsers: 0,
      deletedWorkspaces: 0,
    });
  });
});
