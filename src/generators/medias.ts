// src/generators/medias.ts
import { YAMLMap, YAMLSeq } from "yaml";
import { IRMedia } from "../ir/types";

export function buildMedias(medias: IRMedia[]): YAMLSeq {
  const seq = new YAMLSeq();
  for (const m of medias) seq.add(buildMedia(m));
  return seq;
}

function buildMedia(m: IRMedia): YAMLMap {
  const map = new YAMLMap();
  map.set("id", m.id);
  if (m.description) map.set("description", m.description);
  map.set("type", m.type);
  map.set("iconName", m.iconName);
  return map;
}

/**
 * Автогенерация набора стандартных иконок для действий сущностей.
 * Используется генератором medias и widget'ов в actions.
 */
export function buildAutoMedias(): IRMedia[] {
  return [
    { id: "iconsAdd", type: "icon_name", iconName: "plus" },
    { id: "iconsEdit", type: "icon_name", iconName: "pencil" },
    { id: "iconsDelete", type: "icon_name", iconName: "trash" },
  ];
}
