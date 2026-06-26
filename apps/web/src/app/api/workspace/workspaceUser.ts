export interface WorkspaceSyncUser {
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

export function buildWorkspaceSyncUser(claims: Record<string, unknown> | null | undefined): WorkspaceSyncUser {
  return {
    email: getStringClaim(claims, ["email", "email_address", "primary_email_address"]) ?? "",
    firstName: getStringClaim(claims, ["first_name", "firstName"]),
    lastName: getStringClaim(claims, ["last_name", "lastName"]),
  };
}
