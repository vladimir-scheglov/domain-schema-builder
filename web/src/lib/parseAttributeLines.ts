import type { UIAttribute } from "../types";
import { generateKey } from "./generateKey";

export interface ParseResult {
  attributes: UIAttribute[];
  errors: Array<{ line: number; text: string; message: string }>;
}

/**
 * Парсит список атрибутов из текста.
 *
 * Поддерживаемые форматы (по одному на строку):
 *
 *   value: String                        — простой
 *   value: String : Значение             — с именем
 *   value: String : Значение : readonly  — с флагом
 *   - value: String                      — с дефисом
 *   value                                — только id, тип String
 *   # комментарий                        — игнорируется
 *   (пустая строка)                      — игнорируется
 */
export function parseAttributeLines(text: string): ParseResult {
  const attributes: UIAttribute[] = [];
  const errors: ParseResult["errors"] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.trim();

    // Пустая строка или комментарий
    if (!line || line.startsWith("#")) continue;

    // Убираем "- " в начале, если есть
    const stripped = line.replace(/^-\s+/, "");

    // Разбираем по первому двоеточию, чтобы type мог содержать ":"
    // Пример: "status: enum(Status)"
    // Но нам нужен только id до первого ":"
    const colonIdx = stripped.indexOf(":");

    // Случай 1: только id (без типа)
    if (colonIdx === -1) {
      const id = stripped.trim();
      if (!isValidId(id)) {
        errors.push({
          line: i + 1,
          text: raw,
          message: `Некорректный ID: "${id}"`,
        });
        continue;
      }
      attributes.push(createAttr(id, "String", "", false));
      continue;
    }

    const id = stripped.slice(0, colonIdx).trim();
    const rest = stripped.slice(colonIdx + 1).trim();

    if (!isValidId(id)) {
      errors.push({
        line: i + 1,
        text: raw,
        message: `Некорректный ID: "${id}"`,
      });
      continue;
    }

    // rest = "type" | "type : name" | "type : name : readonly"
    // Разбираем по ":" — но осторожно, потому что type может содержать ":"
    // вложенности (маловероятно, но enum(...) или Array<...> — безопасно).
    // Разбиваем по " : " (с пробелами), чтобы не ломать "enum(X)".
    const parts = rest.split(/\s+:\s+/);
    const type = parts[0]?.trim() ?? "String";
    const name = parts[1]?.trim() ?? "";
    const flags = parts.slice(2).map((s) => s.trim().toLowerCase());

    const readonly = flags.includes("readonly") || flags.includes("r");

    // Проверим, что тип не пустой
    if (!type) {
      errors.push({
        line: i + 1,
        text: raw,
        message: `Пустой тип данных`,
      });
      continue;
    }

    attributes.push(createAttr(id, type, name, readonly));
  }

  return { attributes, errors };
}

function createAttr(
  id: string,
  type: string,
  name: string,
  readonly: boolean,
): UIAttribute {
  const attr: UIAttribute = {
    _key: generateKey(),
    id,
    name,
    type,
    default: "",
    readonly,
  };

  // Identifier без параметров — генерируем sequence по умолчанию
  if (type === "Identifier") {
    attr.template = "{@prefix}-{@inc}";
    attr.defaultPrefix = "ID";
    attr.incrementTemplate = "0000";
  }

  return attr;
}

/**
 * Проверка ID атрибута:
 * - латиница, цифры
 * - начинается с буквы
 * - ≤ 30 символов
 */
function isValidId(id: string): boolean {
  if (!id) return false;
  if (id.length > 30) return false;
  return /^[A-Za-z][A-Za-z0-9]*$/.test(id);
}