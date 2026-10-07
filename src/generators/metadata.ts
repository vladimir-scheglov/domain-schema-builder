import { YAMLMap } from "yaml";
import type { IR } from "../ir/types";

export function buildMetadata(ir: IR): YAMLMap {
  const m = new YAMLMap();
  m.set("id", ir.domain);
  m.set("type", "domain");
  m.set("version", ir.version);
  if (ir.name) m.set("name", ir.name);
  if (ir.description) m.set("description", ir.description);
  if (ir.status) m.set("status", ir.status);
  if (ir.date) m.set("date", ir.date);
  if (ir.author) m.set("author", ir.author);
  if (ir.tags?.length) m.set("tags", ir.tags);
  return m;
}
