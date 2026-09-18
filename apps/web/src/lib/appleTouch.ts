interface NavigatorLike {
  maxTouchPoints?: number;
  platform?: string;
  userAgent?: string;
}

interface MediaQueryListLike {
  matches: boolean;
}

type MatchMediaLike = (query: string) => MediaQueryListLike;

export const TOUCH_TABLET_BREAKPOINT = 744;

export type TouchLayout = "phone" | "tablet" | null;

/**
 * Chooses the editor layout from viewport width and `(pointer: coarse)`. Narrow windows get the
 * phone layout even with a mouse; wide coarse-pointer screens get the tablet layout.
 */
export function getTouchLayout(viewportWidth: number, coarsePointer: boolean): TouchLayout {
  if (viewportWidth < TOUCH_TABLET_BREAKPOINT) {
    return "phone";
  }

  return coarsePointer ? "tablet" : null;
}

/** Only for Monaco's iOS input workarounds; layout decisions use getTouchLayout. */
export function isAppleTouchDevice(navigatorLike?: NavigatorLike | null): boolean {
  if (!navigatorLike) {
    return false;
  }

  const userAgent = navigatorLike.userAgent ?? "";
  const platform = navigatorLike.platform ?? "";
  const maxTouchPoints = navigatorLike.maxTouchPoints ?? 0;

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function supportsDesktopNativeDragAndDrop(
  matchMedia?: MatchMediaLike,
  navigatorLike?: NavigatorLike | null,
): boolean {
  if (isAppleTouchDevice(navigatorLike)) {
    return false;
  }

  if (typeof matchMedia !== "function") {
    return true;
  }

  return !matchMedia("(pointer: coarse)").matches;
}
