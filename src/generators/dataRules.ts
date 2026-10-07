import { YAMLMap, YAMLSeq } from "yaml";
import type { IR } from "../ir/types";

export function buildDataRules(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();
  for (const e of ir.entities) {
    const defaults = e.attributes.filter((a) => a.default !== undefined);
    if (defaults.length === 0) continue;

    const rule = new YAMLMap();
    rule.set("id", `default_${e.id}`);
    rule.set("name", `Значения по умолчанию для ${e.name ?? e.id}`);
    rule.set("target", "entity");
    rule.set("entity", e.id);
    rule.set("condition", true);

    const body = new YAMLMap();
    body.set("effect", "default");
    const attrs = new YAMLSeq();
    for (const a of defaults) {
      const am = new YAMLMap();
      am.set("attribute", a.id);
      am.set("value", a.default);
      attrs.add(am);
    }
    body.set("attributes", attrs);
    rule.set("rule", body);

    seq.add(rule);
  }
  return seq;
}
