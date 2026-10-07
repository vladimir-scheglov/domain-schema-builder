// src/generators/views/tree.ts
import type {
  IR,
  IRTree,
  IRTreeNode,
  IRViewTree,
  IREntity,
  IRTable,
  IRTableColumn,
  IRTableSortingBy,
  IRTableAction,
} from "../../ir/types";

// ============================================================
// Системные атрибуты
// ============================================================

const SYSTEM_ATTRIBUTE_IDS = new Set([
  "id",
  "organizationId",
  "domainId",
  "entityId",
  "entityName",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "tenantId",
  "label",
  "version",
]);

// ============================================================
// Публичная функция
// ============================================================

export function buildTreeView(t: IRTree, ir: IR, createWidgetId?: string): IRViewTree {
  const entityIds = collectTreeEntities(t.hierarchy);
  const treeEntities = entityIds
    .map((id) => ir.entities.find((e) => e.id === id))
    .filter((e): e is IREntity => e !== undefined);

  const rootEntity = treeEntities[0];
  const leafEntity = treeEntities[treeEntities.length - 1];

  // actionPanel: create от каждой сущности, bulkRemove от leaf
  const actionPanel: Array<{ widget: string }> = [];

  if (createWidgetId) {
    actionPanel.push({ widget: createWidgetId });
  }

  if (leafEntity && leafEntity.generateList !== false) {
    actionPanel.push({ widget: `buttons_bulkRemove${leafEntity.id}` });
  }

  return {
    id: `tree_${t.id}`,
    type: "tree",
    tree: t.id,
    label: `Дерево ${rootEntity?.name ?? rootEntity?.id ?? t.hierarchy.entity}`,
    nodeChunkSize: 20,
    variant: "merged",
    actionPanel,
    table:
      treeEntities.length > 0 ? buildTreeTable(t, treeEntities) : undefined,
  };
}

// ============================================================
// Обход иерархии
// ============================================================

function collectTreeEntities(node: IRTreeNode | any): string[] {
  const out: string[] = [node.entity];
  for (const child of node.children ?? []) {
    out.push(...collectTreeEntities(child));
  }
  return out;
}

// ============================================================
// Таблица дерева
// ============================================================

function buildTreeTable(tree: IRTree, treeEntities: IREntity[]): IRTable {
  const columns = buildTreeColumns(treeEntities);

  return {
    columns,
    filter: buildTreeFilter(treeEntities),

    ...(tree.sorting && tree.sorting.length > 0
      ? { sortingBy: buildTreeSortingBy(tree, treeEntities) }
      : {}),

    paging: {
      sizes: [10, 50, 100],
      defaultSize: 50,
    },

    refresh: {
      mode: "all",
      defaults: { enabled: true, unit: "second", interval: 30 },
    },

    actions: buildTreeTableActions(treeEntities, columns),

    selection: true,
  };
}

// ============================================================
// Колонки
// ============================================================

/**
 * Собирает колонки из атрибутов всех сущностей иерархии.
 *
 * Правила:
 *  1. Первая колонка — экспандер (expanded: true).
 *     Использует name/title/label корневой сущности.
 *  2. Общие атрибуты (id встречается у нескольких сущностей) —
 *     одна колонка. Label берётся от первой сущности, у которой встретился.
 *  3. Порядок: сначала общие (по первому появлению), потом уникальные
 *     (по порядку сущностей в иерархии).
 *  4. Системные атрибуты не добавляются (кроме экспандера).
 */
function buildTreeColumns(treeEntities: IREntity[]): IRTableColumn[] {
  const columns: IRTableColumn[] = [];

  // === 1. Экспандер ===
  const root = treeEntities[0];
  const expander = root
    ? findExpanderAttribute(root)
    : { id: "label", name: "Название" };

  columns.push({
    id: expander.id,
    attribute: expander.id,
    label: expander.name ?? "Название",
    expanded: true,
    layout: { width: { default: 300, min: 200, max: 500 } },
  });

  // === 2. Собираем остальные атрибуты ===
  // map: id атрибута → { column, firstSeenOrder, seenCount }
  const columnMap = new Map<
    string,
    {
      column: IRTableColumn;
      firstSeenOrder: number;
      seenCount: number;
    }
  >();

  let order = 0;

  for (const e of treeEntities) {
    for (const a of e.attributes) {
      // Системные — пропускаем
      if (SYSTEM_ATTRIBUTE_IDS.has(a.id)) continue;

      // Совпадает с экспандером — пропускаем (он уже первая колонка)
      if (a.id === expander.id) continue;

      if (columnMap.has(a.id)) {
        // Общий атрибут
        columnMap.get(a.id)!.seenCount++;
      } else {
        // Первое появление
        columnMap.set(a.id, {
          column: {
            id: a.id,
            attribute: a.id,
            label: a.name ?? a.id,
            layout: { width: { default: 120, min: 50, max: 300 } },
          },
          firstSeenOrder: order++,
          seenCount: 1,
        });
      }
    }
  }

  const entries = Array.from(columnMap.values());

  // === 3. Сортируем ===
  // Общие (seenCount > 1) — по firstSeenOrder
  // Уникальные (seenCount === 1) — по firstSeenOrder (= порядок в иерархии)
  const common = entries
    .filter((e) => e.seenCount > 1)
    .sort((a, b) => a.firstSeenOrder - b.firstSeenOrder);

  const unique = entries
    .filter((e) => e.seenCount === 1)
    .sort((a, b) => a.firstSeenOrder - b.firstSeenOrder);

  for (const entry of common) columns.push(entry.column);
  for (const entry of unique) columns.push(entry.column);

  return columns;
}

/**
 * Ищет атрибут для колонки-экспандера в корневой сущности.
 * Приоритет: name → title → label → первый String.
 * Fallback — системный label.
 */
function findExpanderAttribute(entity: IREntity): {
  id: string;
  name?: string;
} {
  const candidates = ["name", "title", "label"];

  for (const id of candidates) {
    const attr = entity.attributes.find((a) => a.id === id);
    if (attr) return { id: attr.id, name: attr.name };
  }

  const firstString = entity.attributes.find((a) => a.dataType === "String");
  if (firstString) return { id: firstString.id, name: firstString.name };

  return { id: "label", name: "Название" };
}

// ============================================================
// Фильтрация
// ============================================================

function buildTreeFilter(entities: IREntity[]) {
  return entities.map((e) => ({
    entity: e.id,
    attributes: { type: "all" as const },
  }));
}

// ============================================================
// Действия
// ============================================================

function buildTreeTableActions(
  treeEntities: IREntity[],
  columns: IRTableColumn[],
): IRTableAction[] {
  const acts: IRTableAction[] = [];

  // === row_click для каждой сущности ===
  for (const e of treeEntities) {
    if (e.generatePanel === false) continue;
    acts.push({
      type: "row_click",
      action: `actions_open${e.id}Panel`,
    });
  }

  // === row_context_menu — от leaf ===
  const leaf = treeEntities[treeEntities.length - 1];
  if (!leaf) return acts;

  const withPage = leaf.generatePage === true;
  const menu: IRTableAction["menu"] = [];

  if (leaf.generateModals !== false) {
    menu.push({
      action: `actions_edit${leaf.id}`,
      label: "Изменить",
      icon: "iconsEdit",
    });
  }

  if (leaf.generatePanel !== false) {
    menu.push({
      action: `actions_remove${leaf.id}`,
      label: "Удалить",
      icon: "iconsDelete",
    });
  }

  if (withPage) {
    menu.push({
      action: `actions_open${leaf.id}Page`,
      label: "Полный экран",
      icon: "iconsView",
    });
  }

  if (menu.length > 0) {
    acts.push({
      type: "row_context_menu",
      menu,
    });
  }

  return acts;
}

// ============================================================
// Сортировка
// ============================================================

function buildTreeSortingBy(
  tree: IRTree,
  treeEntities: IREntity[],
): IRTableSortingBy {
  const rule = tree.sorting?.[0];
  if (!rule) return {};

  const seenColumns = new Set<string>();
  const columns: IRTableSortingBy["columns"] = [];

  // Проходим по правилу: для каждой сущности — её атрибуты из правила
  for (const b of rule.by) {
    const entity = treeEntities.find((e) => e.id === b.entity);
    if (!entity) continue;

    for (const inner of b.by) {
      const attrId = inner.attribute;

      // Системные — пропускаем
      if (SYSTEM_ATTRIBUTE_IDS.has(attrId)) continue;

      // Уже добавили — пропускаем
      if (seenColumns.has(attrId)) continue;

      // Проверяем, что атрибут есть в сущности
      if (!entity.attributes.some((a) => a.id === attrId)) continue;

      seenColumns.add(attrId);
      columns.push({
        column: attrId,
        sorting: rule.id,
      });
    }
  }

  const result: IRTableSortingBy = {};
  if (columns.length > 0) result.columns = columns;

  // Default — первая колонка
  const firstColumn = columns[0];
  if (firstColumn) {
    result.defaults = {
      column: firstColumn.column,
      direction: "asc",
    };
  }

  return result;
}
