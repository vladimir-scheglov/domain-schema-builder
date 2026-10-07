// src/generators/trees.ts
import { YAMLMap, YAMLSeq } from "yaml";
import { IR, IRTree, IRTreeNode, IRTreeChild } from "../ir/types";

export function buildTrees(ir: IR): YAMLSeq {
  const seq = new YAMLSeq();
  for (const t of ir.trees) seq.add(buildTree(t));
  return seq;
}

function buildTree(t: IRTree): YAMLMap {
  const m = new YAMLMap();
  m.set("id", t.id);
  if (t.type) m.set("type", t.type);
  m.set("hierarchy", buildHierarchy(t.hierarchy));

  // === NEW: sorting для дерева ===
  if (t.sorting && t.sorting.length > 0) {
    const sortingSeq = new YAMLSeq();
    for (const rule of t.sorting) {
      const ruleMap = new YAMLMap();
      ruleMap.set("id", rule.id);
      if (rule.name) ruleMap.set("name", rule.name);

      const bySeq = new YAMLSeq();
      for (const b of rule.by) {
        const byMap = new YAMLMap();
        byMap.set("entity", b.entity);

        const innerBySeq = new YAMLSeq();
        for (const inner of b.by) {
          const innerMap = new YAMLMap();
          innerMap.set("attribute", inner.attribute);
          innerMap.set("direction", inner.direction);
          innerBySeq.add(innerMap);
        }
        byMap.set("by", innerBySeq);
        bySeq.add(byMap);
      }
      ruleMap.set("by", bySeq);
      sortingSeq.add(ruleMap);
    }
    m.set("sorting", sortingSeq);
  }

  return m;
}

function buildHierarchy(node: IRTreeNode): YAMLMap {
  const m = new YAMLMap();
  m.set("entity", node.entity);
  if (node.children?.length) m.set("children", buildChildren(node.children));
  return m;
}

function buildChildren(children: IRTreeChild[]): YAMLSeq {
  const seq = new YAMLSeq();
  for (const c of children) seq.add(buildChild(c));
  return seq;
}

function buildChild(c: IRTreeChild): YAMLMap {
  const m = new YAMLMap();
  m.set("linkage", c.linkage);
  m.set("entity", c.entity);
  if (c.children?.length) m.set("children", buildChildren(c.children));
  return m;
}
