import { describe, expect, it } from "vitest";
import { buildWorkspaceSyncUser } from "./workspaceUser";

describe("buildWorkspaceSyncUser", () => {
  it("normalizes missing profile claims for Convex", () => {
    expect(buildWorkspaceSyncUser({ email: "alex@example.com" })).toEqual({
      email: "alex@example.com",
      firstName: null,
      lastName: null,
    });
  });

  it("supports Clerk claim naming variants", () => {
    expect(
      buildWorkspaceSyncUser({
        email_address: "alex@example.com",
        first_name: "Alex",
        last_name: "Dev",
      }),
    ).toEqual({
      email: "alex@example.com",
      firstName: "Alex",
      lastName: "Dev",
    });
  });
});
