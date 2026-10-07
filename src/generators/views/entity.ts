// src/generators/views/entity.ts
import type { IR, IREntity, IRViewEntity } from "../../ir/types";
import { buildWidgetsForEntity } from "./widgets";
import { buildGroupsForEntity } from "./groups";
import { buildCardsForEntity } from "./cards";

export function buildEntityView(e: IREntity, ir: IR): IRViewEntity {
  const widgets = buildWidgetsForEntity(e, ir);
  const groups = buildGroupsForEntity(e, widgets);
  const cards = buildCardsForEntity(e, widgets);

  return {
    id: `view${e.id}`,
    type: "entity",
    entity: e.id,
    widgets,
    groups,
    views: cards,
  };
}
