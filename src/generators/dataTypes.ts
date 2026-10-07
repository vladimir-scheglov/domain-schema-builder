import { YAMLMap, YAMLSeq } from "yaml";
import { IR, IRDataType } from "../ir/types";

export function buildDataTypes(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();
  for (const dt of ir.dataTypes) seq.add(buildDataType(dt));
  return seq;
}

function buildDataType(dt: IRDataType): YAMLMap {
  const m = new YAMLMap();
  m.set("id", dt.id);
  if (dt.name) m.set("name", dt.name);
  if (dt.description) m.set("description", dt.description);
  m.set("dataType", dt.kind);

  if (dt.kind === "Enum" && dt.values?.length) {
    m.set("values", buildEnumValues(dt.values));
  }

  if (dt.kind === "Workflow") {
    if (dt.statuses?.length) {
      m.set("statuses", buildWorkflowStatuses(dt.statuses));
    }
    if (dt.initial) {
      m.set("initial", dt.initial);
    }
    if (dt.transitions?.length) {
      const trs = new YAMLSeq();
      for (const t of dt.transitions) {
        const tm = new YAMLMap();
        tm.set("from", t.from);
        tm.set("to", t.to);
        trs.add(tm);
      }
      m.set("transitions", trs);
    }
  }

  return m;
}

function buildEnumValues(values: IRDataType["values"]): YAMLSeq {
  const seq = new YAMLSeq();
  for (const v of values ?? []) {
    const vm = new YAMLMap();
    vm.set("id", v.id);
    if (v.name) vm.set("name", v.name);
    if (v.value !== undefined) vm.set("value", v.value);
    seq.add(vm);
  }
  return seq;
}

function buildWorkflowStatuses(statuses: IRDataType["statuses"]): YAMLSeq {
  const seq = new YAMLSeq();
  for (const s of statuses ?? []) {
    const sm = new YAMLMap();
    sm.set("id", s.id);
    if (s.name) sm.set("name", s.name);
    if (s.description) sm.set("description", s.description);
    seq.add(sm);
  }
  return seq;
}
