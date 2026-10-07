// src/generators/views/groups.ts
import type {
  IREntity,
  IRWidget,
  IRWidgetLinkageList,
  IRGroup,
  IRGroupBlock,
  IRGroupTab,
} from "../../ir/types";

export function buildGroupsForEntity(
  e: IREntity,
  widgets: IRWidget[],
): IRGroup[] {
  const groups: IRGroup[] = [];

  const withModals = e.generateModals !== false;
  const withPanel = e.generatePanel !== false;
  const withLinkages = e.generateLinkages !== false;

  // === Формы ===
  if (withModals) {
    const newComponents = widgets
      .filter((w) => w.type === "attribute" || w.type === "linkage")
      .map((w) => ({ widget: w.id }));

    const editComponents = widgets
      .filter((w) => {
        if (w.type === "linkage") return true;
        if (w.type === "attribute") {
          const attr = e.attributes.find((a) => a.id === w.attribute);
          return !attr?.readonly;
        }
        return false;
      })
      .map((w) => ({ widget: w.id }));

    groups.push({
      id: `blocks_forms_new${e.id}`,
      type: "form",
      layout: { direction: "column" },
      components: newComponents,
    });

    groups.push({
      id: `blocks_forms_edit${e.id}`,
      type: "form",
      layout: { direction: "column" },
      components: editComponents,
    });
  }

  // === Основная вкладка ===
  if (withPanel) {
    const infoComponents = widgets
      .filter((w) => w.type === "attribute" || w.type === "linkage")
      .map((w) => ({ widget: w.id }));

    groups.push({
      id: `blocks_info${e.id}`,
      type: "block",
      layout: { direction: "column", expandable: false },
      components: infoComponents,
    });

    groups.push({
      id: `tabs_info${e.id}`,
      type: "tab",
      label: "Детали",
      components: [{ block: `blocks_info${e.id}` }],
    });
  }

  // === Вкладки для каждого linkage_list ===
  if (withPanel && withLinkages) {
    const linkageListWidgets = widgets.filter(
      (w): w is IRWidgetLinkageList => w.type === "linkage_list",
    );

    for (const w of linkageListWidgets) {
      const blockId = `blocks_${w.id}`;
      const tabId = `tabs_${w.id}`;

      const block: IRGroupBlock = {
        id: blockId,
        type: "block",
        layout: { direction: "column", expandable: false },
        components: [{ widget: w.id }],
      };
      groups.push(block);

      const tab: IRGroupTab = {
        id: tabId,
        type: "tab",
        label: w.label ?? "Связи",
        components: [{ block: blockId }],
      };
      groups.push(tab);
    }
  }

  return groups;
}

export function getLinkageListTabIds(
  e: IREntity,
  widgets: IRWidget[],
): string[] {
  if (e.generateLinkages === false) return [];
  if (e.generatePanel === false) return [];

  return widgets
    .filter((w): w is IRWidgetLinkageList => w.type === "linkage_list")
    .map((w) => `tabs_${w.id}`);
}
