# Domain Schema Builder

Генератор YAML-схем доменов из компактного DSL. Пишете 50 строк — получаете полную схему с сущностями, атрибутами, связями, представлениями, действиями и меню.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#лицензия)

---

## Что это

Описание домена в реальной системе требует сотен строк YAML: сущности, атрибуты, связи, виджеты, формы, панели, действия, меню. Писать это руками — долго и чревато ошибками.

**Domain Schema Builder** решает эту проблему: вы описываете домен в компактном DSL, а генератор строит полную схему.

```yaml
# Входной DSL — 20 строк
domain: iocs.test
version: 0.0.1
name: IOCs Domain

entities:
  Ioc:
    name: Индикатор
    label: "{type}: {value}"
    attributes:
      value: String
      type: enum(IocType)
      iocId:
        type: Identifier
        sequence: IOCSeq

enums:
  IocType: [IP, Domain, URL, Email]

sequences:
  IOCSeq:
    startFrom: 1

menus:
  - Ioc
```

↓ Генератор собирает ↓

```yaml
# Выходная схема — 250+ строк
id: iocs.test
type: domain
version: 0.0.1
name: IOCs Domain
entities:
  - id: Ioc
    name: Индикатор
    label: "{type}: {value}"
    attributes:
      - id: value
        dataType: String
      - id: type
        dataType: IocType
      - id: iocId
        dataType: Identifier
        sequence: IOCSeq
dataTypes:
  - id: IocType
    dataType: Enum
    values:
      - id: IP
      - id: Domain
      - id: URL
      - id: Email
sequences:
  - id: IOCSeq
    startFrom: 1
menus:
  - id: menus_iocs
    route: /iocs
    label: IOCs Domain
    type: root_group
    placement: top
    items:
      - id: IocMenu
        route: /iocs/ioc
        label: Индикатор
        type: menu
        view: lists_ioc
actions:
  - id: actions_createIoc
    name: Добавить
    type: open_modal
    modal: forms_newIoc
    entity: Ioc
    operation: create
  # …и ещё 11 действий
views:
  - id: viewIoc
    type: entity
    entity: Ioc
    widgets: [...]      # 3 виджета
    groups: [...]       # 4 группы
    views: [...]        # 3 карточки
  - id: lists_ioc
    type: list
    entity: Ioc
    actionPanel: [...]
    table:
      columns: [...]
      filter:
        attributes: { type: all }
      paging: { sizes: [10, 50, 100], defaultSize: 50 }
      actions: [...]
dataRules:
  - id: default_Ioc
    entity: Ioc
    rule:
      effect: default
      attributes: [...]
```

Всё, что раньше занимало час ручной работы — за секунду.

---

## Документация

| Документ | О чём |
|---|---|
| **[DSL Reference](docs/DSL.md)** | Полное описание языка: метаданные, сущности, атрибуты, типы, связи, workflow, наследование, идентификаторы, деревья |
| **[User Guide](docs/USER_GUIDE.md)** | Работа с web-редактором: интерфейс, горячие клавиши, палитра команд, пресеты, автосохранение, share-ссылки, DSL-редактор |
| **[CLI Reference](docs/CLI.md)** | Команды `dsb`: `gen`, `validate`, `info`, `inspect`, `init` |
| **[Architecture](docs/ARCHITECTURE.md)** | Как устроен генератор: IR, парсер, генераторы, слои |
| **[Examples](docs/EXAMPLES.md)** | 14 готовых примеров доменов |
| **[Snippets](docs/SNIPPETS.md)** | 25 коротких примеров лаконичности DSL |

---

## Быстрый старт

### Установка

```bash
git clone <repo-url>
cd domain-schema-builder
npm install
npm run build
```

### Сгенерировать схему из DSL

```bash
# Создать шаблон
npx tsx src/cli.ts init my-domain.dsl.yaml

# Отредактировать my-domain.dsl.yaml…

# Сгенерировать схему
npx tsx src/cli.ts gen my-domain.dsl.yaml
# → my-domain.schema.yaml
```

### CLI: полный набор команд

```bash
npx tsx src/cli.ts gen <file>          # Сгенерировать схему
npx tsx src/cli.ts gen <file> -w       # Watch-режим с diff
npx tsx src/cli.ts validate <file>     # Только проверить
npx tsx src/cli.ts info <file>         # Краткая сводка
npx tsx src/cli.ts inspect <file>      # IR в JSON (для отладки)
npx tsx src/cli.ts init [file]         # Создать шаблон
```

### Web-редактор

```bash
cd web
npm install
npm run dev
# → http://localhost:5173
```

Веб-редактор позволяет:
- собирать схему мышью, без правки YAML;
- работать с DSL напрямую через CodeMirror-редактор с подсветкой и автодополнением;
- видеть предпросмотр DSL и готовой схемы в реальном времени;
- смотреть семантический diff с применённым состоянием;
- загружать 14 встроенных пресетов;
- сохранять свои пресеты в браузере;
- делиться состоянием через ссылку;
- использовать горячие клавиши и палитру команд.

Подробнее — в [User Guide](docs/USER_GUIDE.md).

---

## Возможности

### Язык DSL

- **Сущности и атрибуты** — краткий и полный синтаксис.
- **Типы данных** — базовые, `enum(X)`, `workflow(X)`, `Reference(X)`, `Array<T>`.
- **Перечисления** — простые списки и с русскими именами.
- **Workflow** — статусы, переходы, `initial`, визуализация графом.
- **Связи** — `1:1`, `1:n`, `n:n`, направленные и ненаправленные.
- **Наследование** — через `inherits` или блок `inherit`.
- **Деревья** — цепочки вида `A > B > C` с явным указанием связей.
- **Идентификаторы** — последовательности и шаблоны (`{@prefix}-{@YY}/{@MM}-{@inc}`).
- **Default-значения** — через `default` в атрибуте.
- **Constraints** — `required`, `length`, `regexp`, `range`, `unique`.
- **Флаги генерации UI** — секция `ui:` (list, modals, panel, page).

### Что генерируется

- Схема домена со всеми обязательными блоками.
- Действия: `create`, `edit`, `open_panel`, `open_page`, `bulk_remove` — по флагам.
- Представления: `entity` (panel, modal × 2, page) и `list` — по флагам.
- Меню: root_group + пункты для каждой сущности и дерева.
- Правила данных: `default` для атрибутов с заданным значением.
- Связи, перечисления, workflow, последовательности, деревья.

### Валидация

- Разбор YAML и проверка структуры DSL.
- 17 семантических проверок: неразрешённые ссылки, циклы наследования, отсутствие `initial` у workflow, несуществующие связи в деревьях и т.д.
- Все ошибки выводятся с кодом и путём.

### Web-редактор

- **Редактор сущностей, атрибутов, enum'ов, workflow, связей, деревьев, меню.**
- **Массовое добавление атрибутов** — вставка списком с живым предпросмотром.
- **Клонирование сущностей** — Cmd+D.
- **SVG-визуализация workflow** с параллельными и обратными рёбрами.
- **Флаги генерации UI** — отключать лист, модалки, панель, включать полный экран.
- **Предпросмотр DSL и схемы** в реальном времени.
- **CodeMirror-редактор** — подсветка YAML, автодополнение, hover-подсказки, валидация, Emmet-сниппеты.
- **Семантический diff** — что изменится при применении.
- **Пресеты** — 14 встроенных + пользовательские с экспортом/импортом.
- **Автосохранение** рабочей сессии.
- **Share-ссылки** — состояние в base64url.
- **Горячие клавиши** и **палитра команд** (Cmd+K).
- **Справка по хоткеям** — F1 или `?`.

### CLI

- `--watch` с красивым diff при изменениях.
- Цветной вывод, поддержка `--no-color` для CI.
- Команды `validate`, `info`, `inspect`, `init`.

---

## Горячие клавиши

| Клавиша | Действие |
|---|---|
| **N** | Новая сущность |
| **A** | Новый атрибут |
| **E** | Новый enum |
| **W** | Новый workflow |
| **T** | Новое дерево |
| **Cmd/Ctrl + D** | Дублировать сущность |
| **Cmd/Ctrl + K** | Палитра команд |
| **?** или **F1** | Справка |

Полный список — в [User Guide](docs/USER_GUIDE.md#горячие-клавиши) или по нажатию **?** в web-UI.

---

## Примеры

Все примеры — в [docs/EXAMPLES.md](docs/EXAMPLES.md). Каталог пресетов в web-UI:

**Стартовые:**
- Пустой домен
- CRUD-сущность
- Справочник

**Предметные области:**
- IOCs Domain — индикаторы компрометации
- Активы — оборудование с наследованием
- Инциденты — workflow на 7 статусов
- Аудит — два workflow
- Задачи — канбан-подобный домен

**Workflow:**
- Линейный
- С ветвлением
- Циклический

**Продвинутые:**
- Наследование — типы документов
- Кросс-доменные ссылки
- Многие-ко-многим
- Дерево — иерархия

Загрузить в web-UI — кнопка **«Примеры ▾»**. Или указать в URL: `http://localhost:5173/?preset=iocs`.

---

## Структура проекта

```
domain-schema-builder/
├── src/                       # ядро (Node.js, ESM)
│   ├── ir/                    # промежуточная модель
│   │   ├── types.ts
│   │   ├── schema.ts
│   │   └── validate.ts
│   ├── dsl/
│   │   └── parse.ts           # парсер DSL → IR
│   ├── generators/            # генераторы IR → YAML
│   │   ├── metadata.ts
│   │   ├── entities.ts
│   │   ├── attributes.ts
│   │   ├── dataTypes.ts
│   │   ├── sequences.ts
│   │   ├── linkages.ts
│   │   ├── trees.ts
│   │   ├── menus.ts
│   │   ├── actions.ts
│   │   ├── dataRules.ts
│   │   ├── medias.ts
│   │   └── views/
│   ├── cli/
│   │   ├── diff.ts
│   │   └── hash.ts
│   ├── cli.ts
│   └── index.ts
├── web/                       # web-редактор (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── dsl-editor/    # CodeMirror + Emmet + tooltips
│   │   │   ├── Toolbar.tsx
│   │   │   ├── PresetMenu.tsx
│   │   │   ├── EntityList.tsx
│   │   │   ├── EntityEditor.tsx
│   │   │   ├── AttributeEditor.tsx
│   │   │   ├── BulkAttributesDialog.tsx
│   │   │   ├── EnumEditor.tsx
│   │   │   ├── WorkflowEditor.tsx
│   │   │   ├── WorkflowGraph.tsx
│   │   │   ├── LinkEditor.tsx
│   │   │   ├── TreeEditor.tsx
│   │   │   ├── MenuEditor.tsx
│   │   │   ├── YamlPreview.tsx
│   │   │   ├── DslEditorModal.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── HotkeysDialog.tsx
│   │   │   ├── ImportDialog.tsx
│   │   │   └── SavePresetDialog.tsx
│   │   ├── hooks/
│   │   │   └── useHotkeys.ts
│   │   ├── lib/
│   │   │   ├── toDsl.ts
│   │   │   ├── fromIr.ts
│   │   │   ├── loadDsl.ts
│   │   │   ├── draftStorage.ts
│   │   │   ├── presetStorage.ts
│   │   │   ├── shareUrl.ts
│   │   │   ├── entityUtils.ts
│   │   │   ├── platform.ts
│   │   │   ├── useDslSync.ts
│   │   │   └── parseAttributeLines.ts
│   │   ├── presets.ts
│   │   ├── store.tsx
│   │   ├── types.ts
│   │   └── App.tsx
│   └── package.json
├── docs/
│   ├── DSL.md
│   ├── USER_GUIDE.md
│   ├── CLI.md
│   ├── ARCHITECTURE.md
│   ├── EXAMPLES.md
│   └── SNIPPETS.md
├── examples/
│   ├── iocs.dsl.yaml
│   └── run.ts
├── tests/
│   └── e2e.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

---

## Разработка

### Требования

- Node.js ≥ 20
- npm ≥ 10

### Установка зависимостей

```bash
npm install
cd web && npm install
```

### Проверка типов и тесты

```bash
npm run typecheck
npm test
```

### Сборка

```bash
# ядро
npm run build

# web
cd web && npm run build
```

### Разработка ядра

```bash
npx tsx src/cli.ts info examples/iocs.dsl.yaml
npx tsx src/cli.ts gen examples/iocs.dsl.yaml --watch
```

### Разработка web

```bash
cd web
npm run dev
```

**Важно:** после изменения ядра (`src/`) — **пересоберите** `dist/`:

```bash
npm run build
```

Web-UI использует собранный `dist/index.js` через `file:..`. Если не пересобрать — web продолжит использовать старую версию.

### Полезный скрипт

Добавьте в `web/package.json`:

```json
"scripts": {
  "dev": "npm run build:core && vite",
  "build:core": "cd .. && npm run build"
}
```

Тогда `npm run dev` **всегда** сначала пересоберёт ядро.

---

## Программный API

```ts
import { generateSchema, parseDsl, validateIr, generateFromIr } from 'domain-schema-builder';
import { readFileSync, writeFileSync } from 'node:fs';

// Один вызов — от DSL до YAML
const dsl = readFileSync('domain.dsl.yaml', 'utf8');
const yaml = generateSchema(dsl);
writeFileSync('domain.schema.yaml', yaml);

// Пошаговый контроль
const ir = parseDsl(dsl);
const result = validateIr(ir);
if (!result.ok) {
  for (const issue of result.issues) {
    console.error(`[${issue.code}] ${issue.message}`);
  }
  process.exit(1);
}
const yaml2 = generateFromIr(ir);
```

---

## Философия проекта

1. **DSL должен быть компактным.** Пользователь описывает только то, что нельзя сгенерировать автоматически.

2. **Генератор должен быть предсказуемым.** Одни и те же входные данные → один и тот же выход. Порядок ключей в YAML фиксирован.

3. **Валидация — до публикации, а не после.** Пользователь должен узнать об ошибке сразу.

4. **Никаких магических зависимостей.** Только `yaml`, `zod`, `commander`, `diff` для ядра. Для web — `vite`, `react`, `codemirror`.

5. **Документация — часть продукта.** DSL и API описаны так, чтобы новый пользователь разобрался за 15 минут.

---

## Статус

- ✅ **v0.2** — ядро, DSL с деревьями и флагами UI, CLI, web-редактор, CodeMirror с Emmet, semantic diff, горячие клавиши, палитра команд
- 🔄 **v0.3** — в работе: constraints в web-UI, проекции, `dsb publish`
- 📋 **v0.4** — план: mixins, импорт существующей YAML-схемы, тёмная тема

---

## Лицензия

MIT. См. файл [LICENSE](LICENSE).

---

## Контрибьютинг

1. Форк.
2. Ветка `feature/my-feature`.
3. Тесты + документация.
4. Pull request.

Перед PR — `npm run typecheck && npm test`.

---

## Ссылки

- [DSL Reference](docs/DSL.md)
- [User Guide](docs/USER_GUIDE.md)
- [CLI Reference](docs/CLI.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Examples](docs/EXAMPLES.md)
- [Snippets](docs/SNIPPETS.md)
- [Issues](../../issues)

---

**Сделано для тех, кому надоело писать YAML руками.**