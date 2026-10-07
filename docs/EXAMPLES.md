# Examples — Каталог примеров доменов

Готовые DSL-примеры для разных сценариев. Каждый пример самодостаточен: скопируйте, сохраните в `.dsl.yaml`, запустите генерацию — получите рабочую схему.

Все примеры доступны в web-UI через кнопку **«Примеры ▾»** в тулбаре, сгруппированы по 4 категориям.

---

## Содержание

**Стартовые:**
- [Пустой домен](#пустой-домен)
- [CRUD-сущность](#crud-сущность)
- [Справочник](#справочник)
- [Числовые типы](#числовые-типы)

**Предметные области:**
- [IOCs Domain](#iocs-domain)
- [Активы](#активы)
- [Инциденты](#инциденты)
- [Аудит](#аудит)
- [Задачи](#задачи)

**Workflow:**
- [Workflow: линейный](#workflow-линейный)
- [Workflow: с ветвлением](#workflow-с-ветвлением)
- [Workflow: циклический](#workflow-циклический)

**Продвинутые:**
- [Наследование](#наследование)
- [Кросс-доменные ссылки](#кросс-доменные-ссылки)
- [Многие-ко-многим](#многие-ко-многим)
- [Дерево](#дерево)
- [Soft Delete](#soft-delete)
- [Самоссылающаяся сущность](#самоссылающаяся-сущность)
- [Несколько связей](#несколько-связей)
- [Две сущности CRUD](#две-сущности-crud)

**Разделы:**
- [Как использовать примеры](#как-использовать-примеры)
- [Комбинирование примеров](#комбинирование-примеров)
- [Флаги генерации UI в примерах](#флаги-генерации-ui-в-примерах)

---

## Быстрый старт

### В web-UI

Откройте http://localhost:5173, нажмите **«Примеры ▾»**, выберите нужный из категории.

### В CLI

```bash
npx tsx src/cli.ts gen iocs.dsl.yaml
```

### Прямая ссылка

```
http://localhost:5173/?preset=empty
http://localhost:5173/?preset=crud
http://localhost:5173/?preset=reference-book
http://localhost:5173/?preset=numbers
http://localhost:5173/?preset=iocs
http://localhost:5173/?preset=assets
http://localhost:5173/?preset=incidents
http://localhost:5173/?preset=audit
http://localhost:5173/?preset=tasks
http://localhost:5173/?preset=workflow-simple
http://localhost:5173/?preset=workflow-branching
http://localhost:5173/?preset=workflow-cyclic
http://localhost:5173/?preset=inheritance
http://localhost:5173/?preset=cross-domain
http://localhost:5173/?preset=many-to-many
http://localhost:5173/?preset=tree
http://localhost:5173/?preset=soft-delete
http://localhost:5173/?preset=self-reference
http://localhost:5173/?preset=many-links
http://localhost:5173/?preset=two-entities-crud
```

---

# Стартовые

Минимальные заготовки для быстрого начала.

---

## Пустой домен

**Чему учит:** минимальному набору для старта.

**Уровень:** начинающий.

**Пресет:** `empty`

**Категория:** Стартовые.

### Что описываем

Минимальный домен — одна сущность `Item` с двумя полями.

### DSL

```yaml
domain: empty.test
version: 0.0.1
name: Empty Domain
description: Домен для начала работы

entities:
  Item:
    name: Элемент
    label: "{title}"
    attributes:
      title: String
      description: String

menus:
  - Item
```

### Что генерируется

| Блок | Содержимое |
|---|---|
| `entities` | 1 сущность |
| `actions` | 4 действия |
| `views` | 2 представления (entity + list) |
| `menus` | 1 root_group + 1 пункт |

**Флаги UI:** все дефолтные. Секции `ui:` в схеме нет.

### Когда использовать

Как **стартовую точку** для собственного домена.

---

## CRUD-сущность

**Чему учит:** стандартному набору полей + **полноэкранной карточке**.

**Уровень:** начинающий.

**Пресет:** `crud`

**Категория:** Стартовые.

### Что описываем

Одна сущность `Record` со всеми типовыми полями: identifier, audit-поля, status, priority, tags. **Плюс полноэкранная карточка** — для удобной работы с длинной формой.

### DSL

```yaml
domain: crud.test
version: 0.0.1
name: CRUD Domain
description: Домен с одной типовой сущностью

entities:
  Record:
    name: Запись
    label: "{recordId}: {title}"
    description: Типовая запись
    ui:
      page: true
    attributes:
      recordId:
        type: Identifier
        sequence: RecordSeq
        readonly: true
      title: String
      description: Text
      status:
        type: enum(Status)
        default: ACTIVE
      priority: enum(Priority)
      tags: Array<String>
      isArchived:
        type: Bool
        default: false

enums:
  Status:
    ACTIVE: Активна
    ARCHIVED: Архивирована
    DRAFT: Черновик
  Priority:
    LOW: Низкий
    MEDIUM: Средний
    HIGH: Высокий
    CRITICAL: Критический

sequences:
  RecordSeq:
    startFrom: 1

menus:
  - Record
```

### Разбор ключевых мест

**Readonly-идентификатор:**

```yaml
recordId:
  type: Identifier
  sequence: RecordSeq
  readonly: true
```

Задаётся при создании, не редактируется.

**Default для enum и Bool:**

```yaml
status:
  type: enum(Status)
  default: ACTIVE

isArchived:
  type: Bool
  default: false
```

**Флаг `ui.page: true`:**

```yaml
ui:
  page: true
```

Включает полную карточку. Остальные флаги — дефолтные, поэтому в `ui:` пишется **только `page: true`**.

### Что генерируется

| Блок | Содержимое |
|---|---|
| `entities` | 1 сущность с `ui: page: true` |
| `dataTypes` | 2 enum |
| `sequences` | 1 последовательность |
| `actions` | 5 действий (включая `openRecordPage`) |
| `views` | 2 представления + `pages_infoRecord` |
| `menus` | 1 root_group + 1 пункт |
| `dataRules` | 1 правило |

### Когда использовать

Как **стартовую точку** для любой новой сущности.

---

## Справочник

**Чему учит:** сущности **без UI** — используется только как `Reference`.

**Уровень:** начинающий.

**Пресет:** `reference-book`

**Категория:** Стартовые.

### Что описываем

Сущность `Category` для классификаторов. **Без своего списка и модалок** — она появляется только в других сущностях как `Reference(Category)`.

### DSL

```yaml
domain: dictionaries.test
version: 0.0.1
name: Dictionary Domain
description: Домен справочников

entities:
  Category:
    name: Категория
    label: "{name}"
    description: Справочник категорий
    ui:
      list: false
      modals: false
      panel: false
    attributes:
      name: String
      code: String
      description: Text
      isActive:
        type: Bool
        default: true

menus:
  - Category
```

### Разбор ключевых мест

**Три флага `false`:**

```yaml
ui:
  list: false
  modals: false
  panel: false
```

Значит:
- **Нет** `lists_category` — нельзя открыть список отдельно.
- **Нет** модалок.
- **Нет** панели просмотра.
- **Нет** пункта меню (потому что пункт ссылается на `lists_category`).

Сущность существует **только как модель данных**.

### Что генерируется

| Блок | Содержимое |
|---|---|
| `entities` | 1 сущность с `ui:` (3 флага false) |
| `actions` | **0 действий** |
| `views` | 1 представление `viewCategory` без cards |
| `menus` | пункт **не создаётся** |

### Когда использовать

Для **классификаторов**, наполняемых через интеграцию или плейбуки.

**Совет:** если справочник должен быть доступен из меню — оставьте `list: true`.

---

## Числовые типы

**Чему учит:** всем числовым типам с constraints — `Integer`, `Decimal`, `Float`, `range`, `required`.

**Уровень:** начинающий.

**Пресет:** `numbers`

**Категория:** Стартовые.

### Что описываем

Домен `Measurement` с полями разных числовых типов и ограничениями.

### DSL

```yaml
domain: numbers.test
version: 0.0.1
name: Numbers Domain
description: Домен с числовыми типами данных

entities:
  Measurement:
    name: Измерение
    label: "{name}: {value}"
    attributes:
      name: String
      # Целое число со значениями от 0 до 1000
      count:
        type: Integer
        default: 0
        constraints:
          - kind: range
            min: 0
            max: 1000
      # Число с фиксированной точностью
      amount:
        type: Decimal
        default: 0
        constraints:
          - kind: range
            min: 0
      # Число с плавающей точкой
      coefficient:
        type: Float
        default: 1.0
      # Обязательное целое
      priority:
        type: Integer
        constraints:
          - kind: required
          - kind: range
            min: 1
            max: 10

menus:
  - Measurement
```

### Разбор ключевых мест

**`count` — Integer с диапазоном:**

```yaml
count:
  type: Integer
  default: 0
  constraints:
    - kind: range
      min: 0
      max: 1000
```

**`amount` — Decimal:**

```yaml
amount:
  type: Decimal
  default: 0
  constraints:
    - kind: range
      min: 0
```

**`coefficient` — Float:**

```yaml
coefficient:
  type: Float
  default: 1.0
```

**`priority` — обязательный Integer:**

```yaml
priority:
  type: Integer
  constraints:
    - kind: required
    - kind: range
      min: 1
      max: 10
```

### Что генерируется

Все атрибуты с `constraints` переносятся в схему **как есть**.

### Когда использовать

Если нужны числовые поля с валидацией диапазона.

---

# Предметные области

Готовые домены для типовых сценариев.

---

## IOCs Domain

**Чему учит:** базовым элементам DSL — сущности, атрибуты, enum, reference, идентификаторы, связь `n:n`, полноэкранная карточка.

**Уровень:** начинающий.

**Пресет:** `iocs`

**Категория:** Предметные области.

### Что описываем

Домен индикаторов компрометации. Три сущности:

- **Ioc** — сам индикатор.
- **IocSource** — источник.
- **Incident** — инцидент (с полноэкранной карточкой).

Связь: `n:n`.

### DSL

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
    description: Источник индикатора
    attributes:
      sourceName: String
      sourceDescription: String
      sourceId:
        type: Identifier
        template: "{@YYYY}-{@MM}-{@inc}"

  Incident:
    name: Инцидент
    label: "{incidentSubject}"
    description: Инцидент
    ui:
      page: true
    attributes:
      incidentSubject: String
      incidentDescription: String
      status:
        type: enum(IncidentStatus)
        default: OPEN
      incidentId:
        type: Identifier
        template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}"
        defaultPrefix: INC
        incrementTemplate: "0000"

links:
  Ioc:
    - n:n Incident

enums:
  IocType: [IP, Domain, URL, Email, MD5Hash, SHA256Hash]
  IncidentStatus:
    OPEN: Открыт
    IN_PROGRESS: В работе
    CLOSED: Закрыт

sequences:
  IOCSeq:
    startFrom: 1
    description: Последовательность для индикаторов

menus:
  - Ioc
  - IocSource
  - Incident
```

### Разбор ключевых мест

**Три формы атрибута:**

```yaml
value: String                             # краткая
type: enum(IocType)                       # enum-ссылка
sources: Array<Reference(IocSource)>      # массив ссылок
iocId:                                    # полная
  type: Identifier
  sequence: IOCSeq
```

**Три типа идентификаторов:**

```yaml
# 1. С последовательностью: 1, 2, 3, …
iocId:
  type: Identifier
  sequence: IOCSeq

# 2. С датой
sourceId:
  type: Identifier
  template: "{@YYYY}-{@MM}-{@inc}"

# 3. С префиксом и датой: INC-25/10/04-0001
incidentId:
  type: Identifier
  template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}"
  defaultPrefix: INC
  incrementTemplate: "0000"
```

**Связь `n:n`:**

```yaml
links:
  Ioc:
    - n:n Incident
```

### Что генерируется

| Блок | Содержимое |
|---|---|
| `entities` | 3 сущности |
| `dataTypes` | 2 enum |
| `sequences` | 1 последовательность |
| `linkages` | 1 связь `n_n` |
| `actions` | 13 действий |
| `views` | 6 представлений + `pages_infoIncident` |
| `menus` | 1 root_group + 3 пункта |
| `dataRules` | 1 правило |

### Когда использовать

Как базу для домена безопасности.

---

## Активы

**Чему учит:** наследованию (`inherits`), типам `IpAddress` и `MAC`, ссылкам через `Reference`, полноэкранной карточке.

**Уровень:** средний.

**Пресет:** `assets`

**Категория:** Предметные области.

### Что описываем

Домен учёта активов. Четыре сущности с наследованием и связью.

### DSL

```yaml
domain: assets.test
version: 0.0.1
name: Assets Domain
description: Домен учёта активов
author: Asset Team
tags: [assets, inventory]

entities:
  Device:
    name: Оборудование
    label: "{hostname}"
    description: Общее оборудование
    ui:
      page: true
    attributes:
      hostname: String
      ipAddress: IpAddress
      macAddress: MAC
      os: enum(OS)
      owner: Reference(User)

  Server:
    name: Сервер
    inherits: Device
    description: Серверное оборудование
    attributes:
      cpuCount: Integer
      ramGb: Integer
      rack: String

  Workstation:
    name: Рабочая станция
    inherits: Device
    description: Пользовательская рабочая станция
    attributes:
      monitorSize: Decimal
      department: String

  User:
    name: Пользователь
    label: "{fullName}"
    description: Сотрудник организации
    attributes:
      fullName: String
      email: String
      position: String
      phone: String

links:
  User:
    - 1:n Device

enums:
  OS:
    - Linux
    - Windows
    - macOS

menus:
  - Device
  - Server
  - Workstation
  - User
```

### Граф наследования

```
        ┌──────────┐
        │  Device  │  ← ui: page: true
        └────┬─────┘
             │ inherits
      ┌──────┴───────┐
      ▼              ▼
┌──────────┐   ┌──────────────┐
│  Server  │   │ Workstation  │
└──────────┘   └──────────────┘
```

**Флаг `page: true` у Device** — наследуется потомками. Полная карточка доступна и для Server/Workstation.

### Когда использовать

Для нескольких типов с общей базой.

---

## Инциденты

**Чему учит:** большому workflow на 7 статусов, `Timestamp`, двум enum'ам, полноэкранной карточке.

**Уровень:** продвинутый.

**Пресет:** `incidents`

**Категория:** Предметные области.

### DSL

```yaml
domain: incidents.test
version: 0.0.1
name: Incidents Domain
description: Домен управления инцидентами информационной безопасности
author: SOC Team
tags: [incidents, soc]

entities:
  Incident:
    name: Инцидент
    label: "{subject}"
    description: Инцидент ИБ
    ui:
      page: true
    attributes:
      subject: String
      description: Text
      priority: enum(Priority)
      category: enum(Category)
      detectedAt: Timestamp
      resolvedAt: Timestamp
      status: workflow(IncidentWorkflow)
      incidentId:
        type: Identifier
        template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}"
        defaultPrefix: INC
        incrementTemplate: "0000"

enums:
  Priority:
    CRITICAL: Критический
    HIGH: Высокий
    MEDIUM: Средний
    LOW: Низкий
  Category:
    MALWARE: Вредоносное ПО
    PHISHING: Фишинг
    DATA_LEAK: Утечка данных
    UNAUTHORIZED_ACCESS: Несанкционированный доступ
    DOS: Отказ в обслуживании

workflows:
  IncidentWorkflow:
    name: Статус инцидента
    description: Жизненный цикл инцидента ИБ
    initial: new
    statuses:
      new: Новый
      triage: Триаж
      investigating: Расследование
      containment: Локализация
      eradicated: Устранён
      closed: Закрыт
      falsePositive: Ложное срабатывание
    transitions:
      - new -> triage
      - triage -> investigating
      - triage -> falsePositive
      - investigating -> containment
      - containment -> eradicated
      - eradicated -> closed

menus:
  - Incident
```

### Граф workflow

```
                     ┌─────────────────┐
              ┌─────▶│Ложное срабатыва-│
              │      │ falsePositive   │
              │      └─────────────────┘
┌──────┐  ┌───────┐  ┌───────────────┐  ┌────────────┐  ┌──────────┐  ┌─────────┐
│Новый │─▶│Триаж  │─▶│Расследование  │─▶│Локализация │─▶│Устранён  │─▶│Закрыт   │
└──────┘  └───────┘  └───────────────┘  └────────────┘  └──────────┘  └─────────┘
```

### Когда использовать

Для сложного жизненного цикла с ветвлениями.

---

## Аудит

**Чему учит:** нескольким workflow, связи `1:n`, идентификаторам с годом, разным флагам UI у двух сущностей.

**Уровень:** средний.

**Пресет:** `audit`

**Категория:** Предметные области.

### DSL

```yaml
domain: audit.test
version: 0.0.1
name: Audit Domain
description: Домен управления аудитами
author: Audit Team
tags: [audit, compliance]

entities:
  Audit:
    name: Аудит
    label: "{auditName}"
    description: Аудит соответствия
    ui:
      page: true
    attributes:
      auditName: String
      auditDescription: String
      status: workflow(AuditStatusWorkflow)
      plannedDate: Date
      auditId:
        type: Identifier
        template: "{@prefix}-{@YYYY}-{@inc}"
        defaultPrefix: AUD
        incrementTemplate: "0000"

  Requirement:
    name: Требование
    label: "{requirementName}"
    ui:
      modals: false
    attributes:
      requirementName: String
      requirementDescription: Text
      assessmentIndex: Decimal
      status: workflow(RequirementStatusWorkflow)

links:
  Audit:
    - 1:n Requirement

workflows:
  AuditStatusWorkflow:
    name: Статус аудита
    initial: planned
    statuses:
      planned: Запланирован
      inProgress: В работе
      completed: Завершен
    transitions:
      - planned -> inProgress
      - inProgress -> completed

  RequirementStatusWorkflow:
    name: Статус требования
    initial: notAssessed
    statuses:
      notAssessed: Не оценено
      compliant: Соответствует
      nonCompliant: Не соответствует
      partial: Частично соответствует
    transitions:
      - notAssessed -> compliant
      - notAssessed -> nonCompliant
      - notAssessed -> partial
      - partial -> compliant
      - partial -> nonCompliant

menus:
  - Audit
  - Requirement
```

### Разбор ключевых мест

**Разные флаги UI:**

- `Audit` — с `page: true` (полная карточка).
- `Requirement` — с `modals: false` (заполняется через плейбук при аудите).

**Два workflow:**

```yaml
workflows:
  AuditStatusWorkflow: ...      # статус аудита
  RequirementStatusWorkflow: ... # статус требования
```

### Когда использовать

Для иерархии процессов с разными статусами.

---

## Задачи

**Чему учит:** комбинированию нескольких сущностей со связями, идентификаторам, двум workflow, полноэкранной карточке.

**Уровень:** продвинутый.

**Пресет:** `tasks`

**Категория:** Предметные области.

### DSL

```yaml
domain: tasks.test
version: 0.0.1
name: Tasks Domain
description: Домен управления задачами
tags: [tasks, kanban]

entities:
  Project:
    name: Проект
    label: "{projectName}"
    attributes:
      projectName: String
      projectDescription: Text
      status: workflow(ProjectWorkflow)

  Task:
    name: Задача
    label: "{taskId}: {title}"
    ui:
      page: true
    attributes:
      taskId:
        type: Identifier
        sequence: TaskSeq
        readonly: true
      title: String
      description: Text
      status: workflow(TaskWorkflow)
      priority: enum(Priority)
      assignee: Reference(User)
      dueDate: Date
      tags: Array<String>

  User:
    name: Пользователь
    label: "{fullName}"
    attributes:
      fullName: String
      email: String
      position: String

links:
  Project:
    - 1:n Task
  User:
    - 1:n Task

enums:
  Priority:
    LOW: Низкий
    MEDIUM: Средний
    HIGH: Высокий
    URGENT: Срочный

sequences:
  TaskSeq:
    startFrom: 100

workflows:
  ProjectWorkflow:
    name: Статус проекта
    initial: active
    statuses:
      active: Активен
      paused: На паузе
      completed: Завершён
      archived: В архиве
    transitions:
      - active -> paused
      - paused -> active
      - active -> completed
      - completed -> archived

  TaskWorkflow:
    name: Статус задачи
    initial: todo
    statuses:
      todo: К выполнению
      inProgress: В работе
      review: На проверке
      done: Готово
    transitions:
      - todo -> inProgress
      - inProgress -> review
      - review -> done
      - review -> inProgress

menus:
  - Project
  - Task
  - User
```

### Разбор ключевых мест

**Несколько связей `1:n` от одной сущности:**

```yaml
links:
  Project:
    - 1:n Task
  User:
    - 1:n Task
```

**Два workflow** — `ProjectWorkflow` для проекта, `TaskWorkflow` для задачи.

### Когда использовать

Для канбан-подобной системы.

---

# Workflow

Три паттерна рабочих процессов.

---

## Workflow: линейный

**Чему учит:** базовому workflow.

**Уровень:** начинающий.

**Пресет:** `workflow-simple`

**Категория:** Workflow.

### DSL

```yaml
domain: workflow-simple.test
version: 0.0.1
name: Simple Workflow

entities:
  Item:
    name: Элемент
    label: "{title}"
    attributes:
      title: String
      status: workflow(SimpleWorkflow)

workflows:
  SimpleWorkflow:
    name: Простой процесс
    initial: draft
    statuses:
      draft: Черновик
      published: Опубликовано
      archived: В архиве
    transitions:
      - draft -> published
      - published -> archived

menus:
  - Item
```

### Граф

```
┌──────────┐     ┌────────────┐     ┌──────────┐
│ Черновик │────▶│Опубликовано│────▶│В архиве  │
└──────────┘     └────────────┘     └──────────┘
```

### Когда использовать

Для простых процессов без ветвлений.

---

## Workflow: с ветвлением

**Чему учит:** процессу с исходами и возвратами, полноэкранной карточке.

**Уровень:** средний.

**Пресет:** `workflow-branching`

**Категория:** Workflow.

### DSL

```yaml
domain: workflow-branch.test
version: 0.0.1
name: Branching Workflow

entities:
  Request:
    name: Заявка
    label: "{requestId}: {title}"
    ui:
      page: true
    attributes:
      requestId:
        type: Identifier
        sequence: ReqSeq
        readonly: true
      title: String
      status: workflow(RequestWorkflow)

sequences:
  ReqSeq:
    startFrom: 1

workflows:
  RequestWorkflow:
    name: Статус заявки
    initial: created
    statuses:
      created: Создана
      review: На согласовании
      approved: Согласована
      rejected: Отклонена
      revision: На доработке
      closed: Закрыта
    transitions:
      - created -> review
      - review -> approved
      - review -> rejected
      - rejected -> revision: Вернуть на доработку
      - revision -> review: Отправить повторно
      - approved -> closed

menus:
  - Request
```

### Граф

```
                                ┌────────────┐
                          ┌────▶│ Согласована│────▶┌────────┐
                          │     └────────────┘     │Закрыта │
                          │                        └────────┘
┌─────────┐  ┌────────────┐│
│ Создана │─▶│На согласова-││     ┌────────────┐
└─────────┘  │  review    ││     │ Отклонена  │
              └────────────┘│     │  rejected  │────▶┌────────────┐
                          └────▶│            │     │На доработке│
                                └────────────┘     │  revision  │
                                                    └──────┬─────┘
                                                           │
                                              возврат на review
```

### Когда использовать

Для процессов согласования.

---

## Workflow: циклический

**Чему учит:** процессу с возвратами и пересмотром.

**Уровень:** средний.

**Пресет:** `workflow-cyclic`

**Категория:** Workflow.

### DSL

```yaml
domain: workflow-cycle.test
version: 0.0.1
name: Cyclic Workflow

entities:
  Document:
    name: Документ
    label: "{title}"
    attributes:
      title: String
      status: workflow(DocumentWorkflow)

workflows:
  DocumentWorkflow:
    name: Статус документа
    initial: draft
    statuses:
      draft: Черновик
      review: На проверке
      approved: Утверждён
      published: Опубликован
      outdated: Устарел
    transitions:
      - draft -> review
      - review -> approved
      - review -> draft: Вернуть на доработку
      - approved -> published
      - published -> outdated
      - outdated -> draft: Пересмотреть

menus:
  - Document
```

### Граф

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌────────────┐
│ Черновик │────▶│На провер-│────▶│ Утверждён │────▶│Опубликован │
│ draft    │◀────│  review  │     │ approved  │     │ published  │
└──────────┘     └──────────┘     └───────────┘     └──────┬─────┘
      ▲                                                     │
      │                                                     ▼
      │                                             ┌───────────┐
      └─────────────────────────────────────────────│ Устарел   │
                    Пересмотреть                   └───────────┘
```

### Когда использовать

Для процессов, где возможен пересмотр.

---

# Продвинутые

Сложные паттерны DSL.

---

## Наследование

**Чему учит:** общей базе с несколькими потомками.

**Уровень:** средний.

**Пресет:** `inheritance`

**Категория:** Продвинутые.

### DSL

```yaml
domain: inheritance.test
version: 0.0.1
name: Inheritance Domain

entities:
  Document:
    name: Документ
    label: "{documentNumber}"
    description: Базовый документ
    attributes:
      documentNumber: String
      documentDate: Date
      amount: Decimal
      status: enum(DocumentStatus)

  Contract:
    name: Договор
    inherits: Document
    attributes:
      counterparty: String
      validUntil: Date

  Act:
    name: Акт
    inherits: Document
    attributes:
      signedBy: String
      signedAt: Timestamp

  Invoice:
    name: Счёт
    inherits: Document
    attributes:
      paymentDue: Date
      bankAccount: String

enums:
  DocumentStatus:
    DRAFT: Черновик
    SIGNED: Подписан
    PAID: Оплачен
    CANCELLED: Отменён

menus:
  - Document
  - Contract
  - Act
  - Invoice
```

### Граф

```
              ┌──────────────┐
              │   Document   │
              └───────┬──────┘
                      │ inherits
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Contract │  │   Act    │  │ Invoice  │
  └──────────┘  └──────────┘  └──────────┘
```

### Когда использовать

Для нескольких типов с общей структурой.

---

## Кросс-доменные ссылки

**Чему учит:** ссылкам и связям с сущностями из другого домена через FQID.

**Уровень:** продвинутый.

**Пресет:** `cross-domain`

**Категория:** Продвинутые.

### DSL

```yaml
domain: cross-domain.test
version: 0.0.1
name: Cross-Domain

entities:
  Incident:
    name: Инцидент
    label: "{subject}"
    attributes:
      subject: String
      category: Reference(dictionaries.test/Category)
      affectedAsset: Reference(assets.test/Device)

  Asset:
    name: Актив
    label: "{assetName}"
    attributes:
      assetName: String

links:
  Incident:
    - n:n assets.test/Device

menus:
  - Incident
  - Asset
```

### Когда использовать

Для связанных доменов.

---

## Многие-ко-многим

**Чему учит:** минимальному примеру связи `n:n`.

**Уровень:** начинающий.

**Пресет:** `many-to-many`

**Категория:** Продвинутые.

### DSL

```yaml
domain: many-to-many.test
version: 0.0.1
name: Many-to-Many

entities:
  Student:
    name: Студент
    label: "{fullName}"
    attributes:
      fullName: String
      email: String

  Course:
    name: Курс
    label: "{courseName}"
    attributes:
      courseName: String
      credits: Integer
      teacher: String

links:
  Student:
    - n:n Course

menus:
  - Student
  - Course
```

### Когда использовать

Для любой связи `n:n`.

---

## Дерево

**Чему учит:** иерархической структуре через деревья.

**Уровень:** средний.

**Пресет:** `tree`

**Категория:** Продвинутые.

### Что описываем

Иерархия рисков: оценка → категория → риск.

### DSL

```yaml
domain: risk.test
version: 0.0.1
name: Risk Domain

entities:
  RiskAssessment:
    name: Оценка риска
    label: "{name}"
    attributes:
      name: String
      description: Text

  RiskCategory:
    name: Категория риска
    label: "{name}"
    attributes:
      name: String
      description: Text

  Risk:
    name: Риск
    label: "{name}"
    attributes:
      name: String
      description: Text
      severity: Integer
      probability: Integer

links:
  RiskAssessment:
    - 1:n RiskCategory
  RiskCategory:
    - 1:n Risk

trees:
  RiskTree: RiskAssessment > RiskCategory > Risk

menus:
  - RiskAssessment
  - RiskCategory
  - Risk
```

### Разбор ключевых мест

**Одна строка для дерева:**

```yaml
trees:
  RiskTree: RiskAssessment > RiskCategory > Risk
```

Генератор **сам найдёт** связи между сущностями. Создаются:
- `trees[]` с иерархией.
- View `tree_RiskTree`.
- **Автоматический** пункт меню `RiskTreeMenu`.
- `row_click` для **каждой** сущности иерархии.

**Явное указание связи** (если их несколько):

```yaml
trees:
  RiskTree: RiskAssessment >(RiskAssessment_RiskCategory) RiskCategory >(RiskCategory_Risk) Risk
```

### Что генерируется

| Блок | Содержимое |
|---|---|
| `entities` | 3 сущности |
| `linkages` | 2 связи `1_n` |
| `trees` | 1 дерево |
| `views` | 3 entity + 3 list + 1 tree |
| `menus` | 1 root_group + 3 пункта + 1 пункт дерева |

### Когда использовать

Для иерархий: категории, оргструктура, дерево рисков.

**Совет:** для дерева **не отключайте `panel: true`** у сущностей иерархии — иначе `row_click` не сможет открыть панель.

---

## Soft Delete

**Чему учит:** паттерну мягкого удаления.

**Уровень:** средний.

**Пресет:** `soft-delete`

**Категория:** Продвинутые.

### Что описываем

Домен `Document` с полями мягкого удаления — объект не удаляется физически, а помечается как удалённый.

### DSL

```yaml
domain: soft-delete.test
version: 0.0.1
name: Soft Delete Domain
description: Домен с паттерном мягкого удаления

entities:
  Document:
    name: Документ
    label: "{title}"
    attributes:
      title: String
      content: Text
      # Флаги мягкого удаления
      isDeleted:
        type: Bool
        default: false
        readonly: true
      deletedAt:
        type: Timestamp
        readonly: true
      deletedBy:
        type: String
        readonly: true
      # Метаданные
      createdAt:
        type: Timestamp
        readonly: true
      createdBy:
        type: String
        readonly: true
      updatedAt:
        type: Timestamp
        readonly: true
      updatedBy:
        type: String
        readonly: true

menus:
  - Document
```

### Разбор ключевых мест

**Флаги readonly** — значения задаются системой, не пользователем.

**`isDeleted: false` по умолчанию** — объект создаётся активным.

**Метаданные** — `createdAt`, `createdBy` — заполняются автоматически.

### Когда использовать

Для доменов, где важна история и восстановление.

---

## Самоссылающаяся сущность

**Чему учит:** иерархии через `parent: Reference(Self)` — без деревьев.

**Уровень:** средний.

**Пресет:** `self-reference`

**Категория:** Продвинутые.

### Что описываем

Узел с ссылкой на родителя — простая иерархия.

### DSL

```yaml
domain: hierarchy.test
version: 0.0.1
name: Hierarchy Domain
description: Домен с самоссылающейся сущностью

entities:
  Node:
    name: Узел
    label: "{name}"
    attributes:
      name: String
      description: Text
      nodeType: enum(NodeType)
      parent: Reference(Node)
      path: String
      order: Integer

enums:
  NodeType:
    FOLDER: Папка
    FILE: Файл
    LINK: Ссылка

menus:
  - Node
```

### Разбор ключевых мест

**Самоссылающаяся ссылка:**

```yaml
parent: Reference(Node)
```

Поле `parent` указывает на ту же сущность `Node`. Так строится иерархия.

**Поле `path`** — материализованный путь (`/folder1/folder2/file.txt`). Обычно заполняется автоматически через плейбуки.

**Отличие от `trees`:**

- `trees` — генерирует **отдельное представление-дерево** для UI.
- `self-reference` — просто `Reference` на себя. В UI можно выбрать родителя из списка, но нет дерева с раскрывающимися узлами.

**Когда что использовать:**

| Задача | Инструмент |
|---|---|
| Отдельное представление-дерево | `trees` |
| Просто иерархия по parent | `Reference(Self)` |
| Дерево + фильтрация по узлам | `trees` |
| Дерево + drag-n-drop | `trees` с `type: orderable` |

### Когда использовать

Для простой иерархии без UI-дерева.

---

## Несколько связей

**Чему учит:** нескольким связям между одними сущностями.

**Уровень:** продвинутый.

**Пресет:** `many-links`

**Категория:** Продвинутые.

### Что описываем

Домен статей с двумя ролями пользователей: writer (автор) и reviewer (рецензент).

**Ограничение текущего DSL:** при определении связи через `links:` генерируется **одна** связь между парой сущностей с автогенерированным ID (`User_Article`). Чтобы сделать **две разные** связи, нужно использовать **разные типы**:

### DSL

```yaml
domain: reviews.test
version: 0.0.1
name: Reviews Domain
description: Домен с несколькими связями к одной сущности

entities:
  Article:
    name: Статья
    label: "{title}"
    attributes:
      title: String
      content: Text
      status: enum(Status)

  User:
    name: Пользователь
    label: "{fullName}"
    attributes:
      fullName: String
      email: String

links:
  User:
    - 1:n Article
  Article:
    - n:n User

enums:
  Status:
    DRAFT: Черновик
    REVIEW: На проверке
    PUBLISHED: Опубликована

menus:
  - Article
  - User
```

### Разбор ключевых мест

**Две связи между User и Article:**

```yaml
links:
  User:
    - 1:n Article    # User_Article (1:n)
  Article:
    - n:n User       # Article_User (n:n)
```

Генератор создаст **два разных ID**: `User_Article` (1:n) и `Article_User` (n:n).

В карточке `Article` появятся **два виджета связи**: «User» и «User» — но с разными типами.

### Ограничение

**Именование связей** не настраивается — генератор использует `<Side1>_<Side2>`. Чтобы сделать «writer» и «reviewer» с осмысленными именами — нужно вручную править схему после генерации.

**Планы:** в будущем — поддержка кастомных имён через DSL:

```yaml
links:
  User:
    - 1:n Article as writer
  Article:
    - n:n User as reviewer
```

Пока не реализовано.

### Когда использовать

Если нужны **разные роли** связи между одними сущностями.

---

## Две сущности CRUD

**Чему учит:** двум связанным сущностям с полным CRUD, связи `1:n`, полной карточке у одной из них.

**Уровень:** средний.

**Пресет:** `two-entities-crud`

**Категория:** Продвинутые.

### Что описываем

Домен с двумя сущностями: `Project` и `Task`. Проект — с полной карточкой. Задача — с identifier'ом.

### DSL

```yaml
domain: two-crud.test
version: 0.0.1
name: Two Entities CRUD
description: Домен с двумя связанными сущностями

entities:
  Project:
    name: Проект
    label: "{projectName}"
    ui:
      page: true
    attributes:
      projectName: String
      description: Text
      status: enum(ProjectStatus)
      startDate: Date
      endDate: Date

  Task:
    name: Задача
    label: "{taskId}: {title}"
    attributes:
      taskId:
        type: Identifier
        sequence: TaskSeq
        readonly: true
      title: String
      description: Text
      status: enum(TaskStatus)
      dueDate: Date
      priority:
        type: Integer
        constraints:
          - kind: range
            min: 1
            max: 5

links:
  Project:
    - 1:n Task

enums:
  ProjectStatus:
    PLANNING: Планирование
    ACTIVE: Активен
    COMPLETED: Завершён
    ARCHIVED: В архиве
  TaskStatus:
    TODO: К выполнению
    IN_PROGRESS: В работе
    DONE: Готово

sequences:
  TaskSeq:
    startFrom: 1

menus:
  - Project
  - Task
```

### Разбор ключевых мест

**Связь `1:n`** — один проект, много задач.

**`priority` с диапазоном:**

```yaml
priority:
  type: Integer
  constraints:
    - kind: range
      min: 1
      max: 5
```

**Полная карточка у `Project`** — но не у `Task`.

### Когда использовать

Как **базовый шаблон** для нового домена с двумя связанными сущностями.

---

# Как использовать примеры

## Способ 1: загрузить в web-UI

1. Откройте http://localhost:5173.
2. **Примеры ▾** → выберите категорию → выберите пресет.
3. Редактируйте прямо в UI.
4. **Скачать DSL** или **Сгенерировать YAML**.

## Способ 2: CLI

```bash
cat > my.dsl.yaml << 'EOF'
domain: example.test
version: 0.0.1
name: My Domain

entities:
  Item:
    name: Элемент
    label: "{title}"
    attributes:
      title: String

menus:
  - Item
EOF

npx tsx src/cli.ts gen my.dsl.yaml
npx tsx src/cli.ts validate my.dsl.yaml
npx tsx src/cli.ts info my.dsl.yaml
```

## Способ 3: прямая ссылка

```
http://localhost:5173/?preset=iocs
```

## Способ 4: адаптировать под свой домен

Возьмите близкий по смыслу пресет и **замените предметную область**:

| Из | В |
|---|---|
| IOCs / индикаторы | уязвимости, CVE, базы знаний |
| Аудит / требования | проверки, чек-листы, регламенты |
| Активы / устройства | документы, проекты, сотрудники |
| Инциденты | заявки, задачи, обращения |
| Задачи | проекты, спринты, эпики |

### Что модифицировать в первую очередь

1. **`domain`** — уникальный FQDN.
2. **`name`, `description`** — заголовки.
3. **Сущности** — переименуйте `id`, `name`, `label`.
4. **Атрибуты** — замените на свои.
5. **Enum'ы** — списки значений.
6. **Связи** — отношения между сущностями.
7. **Деревья** — иерархии.
8. **Флаги `ui:`** — что генерировать.
9. **Workflow** — если нужны статусы.
10. **Меню** — какие сущности показывать.

---

# Комбинирование примеров

Пресеты можно **комбинировать вручную**. Например:

- взять структуру из **Задачи**;
- добавить workflow из **Workflow: с ветвлением**;
- заменить идентификатор на формат из **Инциденты**;
- добавить дерево из **Дерево**;
- включить флаги `ui:` из **Справочник**;
- добавить soft delete из **Soft Delete**.

Пример: задача с ветвящимся статусом, красивым ID, деревом и флагами UI.

```yaml
domain: my-tasks.test
version: 0.0.1
name: My Tasks

entities:
  Task:
    name: Задача
    label: "{taskId}: {title}"
    ui:
      page: true
    attributes:
      taskId:
        type: Identifier
        template: "{@prefix}-{@YYYY}-{@inc}"
        defaultPrefix: TSK
        incrementTemplate: "0000"
        readonly: true
      title: String
      status: workflow(TaskWorkflow)
      priority: enum(Priority)
      isDeleted:
        type: Bool
        default: false
        readonly: true

  Category:
    name: Категория
    ui:
      list: false
      modals: false
    attributes:
      name: String

enums:
  Priority: [LOW, MEDIUM, HIGH, URGENT]

workflows:
  TaskWorkflow:
    initial: todo
    statuses:
      todo: К выполнению
      review: На проверке
      done: Готово
      reopened: Переоткрыта
    transitions:
      - todo -> review
      - review -> done
      - review -> todo: Вернуть
      - done -> reopened: Переоткрыть

links:
  Task:
    - 1:n Category

menus:
  - Task
```

В web-UI:

1. Загрузите пресет **Задачи**.
2. Скопируйте блок `TaskWorkflow` из **Workflow: с ветвлением** в DSL-предпросмотр.
3. Добавьте блок `ui:` из **Справочник**.
4. Добавьте `isDeleted` из **Soft Delete**.
5. Сохраните как свой пресет.

---

# Флаги генерации UI в примерах

Разные пресеты используют разные флаги `ui:` для демонстрации возможностей:

| Пресет | Флаги |
|---|---|
| **Пустой домен** | все дефолтные |
| **CRUD-сущность** | `page: true` |
| **Справочник** | `list: false`, `modals: false`, `panel: false` |
| **Числовые типы** | все дефолтные |
| **IOCs Domain** | у `Incident` — `page: true` |
| **Активы** | у `Device` — `page: true` |
| **Инциденты** | `page: true` |
| **Аудит** | у `Audit` — `page: true`, у `Requirement` — `modals: false` |
| **Задачи** | у `Task` — `page: true` |
| **Workflow: с ветвлением** | `page: true` |
| **Остальные** | все дефолтные |

### Что это даёт

1. **Демонстрация возможностей** — новый пользователь видит, что флаги существуют.
2. **Готовые паттерны** — «вот так делается справочник без UI», «вот так — сущность с полным экраном».
3. **Сравнение размеров** — видно, сколько YAML экономится при отключении флагов.

### Что посмотреть в YAML

При загрузке пресета **«Справочник»**:

- В `entities[Category]` есть `ui: { list: false, modals: false, panel: false }`.
- **Нет** `actions` для Category.
- **Нет** `lists_category`.
- **Нет** пункта меню.

При загрузке **«CRUD-сущность»**:

- В `entities[Record]` есть `ui: { page: true }`.
- В `actions` есть `actions_openRecordPage`.
- В `views` есть `pages_infoRecord`.

---

## Полезные ссылки

- [DSL Reference](DSL.md) — полное описание языка.
- [User Guide](USER_GUIDE.md) — работа с web-редактором.
- [CLI Reference](CLI.md) — команды CLI.
- [Snippets](SNIPPETS.md) — короткие примеры.
- [Architecture](ARCHITECTURE.md) — как устроен генератор.

---

**Версия документа:** 0.3 · **Дата:** 2025