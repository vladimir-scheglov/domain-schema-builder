// src/generators/views/index.ts
import { YAMLMap, YAMLSeq } from "yaml";
import type {
  IR,
  IRViewEntity,
  IRViewList,
  IRViewTree,
  IRWidget,
  IRGroup,
  IRCard,
  IRTable,
  IRTableColumn,
  IRTableAction,
  IRTableSortingBy,
  IRWidgetRef,
  IRWidgetAttribute,
  IRWidgetLinkageList,
  IRWidgetAction,
  IREntity,
} from "../../ir/types";
import { buildEntityView } from "./entity";
import { buildListView } from "./list";
import { buildTreeView } from "./tree";
import { buildTreeCreateWidget } from "./widgets";
import { collectTreeEntityIds } from "../../dsl/parse";

// ============================================================
// Публичная функция
// ============================================================

export function buildAllViews(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();

  // === 1. Собираем widget'ы для деревьев ===
  // treeId → { widget, rootEntityId }
  const treeWidgets = new Map<
    string,
    {
      widget: IRWidgetAction;
      rootEntityId: string;
    }
  >();

  for (const t of ir.trees) {
    const entityIds = collectTreeEntityIds(t.hierarchy);
    const treeEntities = entityIds
      .map((id) => ir.entities.find((e) => e.id === id))
      .filter((e): e is IREntity => e !== undefined);

    const widget = buildTreeCreateWidget(t.id, treeEntities);
    if (widget && treeEntities.length > 0) {
      treeWidgets.set(t.id, {
        widget,
        rootEntityId: treeEntities[0]!.id,
      });
    }
  }

  // === 2. Views сущностей, включая tree-create-виджеты в root ===
  for (const e of ir.entities) {
    const view = buildEntityView(e, ir);

    // Добавляем tree-create-виджет, если эта сущность — корень какого-то дерева
    for (const [, info] of treeWidgets) {
      if (info.rootEntityId === e.id) {
        view.widgets.push(info.widget);
      }
    }

    seq.add(serializeEntityView(view));
  }

  // === 3. Lists ===
  for (const e of ir.entities) {
    if (e.generateList === false) continue;
    seq.add(serializeListView(buildListView(e)));
  }

  // === 4. Trees ===
  for (const t of ir.trees) {
    const entityIds = collectTreeEntityIds(t.hierarchy);
    const treeEntities = entityIds
      .map((id) => ir.entities.find((e) => e.id === id))
      .filter((e): e is IREntity => e !== undefined);

    const info = treeWidgets.get(t.id);
    seq.add(serializeTreeView(buildTreeView(t, ir, info?.widget.id)));
  }

  return seq;
}

// ============================================================
// Entity view
// ============================================================

function serializeEntityView(v: IRViewEntity): YAMLMap {
  const m = new YAMLMap();
  m.set("id", v.id);
  m.set("type", v.type);
  m.set("entity", v.entity);
  if (v.label) m.set("label", v.label);

  const ws = new YAMLSeq();
  for (const w of v.widgets) ws.add(serializeWidget(w));
  m.set("widgets", ws);

  const gs = new YAMLSeq();
  for (const g of v.groups) gs.add(serializeGroup(g));
  m.set("groups", gs);

  const cs = new YAMLSeq();
  for (const c of v.views) cs.add(serializeCard(c));
  m.set("views", cs);

  return m;
}

// ============================================================
// Widgets
// ============================================================

function serializeWidget(w: IRWidget): YAMLMap {
  const m = new YAMLMap();
  m.set("id", w.id);
  m.set("type", w.type);

  if (w.type === "attribute") {
    m.set("attribute", w.attribute);
  } else if (w.type === "action") {
    // Один action
    if (w.action) {
      m.set("action", w.action);
    }
    // Массив actions
    if (w.actions?.length) {
      const actionsSeq = new YAMLSeq();
      for (const a of w.actions) {
        actionsSeq.add({ action: a });
      }
      m.set("actions", actionsSeq);
    }

    if (w.control) {
      const c = new YAMLMap();
      c.set("type", w.control.type);
      if (w.control.label) c.set("label", w.control.label);
      m.set("control", c);
    }
  } else if (w.type === "linkage") {
    m.set("side", w.side);
    if (w.label) m.set("label", w.label);
    m.set("linkage", w.linkage);
  } else if (w.type === "linkage_list") {
    m.set("side", w.side);
    if (w.label) m.set("label", w.label);

    const rules = new YAMLMap();

    if (w.rules.includes?.length) {
      const incSeq = new YAMLSeq();
      for (const inc of w.rules.includes) {
        const im = new YAMLMap();
        im.set("id", inc.id);
        if (inc.only?.length) {
          const only = new YAMLSeq();
          for (const x of inc.only) only.add(x);
          im.set("only", only);
        }
        if (inc.except?.length) {
          const exc = new YAMLSeq();
          for (const x of inc.except) exc.add(x);
          im.set("except", exc);
        }
        incSeq.add(im);
      }
      rules.set("includes", incSeq);
    }

    if (w.rules.excludes?.length) {
      const excSeq = new YAMLSeq();
      for (const ex of w.rules.excludes) {
        const em = new YAMLMap();
        em.set("id", ex.id);
        if (ex.only?.length) {
          const only = new YAMLSeq();
          for (const x of ex.only) only.add(x);
          em.set("only", only);
        }
        if (ex.except?.length) {
          const exc = new YAMLSeq();
          for (const x of ex.except) exc.add(x);
          em.set("except", exc);
        }
        excSeq.add(em);
      }
      rules.set("excludes", excSeq);
    }

    m.set("rules", rules);
  }

  return m;
}

// ============================================================
// Groups
// ============================================================

function serializeGroup(g: IRGroup): YAMLMap {
  const m = new YAMLMap();
  m.set("id", g.id);
  m.set("type", g.type);

  if (g.type === "block" || g.type === "form") {
    const layout = new YAMLMap();
    layout.set("direction", g.layout.direction);
    if (g.type === "block" && g.layout.expandable !== undefined) {
      layout.set("expandable", g.layout.expandable);
    }
    m.set("layout", layout);

    const comps = new YAMLSeq();
    for (const c of g.components) comps.add({ widget: c.widget });
    m.set("components", comps);
  } else if (g.type === "tab") {
    if (g.label) m.set("label", g.label);
    const comps = new YAMLSeq();
    for (const c of g.components) comps.add({ block: c.block });
    m.set("components", comps);
  }

  return m;
}

// ============================================================
// Cards
// ============================================================

function serializeCard(c: IRCard): YAMLMap {
  const m = new YAMLMap();
  m.set("id", c.id);
  m.set("type", c.type);

  if (c.type === "panel") {
    if (c.label) m.set("label", c.label);

    if (c.menu?.length) {
      const menu = new YAMLSeq();
      for (const item of c.menu) menu.add({ action: item.action });
      m.set("menu", menu);
    }

    const tabs = new YAMLSeq();
    for (const t of c.tabs) tabs.add({ tab: t.tab });
    m.set("tabs", tabs);
  } else if (c.type === "modal") {
    m.set("form", c.form);
    if (c.label) m.set("label", c.label);
  } else if (c.type === "page") {
    if (c.label) m.set("label", c.label);
    m.set("menuItem", c.menuItem);

    // actionPanel — опционально
    if (c.actionPanel?.length) {
      const ap = new YAMLSeq();
      for (const w of c.actionPanel) ap.add({ widget: w.widget });
      m.set("actionPanel", ap);
    }

    if (c.block) {
      m.set("block", c.block);
    } else if (c.tabs?.length) {
      const tabs = new YAMLSeq();
      for (const t of c.tabs) tabs.add({ tab: t.tab });
      m.set("tabs", tabs);
    }
  }

  return m;
}

// ============================================================
// List view
// ============================================================

function serializeListView(v: IRViewList): YAMLMap {
  const m = new YAMLMap();
  m.set("id", v.id);
  m.set("type", v.type);

  const src = new YAMLMap();
  src.set("type", "operational");
  src.set("entity", v.entity);
  m.set("source", src);

  if (v.label) m.set("label", v.label);

  const ap = new YAMLSeq();
  for (const w of v.actionPanel) ap.add({ widget: w.widget });
  m.set("actionPanel", ap);

  m.set("table", serializeTable(v.table));

  return m;
}

// ============================================================
// Tree view
// ============================================================

function serializeTreeView(v: IRViewTree): YAMLMap {
  const m = new YAMLMap();
  m.set("id", v.id);
  m.set("type", "tree");
  if (v.label) m.set("label", v.label);
  m.set("tree", v.tree);
  m.set("nodeChunkSize", v.nodeChunkSize);
  m.set("variant", v.variant);
  if (v.ordering) m.set("ordering", v.ordering);

  if (v.actionPanel?.length) {
    const ap = new YAMLSeq();
    for (const w of v.actionPanel) ap.add({ widget: w.widget });
    m.set("actionPanel", ap);
  }

  if (v.variant === "splitted") {
    if (v.list) m.set("list", v.list);
    if (v.showLeaf !== undefined) m.set("showLeaf", v.showLeaf);
    if (v.rootText) m.set("rootText", v.rootText);
    if (v.catalogTitle) m.set("catalogTitle", v.catalogTitle);
  } else if (v.table) {
    m.set("table", serializeTable(v.table));
  }

  return m;
}

// ============================================================
// Table (общая для list и tree)
// ============================================================

function serializeTable(t: IRTable): YAMLMap {
  const m = new YAMLMap();

  // columns
  const cols = new YAMLSeq();
  for (const col of t.columns) {
    const cm = new YAMLMap();
    cm.set("id", col.id);
    cm.set("attribute", col.attribute);
    cm.set("label", col.label);
    if (col.expanded) cm.set("expanded", true); 
    if (col.layout?.width) {
      const lay = new YAMLMap();
      const w = new YAMLMap();
      w.set("default", col.layout.width.default);
      w.set("min", col.layout.width.min);
      w.set("max", col.layout.width.max);
      lay.set("width", w);
      cm.set("layout", lay);
    }
    cols.add(cm);
  }
  m.set("columns", cols);

  // filter
  if (t.filter) {
    if (Array.isArray(t.filter)) {
      const filterSeq = new YAMLSeq();
      for (const f of t.filter) {
        const fm = new YAMLMap();
        fm.set("entity", f.entity);
        if (f.attributes) {
          const fa = new YAMLMap();
          fa.set("type", f.attributes.type);
          if (f.attributes.use?.length) {
            const use = new YAMLSeq();
            for (const item of f.attributes.use)
              use.add({ attribute: item.attribute });
            fa.set("use", use);
          }
          fm.set("attributes", fa);
        }
        filterSeq.add(fm);
      }
      m.set("filter", filterSeq);
    } else {
      const f = new YAMLMap();
      const fa = new YAMLMap();
      fa.set("type", t.filter.attributes?.type ?? "all");
      f.set("attributes", fa);
      m.set("filter", f);
    }
  }

  // sortingBy
  if (t.sortingBy) {
    m.set("sortingBy", serializeSortingBy(t.sortingBy));
  }

  // paging
  if (t.paging) {
    const p = new YAMLMap();
    p.set("sizes", t.paging.sizes);
    p.set("defaultSize", t.paging.defaultSize);
    m.set("paging", p);
  }

  // refresh
  if (t.refresh) {
    const r = new YAMLMap();
    r.set("mode", t.refresh.mode);
    if (t.refresh.defaults) {
      const d = new YAMLMap();
      d.set("enabled", t.refresh.defaults.enabled);
      d.set("unit", t.refresh.defaults.unit);
      d.set("interval", t.refresh.defaults.interval);
      r.set("defaults", d);
    }
    m.set("refresh", r);
  }

  // actions
  const acts = new YAMLSeq();
  for (const a of t.actions) acts.add(serializeTableAction(a));
  m.set("actions", acts);

  // selection
  m.set("selection", t.selection ?? true);

  // empty
  if (t.empty) {
    const empty = new YAMLMap();
    empty.set("message", t.empty.message);
    m.set("empty", empty);
  }

  return m;
}

function serializeSortingBy(sb: IRTableSortingBy): YAMLMap {
  const m = new YAMLMap();

  if (sb.columns?.length) {
    const cols = new YAMLSeq();
    for (const c of sb.columns) {
      cols.add({ column: c.column, sorting: c.sorting });
    }
    m.set("columns", cols);
  }

  if (sb.defaults) {
    const d = new YAMLMap();
    d.set("column", sb.defaults.column);
    d.set("direction", sb.defaults.direction);
    m.set("defaults", d);
  }

  return m;
}

function serializeTableAction(a: IRTableAction): YAMLMap {
  const m = new YAMLMap();
  m.set("type", a.type);

  if (a.type === "row_click" || a.type === "row_double_click") {
    if (a.action) m.set("action", a.action);
  } else if (a.type === "row_context_menu" && a.menu) {
    const menuSeq = new YAMLSeq();
    for (const it of a.menu) {
      const im = new YAMLMap();
      im.set("action", it.action);
      if (it.label) im.set("label", it.label);
      if (it.icon) im.set("icon", it.icon);
      menuSeq.add(im);
    }
    m.set("menu", menuSeq);
  }

  return m;
}
