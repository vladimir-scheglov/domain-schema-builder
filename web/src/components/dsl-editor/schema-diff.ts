// web/src/components/dsl-editor/schema-diff.ts
import { parse as parseYaml } from "yaml";

// ============================================================
// Типы
// ============================================================

export type ElementKind =
  | "entity"
  | "attribute"
  | "linkage"
  | "enum"
  | "workflow"
  | "tree"
  | "action"
  | "view";

export interface SchemaElement {
  kind: ElementKind;
  id: string;
  parentId?: string;
  /** Хеш содержимого для быстрого сравнения */
  signature: string;
  /** Сырой объект для дальнейшего сравнения полей */
  raw: Record<string, unknown>;
}

export type ElementChange = "added" | "removed" | "modified";

export interface FieldChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface ElementDiff {
  kind: ElementKind;
  id: string;
  parentId?: string;
  change: ElementChange;
  /** Изменённые поля — только для change === 'modified' */
  fieldChanges?: FieldChange[];
}

// ============================================================
// Парсинг схемы
// ============================================================

export function parseSchemaElements(
  schema: string,
): Map<string, SchemaElement> {
  const elements = new Map<string, SchemaElement>();

  let root: Record<string, unknown>;
  try {
    root = parseYaml(schema) as Record<string, unknown>;
  } catch {
    return elements;
  }

  if (!root || typeof root !== "object") return elements;

  // entities + attributes
  if (Array.isArray(root.entities)) {
    for (const entity of root.entities) {
      const e = entity as Record<string, unknown>;
      const id = String(e.id ?? "");
      if (!id) continue;

      elements.set(`entity:${id}`, {
        kind: "entity",
        id,
        signature: hash(JSON.stringify(e)),
        raw: e,
      });

      // attributes
      if (Array.isArray(e.attributes)) {
        for (const attr of e.attributes) {
          const a = attr as Record<string, unknown>;
          const aid = String(a.id ?? "");
          if (!aid) continue;
          elements.set(`attribute:${id}.${aid}`, {
            kind: "attribute",
            id: aid,
            parentId: id,
            signature: hash(JSON.stringify(a)),
            raw: a,
          });
        }
      }
    }
  }

  // linkages + attributes связей
  if (Array.isArray(root.linkages)) {
    for (const link of root.linkages) {
      const l = link as Record<string, unknown>;
      const id = String(l.id ?? "");
      if (!id) continue;

      elements.set(`linkage:${id}`, {
        kind: "linkage",
        id,
        signature: hash(JSON.stringify(l)),
        raw: l,
      });

      if (Array.isArray(l.attributes)) {
        for (const attr of l.attributes) {
          const a = attr as Record<string, unknown>;
          const aid = String(a.id ?? "");
          if (!aid) continue;
          elements.set(`linkage-attribute:${id}.${aid}`, {
            kind: "attribute",
            id: aid,
            parentId: id,
            signature: hash(JSON.stringify(a)),
            raw: a,
          });
        }
      }
    }
  }

  // dataTypes — enum / workflow / table
  if (Array.isArray(root.dataTypes)) {
    for (const dt of root.dataTypes) {
      const d = dt as Record<string, unknown>;
      const id = String(d.id ?? "");
      if (!id) continue;

      const dtType = String(d.dataType ?? "");
      const kind: ElementKind = dtType === "Workflow" ? "workflow" : "enum";

      elements.set(`${kind}:${id}`, {
        kind,
        id,
        signature: hash(JSON.stringify(d)),
        raw: d,
      });
    }
  }

  // trees
  if (Array.isArray(root.trees)) {
    for (const t of root.trees) {
      const tree = t as Record<string, unknown>;
      const id = String(tree.id ?? "");
      if (!id) continue;
      elements.set(`tree:${id}`, {
        kind: "tree",
        id,
        signature: hash(JSON.stringify(tree)),
        raw: tree,
      });
    }
  }

  // actions
  if (Array.isArray(root.actions)) {
    for (const a of root.actions) {
      const action = a as Record<string, unknown>;
      const id = String(action.id ?? "");
      if (!id) continue;
      elements.set(`action:${id}`, {
        kind: "action",
        id,
        signature: hash(JSON.stringify(action)),
        raw: action,
      });
    }
  }

  // views
  if (Array.isArray(root.views)) {
    for (const v of root.views) {
      const view = v as Record<string, unknown>;
      const id = String(view.id ?? "");
      if (!id) continue;
      elements.set(`view:${id}`, {
        kind: "view",
        id,
        signature: hash(JSON.stringify(view)),
        raw: view,
      });
    }
  }

  return elements;
}

// ============================================================
// Diff элементов
// ============================================================

const KIND_ORDER: Record<ElementKind, number> = {
  entity: 0,
  attribute: 1,
  linkage: 2,
  enum: 3,
  workflow: 4,
  tree: 5,
  action: 6,
  view: 7,
};

export function diffSchemaElements(
  baseline: Map<string, SchemaElement>,
  current: Map<string, SchemaElement>,
): ElementDiff[] {
  const result: ElementDiff[] = [];
  const allKeys = new Set([...baseline.keys(), ...current.keys()]);

  for (const key of allKeys) {
    const b = baseline.get(key);
    const c = current.get(key);

    if (b && !c) {
      result.push({
        kind: b.kind,
        id: b.id,
        parentId: b.parentId,
        change: "removed",
      });
      continue;
    }

    if (!b && c) {
      result.push({
        kind: c.kind,
        id: c.id,
        parentId: c.parentId,
        change: "added",
      });
      continue;
    }

    if (b && c) {
      if (b.signature === c.signature) continue; // без изменений

      // Если изменилась только сигнатура сущности, но не изменился состав атрибутов,
      // это может быть изменение какого-то поля — тогда покажем как modified
      result.push({
        kind: c.kind,
        id: c.id,
        parentId: c.parentId,
        change: "modified",
        fieldChanges: diffFields(b.raw, c.raw),
      });
    }
  }

  // Сортируем: сущности → их атрибуты → связи → enum/workflow → деревья
  result.sort((a, b) => {
    const oa = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (oa !== 0) return oa;
    // Внутри одного типа — по parentId, потом по id
    if (a.parentId !== b.parentId) {
      return (a.parentId ?? "").localeCompare(b.parentId ?? "");
    }
    return a.id.localeCompare(b.id);
  });

  return result;
}

// ============================================================
// Сравнение полей двух объектов
// ============================================================

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    // Не показываем служебные поля
    if (
      key === "attributes" ||
      key === "views" ||
      key === "groups" ||
      key === "widgets" ||
      key === "tabs" ||
      key === "menu"
    ) {
      continue;
    }

    const b = before[key];
    const a = after[key];

    if (JSON.stringify(b) === JSON.stringify(a)) continue;

    changes.push({
      field: key,
      before: b,
      after: a,
    });
  }

  return changes;
}

// ============================================================
// Утилиты
// ============================================================

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}
