// src/dsl/parse.ts
import { parse as parseYaml } from "yaml";
import type {
  IR,
  IREntity,
  IRAttribute,
  IRDataType,
  IRSequence,
  IRLinkage,
  IRMenu,
  IRAction,
  IRPrefixRule,
  IRArrayItem,
  IRWorkflowStatus,
  IRTree,
  IRTreeNode,
  IRTreeChild,
  LinkType,
  IRSearching,
  IRTreeSortingRule,
  IRTreeSortingBy,
  IRSortingRule,
} from "../ir/types.js";
import { SEARCHABLE_TYPES, SORTING_SKIP_TYPES, SYSTEM_ATTRIBUTE_IDS } from "../ir/consts.js";

// ============================================================
// Типы для сырого YAML (то, что приходит из parseYaml)
// ============================================================

interface RawDsl {
  domain: string;
  version?: string;
  name?: string;
  description?: string;
  author?: string;
  tags?: string[];
  status?: string;
  date?: string;

  entities: Record<string, RawEntity>;
  links?: Record<string, string[]>;
  enums?: Record<string, string[] | Record<string, string | number>>;
  workflows?: Record<string, RawWorkflow>;
  sequences?: Record<string, { startFrom?: number; description?: string }>;
  menus?: Array<string | { tree: string }>;
  inherit?: Record<string, string>;
  trees?: Record<string, string | RawTree>;
}

interface RawEntity {
  name?: string;
  label?: string;
  description?: string;
  inherits?: string;
  attributes: Record<string, string | RawAttribute>;
  ui?: {
    list?: boolean;
    modals?: boolean;
    panel?: boolean;
    page?: boolean;
    sorting?: boolean;
    searching?: boolean;
    linkages?: boolean;
  };
}

interface RawAttribute {
  type: string;
  name?: string;
  description?: string;
  entity?: string;
  item?: { type: string; entity?: string; constraints?: unknown[] };
  sequence?: string;
  template?: string;
  defaultPrefix?: string;
  incrementTemplate?: string;
  prefixRules?: IRPrefixRule[];
  constraints?: unknown[];
  readonly?: boolean;
  default?: unknown;
}

interface RawWorkflow {
  name?: string;
  description?: string;
  initial: string;
  statuses:
    | string[]
    | Record<string, string>
    | Record<string, { name?: string; description?: string }>;
  transitions?: Array<string | { from: string; to: string }>;
}

interface RawTree {
  type?: "ordinary" | "orderable" | "multiparent";
  chain: string;
}

// ============================================================
// Публичная функция
// ============================================================

export function parseDsl(yaml: string): IR {
  const preprocessed = preprocessDsl(yaml);
  const raw = parseYaml(preprocessed) as RawDsl;

  if (!raw || typeof raw !== "object") {
    throw new Error("DSL должен быть YAML-объектом");
  }
  if (!raw.domain || typeof raw.domain !== "string") {
    throw new Error(
      "В DSL отсутствует обязательное поле 'domain'. " +
        "Укажите его на верхнем уровне без отступа.",
    );
  }

  const ir: IR = {
    domain: raw.domain,
    version: raw.version ?? "0.0.1",
    name: raw.name,
    description: raw.description,
    author: raw.author,
    tags: raw.tags,
    status: raw.status,
    date: raw.date,

    entities: [],
    dataTypes: [],
    sequences: [],
    linkages: [],
    trees: [],
    actions: [],
    views: [],
    menus: [],
    dataRules: [],
    medias: [],
  };

  parseSequences(raw, ir);
  parseEnums(raw, ir);
  parseWorkflows(raw, ir);
  parseEntities(raw, ir);
  parseInherit(raw, ir);
  parseLinks(raw, ir);
  parseTrees(raw, ir);
  parseMenus(raw, ir);
  buildSortingAndSearching(ir);
  buildTreeSorting(ir);

  ir.actions = buildActions(ir);

  return ir;
}

// ============================================================
// Препроцессор: оборачивает "- >" и "- <" в кавычки,
// потому что YAML не умеет их читать без кавычек
// ============================================================

function preprocessDsl(yaml: string): string {
  return yaml
    .split("\n")
    .map((line) => {
      const m1 = /^(\s*-\s*)>\s*(.+)$/.exec(line);
      if (m1) return `${m1[1]}"> ${m1[2]}"`;

      const m2 = /^(\s*-\s*)<\s*(.+)$/.exec(line);
      if (m2) return `${m2[1]}"< ${m2[2]}"`;

      return line;
    })
    .join("\n");
}

// ============================================================
// Sequences
// ============================================================

function parseSequences(raw: RawDsl, ir: IR): void {
  if (!raw.sequences) return;
  for (const [id, s] of Object.entries(raw.sequences)) {
    const seq: IRSequence = { id };
    if (s.startFrom !== undefined) seq.startFrom = s.startFrom;
    if (s.description) seq.description = s.description;
    ir.sequences.push(seq);
  }
}

// ============================================================
// Enums → dataTypes (kind: Enum)
// ============================================================

function parseEnums(raw: RawDsl, ir: IR): void {
  if (!raw.enums) return;

  for (const [id, values] of Object.entries(raw.enums)) {
    const dt: IRDataType = { id, kind: "Enum", values: [] };

    if (Array.isArray(values)) {
      for (const v of values) {
        const str = String(v).trim();
        if (!str) continue;

        // Формат "id:Name" или просто "id"
        const colonIdx = str.indexOf(":");
        if (colonIdx === -1) {
          dt.values!.push({ id: str });
        } else {
          const vid = str.slice(0, colonIdx).trim();
          const vname = str.slice(colonIdx + 1).trim();
          if (vid) {
            dt.values!.push(vname ? { id: vid, name: vname } : { id: vid });
          }
        }
      }
    } else {
      for (const [vid, vname] of Object.entries(values)) {
        dt.values!.push({ id: vid, name: String(vname) });
      }
    }

    ir.dataTypes.push(dt);
  }
}

// ============================================================
// Workflows → dataTypes (kind: Workflow)
// ============================================================

function parseWorkflows(raw: RawDsl, ir: IR): void {
  if (!raw.workflows) return;

  for (const [id, w] of Object.entries(raw.workflows)) {
    const dt: IRDataType = {
      id,
      kind: "Workflow",
      statuses: [],
      initial: w.initial,
      transitions: [],
    };

    if (w.name) dt.name = w.name;
    if (w.description) dt.description = w.description;

    // statuses — три формы
    if (Array.isArray(w.statuses)) {
      for (const sid of w.statuses) dt.statuses!.push({ id: sid });
    } else {
      for (const [sid, sval] of Object.entries(w.statuses)) {
        if (typeof sval === "string") {
          dt.statuses!.push({ id: sid, name: sval });
        } else {
          const s: IRWorkflowStatus = { id: sid };
          if (sval.name) s.name = sval.name;
          if (sval.description) s.description = sval.description;
          dt.statuses!.push(s);
        }
      }
    }

    // transitions — две формы
    if (w.transitions) {
      for (const t of w.transitions) {
        if (typeof t === "string") {
          const m = /^\s*(\w+)\s*->\s*(\w+)\s*$/.exec(t);
          if (m) {
            dt.transitions!.push({ from: m[1]!, to: m[2]! });
          }
        } else {
          dt.transitions!.push({ from: t.from, to: t.to });
        }
      }
    }

    ir.dataTypes.push(dt);
  }
}

// ============================================================
// Entities + attributes
// ============================================================

function parseEntities(raw: RawDsl, ir: IR): void {
  if (!raw.entities) return;

  for (const [rawId, e] of Object.entries(raw.entities)) {
    const { id, inheritsFromKey } = parseEntityKey(rawId);
    const entity: IREntity = { id, attributes: [] };

    if (e.name !== undefined) entity.name = String(e.name);
    if (e.label !== undefined) entity.label = String(e.label);
    if (e.description !== undefined) entity.description = String(e.description);

    // Приоритет: inherits из поля > inherits из ключа
    if (e.inherits !== undefined) {
      entity.inherits = String(e.inherits);
    } else if (inheritsFromKey) {
      entity.inherits = inheritsFromKey;
    }

    if (e.ui) {
      if (typeof e.ui.list === "boolean") entity.generateList = e.ui.list;
      if (typeof e.ui.modals === "boolean") entity.generateModals = e.ui.modals;
      if (typeof e.ui.panel === "boolean") entity.generatePanel = e.ui.panel;
      if (typeof e.ui.page === "boolean") entity.generatePage = e.ui.page;
      if (typeof e.ui.sorting === "boolean")
        entity.generateSorting = e.ui.sorting;
      if (typeof e.ui.searching === "boolean")
        entity.generateSearching = e.ui.searching;
      if (typeof e.ui.linkages === "boolean")
        entity.generateLinkages = e.ui.linkages;
    }

    if (e.attributes) {
      for (const [aid, araw] of Object.entries(e.attributes)) {
        entity.attributes.push(parseAttribute(aid, araw));
      }
    }

    ir.entities.push(entity);
  }
}

function parseAttribute(id: string, raw: string | RawAttribute): IRAttribute {
  // === Строковая форма ===
  if (typeof raw === "string") {
    const a: IRAttribute = { id, dataType: "String" };

    // Array<Reference(X)>
    const arrRef = /^Array<Reference\(([\w./]+)\)>$/.exec(raw);
    if (arrRef) {
      a.dataType = "Array";
      a.item = { dataType: "Reference", entity: arrRef[1]! };
      return a;
    }

    // Array<enum(X)>
    const arrEnum = /^Array<enum\(([\w]+)\)>$/.exec(raw);
    if (arrEnum) {
      a.dataType = "Array";
      a.item = { dataType: arrEnum[1]! };
      return a;
    }

    // Array<X>
    const arr = /^Array<([\w]+)>$/.exec(raw);
    if (arr) {
      a.dataType = "Array";
      a.item = { dataType: arr[1]! };
      return a;
    }

    // Reference(X)
    const ref = /^Reference\(([\w./]+)\)$/.exec(raw);
    if (ref) {
      a.dataType = "Reference";
      a.entity = ref[1]!;
      return a;
    }

    // workflow(X)
    const wfMatch = /^workflow\(([\w]+)\)$/.exec(raw);
    if (wfMatch) {
      a.dataType = wfMatch[1]!;
      return a;
    }

    // enum(X)
    const enumMatch = /^enum\(([\w]+)\)$/.exec(raw);
    if (enumMatch) {
      a.dataType = enumMatch[1]!;
      return a;
    }

    // Простой тип
    a.dataType = raw;
    return a;
  }

  // === Объектная форма ===
  const a: IRAttribute = { id, dataType: "String" };

  const typeStr =
    typeof raw.type === "string" ? raw.type : String(raw.type ?? "");

  const arrRef = /^Array<Reference\(([\w./]+)\)>$/.exec(typeStr);
  if (arrRef) {
    a.dataType = "Array";
    a.item = { dataType: "Reference", entity: arrRef[1]! };
  } else {
    const arrEnum = /^Array<enum\(([\w]+)\)>$/.exec(typeStr);
    if (arrEnum) {
      a.dataType = "Array";
      a.item = { dataType: arrEnum[1]! };
    } else {
      const arr = /^Array<([\w]+)>$/.exec(typeStr);
      if (arr) {
        a.dataType = "Array";
        a.item = { dataType: arr[1]! };
      } else {
        const ref = /^Reference\(([\w./]+)\)$/.exec(typeStr);
        if (ref) {
          a.dataType = "Reference";
          a.entity = ref[1]!;
        } else {
          const wfMatch = /^workflow\(([\w]+)\)$/.exec(typeStr);
          if (wfMatch) {
            a.dataType = wfMatch[1]!;
          } else {
            const enumMatch = /^enum\(([\w]+)\)$/.exec(typeStr);
            if (enumMatch) {
              a.dataType = enumMatch[1]!;
            } else {
              a.dataType = typeStr;
            }
          }
        }
      }
    }
  }

  if (raw.name !== undefined) a.name = String(raw.name);
  if (raw.description !== undefined) a.description = String(raw.description);
  if (raw.readonly !== undefined) a.readonly = Boolean(raw.readonly);
  if (raw.default !== undefined) a.default = raw.default;
  if (raw.sequence) a.sequence = String(raw.sequence);
  if (raw.template) a.template = String(raw.template);
  if (raw.defaultPrefix) a.defaultPrefix = String(raw.defaultPrefix);
  if (raw.incrementTemplate)
    a.incrementTemplate = String(raw.incrementTemplate);
  if (raw.prefixRules) a.prefixRules = raw.prefixRules;
  if (raw.constraints) a.constraints = raw.constraints as IRConstraintRaw[];

  // entity можно задать явно в объекте, если это Reference
  if (a.dataType === "Reference" && raw.entity) {
    a.entity = String(raw.entity);
  }

  // Уточнение item из raw.item
  if (a.dataType === "Array" && raw.item) {
    const item: IRArrayItem = { dataType: "String" };

    const itemTypeStr = typeof raw.item.type === "string" ? raw.item.type : "";

    const itemRef = /^Reference\(([\w./]+)\)$/.exec(itemTypeStr);
    if (itemRef) {
      item.dataType = "Reference";
      item.entity = itemRef[1]!;
    } else {
      const itemEnum = /^enum\(([\w]+)\)$/.exec(itemTypeStr);
      if (itemEnum) {
        item.dataType = itemEnum[1]!;
      } else {
        item.dataType = itemTypeStr;
      }
    }

    if (raw.item.entity) item.entity = String(raw.item.entity);
    if (raw.item.constraints)
      item.constraints = raw.item.constraints as IRConstraintRaw[];
    a.item = item;
  }

  return a;
}

// TypeScript-friendly raw constraints
type IRConstraintRaw = NonNullable<IRAttribute["constraints"]>[number];

// ============================================================
// Inherit (блок inherit)
// ============================================================

function parseInherit(raw: RawDsl, ir: IR): void {
  if (!raw.inherit) return;

  for (const [child, parent] of Object.entries(raw.inherit)) {
    const e = ir.entities.find((x) => x.id === child);
    if (e && typeof parent === "string" && !e.inherits) {
      e.inherits = parent;
    }
  }
}

// ============================================================
// Links → linkages
// ============================================================

function parseLinks(raw: RawDsl, ir: IR): void {
  if (!raw.links) return;

  const seen = new Set<string>();

  for (const [side1, entries] of Object.entries(raw.links)) {
    for (const entry of entries) {
      const m = /^([<>]?)\s*(1:1|1:n|n:n)\s+([\w./]+)$/.exec(
        String(entry).trim(),
      );
      if (!m) continue;

      const [, dir, typeRaw, side2] = m;
      const type = typeRaw!.replace(":", "_") as LinkType;
      const s1 = dir === "<" ? side2! : side1;
      const s2 = dir === "<" ? side1 : side2!;

      const id = `${s1}_${s2}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const l: IRLinkage = {
        id,
        side1: s1,
        side2: s2,
        type,
        undirected: type === "n_n" && !dir,
        nameFrom: {
          side1: `Связан с ${s2}`,
          side2: `Содержит ${s1}`,
        },
      };
      ir.linkages.push(l);
    }
  }
}

// ============================================================
// Trees
// ============================================================

interface ChainStep {
  entity: string;
  linkage?: string;
}

function parseTrees(raw: RawDsl, ir: IR): void {
  if (!raw.trees) return;

  for (const [id, rawTree] of Object.entries(raw.trees)) {
    const spec: RawTree =
      typeof rawTree === "string" ? { chain: rawTree } : rawTree;

    const parts = tokenizeChain(spec.chain);
    if (parts.length < 2) {
      throw new Error(
        `Дерево '${id}': цепочка должна содержать минимум 2 сущности`,
      );
    }

    // Проверим, что все сущности существуют
    for (const part of parts) {
      if (part.entity.includes("/")) continue;

      if (!ir.entities.some((e) => e.id === part.entity)) {
        throw new Error(
          `Дерево '${id}': сущность '${part.entity}' не найдена в домене`,
        );
      }
    }

    const rootEntityId = parts[0]!.entity;

    const root: IRTreeNode = { entity: rootEntityId };
    let currentParent: IRTreeChild | undefined = undefined;

    for (let i = 1; i < parts.length; i++) {
      const step = parts[i]!;
      const prevEntityId = parts[i - 1]!.entity;

      let linkageId = step.linkage;

      if (!linkageId) {
        const matches = ir.linkages.filter(
          (l) =>
            (l.side1 === prevEntityId && l.side2 === step.entity) ||
            (l.side1 === step.entity && l.side2 === prevEntityId),
        );

        if (matches.length === 0) {
          throw new Error(
            `Дерево '${id}': нет связи между '${prevEntityId}' и '${step.entity}'. ` +
              `Определите связь в блоке links или укажите явно: >(LinkageId) ${step.entity}`,
          );
        }

        if (matches.length > 1) {
          const ids = matches.map((m) => m.id).join(", ");
          throw new Error(
            `Дерево '${id}': между '${prevEntityId}' и '${step.entity}' несколько связей (${ids}). ` +
              `Укажите явно: >(LinkageId) ${step.entity}`,
          );
        }

        linkageId = matches[0]!.id;
      } else {
        if (!ir.linkages.some((l) => l.id === linkageId)) {
          throw new Error(`Дерево '${id}': связь '${linkageId}' не найдена`);
        }
      }

      const child: IRTreeChild = {
        linkage: linkageId,
        entity: step.entity,
      };

      if (i === 1) {
        if (!root.children) root.children = [];
        root.children.push(child);
      } else {
        if (!currentParent!.children) currentParent!.children = [];
        currentParent!.children.push(child);
      }

      currentParent = child;
    }

    ir.trees.push({
      id,
      type: spec.type ?? "ordinary",
      hierarchy: root,
    });
  }
}

/**
 * Разбирает цепочку вида:
 *   "A > B > C"
 *   "A >(link1) B >(link2) C"
 *   "A > B >(link) C > D"
 */
function tokenizeChain(chain: string): ChainStep[] {
  const tokens: ChainStep[] = [];

  // Первый элемент — сущность без префикса
  const firstMatch = /^\s*([A-Za-z][\w./]*)\s*/.exec(chain);
  if (!firstMatch) {
    throw new Error(`Не удалось разобрать цепочку: "${chain}"`);
  }
  tokens.push({ entity: firstMatch[1]! });

  let rest = chain.slice(firstMatch[0].length);

  // Далее — ">" с опциональным "(linkage)" и сущностью
  while (rest.length > 0) {
    const m = /^\s*>\s*(?:\(([\w_]+)\)\s*)?([A-Za-z][\w./]*)\s*/.exec(rest);
    if (!m) {
      if (rest.trim().length === 0) break;
      throw new Error(`Не удалось разобрать продолжение цепочки: "${rest}"`);
    }
    tokens.push({
      entity: m[2]!,
      linkage: m[1],
    });
    rest = rest.slice(m[0].length);
  }

  return tokens;
}

// ============================================================
// Menus
// ============================================================

function parseMenus(raw: RawDsl, ir: IR): void {
  // Используем ir.domain — он гарантированно строка (проверен в parseDsl)
  const prefix = ir.domain.split(".")[0]!;

  if (!raw.menus || !Array.isArray(raw.menus) || raw.menus.length === 0) {
    // Если меню нет, но есть деревья — создадим группу только с деревьями
    if (ir.trees.length > 0) {
      const items = ir.trees.map((t) => ({
        id: `${t.id}Menu`,
        route: `/${prefix}/${t.id.toLowerCase()}`,
        label: `Дерево ${getTreeRootName(t, ir)}`,
        type: "menu" as const,
        view: `tree_${t.id}`,
      }));

      ir.menus.push({
        id: `menus_${prefix}`,
        route: `/${prefix}`,
        label: raw.name ?? ir.domain,
        type: "root_group",
        placement: "top",
        items,
      });
    }
    return;
  }

  const items: IRMenu["items"] = [];

  for (const m of raw.menus) {
    if (typeof m === "string") {
      // Обычный пункт по сущности
      const entity = ir.entities.find((e) => e.id === m);
      items!.push({
        id: `${m}Menu`,
        route: `/${prefix}/${m.toLowerCase()}`,
        label: entity?.name ?? m,
        type: "menu",
        view: `lists_${m.toLowerCase()}`,
      });
    } else if (m && typeof m === "object" && "tree" in m) {
      // Пункт дерева — если указан явно в menus
      const treeId = m.tree;
      const tree = ir.trees.find((t) => t.id === treeId);
      if (!tree) continue;
      items!.push({
        id: `${treeId}Menu`,
        route: `/${prefix}/${treeId.toLowerCase()}`,
        label: `Дерево ${getTreeRootName(tree, ir)}`,
        type: "menu",
        view: `tree_${treeId}`,
      });
    }
  }

  // Автоматически добавим пункты для всех деревьев, которые ещё не добавлены
  const addedTreeIds = new Set(
    items!
      .filter((it) => it.view?.startsWith("tree_"))
      .map((it) => it.view!.replace("tree_", "")),
  );
  for (const t of ir.trees) {
    if (addedTreeIds.has(t.id)) continue;
    items!.push({
      id: `${t.id}Menu`,
      route: `/${prefix}/${t.id.toLowerCase()}`,
      label: `Дерево ${getTreeRootName(t, ir)}`,
      type: "menu",
      view: `tree_${t.id}`,
    });
  }

  ir.menus.push({
    id: `menus_${prefix}`,
    route: `/${prefix}`,
    label: raw.name ?? ir.domain,
    type: "root_group",
    placement: "top",
    items: items!,
  });
}

function getTreeRootName(tree: IRTree, ir: IR): string {
  const rootEntity = ir.entities.find((e) => e.id === tree.hierarchy.entity);
  return rootEntity?.name ?? rootEntity?.id ?? tree.hierarchy.entity;
}

// ============================================================
// Actions (автогенерация)
// ============================================================

function buildActions(ir: IR): IRAction[] {
  const actions: IRAction[] = [];

  const treeEntityIds = new Set<string>();
  for (const t of ir.trees) {
    for (const id of collectTreeEntityIds(t.hierarchy)) {
      treeEntityIds.add(id);
    }
  }

  // === 1. Actions для всех сущностей ===
  for (const e of ir.entities) {
    const withModals = e.generateModals !== false;
    const withPanel = e.generatePanel !== false;
    const withList = e.generateList !== false;
    const withPage = e.generatePage === true;

    // Create (обычное)
    if (withModals) {
      actions.push({
        id: `actions_create${e.id}`,
        name: "Добавить",
        type: "open_modal",
        modal: `forms_new${e.id}`,
        entity: e.id,
        operation: "create",
        description: "Открыть модальное окно создания",
      });
    }

    // Edit
    if (withModals) {
      actions.push({
        id: `actions_edit${e.id}`,
        name: "Изменить",
        type: "open_modal",
        modal: `forms_edit${e.id}`,
        entity: e.id,
        operation: "edit",
        description: "Открыть модальное окно редактирования",
      });
    }

    // Open Panel
    if (withPanel) {
      actions.push({
        id: `actions_open${e.id}Panel`,
        name: "Детали",
        type: "open_panel",
        panel: `panels_info${e.id}`,
        entity: e.id,
        description: "Открыть панель с информацией",
      });
    }

    // Open Page
    if (withPage) {
      actions.push({
        id: `actions_open${e.id}Page`,
        name: "Полный экран",
        type: "open_page",
        pageView: `pages_info${e.id}`,
        entity: e.id,
        operation: "view",
        description: "Открыть полноэкранную карточку",
      });
    }

    // Remove (одиночное)
    if (withPanel) {
      actions.push({
        id: `actions_remove${e.id}`,
        name: "Удалить",
        type: "remove",
        entity: e.id,
        description: "Удалить выбранный объект",
      });
    }

    // Bulk Remove (массовое)
    if (withList) {
      actions.push({
        id: `actions_bulkRemove${e.id}`,
        name: "Удалить выбранные",
        type: "bulk",
        entity: e.id,
        operation: "remove",
        description: "Удалить выбранные объекты",
      });
    }

    // Create InTree — только для сущностей в деревьях
    if (withModals && treeEntityIds.has(e.id)) {
      actions.push({
        id: `actions_create${e.id}InTree`,
        name: e.name ?? e.id,
        type: "open_modal",
        modal: `forms_new${e.id}`,
        entity: e.id,
        operation: "create",
        description: `Создать ${e.name ?? e.id} из дерева`,
      });
    }
  }

  return actions;
}

/**
 * Разбирает ключ сущности.
 *   "Contract"           → { id: "Contract" }
 *   "Contract>Document"  → { id: "Contract", inheritsFromKey: "Document" }
 *   "Contract > Document"→ { id: "Contract", inheritsFromKey: "Document" }
 */
function parseEntityKey(rawKey: string): {
  id: string;
  inheritsFromKey?: string;
} {
  const trimmed = rawKey.trim();
  const idx = trimmed.indexOf(">");
  if (idx === -1) {
    return { id: trimmed };
  }

  const id = trimmed.slice(0, idx).trim();
  const parent = trimmed.slice(idx + 1).trim();

  if (!id || !parent) {
    // Некорректный формат — считаем что весь ключ это ID
    return { id: trimmed };
  }

  return { id, inheritsFromKey: parent };
}

function buildSortingAndSearching(ir: IR): void {
  for (const e of ir.entities) {
    // Sorting
    if (e.generateSorting !== false) {
      const rules = buildSortingForEntity(e);
      if (rules.length > 0) e.sorting = rules;
    }

    // Searching
    if (e.generateSearching !== false) {
      const rules = buildSearchingForEntity(e);
      if (rules.length > 0) e.searching = rules;
    }
  }
}

function buildSortingForEntity(e: IREntity): IRSortingRule[] {
  const rules: IRSortingRule[] = [];

  for (const a of e.attributes) {
    // Пропускаем типы, для которых сортировка не имеет смысла
    if (SORTING_SKIP_TYPES.has(a.dataType)) continue;

    // Пропускаем системные атрибуты
    if (SYSTEM_ATTRIBUTE_IDS.has(a.id)) continue;

    rules.push({
      id: `sorting_${e.id}_by${capitalize(a.id)}`,
      name: `По ${a.name || a.id}`,
      by: [{ attribute: a.id, direction: "asc" }],
    });
  }

  return rules;
}

function buildSearchingForEntity(e: IREntity): IRSearching[] {
  const rules: IRSearching[] = [];

  for (const a of e.attributes) {
    if (!SEARCHABLE_TYPES.has(a.dataType)) continue;
    if (SYSTEM_ATTRIBUTE_IDS.has(a.id)) continue;

    rules.push({
      id: `searching_${a.id}`,
      name: `Поиск по ${a.name || a.id}`,
      attribute: a.id,
    });
  }

  return rules;
}

function buildTreeSorting(ir: IR): void {
  for (const t of ir.trees) {
    const entityIds = collectTreeEntityIds(t.hierarchy);
    const rules: IRTreeSortingRule[] = [];

    // Общее правило "По названию" для всех сущностей иерархии
    const byRule: IRTreeSortingBy[] = [];

    for (const entityId of entityIds) {
      const entity = ir.entities.find((e) => e.id === entityId);
      if (!entity) continue;

      // Ищем атрибут для сортировки: предпочитаем name, потом title,
      // потом первый String
      const sortAttr =
        entity.attributes.find((a) => a.id === "name") ||
        entity.attributes.find((a) => a.id === "title") ||
        entity.attributes.find((a) => a.dataType === "String");

      if (sortAttr) {
        byRule.push({
          entity: entity.id,
          by: [{ attribute: sortAttr.id, direction: "asc" }],
        });
      }
    }

    if (byRule.length > 0) {
      rules.push({
        id: `sorting_${t.id}_byName`,
        name: "По названию",
        by: byRule,
      });
    }

    if (rules.length > 0) t.sorting = rules;
  }
}

export function collectTreeEntityIds(node: IRTreeNode | IRTreeChild): string[] {
  const out: string[] = [node.entity];
  for (const child of node.children ?? []) {
    out.push(...collectTreeEntityIds(child));
  }
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}