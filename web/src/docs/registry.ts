// web/src/docs/registry.ts

// Vite импортирует MD-файлы как строки
import dsl from "../../../docs/DSL.md?raw";
import userGuide from "../../../docs/USER_GUIDE.md?raw";
import cli from "../../../docs/CLI.md?raw";
import architecture from "../../../docs/ARCHITECTURE.md?raw";
import examples from "../../../docs/EXAMPLES.md?raw";
import snippets from "../../../docs/SNIPPETS.md?raw";

export interface DocEntry {
  id: string;
  title: string;
  description: string;
  content: string;
  category: "guide" | "reference" | "examples";
}

export const DOCS: DocEntry[] = [
  {
    id: "user-guide",
    title: "User Guide",
    description:
      "Работа с web-редактором: интерфейс, горячие клавиши, пресеты, автосохранение",
    content: userGuide,
    category: "guide",
  },
  {
    id: "dsl",
    title: "DSL Reference",
    description:
      "Полное описание языка: сущности, атрибуты, типы, связи, workflow, деревья",
    content: dsl,
    category: "reference",
  },
  {
    id: "cli",
    title: "CLI Reference",
    description: "Команды dsb: gen, validate, info, inspect, init",
    content: cli,
    category: "reference",
  },
  {
    id: "architecture",
    title: "Architecture",
    description: "Как устроен генератор: IR, парсер, генераторы, CodeMirror",
    content: architecture,
    category: "reference",
  },
  {
    id: "examples",
    title: "Examples",
    description: "20 готовых примеров доменов",
    content: examples,
    category: "examples",
  },
  {
    id: "snippets",
    title: "Snippets",
    description: "34 коротких примера лаконичности DSL",
    content: snippets,
    category: "examples",
  },
];

export const DOC_CATEGORIES: Record<DocEntry["category"], string> = {
  guide: "Руководства",
  reference: "Справочники",
  examples: "Примеры",
};
