import type { Locale } from "../config";
import { en } from "./en";
import { zh } from "./zh";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, zh };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
