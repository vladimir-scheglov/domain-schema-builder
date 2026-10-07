// src/generators/entities.ts
import { YAMLMap, YAMLSeq } from "yaml";
import { IR, IREntity } from "../ir/types";
import { buildAttributes } from "./attributes";

export function buildEntities(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();
  for (const e of ir.entities) seq.add(buildEntity(e));
  return seq;
}

function buildEntity(e: IREntity): YAMLMap {
  const m = new YAMLMap();
  m.set("id", e.id);
  if (e.name) m.set("name", e.name);
  if (e.label) m.set("label", e.label);
  if (e.description) m.set("description", e.description);
  if (e.inherits) m.set("inherits", e.inherits);

  // Секция ui — только если отличается от дефолтов
  const ui = new YAMLMap();
  let hasUi = false;

  if (e.generateList === false) {
    ui.set("list", false);
    hasUi = true;
  }
  if (e.generateModals === false) {
    ui.set("modals", false);
    hasUi = true;
  }
  if (e.generatePanel === false) {
    ui.set("panel", false);
    hasUi = true;
  }
  if (e.generatePage === true) {
    ui.set("page", true);
    hasUi = true;
  }
  if (e.generateSorting === false) {
    ui.set("sorting", false);
    hasUi = true;
  }
  if (e.generateSearching === false) {
    ui.set("searching", false);
    hasUi = true;
  }

  if (e.generateLinkages === false) {
    ui.set("linkages", false);
    hasUi = true;
  } 

  if (hasUi) m.set("ui", ui);

  m.set("attributes", buildAttributes(e.attributes));

  // === sorting ===
  if (e.sorting && e.sorting.length > 0) {
    m.set("sorting", buildSorting(e.sorting));
  }

  // === searching ===
  if (e.searching && e.searching.length > 0) {
    const seq = new YAMLSeq();
    for (const rule of e.searching) {
      const m = new YAMLMap();
      m.set("id", rule.id);
      if (rule.name) m.set("name", rule.name);
      m.set("attribute", rule.attribute);
      seq.add(m);
    }
    m.set("searching", seq);
  }

  return m;
}

function buildSorting(rules: IREntity["sorting"]): YAMLSeq {
  const seq = new YAMLSeq();
  for (const rule of rules ?? []) {
    const ruleMap = new YAMLMap();
    ruleMap.set("id", rule.id);
    if (rule.name) ruleMap.set("name", rule.name);

    const bySeq = new YAMLSeq();
    for (const b of rule.by) {
      const byMap = new YAMLMap();
      byMap.set("attribute", b.attribute);
      byMap.set("direction", b.direction);
      bySeq.add(byMap);
    }
    ruleMap.set("by", bySeq);
    seq.add(ruleMap);
  }
  return seq;
}
