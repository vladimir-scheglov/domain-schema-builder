// web/src/components/dsl-editor/scroll-highlight.ts
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

export const setHighlight = StateEffect.define<number | null>();

export const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,

  update(deco, tr) {
    // Смещаем старые декорации при изменениях
    deco = deco.map(tr.changes);

    // Обрабатываем эффекты
    for (const e of tr.effects) {
      if (e.is(setHighlight)) {
        if (e.value === null) {
          return Decoration.none;
        }
        const line = tr.state.doc.lineAt(e.value);
        const mark = Decoration.line({ class: "cm-scroll-highlight" });
        return Decoration.set([mark.range(line.from)]);
      }
    }

    return deco;
  },

  provide: (f) => EditorView.decorations.from(f),
});
