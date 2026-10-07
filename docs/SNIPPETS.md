# Snippets — Лаконичность DSL на коротких примерах

Коллекция минимальных DSL-фрагментов и того, что из них генерируется. Каждый пример показывает, как **20 строк DSL превращаются в 100+ строк YAML-схемы** со всей инфраструктурой.

Используйте как шпаргалку: найдите свою задачу, скопируйте фрагмент, адаптируйте.

---

## Как читать

Формат каждого сниппета:

1. **Задача** — что нужно описать.
2. **DSL** — минимальный входной код.
3. **Что генерируется** — таблица артефактов.
4. **Ключевые фрагменты схемы** — только самое показательное.

Полные примеры — в [EXAMPLES.md](EXAMPLES.md).

---

## Оглавление

**Сущности и атрибуты:**
- [1. Минимальная сущность](#1-минимальная-сущность)
- [2. Сущность с label](#2-сущность-с-label)
- [3. Атрибут с default](#3-атрибут-с-default)
- [4. Readonly-атрибут](#4-readonly-атрибут)
- [5. Обязательный атрибут](#5-обязательный-атрибут)
- [6. Обязательный и уникальный](#6-обязательный-и-уникальный)
- [7. Числовой атрибут с диапазоном](#7-числовой-атрибут-с-диапазоном)

**Типы данных:**
- [8. Enum в краткой форме](#8-enum-в-краткой-форме)
- [9. Enum с русскими именами](#9-enum-с-русскими-именами)
- [10. Массив строк](#10-массив-строк)
- [11. Ссылка на сущность](#11-ссылка-на-сущность)
- [12. Массив ссылок](#12-массив-ссылок)

**Связи:**
- [13. Ненаправленная n:n](#13-ненаправленная-nn)
- [14. Направленная 1:n](#14-направленная-1n)
- [15. Несколько связей от одной сущности](#15-несколько-связей-от-одной-сущности)
- [16. Связь сущности с самой собой](#16-связь-сущности-с-самой-собой)

**Наследование:**
- [17. Простое наследование](#17-простое-наследование)
- [18. Наследование + добавление атрибутов](#18-наследование--добавление-атрибутов)

**Workflow:**
- [19. Минимальный workflow](#19-минимальный-workflow)
- [20. Workflow с ветвлением](#20-workflow-с-ветвлением)
- [21. Несколько workflow в одном домене](#21-несколько-workflow-в-одном-домене)

**Деревья:**
- [22. Дерево в одну строку](#22-дерево-в-одну-строку)
- [23. Дерево с явной связью](#23-дерево-с-явной-связью)
- [24. Дерево с orderable](#24-дерево-с-orderable)

**Идентификаторы:**
- [25. ID с последовательностью](#25-id-с-последовательностью)
- [26. ID с датой](#26-id-с-датой)
- [27. ID с префиксом и датой](#27-id-с-префиксом-и-датой)

**Флаги генерации UI:**
- [28. Отключить список](#28-отключить-список)
- [29. Отключить модалки](#29-отключить-модалки)
- [30. Отключить весь UI](#30-отключить-весь-ui)
- [31. Включить полный экран](#31-включить-полный-экран)
- [32. Комбинация флагов](#32-комбинация-флагов)

**Кросс-доменные ссылки:**
- [33. Кросс-доменная ссылка](#33-кросс-доменная-ссылка)
- [34. Кросс-доменная связь](#34-кросс-доменная-связь)

---

## 1. Минимальная сущность

**Задача:** одна сущность с двумя полями, отображается в меню.

### DSL

```yaml
domain: min.test
version: 0.0.1
name: Minimal

entities:
  Item:
    attributes:
      title: String
      description: String

menus:
  - Item
```

11 строк.

### Что генерируется

| Артефакт | Количество |
|---|---|
| Сущность | 1 |
| Атрибутов | 2 |
| Действий (`actions`) | 4 |
| Виджетов (`widgets`) | 5 |
| Групп (`groups`) | 4 |
| Карточек (`views`) | 3 |
| Представлений (`views`) | 2 (entity + list) |
| Пунктов меню | 1 |

**Итого:** ~11 строк DSL → ~120 строк YAML-схемы. **Коэффициент ×11.**

---

## 2. Сущность с label

**Задача:** сущность отображается в UI не как `id`, а как значение атрибута.

### DSL

```yaml
entities:
  User:
    name: Пользователь
    label: "{fullName}"
    attributes:
      fullName: String
      email: String
```

### Что появляется в схеме

```yaml
entities:
  - id: User
    name: Пользователь
    label: "{fullName}"
    attributes:
      - id: fullName
        dataType: String
      - id: email
        dataType: String
```

Во всех представлениях `User` (в списках, карточках, ссылках) объект будет отображаться как значение `fullName`.

---

## 3. Атрибут с default

**Задача:** статус создаётся сразу со значением `OPEN`.

### DSL

```yaml
entities:
  Incident:
    attributes:
      status:
        type: enum(Status)
        default: OPEN

enums:
  Status: [OPEN, IN_PROGRESS, CLOSED]
```

### Что появляется в схеме

**В атрибуте — ничего**, но генерируется правило:

```yaml
dataRules:
  - id: default_Incident
    name: Значения по умолчанию для Incident
    target: entity
    entity: Incident
    condition: true
    rule:
      effect: default
      attributes:
        - attribute: status
          value: OPEN
```

При создании объекта `status` автоматически станет `OPEN`.

---

## 4. Readonly-атрибут

**Задача:** поле `externalId` задаётся при создании и потом не редактируется.

### DSL

```yaml
entities:
  Device:
    attributes:
      externalId:
        type: String
        readonly: true
      hostname: String
```

### Ключевая разница в схемах

**Форма создания** — `externalId` **есть**:

```yaml
groups:
  - id: blocks_forms_newDevice
    type: form
    components:
      - widget: editors_device_externalId
      - widget: editors_device_hostname
```

**Форма редактирования** — `externalId` **нет**:

```yaml
groups:
  - id: blocks_forms_editDevice
    type: form
    components:
      - widget: editors_device_hostname
```

Генератор **сам** исключает readonly-атрибуты из edit-формы.

---

## 5. Обязательный атрибут

**Задача:** `subject` должен быть заполнен всегда.

### DSL

```yaml
entities:
  Incident:
    attributes:
      subject:
        type: String
        constraints:
          - kind: required
            message: Тема обязательна
```

### Что появляется в схеме

```yaml
entities:
  - id: Incident
    attributes:
      - id: subject
        dataType: String
        constraints:
          - kind: required
            message: Тема обязательна
```

---

## 6. Обязательный и уникальный

**Задача:** `email` — обязательный, уникальный, с валидацией.

### DSL

```yaml
entities:
  User:
    attributes:
      email:
        type: String
        constraints:
          - kind: required
          - kind: unique
            message: Такой email уже используется
          - kind: regexp
            regexp: "^[^@]+@[^@]+\\.[^@]+$"
            message: Некорректный email
```

### Что появляется в схеме

Три проверки — одна сущность. В UI поле будет обязательным, система проверит формат и уникальность.

**Примечание:** `unique` работает для типов `String`, `Integer`, `Uuid`, `Reference`, `Array`, `Table`.

---

## 7. Числовой атрибут с диапазоном

**Задача:** приоритет — целое число от 1 до 5.

### DSL

```yaml
entities:
  Task:
    attributes:
      priority:
        type: Integer
        default: 3
        constraints:
          - kind: range
            min: 1
            max: 5
```

### Что появляется в схеме

```yaml
attributes:
  - id: priority
    dataType: Integer
    constraints:
      - kind: range
        min: 1
        max: 5
```

Плюс правило `dataRules` с `default: 3`.

---

## 8. Enum в краткой форме

**Задача:** список типов IOC без русских имён.

### DSL

```yaml
enums:
  IocType: [IP, Domain, URL, Email, MD5Hash]
```

### Что появляется в схеме

```yaml
dataTypes:
  - id: IocType
    dataType: Enum
    values:
      - id: IP
      - id: Domain
      - id: URL
      - id: Email
      - id: MD5Hash
```

**1 строка → 9 строк.**

---

## 9. Enum с русскими именами

**Задача:** значения отображаются по-русски, хранятся латиницей.

### DSL

```yaml
enums:
  IncidentStatus:
    OPEN: Открыт
    IN_PROGRESS: В работе
    CLOSED: Закрыт
```

### Что появляется в схеме

```yaml
dataTypes:
  - id: IncidentStatus
    dataType: Enum
    values:
      - id: OPEN
        name: Открыт
      - id: IN_PROGRESS
        name: В работе
      - id: CLOSED
        name: Закрыт
```

В базе хранится `OPEN`, в UI показывается «Открыт».

---

## 10. Массив строк

**Задача:** поле для списка тегов.

### DSL

```yaml
entities:
  Ioc:
    attributes:
      tags: Array<String>
```

### Что появляется в схеме

```yaml
attributes:
  - id: tags
    dataType: Array
    item:
      dataType: String
```

Редактор массива в UI автоматически.

---

## 11. Ссылка на сущность

**Задача:** у инцидента есть ссылка на ответственного.

### DSL

```yaml
entities:
  Incident:
    attributes:
      assignee: Reference(User)

  User:
    attributes:
      fullName: String
```

### Что появляется в схеме

```yaml
entities:
  - id: Incident
    attributes:
      - id: assignee
        dataType: Reference
        entity: User
  - id: User
    attributes:
      - id: fullName
        dataType: String
```

В UI — селектор из списка пользователей.

**Важно:** `Reference` **без** указания сущности невалиден. Всегда пишите `Reference(X)`.

---

## 12. Массив ссылок

**Задача:** у инцидента есть список наблюдателей.

### DSL

```yaml
entities:
  Incident:
    attributes:
      watchers: Array<Reference(User)>
```

### Что появляется в схеме

```yaml
attributes:
  - id: watchers
    dataType: Array
    item:
      dataType: Reference
      entity: User
```

В UI — список тегов-ссылок. Можно добавить/удалить пользователя.

---

## 13. Ненаправленная n:n

**Задача:** индикатор встречается в инцидентах, инцидент содержит индикаторы.

### DSL

```yaml
links:
  Ioc:
    - n:n Incident
```

### Что появляется в схеме

```yaml
linkages:
  - id: Ioc_Incident
    side1: Ioc
    side2: Incident
    type: n_n
    undirected: true
    nameFrom:
      side1: Связан с Incident
      side2: Содержит Ioc
```

Плюс:
- виджет `linkage` в `viewIoc` и `viewIncident`;
- группа связи в формах обеих сущностей.

**1 строка → ~30 строк генерации.**

---

## 14. Направленная 1:n

**Задача:** пользователь владеет несколькими устройствами.

### DSL

```yaml
links:
  User:
    - 1:n Device
```

`1:n` **по умолчанию направленная** — от `User` к `Device`. Дополнительный префикс `>` не нужен.

### Что появляется в схеме

```yaml
linkages:
  - id: User_Device
    side1: User
    side2: Device
    type: 1_n
    undirected: false
    nameFrom:
      side1: Связан с Device
      side2: Содержит User
```

**Совет:** если всё-таки хочется указать `>`, оборачивайте строку в **двойные кавычки**:

```yaml
links:
  User:
    - "> 1:n Device"
```

YAML не понимает `>` без кавычек.

---

## 15. Несколько связей от одной сущности

**Задача:** у задачи есть проект и исполнитель.

### DSL

```yaml
links:
  Project:
    - 1:n Task
  User:
    - 1:n Task
```

### Что появляется в схеме

```yaml
linkages:
  - id: Project_Task
    side1: Project
    side2: Task
    type: 1_n
    undirected: false
  - id: User_Task
    side1: User
    side2: Task
    type: 1_n
    undirected: false
```

В `viewTask` — **два виджета связи**: «Проект» и «Пользователь». Оба работают независимо.

**2 строки → 2 связи + 2 виджета + 2 группы в формах.**

---

## 16. Связь сущности с самой собой

**Задача:** пользователь может быть подчинён другому пользователю.

### DSL

```yaml
links:
  User:
    - 1:n User
```

### Что появляется в схеме

```yaml
linkages:
  - id: User_User
    side1: User
    side2: User
    type: 1_n
    undirected: false
    nameFrom:
      side1: Связан с User
      side2: Содержит User
```

В карточке пользователя появится виджет «Содержит User» — список подчинённых.

**1 строка → самоссылающаяся связь.**

**Совет:** имена `nameFrom` автогенерируются и получаются неоднозначными. Уточните их после генерации.

---

## 17. Простое наследование

**Задача:** `Server` и `Workstation` имеют общую базу от `Device`.

### DSL

```yaml
entities:
  Device:
    attributes:
      hostname: String
      ipAddress: IpAddress
  Server:
    inherits: Device
    attributes:
      cpuCount: Integer
  Workstation:
    inherits: Device
    attributes:
      monitorSize: Decimal
```

### Что наследуется автоматически

- Формы `Server` содержат виджеты `hostname`, `ipAddress` **и** `cpuCount`.
- Панели `Server` показывают все три поля.
- Списки `Server` фильтруются и по `Device`, и по `Server`.
- Действие создания `Device` может создавать `Server` и `Workstation`.

**Одно слово `inherits` → сквозная интеграция.**

### Наследование одной строкой

**Задача:** `Contract` наследует `Document`.

```yaml
entities:
  Contract>Document:
    name: Договор
    attributes:
      counterparty: String
```

**Одно слово в ключе → полноценное наследование.**

---

## 18. Наследование + добавление атрибутов

**Задача:** у `Server` есть всё от `Device` плюс специфичные поля.

### DSL

```yaml
entities:
  Device:
    name: Оборудование
    label: "{hostname}"
    attributes:
      hostname: String
      ipAddress: IpAddress
      macAddress: MAC

  Server:
    name: Сервер
    inherits: Device
    attributes:
      cpuCount: Integer
      ramGb: Integer
      rack: String
```

### Что появляется в формах

Форма создания `Server` содержит **6 виджетов**:

```
editors_server_hostname      ← от Device
editors_server_ipAddress     ← от Device
editors_server_macAddress    ← от Device
editors_server_cpuCount      ← своё
editors_server_ramGb         ← своё
editors_server_rack          ← своё
```

**6 виджетов из 6 строк DSL.**

---

## 19. Минимальный workflow

**Задача:** статус задачи с тремя состояниями.

### DSL

```yaml
workflows:
  TaskWorkflow:
    initial: todo
    statuses:
      todo: К выполнению
      inProgress: В работе
      done: Готово
    transitions:
      - todo -> inProgress
      - inProgress -> done

entities:
  Task:
    attributes:
      status: workflow(TaskWorkflow)
```

### Что появляется в схеме

```yaml
dataTypes:
  - id: TaskWorkflow
    dataType: Workflow
    statuses:
      - id: todo
        name: К выполнению
      - id: inProgress
        name: В работе
      - id: done
        name: Готово
    initial: todo
    transitions:
      - from: todo
        to: inProgress
      - from: inProgress
        to: done
```

Плюс в web-UI автоматически рисуется SVG-граф:

```
┌──────────────┐    ┌──────────┐    ┌─────────┐
│К выполнению  │───▶│В работе  │───▶│Готово   │
│todo          │    │inProgress│    │done     │
└──────────────┘    └──────────┘    └─────────┘
```

---

## 20. Workflow с ветвлением

**Задача:** процесс согласования с одобрением/отклонением.

### DSL

```yaml
workflows:
  ApprovalWorkflow:
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
```

### Граф

```
                    ┌────────────┐
              ┌────▶│ Согласована│────▶┌────────┐
              │     └────────────┘     │Закрыта │
              │                        └────────┘
┌─────────┐  │  ┌──────────┐
│ Создана │──┼─▶│На согласо-│
└─────────┘  │  │  вании   │
              │  └──────────┘
              │  ┌──────────┐  ┌──────────┐
              └─▶│Отклонена │─▶│На доработке│
                 └──────────┘  └────┬─────┘
                                    │
                             возврат на review
```

**Ветвление + цикл + терминальное состояние.**

---

## 21. Несколько workflow в одном домене

**Задача:** два workflow — для проекта и для задачи.

### DSL

```yaml
workflows:
  ProjectWorkflow:
    initial: active
    statuses:
      active: Активен
      completed: Завершён
    transitions:
      - active -> completed

  TaskWorkflow:
    initial: todo
    statuses:
      todo: К выполнению
      done: Готово
    transitions:
      - todo -> done

entities:
  Project:
    attributes:
      status: workflow(ProjectWorkflow)
  Task:
    attributes:
      status: workflow(TaskWorkflow)
```

В web-UI под каждым workflow рисуется свой граф.

---

## 22. Дерево в одну строку

**Задача:** иерархия `RiskAssessment > RiskCategory > Risk`.

### DSL

```yaml
entities:
  RiskAssessment:
    attributes:
      name: String
  RiskCategory:
    attributes:
      name: String
  Risk:
    attributes:
      name: String

links:
  RiskAssessment:
    - 1:n RiskCategory
  RiskCategory:
    - 1:n Risk

trees:
  RiskTree: RiskAssessment > RiskCategory > Risk
```

**Одна строка дерева.**

### Что появляется в схеме

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
      actions:
        - type: row_click
          action: actions_openRiskAssessmentPanel
        - type: row_click
          action: actions_openRiskCategoryPanel
        - type: row_click
          action: actions_openRiskPanel

menus:
  # ...существующие пункты...
  - id: RiskTreeMenu
    route: /risk/risktree
    label: Дерево Оценка риска
    type: menu
    view: tree_RiskTree
```

**Что генерируется автоматически:**

- Блок `trees[]`.
- View `tree_RiskTree`.
- `filter` — массив по всем сущностям иерархии.
- `row_click` для **каждой** сущности.
- Пункт меню `RiskTreeMenu`.

---

## 23. Дерево с явной связью

**Задача:** между двумя сущностями **несколько** связей — какая из них в дереве?

### DSL

```yaml
links:
  A:
    - 1:n B
    - n:n B

trees:
  MyTree: A >(A_B) B
```

### Что появляется в схеме

```yaml
trees:
  - id: MyTree
    type: ordinary
    hierarchy:
      entity: A
      children:
        - linkage: A_B
          entity: B
```

**Синтаксис:** `<entity> >(<linkageId>) <entity>`.

**Без указания ID** генератор найдёт связи между A и B — их **две**, поэтому упадёт с ошибкой:

```
Дерево 'MyTree': между 'A' и 'B' несколько связей (A_B, B_A).
Укажите явно: >(LinkageId) B
```

---

## 24. Дерево с orderable

**Задача:** разрешить перетаскивание узлов в дереве.

### DSL

```yaml
trees:
  StandardsTree:
    type: orderable
    chain: Category > Standard > Requirement
```

### Что появляется в схеме

```yaml
trees:
  - id: StandardsTree
    type: orderable
    hierarchy:
      entity: Category
      children: [...]
```

Тип `orderable` разрешает UI-операции перетаскивания узлов.

---

## 25. ID с последовательностью

**Задача:** индикатор получает номер: 1, 2, 3, …

### DSL

```yaml
entities:
  Ioc:
    attributes:
      iocId:
        type: Identifier
        sequence: IOCSeq

sequences:
  IOCSeq:
    startFrom: 1
```

### Что появляется в схеме

```yaml
sequences:
  - id: IOCSeq
    startFrom: 1

entities:
  - id: Ioc
    attributes:
      - id: iocId
        dataType: Identifier
        sequence: IOCSeq
```

При создании объекта `iocId` = `1`, `2`, `3`, …

---

## 26. ID с датой

**Задача:** идентификатор содержит год и месяц создания.

### DSL

```yaml
entities:
  IocSource:
    attributes:
      sourceId:
        type: Identifier
        template: "{@YYYY}-{@MM}-{@inc}"
```

### Что появляется в схеме

```yaml
attributes:
  - id: sourceId
    dataType: Identifier
    template: "{@YYYY}-{@MM}-{@inc}"
```

Значения: `2025-10-1`, `2025-10-2`, `2025-11-1`, …

---

## 27. ID с префиксом и датой

**Задача:** идентификатор инцидента вида `INC-25/10/04-0042`.

### DSL

```yaml
entities:
  Incident:
    attributes:
      incidentId:
        type: Identifier
        template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}"
        defaultPrefix: INC
        incrementTemplate: "0000"
```

### Что появляется в схеме

```yaml
attributes:
  - id: incidentId
    dataType: Identifier
    template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}"
    defaultPrefix: INC
    incrementTemplate: "0000"
```

Значения: `INC-25/10/04-0001`, `INC-25/10/04-0002`, …, `INC-25/10/05-0001`.

---

## 28. Отключить список

**Задача:** у сущности нет собственного списка — используется как справочник.

### DSL

```yaml
entities:
  Category:
    name: Категория
    ui:
      list: false
    attributes:
      name: String
```

### Что НЕ генерируется

- Представление `lists_category`.
- Действие `actions_bulkRemoveCategory`.
- Кнопка `buttons_removeCategory`.
- Пункт меню для этой сущности.
- Столбцы таблицы.

**Что остаётся:** `viewCategory` с панелью, модалками. Сущность доступна через `Reference(Category)`.

### Что в схеме

```yaml
entities:
  - id: Category
    name: Категория
    ui:
      list: false
    attributes:
      - id: name
        dataType: String
```

**1 строка `list: false` → минус ~50 строк YAML.**

---

## 29. Отключить модалки

**Задача:** сущность создаётся/редактируется через плейбук, модалки не нужны.

### DSL

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

### Что НЕ генерируется

- Действия `actions_createLog`, `actions_editLog`.
- Кнопки `buttons_createLog`, `buttons_editLog`.
- Группы `blocks_forms_newLog`, `blocks_forms_editLog`.
- Карточки `forms_newLog`, `forms_editLog`.

### Что остаётся

- Список `lists_log` — просмотр.
- Панель `panels_infoLog` — детали.

**1 строка `modals: false` → минус ~40 строк YAML.**

---

## 30. Отключить весь UI

**Задача:** сущность — только модель данных. Появляется только через `Reference`.

### DSL

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
      code: String
```

### Что НЕ генерируется

- **Ни одного** действия.
- Список `lists_category`.
- Модалки создания/редактирования.
- Панель `panels_infoCategory`.
- Пункт меню.

### Что генерируется

- `entities[]` с флагами.
- `viewCategory` (пустая entity-обёртка).
- Больше **ничего**.

**3 строки → минус ~120 строк YAML.**

### Когда использовать

Для справочников, наполняемых через интеграцию.

**Совет:** если справочник должен быть доступен из меню — оставьте `list: true`. Флаг `modals: false` отделит редактирование.

---

## 31. Включить полный экран

**Задача:** для сущности с длинной формой нужна полноэкранная карточка.

### DSL

```yaml
entities:
  Incident:
    name: Инцидент
    label: "{subject}"
    ui:
      page: true
    attributes:
      subject: String
      description: Text
      status: workflow(IncidentWorkflow)
```

### Что генерируется ДОПОЛНИТЕЛЬНО

- Действие `actions_openIncidentPage` (`type: open_page`).
- Карточка `pages_infoIncident` (тип `page`).
- Кнопка `buttons_openIncidentPage` в панели действий.

### Что в схеме

```yaml
entities:
  - id: Incident
    ui:
      page: true
    attributes: [...]

actions:
  - id: actions_openIncidentPage
    name: Полный экран
    type: open_page
    view: viewIncident
    entity: Incident
    operation: view

views:
  - id: viewIncident
    type: entity
    ...
    views:
      - id: pages_infoIncident
        type: page
        menuItem: IncidentMenu
        actionPanel:
          - widget: buttons_createIncident
          - widget: buttons_editIncident
          - widget: buttons_removeIncident
        tabs:
          - tab: tabs_infoIncident
```

**1 строка `page: true` → +3 элемента в схеме.**

**По умолчанию выключено** — генерировать полный экран нужно явно.

---

## 32. Комбинация флагов

**Задача:** сущность с полным CRUD, но без списка и с полным экраном.

### DSL

```yaml
entities:
  Incident:
    name: Инцидент
    ui:
      list: false
      page: true
    attributes:
      subject: String
      status: enum(Status)
```

### Что генерируется

- **Есть** модалки создания/редактирования (`modals` дефолт `true`).
- **Есть** панель просмотра (`panel` дефолт `true`).
- **Есть** полный экран (`page: true`).
- **Нет** списка (`list: false`).

### Что в схеме

```yaml
entities:
  - id: Incident
    ui:
      list: false
      page: true
    attributes: [...]

actions:
  - id: actions_createIncident
  - id: actions_editIncident
  - id: actions_openIncidentPanel
  - id: actions_openIncidentPage
  # actions_bulkRemoveIncident — НЕТ

views:
  - id: viewIncident
    # без lists_incident
```

**Правило сериализации:** пишутся только **отличающиеся от дефолтных** флаги.

- `list: false` — потому что дефолт `true`.
- `page: true` — потому что дефолт `false`.

---

## 33. Кросс-доменная ссылка

**Задача:** инцидент ссылается на категорию из другого домена.

### DSL

```yaml
entities:
  Incident:
    attributes:
      category: Reference(dictionaries.test/Category)
```

### Что появляется в схеме

```yaml
attributes:
  - id: category
    dataType: Reference
    entity: dictionaries.test/Category
```

**3 строки → рабочая ссылка на другой домен.**

В UI — селектор с объектами `Category` из домена `dictionaries.test`.

**Требование:** домен `dictionaries.test` должен быть зарегистрирован в целевой системе.

---

## 34. Кросс-доменная связь

**Задача:** связь `n:n` между инцидентом в текущем домене и активом в другом.

### DSL

```yaml
entities:
  Incident:
    name: Инцидент

links:
  Incident:
    - n:n assets.test/Device
```

### Что появляется в схеме

```yaml
linkages:
  - id: Incident_assets.test_Device
    side1: Incident
    side2: assets.test/Device
    type: n_n
    undirected: true
    nameFrom:
      side1: Связан с assets.test/Device
      side2: Содержит Incident
```

В карточке `Incident` появится виджет связи с устройствами из другого домена.

**Примечание:** `assets.test/Device` **не появится** в списке сущностей левой панели web-UI — он в другом домене.

---

## Сводка: сколько генерируется из минимума

| DSL-строк | Что описано | Что генерируется |
|---|---|---|
| 11 | 1 сущность, 2 атрибута, меню | ~120 строк схемы, 4 действия, 5 виджетов, 4 группы, 3 карточки |
| 5 | 1 связь `n:n` | ~30 строк linkages + виджеты в двух представлениях |
| 8 | 1 workflow, 3 статуса | ~15 строк dataType + SVG-граф |
| 1 | `inherits: Device` | Сквозная интеграция |
| 1 | `readonly: true` | Корректное поведение в 3 формах |
| 1 | `default: OPEN` | dataRule с `effect: default` |
| 4 | `template: "{@prefix}-{@inc}"` | Полноценный идентификатор |
| 3 | `Reference(dictionaries.test/Category)` | Кросс-доменная ссылка |
| 1 | `- > 1:n User` | Самоссылающаяся связь |
| 2 | `Project: 1:n Task` + `User: 1:n Task` | Две связи + 2 виджета |
| 5 | 3 constraints для email | Обязательный + уникальный + regexp |
| 5 | 4 constraints для priority | Диапазон + обязательность |
| **1** | **`trees: RiskTree: A > B > C`** | **`trees[]` + view tree + фильтры + row_click + пункт меню** |
| **1** | **`ui: list: false`** | **Минус ~50 строк YAML** |
| **1** | **`ui: modals: false`** | **Минус ~40 строк YAML** |
| **3** | **`ui: list/modals/panel: false`** | **Минус ~120 строк YAML** |
| **1** | **`ui: page: true`** | **+3 элемента в схеме** |

**Общая идея:** DSL описывает **суть**, генератор — **инфраструктуру**. Каждая строка в DSL может дать 10–100 строк YAML и значительную экономию.

---

## Что дальше

- [DSL Reference](DSL.md) — полное описание языка.
- [Examples](EXAMPLES.md) — большие примеры доменов (20 пресетов).
- [User Guide](USER_GUIDE.md) — работа с web-редактором.
- [Architecture](ARCHITECTURE.md) — как устроен генератор.

---

**Версия документа:** 0.2 · **Дата:** 2025