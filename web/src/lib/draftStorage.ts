// web/src/lib/draftStorage.ts
import type { UIState } from "../types";

const KEY = "dsb.draft.v1";

export interface Draft {
  state: UIState;
  savedAt: string; // ISO
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.state || typeof parsed.state !== "object") return null;
    return parsed as Draft;
  } catch {
    return null;
  }
}

export function saveDraft(state: UIState): Draft {
  const draft: Draft = {
    state,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch (e) {
    // Может вылететь QuotaExceededError на очень больших схемах
    console.warn("Не удалось сохранить черновик:", e);
  }
  return draft;
}

export function clearDraft(): void {
  localStorage.removeItem(KEY);
}

export function hasDraft(): boolean {
  return localStorage.getItem(KEY) !== null;
}
