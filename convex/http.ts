import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Clerk -> Convex webhook. Configure in the Clerk dashboard with the endpoint
// `<convex-site-url>/clerk/webhook` and subscribe to `user.deleted`. The
// signing secret must be set as CLERK_WEBHOOK_SECRET on the Convex deployment.
http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Webhook secret is not configured.", { status: 503 });
    }

    const payload = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    };

    let event: unknown;
    try {
      // svix 2.x verify() throws on a bad signature but returns nothing, so parse the verified payload here.
      new Webhook(secret).verify(payload, headers);
      event = JSON.parse(payload);
    } catch {
      return new Response("Invalid webhook signature.", { status: 400 });
    }

    const { type, data } = (event ?? {}) as { type?: unknown; data?: { id?: unknown } | null };
    if (type === "user.deleted" && typeof data?.id === "string") {
      await ctx.runMutation(internal.users.deleteByClerkUserId, { clerkUserId: data.id });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
