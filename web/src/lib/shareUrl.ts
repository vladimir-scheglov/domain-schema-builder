// web/src/lib/shareUrl.ts
import type { UIState } from "../types";

/**
 * Кодирует состояние в base64url (URL-safe).
 * Использует UTF-8 → base64 с заменой символов для URL.
 */
export function encodeState(state: UIState): string {
  const json = JSON.stringify(state);
  const utf8 = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < utf8.length; i++) {
    binary += String.fromCharCode(utf8[i]!);
  }
  const base64 = btoa(binary);
  // URL-safe base64
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeState(encoded: string): UIState | null {
  try {
    // Восстанавливаем padding
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as UIState;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: UIState): string {
  const encoded = encodeState(state);
  const url = new URL(window.location.href);
  url.searchParams.set("state", encoded);
  url.searchParams.delete("preset"); // убираем, если был
  return url.toString();
}
