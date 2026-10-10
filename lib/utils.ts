import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Utilities for cleaning and formatting client names across Outreach Ops.
 * Strips provider-specific suffixes (e.g. 'Smartlead Account', 'Smartlead')
 * so clients are cleanly identified by their actual company/brand name.
 */
export function cleanClientName(name: unknown): string {
  if (typeof name !== "string") return "Unassigned";
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === "unassigned") return "Unassigned";

  const cleaned = trimmed
    .replace(/\s*-\s*smartlead\s*account\b/gi, "")
    .replace(/\s+smartlead\s+account\b/gi, "")
    .replace(/\s*-\s*smartlead\b/gi, "")
    .replace(/\s+smartlead\b/gi, "")
    .replace(/^smartlead\s*account\s*-\s*/gi, "")
    .replace(/^smartlead\s*-\s*/gi, "")
    .trim();

  return cleaned || trimmed;
}

export function createClientId(name: string): string {
  const cleaned = cleanClientName(name);
  const slug = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "unassigned";
}

export function getCleanInitials(name: string): string {
  const cleaned = cleanClientName(name);
  if (cleaned === "Unassigned") return "UA";
  const parts = cleaned.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}
