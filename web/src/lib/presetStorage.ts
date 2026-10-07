// web/src/lib/presetStorage.ts
import type { UIState } from "../types";

export interface UserPreset {
  id: string;
  name: string;
  description: string;
  state: UIState;
  createdAt: string; // ISO
}

const STORAGE_KEY = "dsb.userPresets.v1";

export function loadUserPresets(): UserPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUserPreset);
  } catch {
    return [];
  }
}

export function saveUserPresets(presets: UserPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function addUserPreset(
  preset: Omit<UserPreset, "id" | "createdAt">,
): UserPreset {
  const now = new Date();
  const id = `user_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: UserPreset = {
    ...preset,
    id,
    createdAt: now.toISOString(),
  };
  const all = loadUserPresets();
  all.push(full);
  saveUserPresets(all);
  return full;
}

export function updateUserPreset(
  id: string,
  patch: Partial<Omit<UserPreset, "id" | "createdAt">>,
): void {
  const all = loadUserPresets();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx]!, ...patch };
  saveUserPresets(all);
}

export function removeUserPreset(id: string): void {
  const all = loadUserPresets().filter((p) => p.id !== id);
  saveUserPresets(all);
}

export function exportUserPresetJson(preset: UserPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function parseUserPresetJson(text: string): UserPreset {
  const obj = JSON.parse(text);
  if (!isUserPreset(obj)) {
    throw new Error("Файл не является пресетом");
  }
  // На всякий случай выдаём новый id и время, если конфликтуют
  return {
    ...obj,
    id: obj.id || `imported_${Date.now()}`,
    createdAt: obj.createdAt || new Date().toISOString(),
  };
}

function isUserPreset(x: unknown): x is UserPreset {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.description === "string" &&
    typeof o.state === "object" &&
    o.state !== null
  );
}
