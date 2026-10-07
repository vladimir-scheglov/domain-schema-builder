// src/generators/index.ts
import { Document } from "yaml";
import { IR } from "../ir/types";
import { buildMetadata } from "./metadata";
import { buildEntities } from "./entities";
import { buildDataTypes } from "./dataTypes";
import { buildSequences } from "./sequences";
import { buildLinkages } from "./linkages";
import { buildMenus } from "./menus";
import { buildActions } from "./actions";
import { buildDataRules } from "./dataRules";
import { buildAllViews } from "./views";
import { buildMedias, buildAutoMedias } from "./medias"; // ← NEW
import { buildTrees } from "./trees";

export function generateFromIr(ir: IR): string {
  const doc = new Document({});

  const meta = buildMetadata(ir);
  for (const key of [
    "id",
    "type",
    "version",
    "name",
    "description",
    "status",
    "date",
    "author",
    "tags",
  ]) {
    const v = meta.get(key);
    if (v !== undefined) doc.set(key, v);
  }

  if (ir.entities.length) doc.set("entities", buildEntities(ir));
  if (ir.dataTypes.length) doc.set("dataTypes", buildDataTypes(ir));
  if (ir.sequences.length) doc.set("sequences", buildSequences(ir));
  if (ir.linkages.length) doc.set("linkages", buildLinkages(ir));
  if (ir.trees.length) doc.set("trees", buildTrees(ir));  
  
  const menus = buildMenus(ir);
  if (menus.items.length > 0) {
    doc.set("menus", menus);
  }

  if (ir.actions.length) doc.set("actions", buildActions(ir));
  doc.set("views", buildAllViews(ir));
  const dataRules = buildDataRules(ir);
  if (dataRules.items.length > 0) {
    doc.set("dataRules", dataRules);
  }

  // === NEW: medias ===
  const allMedias = [...(ir.medias ?? []), ...buildAutoMedias()];
  // Убираем дубликаты по id
  const seen = new Set<string>();
  const uniqueMedias = allMedias.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  if (uniqueMedias.length) {
    doc.set("medias", buildMedias(uniqueMedias));
  }

  return doc.toString({ lineWidth: 0, indent: 2 });
}
