// web/src/hooks/useHotkeys.ts
import { useEffect } from "react";

export interface Hotkey {
  /** 'n' | 'a' | 'cmd+d' | 'cmd+k' | 'shift+s' | 'escape' ... */
  combo: string;
  handler: () => void;
  /** Не срабатывать, если фокус в поле ввода (по умолчанию true для одиночных клавиш) */
  ignoreInInput?: boolean;
  /** preventDefault при срабатывании */
  preventDefault?: boolean;
}

export function useHotkeys(hotkeys: Hotkey[], enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Проверяем фокус
      const target = e.target as HTMLElement | null;
      const isInInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Собираем комбо текущего события
      const combo = buildCombo(e);

      for (const hk of hotkeys) {
        if (hk.combo !== combo) continue;

        // Одиночные клавиши: игнорируем в input по умолчанию
        const ignoreInInput = hk.ignoreInInput ?? isSingleKey(hk.combo);
        if (isInInput && ignoreInInput) continue;

        if (hk.preventDefault !== false) {
          e.preventDefault();
        }

        hk.handler();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeys, enabled]);
}

function buildCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("cmd");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  parts.push(e.key.toLowerCase());
  return parts.join("+");
}

function isSingleKey(combo: string): boolean {
  return !combo.includes("+");
}
