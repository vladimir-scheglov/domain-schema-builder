// web/src/components/dsl-editor/dsl-tooltip.ts
import { hoverTooltip, type Tooltip } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import type { DslEditorContext } from "./completions";

/**
 * Hover-подсказки для DSL.
 * Возвращает CM6 Extension.
 */
export function dslTooltip(getContext: () => DslEditorContext) {
  return hoverTooltip(
    (view, pos, side) => {
      const word = view.state.wordAt(pos);
      if (!word) return null;

      const text = view.state.sliceDoc(word.from, word.to);
      if (!text) return null;

      // Не показываем на слишком коротких словах
      if (text.length < 2) return null;

      // Анализируем контекст вокруг слова, чтобы понять, что это
      const context = getContext();
      const tooltip = buildTooltip(view, word.from, word.to, text, context);

      return tooltip;
    },
    {
      hoverTime: 300, // задержка перед показом (мс)
    },
  );
}

// ============================================================
// Построение tooltip
// ============================================================

function buildTooltip(
  view: EditorView,
  from: number,
  to: number,
  word: string,
  context: DslEditorContext,
): Tooltip | null {
  const doc = view.state.doc.toString();

  // Смотрим символы ДО и ПОСЛЕ слова, чтобы понять контекст
  const beforeWord = doc.slice(Math.max(0, from - 30), from);
  const afterWord = doc.slice(to, Math.min(doc.length, to + 30));

  // === 1. Тип данных в атрибуте: "value: String" или "x: enum(IocType)" ===
  // Проверяем, идёт ли после слова конец строки или пробел (значит, это значение)
  const isValuePosition =
    /:\s*$/.test(beforeWord) || // "key: word"
    /\($/.test(beforeWord) || // "enum(word"
    /Reference\($/.test(beforeWord) || // "Reference(word"
    /workflow\($/.test(beforeWord); // "workflow(word"

  // === 2. Ключ верхнего уровня или ID сущности: "Ioc:" ===
  // После слова идёт ":" и конец строки
  const isKeyPosition = /^:\s*$/m.test(afterWord.split("\n")[0] + "\n");
  // Точнее: сразу после слова идёт ':' (в той же строке)

  // === 3. Использование в Reference/enum/workflow ===

  // Проверим, что мы в контексте типа enum(...) или workflow(...)
  const enumMatch = /enum\(([\w]+)\)/.exec(
    doc.slice(Math.max(0, from - 6), Math.min(doc.length, to + 2)),
  );
  if (enumMatch && enumMatch[1] === word) {
    const e = context.state.enums.find((en) => en.id === word);
    if (e) return buildEnumTooltip(from, to, e);
  }

  const wfMatch = /workflow\(([\w]+)\)/.exec(
    doc.slice(Math.max(0, from - 10), Math.min(doc.length, to + 2)),
  );
  if (wfMatch && wfMatch[1] === word) {
    const w = context.state.workflows.find((wf) => wf.id === word);
    if (w) return buildWorkflowTooltip(from, to, w);
  }

  // === 4. Сущность (в Reference(...) или как ключ) ===
  const entity = context.state.entities.find((e) => e.id === word);
  if (entity) {
    // Проверим, что это действительно ссылка или ключ, а не случайное совпадение
    const isInReference = /Reference\($/.test(beforeWord);
    const isInArrayReference = /Array<Reference\($/.test(beforeWord);
    const isKey = isKeyPosition;

    if (isInReference || isInArrayReference || isKey) {
      return buildEntityTooltip(from, to, entity, context);
    }
  }

  // === 5. Атрибут: слово после ":" в блоке attributes ===
  // Ищем выше курсора, в какой сущности мы находимся
  if (isValuePosition) {
    // Это значение атрибута типа String/Integer/... — не показываем
    return null;
  }

  return null;
}

// ============================================================
// Tooltip для сущности
// ============================================================

function buildEntityTooltip(
  from: number,
  to: number,
  entity: DslEditorContext["state"]["entities"][number],
  context: DslEditorContext,
): Tooltip {
  return {
    pos: from,
    end: to,
    above: true,
    create: () => {
      const dom = document.createElement("div");
      dom.className = "cm-dsl-tooltip cm-dsl-tooltip-entity";

      // Считаем связи
      const links = context.state.links.filter(
        (l) => l.from === entity.id || l.to === entity.id,
      );

      const attrsCount = entity.attributes.length;
      const linksCount = links.length;
      const inherits = entity.inherits;

      // Формируем список атрибутов
      const attrsHtml = buildAttributesList(entity.attributes);

      dom.innerHTML = `
        <div class="cm-dsl-tooltip-header">
          <span class="cm-dsl-tooltip-badge cm-dsl-tooltip-badge-entity">E</span>
          <span class="cm-dsl-tooltip-id">${escapeHtml(entity.id)}</span>
        </div>
        ${entity.name ? `<div class="cm-dsl-tooltip-title">${escapeHtml(entity.name)}</div>` : ""}
        ${entity.description ? `<div class="cm-dsl-tooltip-desc">${escapeHtml(entity.description)}</div>` : ""}
        <div class="cm-dsl-tooltip-divider"></div>
        <div class="cm-dsl-tooltip-meta">
          ${attrsCount} атрибутов · ${linksCount} связей
          ${inherits ? ` · наследует от ${escapeHtml(inherits)}` : ""}
        </div>
        ${entity.label ? `<div class="cm-dsl-tooltip-meta">label: <code>${escapeHtml(entity.label)}</code></div>` : ""}
        ${attrsHtml}
      `;

      return { dom };
    },
  };
}

/**
 * Формирует HTML-список атрибутов:
 *   value: String
 *   type: enum(IocType)
 *   sources: Array<Reference(IocSource)>
 */
function buildAttributesList(
  attributes: DslEditorContext["state"]["entities"][number]["attributes"],
): string {
  if (attributes.length === 0) {
    return `
      <div class="cm-dsl-tooltip-divider"></div>
      <div class="cm-dsl-tooltip-empty">Нет атрибутов</div>
    `;
  }

  // Показываем максимум 10 атрибутов, иначе — с многоточием
  const MAX = 10;
  const shown = attributes.slice(0, MAX);
  const hidden = attributes.length - shown.length;

  const rowsHtml = shown
    .map((a) => {
      const id = escapeHtml(a.id || "(без id)");
      const type = escapeHtml(a.type || "—");
      const flags: string[] = [];
      if (a.readonly) flags.push("readonly");
      if (a.default) flags.push(`= ${a.default}`);

      const flagsHtml = flags.length
        ? `<span class="cm-dsl-tooltip-attr-flags">${escapeHtml(flags.join(" · "))}</span>`
        : "";

      return `
        <div class="cm-dsl-tooltip-attr">
          <span class="cm-dsl-tooltip-attr-id">${id}</span>
          <span class="cm-dsl-tooltip-attr-sep">:</span>
          <span class="cm-dsl-tooltip-attr-type">${type}</span>
          ${flagsHtml}
        </div>
      `;
    })
    .join("");

  const moreHtml =
    hidden > 0 ? `<div class="cm-dsl-tooltip-more">…и ещё ${hidden}</div>` : "";

  return `
    <div class="cm-dsl-tooltip-divider"></div>
    <div class="cm-dsl-tooltip-attrs">
      ${rowsHtml}
      ${moreHtml}
    </div>
  `;
}

// ============================================================
// Tooltip для enum
// ============================================================

function buildEnumTooltip(
  from: number,
  to: number,
  en: DslEditorContext["state"]["enums"][number],
): Tooltip {
  return {
    pos: from,
    end: to,
    above: true,
    create: () => {
      const dom = document.createElement("div");
      dom.className = "cm-dsl-tooltip";

      const values = en.values
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
      const preview = values.slice(0, 6).join(", ");
      const more = values.length > 6 ? ` …и ещё ${values.length - 6}` : "";

      dom.innerHTML = `
        <div class="cm-dsl-tooltip-header">
          <span class="cm-dsl-tooltip-badge cm-dsl-tooltip-badge-enum">▦</span>
          <span class="cm-dsl-tooltip-id">${escapeHtml(en.id)}</span>
        </div>
        <div class="cm-dsl-tooltip-divider"></div>
        <div class="cm-dsl-tooltip-meta">
          ${values.length} значений:
        </div>
        <div class="cm-dsl-tooltip-values">
          ${escapeHtml(preview)}${more}
        </div>
      `;

      return { dom };
    },
  };
}

// ============================================================
// Tooltip для workflow
// ============================================================

function buildWorkflowTooltip(
  from: number,
  to: number,
  wf: DslEditorContext["state"]["workflows"][number],
): Tooltip {
  return {
    pos: from,
    end: to,
    above: true,
    create: () => {
      const dom = document.createElement("div");
      dom.className = "cm-dsl-tooltip";

      const statuses = wf.statuses
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const transitions = wf.transitions
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      dom.innerHTML = `
        <div class="cm-dsl-tooltip-header">
          <span class="cm-dsl-tooltip-badge cm-dsl-tooltip-badge-workflow">⚙</span>
          <span class="cm-dsl-tooltip-id">${escapeHtml(wf.id)}</span>
        </div>
        ${wf.name ? `<div class="cm-dsl-tooltip-title">${escapeHtml(wf.name)}</div>` : ""}
        ${wf.description ? `<div class="cm-dsl-tooltip-desc">${escapeHtml(wf.description)}</div>` : ""}
        <div class="cm-dsl-tooltip-divider"></div>
        <div class="cm-dsl-tooltip-meta">
          ${statuses.length} статусов · ${transitions.length} переходов
        </div>
        ${wf.initial ? `<div class="cm-dsl-tooltip-meta">initial: ${escapeHtml(wf.initial)}</div>` : ""}
      `;

      return { dom };
    },
  };
}

// ============================================================
// Утилиты
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
