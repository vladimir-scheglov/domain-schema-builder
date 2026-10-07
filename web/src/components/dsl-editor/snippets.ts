// web/src/components/dsl-editor/snippets.ts
import type { Completion } from "@codemirror/autocomplete";

export const snippets: Completion[] = [
  {
    label: "entity",
    type: "keyword",
    detail: "создать сущность",
    apply: (view, _completion, from, to) => {
      const cursor = view.state.doc.lineAt(to).number;
      const snippet = [
        "NewEntity:",
        "  name: New Entity",
        '  label: "{title}"',
        "  attributes:",
        "    title: String",
      ].join("\n");
      view.dispatch({
        changes: { from, to, insert: snippet },
      });
    },
  },
  {
    label: "enum",
    type: "keyword",
    detail: "создать enum",
    apply: (view, _completion, from, to) => {
      view.dispatch({
        changes: {
          from,
          to,
          insert: "NewEnum:\n  VALUE1: Значение 1\n  VALUE2: Значение 2",
        },
      });
    },
  },
  {
    label: "wf",
    type: "keyword",
    detail: "создать workflow",
    apply: (view, _completion, from, to) => {
      view.dispatch({
        changes: {
          from,
          to,
          insert: [
            "NewWorkflow:",
            "  name: Новый процесс",
            "  initial: draft",
            "  statuses:",
            "    draft: Черновик",
            "    published: Опубликован",
            "  transitions:",
            "    - draft -> published",
          ].join("\n"),
        },
      });
    },
  },
  {
    label: "tree",
    type: "keyword",
    detail: "создать дерево",
    apply: (view, _completion, from, to) => {
      view.dispatch({
        changes: {
          from,
          to,
          insert: "MyTree: Root > Child > Leaf",
        },
      });
    },
  },
  {
    label: "id",
    type: "keyword",
    detail: "атрибут с Identifier",
    apply: (view, _completion, from, to) => {
      view.dispatch({
        changes: {
          from,
          to,
          insert:
            'itemId:\n  type: Identifier\n  template: "{@prefix}-{@inc}"\n  defaultPrefix: ITM',
        },
      });
    },
  },
];
