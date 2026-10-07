// src/generators/views/widgets.ts
import type { IREntity, IR, IRWidget, IRLinkage, IRWidgetAction } from "../../ir/types";

export function buildWidgetsForEntity(e: IREntity, ir: IR): IRWidget[] {
  const widgets: IRWidget[] = [];
  const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

  const withModals = e.generateModals !== false;
  const withList = e.generateList !== false;
  const withPanel = e.generatePanel !== false;
  const withPage = e.generatePage === true;
  const withLinkages = e.generateLinkages !== false;

  // === Атрибуты ===
  for (const a of e.attributes) {
    widgets.push({
      id: `editors_${lc(e.id)}_${a.id}`,
      type: "attribute",
      attribute: a.id,
    });
  }

  // === Create ===
  if (withModals) {
    widgets.push({
      id: `buttons_create${e.id}`,
      type: "action",
      action: `actions_create${e.id}`,
      control: { type: "regular_button", label: "Добавить" },
    });
  }

  // === Edit ===
  if (withModals) {
    widgets.push({
      id: `buttons_edit${e.id}`,
      type: "action",
      action: `actions_edit${e.id}`,
      control: { type: "regular_button", label: "Изменить" },
    });
  }

  // === Remove (одиночное) ===
  if (withPanel) {
    widgets.push({
      id: `buttons_remove${e.id}`,
      type: "action",
      action: `actions_remove${e.id}`,
      control: { type: "regular_button", label: "Удалить" },
    });
  }

  // === Bulk Remove (массовое) ===
  if (withList) {
    widgets.push({
      id: `buttons_bulkRemove${e.id}`,
      type: "action",
      action: `actions_bulkRemove${e.id}`,
      control: { type: "regular_button", label: "Удалить выбранные" },
    });
  }

  // === Open Page ===
  if (withPage) {
    widgets.push({
      id: `buttons_open${e.id}Page`,
      type: "action",
      action: `actions_open${e.id}Page`,
      control: { type: "regular_button", label: "Полный экран" },
    });
  }

  // === Связи ===
  if (withLinkages) {
    const links = ir.linkages.filter(
      (l) => l.side1 === e.id || l.side2 === e.id,
    );

    for (const l of links) {
      const isSymmetric = l.side1 === l.side2;
      const isCurrentSide1 = l.side1 === e.id;
      const sides: Array<1 | 2> = isSymmetric
        ? [1, 2]
        : [isCurrentSide1 ? 1 : 2];

      for (const side of sides) {
        let widgetId = `editors_link_${e.id}_${l.id}`;
        if (isSymmetric) widgetId += `_side${side}`;

        const isLinkageList = shouldBeLinkageList(l, side);
        const label = side === 1 ? l.nameFrom.side1 : l.nameFrom.side2;

        if (isLinkageList) {
          widgets.push({
            id: widgetId,
            type: "linkage_list",
            side,
            label,
            rules: {
              includes: [{ id: ir.domain, only: [l.id] }],
            },
          });
        } else {
          widgets.push({
            id: widgetId,
            type: "linkage",
            side,
            label,
            linkage: l.id,
          });
        }
      }
    }
  }

  return widgets;
}

function shouldBeLinkageList(l: IRLinkage, side: 1 | 2): boolean {
  if (l.type === "1_n") return side === 1;
  if (l.type === "n_n") return true;
  return false;
}

/**
 * Создаёт виджет "Добавить из дерева" для указанного дерева.
 * Привязывается к корневой сущности дерева (view<RootEntity>.widgets).
 *
 * Логика:
 *  - Если сущностей в дереве одна — обычный виджет с control.label = "Добавить"
 *  - Если несколько — виджет с массивом actions; каждый action — InTree-вариант
 */
export function buildTreeCreateWidget(
  treeId: string,
  treeEntities: IREntity[],
): IRWidgetAction | null {
  // Отбираем сущности, у которых модалки разрешены
  const creatableEntities = treeEntities.filter(
    e => e.generateModals !== false,
  );

  if (creatableEntities.length === 0) return null;

  const widgetId = `buttons_create_${treeId}_from_hierarchy`;

  // === Одна сущность — обычный виджет с label "Добавить" ===
  if (creatableEntities.length === 1) {
    const e = creatableEntities[0]!;
    return {
      id: widgetId,
      type: 'action',
      action: `actions_create${e.id}InTree`,     // ← используем InTree-variant
      control: {
        type: 'regular_button',
        label: 'Добавить',
      },
    };
  }

  // === Несколько сущностей — выпадающее меню ===
  return {
    id: widgetId,
    type: 'action',
    actions: creatableEntities.map(e => `actions_create${e.id}InTree`),
    control: {
      type: 'regular_button',
      // label не задаём — система сама подставит
    },
  };
}