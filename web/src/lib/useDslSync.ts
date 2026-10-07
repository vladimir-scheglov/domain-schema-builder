// web/src/lib/useDslSync.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { uiToDsl } from "./toDsl";
import { loadDslFromText } from "./loadDsl";

export interface UseDslSyncOptions {
  /**
   * Задержка перед применением DSL к state.
   * По умолчанию 500 мс.
   */
  debounceMs?: number;

  /**
   * Минимальная длина DSL, при которой применяем изменения.
   * Защита от случайного удаления всего текста.
   * По умолчанию 10 символов.
   */
  minLength?: number;
}

export interface UseDslSyncResult {
  /** Текущий текст DSL в textarea */
  dslText: string;

  /** Ошибки парсинга/валидации, если были */
  error: string | null;

  /** Обновить текст DSL (вызывается из onChange) */
  update: (text: string) => void;

  /** Пользователь начал редактировать (вызывается из onFocus) */
  beginEditing: () => void;

  /** Пользователь закончил редактирование (вызывается из onBlur) */
  endEditing: () => void;

  /** Позиция курсора — для восстановления после перерисовки */
  selectionRef: React.MutableRefObject<{ start: number; end: number } | null>;
}

export function useDslSync(opts: UseDslSyncOptions = {}): UseDslSyncResult {
  const { debounceMs = 500, minLength = 10 } = opts;
  const { state, dispatch } = useStore();

  // Локальный текст — источник правды для textarea
  const [dslText, setDslText] = useState<string>(() => uiToDsl(state));

  // Ошибки парсинга/валидации
  const [error, setError] = useState<string | null>(null);

  // Флаг: пользователь сейчас редактирует DSL
  const isEditingRef = useRef(false);

  // Таймер debounce
  const debounceRef = useRef<number | null>(null);

  // Позиция курсора
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  // === UI → DSL ===
  // Когда state меняется из UI, обновляем dslText, если пользователь НЕ в DSL.
  useEffect(() => {
    if (isEditingRef.current) return;
    setDslText((prev) => {
      const next = uiToDsl(state);
      return prev === next ? prev : next;
    });
  }, [state]);

  // === DSL → UI ===
  const update = useCallback(
    (text: string) => {
      setDslText(text);
      setError(null);

      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(() => {
        // Защита от случайного стирания
        if (text.trim().length < minLength) {
          setError("DSL слишком короткий для применения");
          return;
        }

        const result = loadDslFromText(text);

        if (result.ok && result.state) {
          dispatch({ type: "load", state: result.state });

          if (result.errors.length > 0) {
            setError(
              "Предупреждения:\n" +
                result.errors.map((e) => `• ${e.message}`).join("\n"),
            );
          } else {
            setError(null);
          }
        } else {
          // Парсинг упал — не трогаем state, показываем ошибку
          setError(
            "Ошибки DSL:\n" +
              result.errors.map((e) => `• ${e.message}`).join("\n"),
          );
        }
      }, debounceMs);
    },
    [dispatch, debounceMs, minLength],
  );

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // === Управление фокусом ===
  const beginEditing = useCallback(() => {
    isEditingRef.current = true;
  }, []);

  const endEditing = useCallback(() => {
    isEditingRef.current = false;
  }, []);

  return {
    dslText,
    error,
    update,
    beginEditing,
    endEditing,
    selectionRef,
  };
}
