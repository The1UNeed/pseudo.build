import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

type ClerkWebhookEvent = {
  type: string;
  data: { id?: string; deleted?: boolean };
};

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

    let event: ClerkWebhookEvent;
    try {
      event = new Webhook(secret).verify(payload, headers) as unknown as ClerkWebhookEvent;
    } catch {
      return new Response("Invalid webhook signature.", { status: 400 });
    }

    if (event.type === "user.deleted" && typeof event.data.id === "string") {
      await ctx.runMutation(internal.users.deleteByClerkUserId, { clerkUserId: event.data.id });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
