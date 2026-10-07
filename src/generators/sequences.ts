import { YAMLMap, YAMLSeq } from "yaml";
import type { IR, IRSequence } from "../ir/types";

export function buildSequences(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();
  for (const s of ir.sequences) seq.add(buildSequence(s));
  return seq;
}

function buildSequence(s: IRSequence): YAMLMap {
  const m = new YAMLMap();
  m.set("id", s.id);
  if (s.startFrom !== undefined) m.set("startFrom", s.startFrom);
  if (s.description) m.set("description", s.description);
  return m;
}
