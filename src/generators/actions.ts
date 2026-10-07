import { collectTreeEntityIds } from "../dsl/parse";
import type { IR, IRAction } from "../ir/types";

export function buildActions(ir: IR): IRAction[] {
  const actions: IRAction[] = [];

  const treeEntityIds = new Set<string>();
  for (const t of ir.trees) {
    for (const id of collectTreeEntityIds(t.hierarchy)) {
      treeEntityIds.add(id);
    }
  }

  for (const e of ir.entities) {
    const withModals = e.generateModals !== false;
    const withPanel = e.generatePanel !== false;
    const withList = e.generateList !== false;
    const withPage = e.generatePage === true;

    // === Create ===
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

    // === Edit ===
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

    // === Open Panel ===
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

    // === Open Page ===
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

    // === Remove (одиночное) ===
    if (withPanel) {
      actions.push({
        id: `actions_remove${e.id}`,
        name: "Удалить",
        type: "remove",
        entity: e.id,
        description: "Удалить выбранный объект",
      });
    }

    // === Bulk Remove (массовое) ===
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
