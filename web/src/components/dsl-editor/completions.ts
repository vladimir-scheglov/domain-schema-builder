// web/src/components/dsl-editor/completions.ts
import type {
  CompletionContext,
  CompletionResult,
  Completion,
} from "@codemirror/autocomplete";
import type { UIState } from "../../types";

export interface DslEditorContext {
  state: UIState;
}

export function dslCompletions(context: DslEditorContext) {
  return (ctx: CompletionContext): CompletionResult | null => {
    // Слово под курсором
    const word = ctx.matchBefore(/[\w./]*/);
    if (!word) return null;
    if (word.from === word.to && !ctx.explicit) return null;

    // Анализируем текст до курсора
    const before = ctx.state.doc.sliceString(0, ctx.pos);
    const scope = detectScope(before);

    const options = getCompletionsForScope(scope, context.state);

    return {
      from: word.from,
      options,
      validFor: /^[\w./]*$/,
    };
  };
}

interface Scope {
  section:
    | "top"
    | "entities"
    | "enums"
    | "workflows"
    | "links"
    | "trees"
    | "menus"
    | "unknown";
  entityId?: string;
  level: "attributes" | "entity-props" | "unknown";
}

function detectScope(text: string): Scope {
  const lines = text.split("\n");

  // Идём снизу вверх, ищем ближайший секционный ключ
  let section: Scope["section"] = "top";

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;

    // Секция верхнего уровня (без отступа)
    const topMatch = /^([a-zA-Z]+):/.exec(line);
    if (topMatch && !line.startsWith(" ")) {
      const key = topMatch[1]!;
      if (
        [
          "entities",
          "enums",
          "workflows",
          "links",
          "trees",
          "menus",
          "sequences",
          "inherit",
        ].includes(key)
      ) {
        section = key as Scope["section"];
        break;
      }
      if (
        key === "domain" ||
        key === "version" ||
        key === "name" ||
        key === "description"
      ) {
        section = "top";
        break;
      }
    }
  }

  // Если внутри entities — определяем текущую сущность
  let entityId: string | undefined;
  let level: Scope["level"] = "unknown";

  if (section === "entities") {
    // Ищем "  EntityId:" (2 пробела) выше курсора
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!;
      const m = /^  ([A-Z][\w]*):\s*$/.exec(line);
      if (m) {
        entityId = m[1];
        break;
      }
      // Если встретили более высокий уровень — стоп
      if (line && !line.startsWith(" ")) break;
    }

    // Определяем, в attributes ли мы
    if (entityId) {
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]!;
        if (/^    attributes:\s*$/.test(line)) {
          level = "attributes";
          break;
        }
        if (/^    [a-z][\w]*:\s*$/.test(line)) {
          level = "entity-props";
          break;
        }
        if (/^  [A-Z]/.test(line)) break;
      }
    }
  }

  return { section, entityId, level };
}

function getCompletionsForScope(scope: Scope, state: UIState): Completion[] {
  const options: Completion[] = [
    {
      label: "ent:",
      type: "keyword",
      detail: "сущность",
      apply: "ent:NewEntity > title:String",
    },
    {
      label: "enum:",
      type: "keyword",
      detail: "перечисление",
      apply: "enum:NewEnum > VAL1:Значение 1, VAL2:Значение 2",
    },
    {
      label: "wf:",
      type: "keyword",
      detail: "workflow",
      apply: "wf:NewWorkflow > draft -> published",
    },
    {
      label: "link:",
      type: "keyword",
      detail: "связь",
      apply: "link:From > n:n > To",
    },
    {
      label: "tree:",
      type: "keyword",
      detail: "дерево",
      apply: "tree:MyTree > Root > Child > Leaf",
    },
    {
      label: "menu:",
      type: "keyword",
      detail: "меню",
      apply: "menu:Entity1, Entity2",
    },
    {
      label: "ref:",
      type: "keyword",
      detail: "Reference",
      apply: "ref:EntityName",
    },
    {
      label: "arr:",
      type: "keyword",
      detail: "Array",
      apply: "arr:String",
    },
    {
      label: "arrRef:",
      type: "keyword",
      detail: "Array<Reference>",
      apply: "arrRef:EntityName",
    },
  ];

  // Типы данных для атрибутов
  const BASE_TYPES = [
    "String",
    "Text",
    "Integer",
    "Decimal",
    "Float",
    "Bool",
    "Date",
    "Time",
    "Timestamp",
    "Uuid",
    "MAC",
    "IpAddress",
    "CIDR",
    "URL",
    "Attachment",
    "Identifier",
  ];

  const enumTypes: Completion[] = state.enums.map((e) => ({
    label: `enum(${e.id})`,
    type: "enum",
    detail: "перечисление",
    apply: `enum(${e.id})`,
  }));

  const workflowTypes: Completion[] = state.workflows.map((w) => ({
    label: `workflow(${w.id})`,
    type: "class",
    detail: "workflow",
    apply: `workflow(${w.id})`,
  }));

  const referenceTypes: Completion[] = state.entities.map((e) => ({
    label: `Reference(${e.id})`,
    type: "variable",
    detail: "ссылка на сущность",
    apply: `Reference(${e.id})`,
  }));

  const arrayTypes: Completion[] = [
    { label: "Array<String>", type: "type", apply: "Array<String>" },
    { label: "Array<Integer>", type: "type", apply: "Array<Integer>" },
    ...state.entities.map((e) => ({
      label: `Array<Reference(${e.id})>`,
      type: "type",
      apply: `Array<Reference(${e.id})>`,
    })),
    ...state.enums.map((e) => ({
      label: `Array<enum(${e.id})>`,
      type: "type",
      apply: `Array<enum(${e.id})>`,
    })),
  ];

  // === Заполнение по контексту ===

  // Верхний уровень — секции
  if (scope.section === "top") {
    return [
      { label: "domain:", type: "keyword", apply: "domain: " },
      { label: "version:", type: "keyword", apply: "version: " },
      { label: "name:", type: "keyword", apply: "name: " },
      { label: "description:", type: "keyword", apply: "description: " },
      { label: "author:", type: "keyword", apply: "author: " },
      { label: "tags:", type: "keyword", apply: "tags: []" },
      { label: "entities:", type: "keyword", apply: "entities:\n  " },
      { label: "enums:", type: "keyword", apply: "enums:\n  " },
      { label: "workflows:", type: "keyword", apply: "workflows:\n  " },
      { label: "links:", type: "keyword", apply: "links:\n  " },
      { label: "trees:", type: "keyword", apply: "trees:\n  " },
      { label: "menus:", type: "keyword", apply: "menus:\n  " },
    ];
  }

  // Внутри entities — предлагаем типы
  if (scope.section === "entities" && scope.level === "attributes") {
    // Если пользователь уже начал вводить тип
    return [
      ...BASE_TYPES.map((t) => ({ label: t, type: "type", apply: t })),
      ...enumTypes,
      ...workflowTypes,
      ...referenceTypes,
      ...arrayTypes,
    ];
  }

  // Внутри entities — ID новых сущностей (показываем примеры)
  if (scope.section === "entities" && scope.level === "unknown") {
    return [
      { label: "Entity", type: "class", detail: "начните с CamelCase" },
      // Существующие ID как подсказка (вдруг пользователь хочет ссылку)
      ...state.entities.map((e) => ({
        label: e.id,
        type: "class",
        detail: e.name ?? "сущность",
      })),
    ];
  }

  // Внутри enums — предлагаем ID enum-ов
  if (scope.section === "enums") {
    return state.enums.map((e) => ({
      label: e.id,
      type: "enum",
      detail: `${e.values?.split("\n").length ?? 0} значений`,
    }));
  }

  // Внутри workflows — существующие workflow
  if (scope.section === "workflows") {
    return state.workflows.map((w) => ({
      label: w.id,
      type: "class",
      detail: w.name ?? "workflow",
    }));
  }

  // Внутри trees — подсказка синтаксиса
  if (scope.section === "trees") {
    return [
      {
        label: "A > B > C",
        type: "text",
        detail: "простая цепочка",
        apply: "A > B > C",
      },
      {
        label: "A >(link) B",
        type: "text",
        detail: "с явной связью",
        apply: "A >(link) B",
      },
    ];
  }

  // Внутри links — ID сущностей
  if (scope.section === "links") {
    return state.entities.map((e) => ({
      label: e.id,
      type: "class",
      detail: e.name ?? "сущность",
    }));
  }

  return options;
}
