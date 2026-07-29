import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATARS = [
  "🦊", "🐢", "🦉", "🐙", "🦝", "🐝", "🦋", "🦄",
  "🐞", "🦔", "🦡", "🦏", "🦌", "🐯", "🦁", "🐼",
];

export function avatarFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATARS[hash % AVATARS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatScore(score: number): string {
  return score.toLocaleString("en-US");
}
