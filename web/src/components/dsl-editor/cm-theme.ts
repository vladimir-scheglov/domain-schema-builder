// web/src/components/dsl-editor/cm-theme.ts
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const colors = {
  bg: "#f9fafb",
  text: "#111827",
  key: "#7c3aed",
  string: "#16a34a",
  number: "#2563eb",
  comment: "#9ca3af",
  type: "#dc2626",
};

export const dslTheme = [
  EditorView.theme({
    "&": {
      backgroundColor: colors.bg,
      color: colors.text,
      fontSize: "12px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      height: "100%",
    },
    ".cm-content": {
      padding: "10px",
    },
    ".cm-gutters": {
      backgroundColor: "#f3f4f6",
      color: "#9ca3af",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#dbeafe",
    },
    ".cm-selectionBackground": {
      backgroundColor: "#bfdbfe !important",
    },
    ".cm-tooltip-autocomplete": {
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.propertyName, color: colors.key },
      { tag: tags.string, color: colors.string },
      { tag: tags.number, color: colors.number },
      { tag: tags.comment, color: colors.comment, fontStyle: "italic" },
      { tag: tags.keyword, color: colors.type },
    ]),
  ),
];
