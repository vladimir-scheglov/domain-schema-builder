// web/src/components/dsl-editor/emmet-highlighter.ts
import {
  Decoration,
  ViewPlugin,
  EditorView,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const emmetMark = Decoration.mark({ class: "cm-emmet-line" });

/**
 * Подсвечивает строки, начинающиеся с Emmet-префиксов:
 *   ent:  enum:  wf:  link:  tree:  menu:  ref:  arr:  arrRef:
 * Показывает пользователю, что строку можно развернуть по Tab.
 */
export const emmetHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const EMMET_PREFIX = /^\s*(ent|enum|wf|link|tree|menu|ref|arr|arrRef):/;

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    let pos = from;

    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;

      if (EMMET_PREFIX.test(text)) {
        builder.add(line.from, line.to, emmetMark);
      }

      pos = line.to + 1;
      if (pos > to) break;
    }
  }

  return builder.finish();
}
