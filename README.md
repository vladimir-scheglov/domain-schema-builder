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
  # …и ещё 11 действий (create, edit, open_panel, bulk_remove × 1 сущность)
views:
  - id: viewIoc
    type: entity
    entity: Ioc
    widgets: [...]      # 3 виджета
    groups: [...]       # 4 группы
    views: [...]        # 3 карточки (panel, modal × 2)
  - id: lists_ioc
    type: list
    entity: Ioc
    actionPanel: [...]
    table:
      columns: [...]
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
| **[DSL Reference](docs/DSL.md)** | Полное описание языка: метаданные, сущности, атрибуты, типы, связи, workflow, наследование, идентификаторы |
| **[User Guide](docs/USER_GUIDE.md)** | Работа с web-редактором: интерфейс, пресеты, автосохранение, share-ссылки |
| **[Architecture](docs/ARCHITECTURE.md)** | Как устроен генератор: IR, парсер, генераторы, слои |
| **[Examples](docs/EXAMPLES.md)** | Готовые примеры доменов: IOCs, аудит, активы, инциденты |

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

# Отредактировать my-domain.dsl.yaml в любимом редакторе…

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
- смотреть предпросмотр DSL и готовой схемы в реальном времени;
- загружать готовые пресеты;
- сохранять свои пресеты в браузере;
- делиться состоянием через ссылку.

Подробнее — в [User Guide](docs/USER_GUIDE.md).

---

## Примеры

Все примеры — в [docs/EXAMPLES.md](docs/EXAMPLES.md). Краткий обзор:

| Пресет | Что показывает |
|---|---|
| **IOCs Domain** | Сущности, enum, reference, идентификаторы, связь n:n |
| **Аудит** | Workflow, связь 1:n, идентификаторы с префиксом |
| **Активы** | Наследование (`Server` и `Workstation` от `Device`) |
| **Инциденты (расширенный)** | Большой workflow на 7 статусов, enum'ы |
| **Пустой домен** | Минимальный каркас для старта |

Загрузить в web-UI — кнопка **«Примеры ▾»** в тулбаре. Или указать в URL: `http://localhost:5173/?preset=iocs`.

---

## Возможности

### Язык DSL

- **Сущности и атрибуты** — краткий и полный синтаксис.
- **Типы данных** — базовые, `enum(X)`, `workflow(X)`, `Reference(X)`, `Array<T>`.
- **Перечисления** — простые списки и с русскими именами.
- **Workflow** — статусы, переходы, `initial`, визуализация графом.
- **Связи** — `1:1`, `1:n`, `n:n`, направленные и ненаправленные.
- **Наследование** — через `inherits` или блок `inherit`.
- **Идентификаторы** — последовательности и шаблоны (`{@prefix}-{@YY}/{@MM}-{@inc}`).
- **Default-значения** — через `default` в атрибуте.
- **Constraints** — `required`, `length`, `regexp`, `range`, `unique` и т.д.

### Что генерируется

- Схема домена со всеми обязательными блоками.
- Действия: create, edit, open_panel, bulk_remove — для каждой сущности.
- Представления: entity (panel + 2 modal) и list (table + actionPanel) — для каждой сущности.
- Меню: root_group + пункты для каждой сущности из `menus`.
- Правила данных: `default` для атрибутов с заданным значением.
- Связи, перечисления, workflow, последовательности — по описанию.

### Валидация

- Разбор YAML и проверка структуры DSL.
- Семантические проверки: неразрешённые ссылки, циклы наследования, отсутствие `initial` у workflow, конфликты ID и т.д.
- Все ошибки выводятся с кодом и путём.

### Web-редактор

- Редактор сущностей, атрибутов, enum'ов, workflow, связей, меню.
- SVG-визуализация workflow с параллельными и обратными рёбрами.
- Предпросмотр DSL и сгенерированной схемы.
- Пресеты (встроенные и пользовательские).
- Автосохранение рабочей сессии.
- Share-ссылки.

### CLI

- `--watch` с красивым diff при изменениях.
- Цветной вывод, поддержка `--no-color` для CI.
- Команды `validate`, `info`, `inspect`, `init`.

---

## Структура проекта

```
domain-schema-builder/
├── src/                       # ядро (Node.js, ESM)
│   ├── ir/                    # промежуточная модель (Intermediate Representation)
│   │   ├── types.ts
│   │   ├── schema.ts          # zod-схемы
│   │   └── validate.ts        # семантические проверки
│   ├── dsl/
│   │   └── parse.ts           # парсер DSL → IR
│   ├── generators/            # генераторы IR → YAML
│   │   ├── metadata.ts
│   │   ├── entities.ts
│   │   ├── attributes.ts
│   │   ├── dataTypes.ts
│   │   ├── sequences.ts
│   │   ├── linkages.ts
│   │   ├── menus.ts
│   │   ├── actions.ts
│   │   ├── dataRules.ts
│   │   └── views/
│   ├── cli/
│   │   ├── diff.ts            # diff для --watch
│   │   └── hash.ts
│   ├── cli.ts                 # CLI-точка входа
│   └── index.ts               # публичный API
├── web/                       # web-редактор (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── presets.ts
│   │   ├── store.tsx
│   │   ├── types.ts
│   │   └── App.tsx
│   └── package.json
├── docs/                      # документация
│   ├── DSL.md
│   ├── USER_GUIDE.md
│   ├── ARCHITECTURE.md
│   └── EXAMPLES.md
├── examples/                  # примеры DSL
│   ├── iocs.dsl.yaml
│   └── run.ts
└── tests/
    └── e2e.test.ts
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

Изменения в ядре требуют `npm run build` в корне, чтобы они подхватились в `web/` (пакет подключён через `file:..`).

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

1. **DSL должен быть компактным.** Пользователь описывает только то, что нельзя сгенерировать автоматически. Всё остальное — забота генератора.

2. **Генератор должен быть предсказуемым.** Одни и те же входные данные → один и тот же выход, без сюрпризов. Порядок ключей в YAML фиксирован, комментарии не добавляются.

3. **Валидация — до публикации, а не после.** Пользователь должен узнать об ошибке сразу, а не после того, как схема уйдёт в систему и не примется.

4. **Никаких магических зависимостей.** Только `yaml`, `zod` и `commander` для ядра. Остальное — минимализм и стандартная библиотека.

5. **Документация — часть продукта.** DSL и API описаны так, чтобы новый пользователь разобрался за 15 минут.

---

## Статус

- ✅ **v0.1** — ядро, DSL, CLI, web-редактор
- 🔄 **v0.2** — в работе: расширенная кастомизация views, mixins
- 📋 **v0.3** — план: автоматическая публикация через API, плагины

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
- [Architecture](docs/ARCHITECTURE.md)
- [Examples](docs/EXAMPLES.md)
- [Issues](../../issues)

---

**Сделано для тех, кому надоело писать YAML руками.**