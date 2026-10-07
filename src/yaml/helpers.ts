import { YAMLMap, YAMLSeq, Scalar } from "yaml";

export function map(entries: Array<[string, unknown]>): YAMLMap {
  const m = new YAMLMap();
  for (const [k, v] of entries) {
    if (v !== undefined) m.set(k, v);
  }
  return m;
}

export function seq<T>(items: T[]): YAMLSeq {
  const s = new YAMLSeq();
  for (const item of items) s.add(item);
  return s;
}

export function scalar(value: unknown): Scalar {
  const s = new Scalar(value);
  if (typeof value === "boolean") s.type = "PLAIN";
  return s;
}
