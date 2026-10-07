import { YAMLMap, YAMLSeq } from "yaml";
import type { IRAttribute, IRConstraint } from "../ir/types";

export function buildAttribute(a: IRAttribute): YAMLMap {
  const m = new YAMLMap();
  m.set("id", a.id);
  if (a.name) m.set("name", a.name);
  if (a.description) m.set("description", a.description);
  m.set("dataType", a.dataType);

  if (a.dataType === "Reference" && a.entity) {
    m.set("entity", a.entity);
  }

  if (a.dataType === "Array" && a.item) {
    const item = new YAMLMap();
    item.set("dataType", a.item.dataType);
    if (a.item.entity) item.set("entity", a.item.entity);
    if (a.item.constraints?.length) {
      item.set("constraints", buildConstraints(a.item.constraints));
    }
    m.set("item", item);
  }

  if (a.sequence) m.set("sequence", a.sequence);
  if (a.template) m.set("template", a.template);
  if (a.defaultPrefix) m.set("defaultPrefix", a.defaultPrefix);
  if (a.incrementTemplate) m.set("incrementTemplate", a.incrementTemplate);

  if (a.prefixRules?.length) {
    const seq = new YAMLSeq();
    for (const r of a.prefixRules) {
      const rm = new YAMLMap();
      rm.set("id", r.id);
      rm.set("attribute", r.attribute);
      const src = new YAMLMap();
      src.set("entity", r.source.entity);
      src.set("key", r.source.key);
      src.set("value", r.source.value);
      rm.set("source", src);
      seq.add(rm);
    }
    m.set("prefixRules", seq);
  }

  if (a.constraints?.length) {
    m.set("constraints", buildConstraints(a.constraints));
  }
  if (a.readonly !== undefined) m.set("readonly", a.readonly);
  return m;
}

function buildConstraints(cs: IRConstraint[]): YAMLSeq {
  const seq = new YAMLSeq();
  for (const c of cs) {
    const m = new YAMLMap();
    m.set("kind", c.kind);
    if (c.message) m.set("message", c.message);
    if (c.min !== undefined) m.set("min", c.min);
    if (c.max !== undefined) m.set("max", c.max);
    if (c.regexp) m.set("regexp", c.regexp);
    if (c.mimeTypes?.length) m.set("mimeTypes", c.mimeTypes);
    seq.add(m);
  }
  return seq;
}

export function buildAttributes(attrs: IRAttribute[]): YAMLSeq {
  const s = new YAMLSeq();
  for (const a of attrs) s.add(buildAttribute(a));
  return s;
}
