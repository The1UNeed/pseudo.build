"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  ClerkProvider as ClerkProviderBase,
  Show as ClerkShow,
  SignInButton as ClerkSignInButton,
  SignUpButton as ClerkSignUpButton,
  UserButton as ClerkUserButton,
  useAuth as useClerkAuth,
} from "@clerk/nextjs";
import { zhCN } from "@clerk/localizations";
import { localePath, type Locale } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/context";
import { getClientAppPlatform, platformUsesCloudSaving } from "@/lib/platform";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Clerk's built-in strings per locale; English is Clerk's default. */
const clerkLocalizations: Partial<Record<Locale, typeof zhCN>> = { zh: zhCN };

type AuthState = ReturnType<typeof useClerkAuth>;

export function isCloudAuthConfigured() {
  return Boolean(clerkPublishableKey);
}

function cloudAuthRequired() {
  if (typeof window === "undefined") {
    return false;
  }

  return platformUsesCloudSaving(getClientAppPlatform());
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = useDictionary().auth;

  if (!isCloudAuthConfigured()) {
    return <>{children}</>;
  }

  const base: Partial<typeof zhCN> = clerkLocalizations[locale] ?? {};

  return (
    <ClerkProviderBase
      publishableKey={clerkPublishableKey}
      signInUrl={localePath(locale, "/login")}
      signUpUrl={localePath(locale, "/login")}
      signInFallbackRedirectUrl={localePath(locale, "/app")}
      signUpFallbackRedirectUrl={localePath(locale, "/app")}
      afterSignOutUrl={localePath(locale, "/")}
      localization={{
        ...base,
        userButton: {
          ...base.userButton,
          action__manageAccount: t.manageAccount,
        },
        userProfile: {
          ...base.userProfile,
          navbar: {
            ...base.userProfile?.navbar,
            title: t.settingsTitle,
            description: t.settingsDescription,
          },
        },
      }}
      appearance={{
        elements: {
          modalBackdrop: {
            alignItems: "center",
            justifyContent: "center",
          },
          modalContent: {
            margin: "auto",
          },
          modalCloseButton: {
            backgroundColor: "transparent",
            border: "0",
            boxShadow: "none",
            outline: "none",
            "&:focus": {
              boxShadow: "none",
              outline: "none",
            },
            "&:focus-visible": {
              boxShadow: "none",
              outline: "none",
            },
          },
          userButtonAvatarBox: {
            boxShadow: "none",
          },
          userButtonTrigger: {
            boxShadow: "none",
            outline: "none",
            "&:focus": {
              boxShadow: "none",
              outline: "none",
            },
            "&:focus-visible": {
              boxShadow: "none",
              outline: "none",
            },
          },
        },
      }}
    >
      {children}
    </ClerkProviderBase>
  );
}

export function Show({ children, when }: ComponentProps<typeof ClerkShow>) {
  if (!cloudAuthRequired() || !isCloudAuthConfigured()) {
    return when === "signed-out" ? <>{children}</> : null;
  }

  return <ClerkShow when={when}>{children}</ClerkShow>;
}

export function SignInButton({
  children,
  ...props
}: ComponentProps<typeof ClerkSignInButton>) {
  if (!cloudAuthRequired() || !isCloudAuthConfigured()) {
    return <>{children}</>;
  }

  return (
    <ClerkSignInButton {...props}>
      {children}
    </ClerkSignInButton>
  );
}

export function SignUpButton({
  children,
  ...props
}: ComponentProps<typeof ClerkSignUpButton>) {
  if (!cloudAuthRequired() || !isCloudAuthConfigured()) {
    return <>{children}</>;
  }

  return (
    <ClerkSignUpButton {...props}>
      {children}
    </ClerkSignUpButton>
  );
}

function UserButtonBase(props: ComponentProps<typeof ClerkUserButton>) {
  if (!cloudAuthRequired() || !isCloudAuthConfigured()) {
    return null;
  }

  return <ClerkUserButton {...props} />;
}

export const UserButton = Object.assign(UserButtonBase, {
  Action: ClerkUserButton.Action,
  Link: ClerkUserButton.Link,
  MenuItems: ClerkUserButton.MenuItems,
  UserProfileLink: ClerkUserButton.UserProfileLink,
  UserProfilePage: ClerkUserButton.UserProfilePage,
});

export function useAuth() {
  if (!cloudAuthRequired() || !isCloudAuthConfigured()) {
    return {
      actor: null,
      getToken: async () => null,
      has: () => false,
      isLoaded: true,
      isSignedIn: false,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      sessionClaims: null,
      sessionId: null,
      signOut: async () => undefined,
      userId: null,
    } as AuthState;
  }

  // Clerk's hook is only reachable in configured builds, where AppAuthProvider
  // supplies the matching provider for this stable runtime branch.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkAuth();
}
