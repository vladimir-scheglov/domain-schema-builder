// src/generators/views/cards.ts
import type { IREntity, IRCard, IRWidget } from "../../ir/types";
import { getLinkageListTabIds } from "./groups";

export function buildCardsForEntity(
  e: IREntity,
  widgets: IRWidget[],
): IRCard[] {
  const cards: IRCard[] = [];

  const withModals = e.generateModals !== false;
  const withPanel = e.generatePanel !== false;
  const withPage = e.generatePage === true;

  const linkageTabs = getLinkageListTabIds(e, widgets);

  // === Panel ===
  if (withPanel) {
    const menu: Array<{ action: string }> = [
      { action: `actions_edit${e.id}` },
      { action: `actions_remove${e.id}` },
    ];
    if (withPage) {
      menu.push({ action: `actions_open${e.id}Page` });
    }

    cards.push({
      id: `panels_info${e.id}`,
      type: "panel",
      label: e.label ?? `{${e.attributes[0]?.id ?? "id"}}`,
      menu,
      tabs: [
        { tab: `tabs_info${e.id}` },
        ...linkageTabs.map((id) => ({ tab: id })),
      ],
    });
  }

  // === Modals ===
  if (withModals) {
    cards.push({
      id: `forms_new${e.id}`,
      type: "modal",
      form: `blocks_forms_new${e.id}`,
      label: `Добавление ${e.name ?? e.id}`,
    });
    cards.push({
      id: `forms_edit${e.id}`,
      type: "modal",
      form: `blocks_forms_edit${e.id}`,
      label: `Изменение ${e.name ?? e.id}`,
    });
  }

  // === Page ===
  if (withPage) {
    cards.push({
      id: `pages_info${e.id}`,
      type: "page",
      label: e.label ?? `{${e.attributes[0]?.id ?? "id"}}`,
      menuItem: `${e.id}Menu`,
      tabs: [
        { tab: `tabs_info${e.id}` },
        ...linkageTabs.map((id) => ({ tab: id })),
      ],
    });
  }

  return cards;
}
