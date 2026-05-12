export interface WorkspaceSyncUser {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

function getStringClaim(claims: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = claims?.[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

export function buildWorkspaceSyncUser(
  clerkUserId: string,
  claims: Record<string, unknown> | null | undefined,
): WorkspaceSyncUser {
  return {
    clerkUserId,
    email: getStringClaim(claims, ["email", "email_address", "primary_email_address"]) ?? "",
    firstName: getStringClaim(claims, ["first_name", "firstName"]),
    lastName: getStringClaim(claims, ["last_name", "lastName"]),
  };
}
