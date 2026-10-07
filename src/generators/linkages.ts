import { YAMLMap, YAMLSeq } from "yaml";
import type { IR, IRLinkage } from "../ir/types";
import { buildAttributes } from "./attributes";

export function buildLinkages(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();
  for (const l of ir.linkages) seq.add(buildLinkage(l));
  return seq;
}

function buildLinkage(l: IRLinkage): YAMLMap {
  const m = new YAMLMap();
  m.set("id", l.id);
  if (l.name) m.set("name", l.name);
  if (l.description) m.set("description", l.description);
  m.set("side1", l.side1);
  m.set("side2", l.side2);
  m.set("type", l.type);
  if (l.undirected) m.set("undirected", l.undirected);

  const nf = new YAMLMap();
  nf.set("side1", l.nameFrom.side1);
  nf.set("side2", l.nameFrom.side2);
  m.set("nameFrom", nf);

  if (l.attributes?.length) m.set("attributes", buildAttributes(l.attributes));
  return m;
}
