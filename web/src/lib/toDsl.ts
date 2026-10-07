import { UIState } from "../types";

export function uiToDsl(state: UIState): string {
  const lines: string[] = [];

  lines.push(`domain: ${state.domain}`);
  lines.push(`version: ${state.version}`);
  if (state.name) lines.push(`name: ${state.name}`);
  if (state.description) lines.push(`description: ${state.description}`);
  if (state.author) lines.push(`author: ${state.author}`);
  if (state.tags.length) lines.push(`tags: [${state.tags.join(", ")}]`);
  lines.push("");

  // entities
  lines.push("entities:");
  for (const e of state.entities) {
    lines.push(`  ${e.id}:`);
    if (e.name) lines.push(`    name: ${e.name}`);
    if (e.label) lines.push(`    label: ${JSON.stringify(e.label)}`);
    if (e.description) lines.push(`    description: ${e.description}`);
    if (e.inherits) lines.push(`    inherits: ${e.inherits}`);

    const uiLines: string[] = [];
    if (e.generateList === false) uiLines.push("      list: false");
    if (e.generateModals === false) uiLines.push("      modals: false");
    if (e.generatePanel === false) uiLines.push("      panel: false");
    if (e.generatePage === true) uiLines.push("      page: true");
    if (e.generateSorting === false) uiLines.push("      sorting: false"); 
    if (e.generateSearching === false) uiLines.push("      searching: false"); 
    if (e.generateLinkages === false) uiLines.push("      linkages: false");

    if (uiLines.length > 0) {
      lines.push(`    ui:`);
      lines.push(...uiLines);
    }

    lines.push("    attributes:");
    for (const a of e.attributes) {
      const isIdentifier = a.type === "Identifier";
      const hasIdentifierOpts =
        isIdentifier &&
        (a.sequence || a.template || a.defaultPrefix || a.incrementTemplate);

      const full = a.default || a.readonly !== false ? a.readonly : false;
      const needsFull = !!a.default || a.readonly || hasIdentifierOpts;

      if (needsFull) {
        lines.push(`      ${a.id}:`);
        lines.push(`        type: ${a.type}`);
        if (a.default) lines.push(`        default: ${a.default}`);
        if (a.readonly) lines.push(`        readonly: true`);
        if (isIdentifier) {
          if (a.sequence) lines.push(`        sequence: ${a.sequence}`);
          if (a.template) lines.push(`        template: "${a.template}"`);
          if (a.defaultPrefix)
            lines.push(`        defaultPrefix: ${a.defaultPrefix}`);
          if (a.incrementTemplate)
            lines.push(`        incrementTemplate: "${a.incrementTemplate}"`);
        }
      } else {
        lines.push(`      ${a.id}: ${a.type}`);
      }
    }
    lines.push("");
  }

  // enums
  if (state.enums.length) {
    lines.push("enums:");
    for (const en of state.enums) {
      const values = en.values
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length === 0) continue;
      lines.push(`  ${en.id}:`);
      for (const v of values) lines.push(`    - ${v}`);
    }
    lines.push("");
  }

  if (state.workflows.length) {
    lines.push("workflows:");
    for (const w of state.workflows) {
      lines.push(`  ${w.id}:`);
      if (w.name) lines.push(`    name: ${w.name}`);
      if (w.description) lines.push(`    description: ${w.description}`);
      if (w.initial) lines.push(`    initial: ${w.initial}`);

      const statuses = w.statuses
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length) {
        lines.push("    statuses:");
        for (const s of statuses) {
          const [id, ...nameParts] = s.split(":").map((x) => x.trim());
          const name = nameParts.join(":");
          if (name) {
            lines.push(`      ${id}: ${name}`);
          } else {
            lines.push(`      - ${id}`);
          }
        }
      }

      const trans = w.transitions
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
      if (trans.length) {
        lines.push("    transitions:");
        for (const t of trans) {
          lines.push(`      - ${t}`);
        }
      }
    }
    lines.push("");
  }

  // links
  if (state.links.length) {
    lines.push("links:");
    const byFrom: Record<string, string[]> = {};
    for (const l of state.links) {
      (byFrom[l.from] ??= []).push(`${l.type} ${l.to}`);
    }
    for (const [from, entries] of Object.entries(byFrom)) {
      lines.push(`  ${from}:`);
      for (const e of entries) lines.push(`    - ${e}`);
    }
    lines.push("");
  }

  if (state.trees?.length) {
    lines.push("trees:");
    for (const t of state.trees) {
      const id = t.id || "UnnamedTree";
      const chain = t.chain.trim();

      if (t.type === "ordinary") {
        // Краткая форма: одной строкой
        lines.push(`  ${id}: ${chain}`);
      } else {
        // Развёрнутая форма для orderable/multiparent
        lines.push(`  ${id}:`);
        lines.push(`    type: ${t.type}`);
        lines.push(`    chain: ${chain}`);
      }
    }
    lines.push("");
  }

  // sequences
  if (state.sequences.length) {
    lines.push("sequences:");
    for (const s of state.sequences) {
      lines.push(`  ${s.id}:`);
      lines.push(`    startFrom: ${s.startFrom}`);
    }
    lines.push("");
  }

  // menus
  if (state.menus.length) {
    lines.push("menus:");
    for (const id of state.menus) lines.push(`  - ${id}`);
  }

  return lines.join("\n") + "\n";
}
