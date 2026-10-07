// web/src/components/dsl-editor/emmet.ts

export interface EmmetResult {
  /** Текст для вставки вместо аббревиатуры */
  yaml: string;
  /** Позиция курсора после вставки, относительно начала yaml */
  cursorOffset?: number;
  /** В какой секции DSL находится результат (для подсказки) */
  scope?:
    | "entities"
    | "enums"
    | "workflows"
    | "links"
    | "trees"
    | "menus"
    | "top";
}

/**
 * Проверяет, похожа ли строка на Emmet-аббревиатуру нашего DSL.
 * Если да — разворачивает. Если нет — возвращает null.
 */
export function expandEmmet(input: string): EmmetResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Определяем тип по префиксу
  if (trimmed.startsWith("ent:")) return expandEntity(trimmed);
  if (trimmed.startsWith("enum:")) return expandEnum(trimmed);
  if (trimmed.startsWith("wf:")) return expandWorkflow(trimmed);
  if (trimmed.startsWith("link:")) return expandLink(trimmed);
  if (trimmed.startsWith("tree:")) return expandTree(trimmed);
  if (trimmed.startsWith("menu:")) return expandMenu(trimmed);
  if (trimmed.startsWith("ref:")) return expandRef(trimmed);
  if (trimmed.startsWith("arr:")) return expandArray(trimmed);
  if (trimmed.startsWith("arrRef:")) return expandArrayRef(trimmed);

  return null;
}

// ============================================================
// Entity
// ============================================================

/**
 * ent:Ioc
 * ent:Ioc : Индикатор
 * ent:Ioc ~ Device
 * ent:Ioc > title:String, value:String
 * ent:Ioc : Индикатор ~ Device > title:String
 */
function expandEntity(input: string): EmmetResult | null {
  // Убираем префикс
  let rest = input.slice("ent:".length).trim();
  if (!rest) return null;

  // Отделяем атрибуты по ">"
  let attrPart = "";
  const gtIdx = rest.indexOf(">");
  if (gtIdx !== -1) {
    attrPart = rest.slice(gtIdx + 1).trim();
    rest = rest.slice(0, gtIdx).trim();
  }

  // Теперь rest = "Ioc" | "Ioc : Индикатор" | "Ioc ~ Device" | "Ioc : Индикатор ~ Device"
  // Найдём наследование
  let inherits = "";
  const tildeIdx = rest.indexOf("~");
  if (tildeIdx !== -1) {
    inherits = rest.slice(tildeIdx + 1).trim();
    rest = rest.slice(0, tildeIdx).trim();
  }

  // Найдём name
  let name = "";
  const colonIdx = rest.indexOf(":");
  if (colonIdx !== -1) {
    name = rest.slice(colonIdx + 1).trim();
    rest = rest.slice(0, colonIdx).trim();
  }

  const id = rest.trim();
  if (!id || !/^[A-Za-z][\w]*$/.test(id)) return null;

  // Парсим атрибуты
  const attrs = parseAttributes(attrPart);

  // Собираем YAML
  const lines: string[] = [];
  lines.push(`${id}:`);
  if (name) lines.push(`  name: ${name}`);
  if (!name) lines.push(`  name: ${id}`);
  lines.push(`  label: "{title}"`);
  if (inherits) lines.push(`  inherits: ${inherits}`);

  if (attrs.length > 0) {
    lines.push(`  attributes:`);
    for (const a of attrs) {
      if (isSimpleAttr(a)) {
        lines.push(`    ${a.id}: ${a.type}`);
      } else {
        lines.push(`    ${a.id}:`);
        lines.push(`      type: ${a.type}`);
        if (a.name) lines.push(`      name: ${a.name}`);
        if (a.readonly) lines.push(`      readonly: true`);
        if (a.default !== undefined) lines.push(`      default: ${a.default}`);
      }
    }
  } else {
    lines.push(`  attributes:`);
    lines.push(`    title: String`);
  }

  return {
    yaml: lines.join("\n"),
    cursorOffset: lines.join("\n").length,
    scope: "entities",
  };
}

interface ParsedAttr {
  id: string;
  type: string;
  name?: string;
  readonly?: boolean;
  default?: string;
}

function parseAttributes(text: string): ParsedAttr[] {
  if (!text) return [];

  // Разделяем по запятой, но не внутри скобок
  const parts = splitByCommaOutsideParens(text);
  const attrs: ParsedAttr[] = [];

  for (const part of parts) {
    const a = parseOneAttribute(part.trim());
    if (a) attrs.push(a);
  }

  return attrs;
}

function parseOneAttribute(text: string): ParsedAttr | null {
  if (!text) return null;

  // Ищем первое ":"
  const firstColon = text.indexOf(":");
  if (firstColon === -1) {
    // Просто id — дефолтный тип String
    if (!/^[a-zA-Z][\w]*$/.test(text)) return null;
    return { id: text, type: "String" };
  }

  const id = text.slice(0, firstColon).trim();
  if (!/^[a-zA-Z][\w]*$/.test(id)) return null;

  let rest = text.slice(firstColon + 1);

  // Тип может содержать скобки и "<...>". Найдём его конец.
  // Если начинается с Array< — искать до ">"
  // Если начинается с enum( / workflow( / Reference( — до ")"
  // Иначе — до следующего ":"

  const type = extractType(rest);
  if (!type) return null;

  rest = rest.slice(type.length);

  // Осталось ":Name:readonly:default" или пусто
  const extras = rest.split(":").map((s) => s.trim());
  // extras[0] всегда '' (потому что split от ':')
  // extras[1] = name, extras[2] = readonly?, extras[3] = default?

  const a: ParsedAttr = { id, type };

  if (extras.length > 1 && extras[1]) {
    a.name = extras[1];
  }
  if (extras.length > 2 && extras[2] === "readonly") {
    a.readonly = true;
  }
  if (extras.length > 3 && extras[3]) {
    a.default = extras[3];
  }

  return a;
}

/**
 * Извлекает тип из начала строки.
 *   "String"             → "String"
 *   "enum(Status)"       → "enum(Status)"
 *   "Array<Reference(X)>" → "Array<Reference(X)>"
 */
function extractType(text: string): string | null {
  // Array<...>
  if (text.startsWith("Array<")) {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "<") depth++;
      else if (ch === ">") {
        depth--;
        if (depth === 0) {
          return text.slice(0, i + 1);
        }
      }
    }
    return null;
  }

  // enum( / workflow( / Reference(
  if (
    text.startsWith("enum(") ||
    text.startsWith("workflow(") ||
    text.startsWith("Reference(")
  ) {
    const closeIdx = text.indexOf(")");
    if (closeIdx === -1) return null;
    return text.slice(0, closeIdx + 1);
  }

  // Простой тип — до ':' или до конца
  const colonIdx = text.indexOf(":");
  if (colonIdx === -1) return text.trim();
  return text.slice(0, colonIdx).trim();
}

function isSimpleAttr(a: ParsedAttr): boolean {
  return !a.name && !a.readonly && a.default === undefined;
}

/** Разделяет строку по запятым, но не внутри круглых или угловых скобок */
function splitByCommaOutsideParens(text: string): string[] {
  const parts: string[] = [];
  let depthParen = 0;
  let depthAngle = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "(") depthParen++;
    else if (ch === ")") depthParen--;
    else if (ch === "<") depthAngle++;
    else if (ch === ">") depthAngle--;
    else if (ch === "," && depthParen === 0 && depthAngle === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(text.slice(start));
  return parts.filter((p) => p.trim().length > 0);
}

// ============================================================
// Enum
// ============================================================

/**
 * enum:Status > OPEN:Открыт, IN_PROGRESS:В работе
 * enum:Priority > LOW, MEDIUM, HIGH
 */
function expandEnum(input: string): EmmetResult | null {
  let rest = input.slice("enum:".length).trim();
  if (!rest) return null;

  let valuesPart = "";
  const gtIdx = rest.indexOf(">");
  if (gtIdx !== -1) {
    valuesPart = rest.slice(gtIdx + 1).trim();
    rest = rest.slice(0, gtIdx).trim();
  }

  const id = rest.trim();
  if (!id || !/^[A-Za-z][\w]*$/.test(id)) return null;

  const lines: string[] = [];
  lines.push(`${id}:`);

  if (valuesPart) {
    const values = valuesPart
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    for (const v of values) {
      const colonIdx = v.indexOf(":");
      if (colonIdx === -1) {
        lines.push(`  ${v}: ${v}`);
      } else {
        const vid = v.slice(0, colonIdx).trim();
        const vname = v.slice(colonIdx + 1).trim();
        lines.push(`  ${vid}: ${vname}`);
      }
    }
  } else {
    // Пустой enum — дефолтные значения
    lines.push(`  VALUE1: Значение 1`);
    lines.push(`  VALUE2: Значение 2`);
  }

  return {
    yaml: lines.join("\n"),
    cursorOffset: lines.join("\n").length,
    scope: "enums",
  };
}

// ============================================================
// Workflow
// ============================================================

/**
 * wf:TaskWorkflow > todo:К выполнению, inProgress:В работе, done:Готово
 * wf:TaskWorkflow > todo -> inProgress -> done
 */
function expandWorkflow(input: string): EmmetResult | null {
  let rest = input.slice("wf:".length).trim();
  if (!rest) return null;

  let bodyPart = "";
  const gtIdx = rest.indexOf(">");
  if (gtIdx !== -1) {
    bodyPart = rest.slice(gtIdx + 1).trim();
    rest = rest.slice(0, gtIdx).trim();
  }

  const id = rest.trim();
  if (!id || !/^[A-Za-z][\w]*$/.test(id)) return null;

  let statuses: Array<{ id: string; name?: string }> = [];
  let transitions: Array<{ from: string; to: string }> = [];

  if (bodyPart) {
    if (bodyPart.includes("->")) {
      // Формат с переходами
      const parts = bodyPart.split("->").map((s) => s.trim());
      statuses = parts.map((p) => ({ id: p }));
      for (let i = 0; i < parts.length - 1; i++) {
        transitions.push({ from: parts[i]!, to: parts[i + 1]! });
      }
    } else {
      // Формат через запятую
      const parts = bodyPart
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of parts) {
        const colonIdx = p.indexOf(":");
        if (colonIdx === -1) statuses.push({ id: p });
        else
          statuses.push({
            id: p.slice(0, colonIdx).trim(),
            name: p.slice(colonIdx + 1).trim(),
          });
      }
    }
  } else {
    statuses = [
      { id: "draft", name: "Черновик" },
      { id: "published", name: "Опубликован" },
    ];
    transitions = [{ from: "draft", to: "published" }];
  }

  const lines: string[] = [];
  lines.push(`${id}:`);
  lines.push(`  name: ${id}`);
  lines.push(`  initial: ${statuses[0]?.id ?? "draft"}`);

  if (statuses.length) {
    lines.push(`  statuses:`);
    for (const s of statuses) {
      lines.push(`    ${s.id}${s.name ? `: ${s.name}` : `: ${s.id}`}`);
    }
  }

  if (transitions.length) {
    lines.push(`  transitions:`);
    for (const t of transitions) {
      lines.push(`    - ${t.from} -> ${t.to}`);
    }
  }

  return {
    yaml: lines.join("\n"),
    cursorOffset: lines.join("\n").length,
    scope: "workflows",
  };
}

// ============================================================
// Link
// ============================================================

/**
 * link:Ioc > n:n > Incident
 * link:User > 1:n > Device
 */
function expandLink(input: string): EmmetResult | null {
  let rest = input.slice("link:".length).trim();
  if (!rest) return null;

  const parts = rest.split(">").map((s) => s.trim());
  if (parts.length < 3) return null;

  const [from, type, to] = parts;
  if (!from || !type || !to) return null;

  // Проверим формат типа
  const normalizedType = type.replace(":", ":").replace(" ", "");
  if (!/^[1n]:[1n]$/.test(normalizedType)) return null;

  const lines: string[] = [];
  lines.push(`${from}:`);
  lines.push(`  - ${normalizedType} ${to}`);

  return {
    yaml: lines.join("\n"),
    cursorOffset: lines.join("\n").length,
    scope: "links",
  };
}

// ============================================================
// Tree
// ============================================================

/**
 * tree:RiskTree > RiskAssessment > RiskCategory > Risk
 */
function expandTree(input: string): EmmetResult | null {
  let rest = input.slice("tree:".length).trim();
  if (!rest) return null;

  const gtIdx = rest.indexOf(">");
  if (gtIdx === -1) return null;

  const id = rest.slice(0, gtIdx).trim();
  const chain = rest.slice(gtIdx + 1).trim();

  if (!id) return null;

  return {
    yaml: `${id}: ${chain}`,
    cursorOffset: id.length + 2 + chain.length,
    scope: "trees",
  };
}

// ============================================================
// Menu
// ============================================================

/**
 * menu:Ioc, IocSource, Incident
 */
function expandMenu(input: string): EmmetResult | null {
  const rest = input.slice("menu:".length).trim();
  if (!rest) return null;

  const items = rest
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return null;

  const lines: string[] = items.map((i) => `- ${i}`);

  return {
    yaml: lines.join("\n"),
    cursorOffset: lines.join("\n").length,
    scope: "menus",
  };
}

// ============================================================
// Ref / Array / ArrayRef
// ============================================================

function expandRef(input: string): EmmetResult | null {
  const id = input.slice("ref:".length).trim();
  if (!id) return null;
  return {
    yaml: `Reference(${id})`,
    cursorOffset: `Reference(${id})`.length,
  };
}

function expandArray(input: string): EmmetResult | null {
  const type = input.slice("arr:".length).trim();
  if (!type) return null;
  return {
    yaml: `Array<${type}>`,
    cursorOffset: `Array<${type}>`.length,
  };
}

function expandArrayRef(input: string): EmmetResult | null {
  const id = input.slice("arrRef:".length).trim();
  if (!id) return null;
  return {
    yaml: `Array<Reference(${id})>`,
    cursorOffset: `Array<Reference(${id})>`.length,
  };
}
