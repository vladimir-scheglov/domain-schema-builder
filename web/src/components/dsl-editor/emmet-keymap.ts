// web/src/components/dsl-editor/emmet-keymap.ts
import type { KeyBinding } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { expandEmmet } from "./emmet";

export const emmetKeymap: KeyBinding[] = [
  {
    key: "Tab",
    run: (view) => {
      console.log("[emmet] Tab pressed");
      const { state } = view;
      const { from, to } = state.selection.main;

      // Не разворачиваем, если есть выделение
      if (from !== to) return false;

      // Находим начало текущей строки
      const line = state.doc.lineAt(from);
      const lineText = state.sliceDoc(line.from, from);
      const trimmed = lineText.trim();

      // Проверяем, похоже ли на Emmet
      if (!/^(ent|enum|wf|link|tree|menu|ref|arr|arrRef):/.test(trimmed)) {
        return false; // обычный Tab
      }

      const result = expandEmmet(trimmed);
      if (!result) return false;

      // Определяем отступ — сохраняем его
      const indent = lineText.match(/^\s*/)?.[0] ?? "";
      const insertion = result.yaml
        .split("\n")
        .map((l, i) => (i === 0 ? l : indent + l))
        .join("\n");

      // Заменяем строку на развёрнутый YAML
      view.dispatch({
        changes: {
          from: line.from + indent.length,
          to: from,
          insert: insertion,
        },
        selection: EditorSelection.cursor(
          line.from + indent.length + insertion.length,
        ),
      });

      return true;
    },
  },
  {
    key: "Mod-Enter", // Cmd+Enter / Ctrl+Enter
    run: (view) => {
      // То же самое, но альтернативная клавиша
      const { state } = view;
      const { from } = state.selection.main;
      const line = state.doc.lineAt(from);
      const lineText = state.sliceDoc(line.from, from);
      const trimmed = lineText.trim();

      if (!/^(ent|enum|wf|link|tree|menu|ref|arr|arrRef):/.test(trimmed)) {
        return false;
      }

      const result = expandEmmet(trimmed);
      if (!result) return false;

      const indent = lineText.match(/^\s*/)?.[0] ?? "";
      const insertion = result.yaml
        .split("\n")
        .map((l, i) => (i === 0 ? l : indent + l))
        .join("\n");

      view.dispatch({
        changes: {
          from: line.from + indent.length,
          to: from,
          insert: insertion,
        },
        selection: EditorSelection.cursor(
          line.from + indent.length + insertion.length,
        ),
      });

      return true;
    },
  },
];
