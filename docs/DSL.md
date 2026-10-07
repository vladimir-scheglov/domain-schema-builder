# Domain Schema Builder — DSL Reference

Язык описания доменов (DSL) для генератора схем домена. Позволяет описать домен в компактной форме, из которой автоматически генерируется полная YAML-схема со всей инфраструктурой: сущностями, атрибутами, связями, деревьями, представлениями, действиями и меню.

- **Версия:** 0.2
- **Формат:** YAML
- **Расширение файла:** `.dsl.yaml`

---

## Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Структура DSL](#структура-dsl)
3. [Метаданные домена](#метаданные-домена)
4. [Сущности](#сущности)
5. [Атрибуты](#атрибуты)
6. [Типы данных](#типы-данных)
7. [Перечисления (Enum)](#перечисления-enum)
8. [Workflow](#workflow)
9. [Связи](#связи)
10. [Наследование](#наследование)
11. [Деревья](#деревья)
12. [Последовательности](#последовательности)
13. [Меню](#меню)
14. [Флаги генерации UI](#флаги-генерации-ui)
15. [Генерация схемы](#генерация-схемы)
16. [Полный пример](#полный-пример)
17. [Справочник по типам данных](#справочник-по-типам-данных)
18. [Ошибки и валидация](#ошибки-и-валидация)

---

## Быстрый старт

Минимальный DSL — одна сущность, одно меню:

```yaml
domain: example.test
version: 0.0.1
name: Example Domain

entities:
  Item:
    name: Элемент
    label: "{title}"
    attributes:
      title: String
      description: String
      status:
        type: enum(ItemStatus)
        default: OPEN

enums:
  ItemStatus:
    OPEN: Открыт
    CLOSED: Закрыт

menus:
  - Item
```

Из этого файла генератор соберёт схему домена с:
- 1 сущностью `Item` и 3 атрибутами;
- 1 перечислением `ItemStatus`;
- 4 действиями (создание, редактирование, просмотр, удаление);
- 2 представлениями (entity + list);
- 1 правилом данных (`default` для `status`);
- 1 корневой группой меню с 1 пунктом.

Запуск:

```bash
npx tsx src/cli.ts gen example.dsl.yaml
```

На выходе — `example.schema.yaml`.

---

## Структура DSL

DSL — это YAML-документ с фиксированным набором секций верхнего уровня:

| Секция | Обяз. | Назначение |
|---|---|---|
| `domain` | ✅ | FQDN домена (уникальный идентификатор) |
| `version` | ✅ | Версия схемы (Semantic Versioning) |
| `name` | | Название домена |
| `description` | | Описание домена |
| `author` | | Автор |
| `tags` | | Теги для классификации |
| `entities` | ✅ | Сущности домена |
| `enums` | | Перечисления |
| `workflows` | | Workflow-статусы |
| `links` | | Связи между сущностями |
| `trees` | | Деревья иерархий |
| `inherit` | | Наследование (альтернативный синтаксис) |
| `sequences` | | Числовые последовательности |
| `menus` | | Пункты меню |

Порядок секций **произвольный**, но рекомендуется придерживаться порядка выше.

---

## Метаданные домена

```yaml
domain: iocs.test
version: 0.0.1
name: IOCs Domain
description: Домен индикаторов компрометации
author: Ivan Ivanov <ivanov@example.ru>
tags: [iocs, security]
```

### Поля

| Поле | Обяз. | Тип | Описание |
|---|---|---|---|
| `domain` | ✅ | string | FQDN. Уникальный идентификатор домена. |
| `version` | ✅ | string | SemVer: `MAJOR.MINOR.PATCH`. |
| `name` | | string | Название домена (отображается в меню). |
| `description` | | string | Описание. |
| `author` | | string | Автор — имя и контакт. |
| `tags` | | string[] | Теги. |

### Правила для `domain`

- Соответствует DNS-нотации: `example.test`, `iocs.company.com`.
- Всегда на латинице, в нижнем регистре.
- Точки как разделители.

---

## Сущности

Сущности описываются в блоке `entities` как map: ключ — это `id` сущности, значение — объект с параметрами.

```yaml
entities:
  Ioc:
    name: Индикатор
    label: "{type}: {value}"
    description: Индикатор компрометации
    inherits: BaseEntity
    ui:
      list: true
      modals: true
      panel: true
      page: false
    attributes:
      value: String
      type: enum(IocType)
```

### Поля сущности

| Поле | Обяз. | Тип | Описание |
|---|---|---|---|
| `name` | | string | Название сущности |
| `label` | | string | Шаблон отображаемого имени. См. [Label](#label) |
| `description` | | string | Описание |
| `inherits` | | string | ID родительской сущности. См. [Наследование](#наследование) |
| `ui` | | object | Флаги генерации UI. См. [Флаги генерации UI](#флаги-генерации-ui) |
| `attributes` | ✅ | map | Атрибуты сущности. См. [Атрибуты](#атрибуты) |

### Правила для `id` сущности

- **PascalCase** (CamelCase с заглавной первой буквой).
- Только латиница, цифры, без разделителей.
- Длина ≤ 30 символов.
- Примеры: `Ioc`, `IocSource`, `Incident`, `DeviceConfiguration`.

### Label

Поле `label` задаёт шаблон для отображаемого имени объекта. Поддерживает подстановку значений атрибутов в фигурных скобках:

```yaml
label: "{type}: {value}"
label: "{incidentSubject}"
label: "Источник {sourceName}"
```

Если не задано — в UI отображается системный идентификатор `{id} ({domainId}/{entityId})`.

---

## Атрибуты

Атрибуты описываются в блоке `attributes` сущности как map: ключ — `id` атрибута, значение — **строка** (краткая форма) или **объект** (полная форма).

### Краткая форма

```yaml
attributes:
  value: String
  type: enum(IocType)
  sources: Array<Reference(IocSource)>
  iocId: Identifier
```

Только тип данных, без дополнительных настроек.

### Полная форма

```yaml
attributes:
  value:
    type: String
    name: Значение
    description: Значение индикатора
    readonly: false
    default: "unknown"

  status:
    type: enum(IncidentStatus)
    default: OPEN
```

### Поля атрибута

| Поле | Обяз. | Тип | Описание |
|---|---|---|---|
| `type` | ✅ | string | Тип данных. См. [Справочник по типам](#справочник-по-типам-данных) |
| `name` | | string | Отображаемое имя |
| `description` | | string | Описание |
| `readonly` | | boolean | Запрет редактирования после создания |
| `default` | | any | Значение по умолчанию (через `dataRules`) |
| `sequence` | | string | ID последовательности (для `Identifier`) |
| `template` | | string | Шаблон идентификатора (для `Identifier`) |
| `defaultPrefix` | | string | Префикс по умолчанию (для `Identifier`) |
| `incrementTemplate` | | string | Формат инкремента (для `Identifier`) |
| `prefixRules` | | array | Правила подстановки префикса (для `Identifier`) |
| `entity` | | string | Сущность-цель (для `Reference`) |
| `item` | | object | Описание элемента массива (для `Array`) |
| `constraints` | | array | Валидация значения |

### Правила для `id` атрибута

- **camelCase** (первое слово со строчной, остальные с заглавной).
- Латиница, цифры.
- Длина ≤ 30 символов.
- Примеры: `value`, `updatedAt`, `iocId`, `sourceName`.

### Readonly

```yaml
attributes:
  externalId:
    type: String
    readonly: true
```

`readonly: true` означает, что значение задаётся **только при создании** объекта и не может быть изменено при редактировании.

**Важно:** readonly-атрибут **присутствует** в форме создания, но **отсутствует** в форме редактирования.

### Default

```yaml
attributes:
  status:
    type: enum(IncidentStatus)
    default: OPEN
```

Значение `default` применяется, если пользователь не заполнил поле. Автоматически превращается в `dataRules` с `effect: default`.

**Не поддерживается** для типов: `Attachment`, `Workflow`, `Identifier`, `Counter`, `Reference`.

### Constraints

```yaml
attributes:
  email:
    type: String
    constraints:
      - kind: required
        message: Email обязателен
      - kind: regexp
        regexp: "^[^@]+@[^@]+\\.[^@]+$"
        message: Некорректный email
      - kind: length
        min: 5
        max: 100
```

Доступные `kind`:

| Kind | Описание | Доп. поля |
|---|---|---|
| `required` | Обязательный атрибут | — |
| `range` | Ограничение числа | `min`, `max` |
| `length` | Длина строки | `min`, `max` |
| `regexp` | Регулярное выражение | `regexp` |
| `size` | Размер файла | `min`, `max` |
| `mime_types` | Типы файлов | `mimeTypes[]` |
| `unique` | Уникальность значения | — |

---

## Типы данных

Полный справочник в разделе [Справочник по типам данных](#справочник-по-типам-данных).

### Краткая запись

| Тип | Пример | Описание |
|---|---|---|
| Базовые | `String`, `Integer`, `Bool`, `Date`, `Timestamp`, `Uuid`, `IpAddress`, `MAC`, `URL`, `Text` | Прямое имя типа |
| Enum | `enum(IocType)` | Ссылка на перечисление |
| Workflow | `workflow(IncidentWorkflow)` | Ссылка на workflow |
| Reference | `Reference(IocSource)` | Ссылка на сущность |
| Array | `Array<String>`, `Array<Reference(X)>`, `Array<enum(X)>` | Массив значений |

### Array

```yaml
attributes:
  tags: Array<String>
  sources: Array<Reference(IocSource)>
  statuses: Array<enum(IncidentStatus)>
```

### Reference

```yaml
attributes:
  owner: Reference(User)
  sources: Array<Reference(IocSource)>
```

Значением атрибута Reference является ссылка на объект другой сущности. В UI отображается как тег.

**Важно:** `Reference` **без** указания сущности невалиден. Используйте `Reference(X)`.

---

## Перечисления (Enum)

Перечисления описываются в блоке `enums` как map: ключ — `id` перечисления, значение — список значений или map `id: name`.

### Краткая форма

```yaml
enums:
  IocType: [IP, Domain, URL, Email, MD5Hash, SHA256Hash]
```

### Массив с именами

```yaml
enums:
  DocumentStatus:
    - DRAFT:Черновик
    - SIGNED:Подписан
    - PAID:Оплачен
```    

### Полная форма (с русскими именами)

```yaml
enums:
  IncidentStatus:
    OPEN: Открыт
    IN_PROGRESS: В работе
    CLOSED: Закрыт
```

### Правила для значений

- Ключи — латиница, цифры, подчёркивание, без пробелов.
- Рекомендуется UPPER_SNAKE_CASE: `OPEN`, `IN_PROGRESS`.
- Значения (имена) — произвольные строки.
- В массиве допустимы три формы:
  - `<id>` — только ID.
  - `<id>:<Name>` — ID и Name без пробела после `:`.
  - `<id>: <Name>` — ID и Name с пробелом после `:` (тоже корректно).

### Использование

```yaml
attributes:
  type: enum(IocType)
  statuses: Array<enum(IncidentStatus)>
```

---

## Workflow

Workflow — это пользовательский тип данных с состояниями и переходами между ними. Описывается в блоке `workflows`.

```yaml
workflows:
  AuditStatusWorkflow:
    name: Статус аудита
    description: Жизненный цикл аудита
    initial: planned
    statuses:
      planned: Запланирован
      inProgress: В работе
      completed: Завершен
    transitions:
      - planned -> inProgress
      - inProgress -> completed
```

### Поля workflow

| Поле | Обяз. | Тип | Описание |
|---|---|---|---|
| `name` | | string | Название |
| `description` | | string | Описание |
| `initial` | ✅ | string | ID начального статуса |
| `statuses` | ✅ | map или array | Список статусов |
| `transitions` | | array | Список переходов |

### Формат `statuses`

**Map (с именами):**

```yaml
statuses:
  planned: Запланирован
  inProgress: В работе
  completed: Завершен
```

**Массив (только id):**

```yaml
statuses:
  - planned
  - inProgress
  - completed
```

### Формат `transitions`

Каждый переход — строка `from -> to` или `from -> to: name`:

```yaml
transitions:
  - planned -> inProgress
  - inProgress -> completed
  - planned -> cancelled: Отменить
  - cancelled -> planned: Возобновить
```

### Использование

```yaml
attributes:
  status: workflow(AuditStatusWorkflow)
```

### Визуализация

В web-UI workflow автоматически отображается в виде SVG-графа:
- начальный статус подсвечивается зелёным;
- параллельные переходы разводятся дугами;
- при наличии имён у переходов они показываются над стрелками.

### Правила валидации

- `initial` должен быть среди `statuses`.
- Каждый `from` и `to` в `transitions` должен быть среди `statuses`.
- Циклы допустимы.

---

## Связи

Связи описываются в блоке `links`. Ключ — сущность-источник, значение — список связей с другими сущностями.

### Синтаксис

```yaml
links:
  Ioc:
    - n:n Incident
    - 1:n dictionaries.test/IncidentCategoryDict
  Incident:
    - 1:n dictionaries.test/IncidentCategoryDict
```

Формат строки связи:

```
[<|>] <тип> <сущность>
```

### Тип связи

| Тип | Описание | Пример |
|---|---|---|
| `1:1` | Один к одному | `Пользователь → Паспорт` |
| `1:n` | Один ко многим | `Пользователь → Учётные записи` |
| `n:n` | Многие ко многим | `Инцидент ↔ Индикатор` |

### Направление

- **По умолчанию** (`n:n`) — ненаправленная связь.
- **`>`** перед типом — направленная от текущей сущности.
- **`<`** перед типом — направленная к текущей сущности.

```yaml
links:
  Ioc:
    - n:n Incident          # ненаправленная
    - "> 1:n Incident"      # направленная от Ioc к Incident (в кавычках!)
    - "< 1:n Source"        # направленная к Ioc
```

**Важно:** префиксы `>` и `<` в YAML — спецсимволы. Оборачивайте такие строки в **двойные кавычки**.

### Автогенерируемые поля

| Поле | Значение |
|---|---|
| `id` | `<side1>_<side2>` |
| `name` | `Связь <side1> и <side2>` |
| `nameFrom.side1` | `Связан с <side2>` |
| `nameFrom.side2` | `Содержит <side1>` |

### Внешние домены

Если сущность в другом домене — указывается FQID:

```yaml
links:
  Incident:
    - 1:n dictionaries.test/IncidentCategoryDict
```

---

## Наследование

Наследование задаётся тремя способами.

### Способ 1 — в сущности

```yaml
entities:
  Device:
    name: Оборудование
    attributes:
      hostname: String

  Server:
    name: Сервер
    inherits: Device
    attributes:
      cpuCount: Integer
```

### Способ 2 — в блоке `inherit`

```yaml
inherit:
  Server: Device
  Workstation: Device
```

### Способ 3 — краткая форма в ключе сущности

```yaml
entities:
  Contract>Document:
    name: Договор
    attributes:
      counterparty: String
```

### Приоритет
Если указано несколько способов:
- Поле inherits в теле сущности — высший приоритет.
- Ключ A>B — средний.
- Блок inherit: — низший.

Побеждает наиболее специфичный.


### Что наследуется

- **Label** — если не задан у потомка.
- **Атрибуты** — доступны в потомке.
- **Правила данных** — наследуются.
- **Действия** — действие родителя может быть вызвано для потомка.
- **Интерфейсы** — формы, панели, виджеты.

### Ограничения

- Только **один** родитель.
- Запрещены циклы (`A → B → A`).
- Родитель и потомок могут быть в **разных доменах** (через FQID).

---

## Деревья

Деревья описывают иерархические связи между сущностями. Описываются в блоке `trees`.

### Простой синтаксис

```yaml
trees:
  RiskTree: RiskAssessment > RiskCategory > Risk
```

Генератор **сам найдёт** связи между сущностями:
- Есть связь `RiskAssessment → RiskCategory` — использует её.
- Есть связь `RiskCategory → Risk` — использует её.

### Развёрнутый синтаксис

```yaml
trees:
  RiskTree:
    type: orderable
    chain: RiskAssessment > RiskCategory > Risk
```

### Типы дерева

| Тип | Описание |
|---|---|
| `ordinary` | Обычное дерево (по умолчанию) |
| `orderable` | Разрешает перетаскивание узлов |
| `multiparent` | Узел можно включить в несколько групп |

### Явное указание связи

Если между двумя сущностями **несколько** связей — укажите ID явно:

```yaml
trees:
  RiskTree: RiskAssessment >(RiskAssessment_RiskCategory) RiskCategory >(RiskCategory_Risk) Risk
```

Синтаксис: `<entity> >(<linkageId>) <entity>`.

### Что генерируется

Из одной строки:

```yaml
trees:
  RiskTree: RiskAssessment > RiskCategory > Risk
```

↓

```yaml
trees:
  - id: RiskTree
    type: ordinary
    hierarchy:
      entity: RiskAssessment
      children:
        - linkage: RiskAssessment_RiskCategory
          entity: RiskCategory
          children:
            - linkage: RiskCategory_Risk
              entity: Risk

views:
  - id: tree_RiskTree
    type: tree
    label: Дерево Оценка риска
    tree: RiskTree
    nodeChunkSize: 20
    variant: merged
    table:
      columns: [...]
      filter:
        - entity: RiskAssessment
          attributes: { type: all }
        - entity: RiskCategory
          attributes: { type: all }
        - entity: Risk
          attributes: { type: all }
      paging: { sizes: [10, 50, 100], defaultSize: 50 }
      refresh: { mode: all, defaults: { enabled: true, unit: second, interval: 30 } }
      actions:
        - type: row_click
          action: actions_openRiskAssessmentPanel
        - type: row_click
          action: actions_openRiskCategoryPanel
        - type: row_click
          action: actions_openRiskPanel
        - type: row_context_menu
          items: [...]
      selection: true

menus:
  - id: menus_risk
    ...
    items:
      - id: RiskTreeMenu
        route: /risk/risktree
        label: Дерево Оценка риска
        type: menu
        view: tree_RiskTree
```

**Что генерируется автоматически:**

- Блок `trees` с иерархией.
- Представление `tree_RiskTree` (тип `tree`).
- Фильтрация по всем сущностям иерархии.
- `row_click` для **каждой** сущности иерархии.
- Пункт меню.

### Правила валидации

- Все сущности в цепочке должны существовать в домене.
- Между каждой парой должна быть определена связь.
- Если связей несколько — требуется явное указание ID.

---

## Последовательности

Последовательности используются в атрибутах типа `Identifier` для генерации уникальных числовых значений.

```yaml
sequences:
  IOCSeq:
    startFrom: 1
    description: Последовательность для индикаторов
```

### Использование

```yaml
entities:
  Ioc:
    attributes:
      iocId:
        type: Identifier
        sequence: IOCSeq
```

### Идентификаторы без последовательности

Если нужен шаблон, а не последовательность:

```yaml
attributes:
  sourceId:
    type: Identifier
    template: "{@YYYY}-{@MM}-{@inc}"
```

### Шаблоны Identifier

Системные литералы:

| Литерал | Значение |
|---|---|
| `{@YYYY}` | Год (4 цифры) |
| `{@YY}` | Год (2 цифры) |
| `{@MM}` | Месяц |
| `{@DD}` | День |
| `{@inc}` | Инкремент (обязательный) |
| `{@prefix}` | Префикс |

### Примеры шаблонов

```yaml
template: "{@YYYY}-{@MM}-{@inc}"              # 2025-10-42
template: "{@prefix}-{@inc}"                  # INC-42
template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}" # INC-25/10/04-0042
```

### Правила подстановки префикса

Позволяют подставлять префикс из атрибута справочной сущности:

```yaml
attributes:
  incidentId:
    type: Identifier
    template: "{@prefix}-{@inc}"
    defaultPrefix: INC
    prefixRules:
      - id: PrefixByType
        attribute: incidentType
        source:
          entity: dictionaries.test/IncidentTypeDict
          key: fullName
          value: shortCode
```

Алгоритм:
1. Если `incidentType` совпадает с `fullName` в справочнике — берём `shortCode` как префикс.
2. Иначе — используем `defaultPrefix`.

---

## Меню

Меню — список ID сущностей, для которых нужно создать пункты меню.

```yaml
menus:
  - Ioc
  - IocSource
  - Incident
```

### Пункты для деревьев

Если в домене есть `trees:`, для каждого дерева **автоматически** создаётся пункт меню. Явно указывать не нужно.

Можно указать явно:

```yaml
menus:
  - Ioc
  - tree: RiskTree
```

### Что генерируется

1. **Корневая группа меню** (`root_group`) с названием домена.
2. **Пункты меню** для каждой сущности из `menus`.
3. **Пункты меню для деревьев** — автоматически.
4. Каждый пункт ссылается на соответствующее представление.

---

## Флаги генерации UI

Для каждой сущности можно указать, какие UI-компоненты генерировать. Это делается через **опциональную** секцию `ui:`.

```yaml
entities:
  Ioc:
    name: Индикатор
    ui:
      list: true
      modals: true
      panel: true
      page: false
    attributes:
      value: String
```

### Поля `ui`

| Поле | Обяз. | По умолчанию | Описание |
|---|---|---|---|
| `list` | | `true` | Списочное представление `lists_<entity>` |
| `modals` | | `true` | Модальные окна создания и редактирования |
| `panel` | | `true` | Боковая панель с деталями |
| `page` | | `false` | Полноэкранная карточка |

### Правило сериализации

В YAML-схеме **пишутся только флаги, отличающиеся от дефолтных**:

- `list: false` — потому что дефолт `true`.
- `page: true` — потому что дефолт `false`.
- Если все флаги дефолтные — секции `ui:` **нет**.

### Что генерируется при отключении

**`list: false`** — не создаётся:
- Представление `lists_<entity>`.
- Действие `actions_bulkRemove<Entity>`.
- Кнопка `buttons_remove<Entity>`.
- Пункт меню для этой сущности (если сущность была в `menus`).
- Столбцы таблицы и все её настройки.

**`modals: false`** — не создаётся:
- Действия `actions_create<Entity>`, `actions_edit<Entity>`.
- Кнопки `buttons_create<Entity>`, `buttons_edit<Entity>`.
- Группы `blocks_forms_new<Entity>`, `blocks_forms_edit<Entity>`.
- Карточки `forms_new<Entity>`, `forms_edit<Entity>`.

**`panel: false`** — не создаётся:
- Действие `actions_open<Entity>Panel`.
- Группа `blocks_info<Entity>`.
- Карточка `panels_info<Entity>`.
- `row_click` в таблице списка.

**`page: true`** — дополнительно создаётся:
- Действие `actions_open<Entity>Page` (`type: open_page`).
- Карточка `pages_info<Entity>` (тип `page`).
- Кнопка `buttons_open<Entity>Page`.

### Пример: справочник без UI

```yaml
entities:
  Category:
    name: Категория
    ui:
      list: false
      modals: false
      panel: false
    attributes:
      name: String
```

Генерируется только сущность `Category` — она доступна как `Reference(Category)` из других сущностей, но **не имеет собственного UI**. Пункт меню не создаётся.

### Пример: только просмотр

```yaml
entities:
  Log:
    name: Журнал
    ui:
      modals: false
    attributes:
      message: String
      createdAt: Timestamp
```

Генерируется:
- Список `lists_log` (просмотр).
- Панель `panels_infoLog` (детали).
- **Нет** модалок создания/редактирования.
- **Нет** действия `bulk_remove`.

---

## Генерация схемы

### CLI

```bash
npx tsx src/cli.ts gen example.dsl.yaml
npx tsx src/cli.ts gen example.dsl.yaml --watch
npx tsx src/cli.ts validate example.dsl.yaml
npx tsx src/cli.ts info example.dsl.yaml
npx tsx src/cli.ts inspect example.dsl.yaml
npx tsx src/cli.ts init my.dsl.yaml
```

Подробнее — в [CLI Reference](CLI.md).

### Программный API

```ts
import { generateSchema, parseDsl, validateIr, generateFromIr } from 'domain-schema-builder';

const dsl = readFileSync('example.dsl.yaml', 'utf8');
const yaml = generateSchema(dsl);
```

### Что генерируется автоматически

Из каждой сущности:

| Артефакт | ID |
|---|---|
| Action create | `actions_create<Entity>` |
| Action edit | `actions_edit<Entity>` |
| Action open panel | `actions_open<Entity>Panel` |
| Action open page | `actions_open<Entity>Page` |
| Action bulk remove | `actions_bulkRemove<Entity>` |
| Widget attribute | `editors_<entity>_<attr>` |
| Widget action | `buttons_create<Entity>`, `buttons_edit<Entity>`, `buttons_remove<Entity>`, `buttons_open<Entity>Page` |
| Widget linkage | `editors_link_<Entity>_<Other>` |
| Group form | `blocks_forms_new<Entity>`, `blocks_forms_edit<Entity>` |
| Group block | `blocks_info<Entity>` |
| Group tab | `tabs_info<Entity>` |
| Card panel | `panels_info<Entity>` |
| Card modal | `forms_new<Entity>`, `forms_edit<Entity>` |
| Card page | `pages_info<Entity>` |
| View entity | `view<Entity>` |
| View list | `lists_<entityLowercase>` |
| DataRule | `default_<Entity>` |

Из связей: `linkages[]` с ID `<Side1>_<Side2>`.
Из деревьев: `trees[]` + `views[]` с ID `tree_<TreeId>`.
Из перечислений: `dataTypes[]` с ID перечисления.
Из workflow: `dataTypes[]` с ID workflow.
Из меню: `menus[]` + пункты для деревьев.

---

## Полный пример

```yaml
domain: iocs.test
version: 0.0.1
name: IOCs Domain
description: Домен индикаторов компрометации
author: Ivan Ivanov
tags: [iocs, security]

entities:
  Ioc:
    name: Индикатор
    label: "{type}: {value}"
    description: Индикатор компрометации
    attributes:
      value: String
      type: enum(IocType)
      sources: Array<Reference(IocSource)>
      iocId:
        type: Identifier
        sequence: IOCSeq

  IocSource:
    name: Источник индикатора
    label: "{sourceName}"
    attributes:
      sourceName: String
      sourceDescription: String
      sourceId:
        type: Identifier
        template: "{@YYYY}-{@MM}-{@inc}"

  Incident:
    name: Инцидент
    label: "{incidentSubject}"
    ui:
      page: true
    attributes:
      incidentSubject: String
      incidentDescription: String
      status:
        type: enum(IncidentStatus)
        default: OPEN
      severity: enum(Severity)
      incidentId:
        type: Identifier
        template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}"
        defaultPrefix: INC
        incrementTemplate: "0000"

  Category:
    name: Категория
    ui:
      list: false
      modals: false
    attributes:
      name: String
      code: String

links:
  Ioc:
    - n:n Incident
  Incident:
    - 1:n Category

enums:
  IocType: [IP, Domain, URL, Email, MD5Hash, SHA256Hash]
  IncidentStatus:
    OPEN: Открыт
    IN_PROGRESS: В работе
    CLOSED: Закрыт
  Severity:
    CRITICAL: Критический
    HIGH: Высокий
    MEDIUM: Средний
    LOW: Низкий

sequences:
  IOCSeq:
    startFrom: 1
    description: Последовательность индикаторов

menus:
  - Ioc
  - IocSource
  - Incident
```

**Что тут показано:**
- `Ioc` — базовый случай, все флаги дефолтные.
- `IocSource` — с последовательностью и шаблоном идентификатора.
- `Incident` — с `ui.page: true` (полноэкранная карточка).
- `Category` — справочник без list и модалок.
- Связи: `n:n` и `1:n`.
- Три перечисления, одна последовательность, три пункта меню.

---

## Справочник по типам данных

### Базовые типы

| Тип | Формат | Пример |
|---|---|---|
| `Uuid` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | `61f0c404-5cb3-11e7-907b-a6006ad3dba0` |
| `Timestamp` | ISO 8601 | `2024-08-10T10:31:41Z` |
| `Date` | `YYYY-MM-DD` | `2024-05-23` |
| `Time` | `hh:mm:ss` | `05:35:22` |
| `TimestampRange` | Массив Timestamp | `["2024-08-10T10:31:41Z", "2025-10-10T10:31:41Z"]` |
| `String` | Строка | `"абвг123"` |
| `Text` | Форматированный текст | многострочный |
| `MAC` | `XX:XX:XX:XX:XX:XX` | `00:53:00:B8:DF:B8` |
| `Integer` | Целое | `255` |
| `Decimal` | С фиксированной точкой | `0.9` |
| `Float` | С плавающей точкой | `0.999` |
| `Bool` | `true` / `false` | `true` |
| `IpAddress` | IPv4 / IPv6 | `192.0.2.128` |
| `CIDR` | IP + маска | `198.51.100.0/22` |
| `URL` | URL-адрес | `http://example.com` |
| `Attachment` | Файл | `picture.jpg` |

### Структурные типы

| Тип | Описание |
|---|---|
| `Array<T>` | Массив значений типа T |
| `Reference(X)` | Ссылка на сущность X |

### Специальные типы

| Тип | Описание |
|---|---|
| `Identifier` | Человекочитаемый ID с шаблоном |
| `Counter` | Счётчик времени |
| `Calculation` | Результат расчёта |
| `Configuration` | Ссылка на конфигурацию |
| `Variable` | Ссылка на переменную |
| `RQL` | Настройки фильтрации |
| `Automation` | Ссылка на автоматизацию |

### Пользовательские типы

| Тип | Описание |
|---|---|
| `Enum` | Список предопределённых значений |
| `Workflow` | Рабочий процесс с состояниями |
| `Table` | Табличная структура |

### Синтаксические формы

| Форма | Пример |
|---|---|
| Прямой тип | `String` |
| Enum-ссылка | `enum(IocType)` |
| Workflow-ссылка | `workflow(AuditStatus)` |
| Reference | `Reference(User)` |
| Массив базовый | `Array<String>` |
| Массив ссылок | `Array<Reference(User)>` |
| Массив enum | `Array<enum(IocType)>` |

---

## Ошибки и валидация

### Ошибки парсинга

| Код | Описание |
|---|---|
| `PARSE_ERROR` | Не удалось разобрать YAML или структура не соответствует DSL |

### Ошибки валидации IR

| Код | Описание |
|---|---|
| `DUPLICATE_ENTITY_ID` | Сущность с таким ID объявлена дважды |
| `DUPLICATE_ATTRIBUTE_ID` | Атрибут с таким ID объявлен дважды в одной сущности |
| `DUPLICATE_DATATYPE_ID` | Тип данных объявлен дважды |
| `UNRESOLVED_REFERENCE` | Ссылка на несуществующую сущность |
| `UNRESOLVED_DATATYPE` | Ссылка на несуществующий тип |
| `UNRESOLVED_SEQUENCE` | Ссылка на несуществующую последовательность |
| `IDENTIFIER_NO_SEQUENCE_NO_TEMPLATE` | Identifier без sequence и template |
| `DEFAULT_NOT_ALLOWED` | `default` для типа, который это не поддерживает |
| `REFERENCE_WITHOUT_ENTITY` | Reference без указания сущности |
| `UNRESOLVED_INHERITS` | Наследование от несуществующей сущности |
| `INHERITANCE_CYCLE` | Циклическое наследование |
| `UNRESOLVED_LINKAGE_SIDE` | Связь ссылается на несуществующую сущность |
| `EMPTY_ENUM` | Перечисление без значений |
| `WORKFLOW_NO_STATUSES` | Workflow без статусов |
| `WORKFLOW_NO_INITIAL` | Workflow без `initial` |
| `WORKFLOW_INITIAL_UNKNOWN` | `initial` не найден среди `statuses` |
| `WORKFLOW_TRANSITION_UNKNOWN_STATE` | Переход в несуществующий статус |
| `UNRESOLVED_TREE_ENTITY` | Сущность в дереве не найдена |
| `UNRESOLVED_TREE_LINKAGE` | Связь в дереве не найдена |
| `PREFIX_RULE_ATTR_NOT_FOUND` | Правило префикса на несуществующий атрибут |

### Проверка

```bash
npx tsx src/cli.ts validate example.dsl.yaml
```

Успех:

```
✅ Валидация пройдена
```

Ошибки:

```
❌ [UNRESOLVED_REFERENCE] (entities.Ioc.attributes.sources) Элемент массива 'Ioc.sources' ссылается на несуществующую сущность 'IocSourceTypo'
❌ [INHERITANCE_CYCLE] (entities.Server.inherits) Циклическое наследование у сущности 'Server'
```

### Рекомендации

1. Запускайте `validate` **до** генерации.
2. Используйте `--watch` в CLI — ошибки показываются сразу.
3. Следите за warning'ами.

---

## Что дальше

- [Examples](EXAMPLES.md) — 14 готовых DSL-файлов.
- [User Guide](USER_GUIDE.md) — работа с web-UI.
- [CLI Reference](CLI.md) — команды CLI.
- [Architecture](ARCHITECTURE.md) — как устроен генератор.

---

**Версия документа:** 0.2 · **Дата:** 2025