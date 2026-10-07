// web/src/components/dsl-editor/diagnostics.ts
import type { Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import type { DslEditorContext } from "./completions";

export function dslLinter(context: DslEditorContext) {
  return async (view: EditorView): Promise<Diagnostic[]> => {
    const text = view.state.doc.toString();

    // Не валидируем, пока текст короткий
    if (text.trim().length < 10) return [];

    try {
      const { parseDsl, validateIr } = await import("domain-schema-builder");
      const ir = parseDsl(text);
      const result = validateIr(ir);

      const diagnostics: Diagnostic[] = [];
      const lines = text.split("\n");

      for (const issue of result.issues) {
        // Попытаемся найти строку по path
        // path = "entities.Ioc.attributes.value"
        // Ищем в тексте "value:" внутри блока Ioc — упрощённо
        const line = findLineForPath(lines, issue.path);

        diagnostics.push({
          from: line >= 0 ? view.state.doc.line(line + 1).from : 0,
          to: line >= 0 ? view.state.doc.line(line + 1).to : 0,
          severity: issue.level === "error" ? "error" : "warning",
          message: `[${issue.code}] ${issue.message}`,
        });
      }

      return diagnostics;
    } catch (e) {
      // Ошибка парсинга YAML — общая
      const msg = e instanceof Error ? e.message : String(e);
      return [
        {
          from: 0,
          to: 0,
          severity: "error",
          message: msg,
        },
      ];
    }
  };
}

function findLineForPath(lines: string[], path?: string): number {
  if (!path) return -1;

  // Извлекаем последний ID из пути
  const parts = path.split(".");
  const lastId = parts[parts.length - 1];

  // Ищем строку с "id:" или "id -"
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.includes(`${lastId}:`) || line.trim().startsWith(`${lastId}:`)) {
      return i;
    }
  }
  return -1;
}
