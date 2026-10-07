import { YAMLMap, YAMLSeq } from "yaml";
import type { IR, IRMenu } from "../ir/types";

export function buildMenus(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();

  if (ir.menus.length === 0 && ir.trees.length > 0) {
    const prefix = ir.domain.split(".")[0]!;
    const items = ir.trees.map((t) => ({
      id: `${t.id}Menu`,
      route: `/${prefix}/${t.id.toLowerCase()}`,
      label: `Дерево ${ir.entities.find((e) => e.id === t.hierarchy.entity)?.name ?? t.hierarchy.entity}`,
      type: "menu" as const,
      view: `tree_${t.id}`,
    }));
    seq.add(
      buildMenu({
        id: `menus_${prefix}`,
        route: `/${prefix}`,
        label: ir.name ?? ir.domain,
        type: "root_group",
        placement: "top",
        items,
      }),
    );
    return seq;
  }

  for (const m of ir.menus) {
    const items = (m.items ?? []).filter(item => {
      const entityId = item.id.replace(/Menu$/, '');
      const e = ir.entities.find(x => x.id === entityId);
      return e?.generateList !== false;
    });

    // Добавляем пункты меню для деревьев
    for (const t of ir.trees) {
      items.push({
        id: `${t.id}Menu`,
        route: `${m.route}/${t.id.toLowerCase()}`,
        label: `Дерево ${ir.entities.find(e => e.id === t.hierarchy.entity)?.name ?? t.hierarchy.entity}`,
        type: 'menu',
        view: `tree_${t.id}`,
      });
    }

    if (items.length === 0) continue;
    seq.add(buildMenu({ ...m, items }));
  }

  return seq;
}

function buildMenu(m: IRMenu): YAMLMap {
  const map = new YAMLMap();
  map.set("id", m.id);
  map.set("route", m.route);
  map.set("label", m.label);
  map.set("type", m.type);
  if (m.description) map.set("description", m.description);
  map.set("placement", m.placement);
  if (m.view) map.set("view", m.view);
  if (m.items?.length) {
    const items = new YAMLSeq();
    for (const it of m.items) {
      const im = new YAMLMap();
      im.set("id", it.id);
      im.set("route", it.route);
      im.set("label", it.label);
      im.set("type", it.type);
      im.set("view", it.view);
      if (it.description) im.set("description", it.description);
      items.add(im);
    }
    map.set("items", items);
  }
  return map;
}
