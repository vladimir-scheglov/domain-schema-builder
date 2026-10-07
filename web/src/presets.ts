// web/src/presets.ts

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: "starter" | "domain" | "workflow" | "advanced";
  dsl: string;
}

export const PRESETS: Preset[] = [
  // ============================================================
  // STARTER — минимальные заготовки
  // ============================================================
  {
    id: "empty",
    name: "Пустой домен",
    description: "Минимальный каркас: одна сущность, одно меню",
    category: "starter",
    dsl: `domain: empty.test
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
`,
  },

  {
    id: "crud",
    name: "CRUD-сущность",
    description:
      "Все типовые поля: identifier, audit, status, tags, полноэкранная карточка",
    category: "starter",
    dsl: `domain: crud.test
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
`,
  },

  {
    id: "reference-book",
    name: "Справочник",
    description:
      "Сущность-классификатор без собственного UI: используется только как Reference",
    category: "starter",
    dsl: `domain: dictionaries.test
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
`,
  },

  {
    id: "numbers",
    name: "Числовые типы",
    description:
      "Все числовые типы с constraints: Integer, Decimal, Float, range, default",
    category: "starter",
    dsl: `domain: numbers.test
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
`,
  },

  // ============================================================
  // DOMAIN — типовые предметные области
  // ============================================================
  {
    id: "iocs",
    name: "IOCs Domain",
    description:
      "Индикаторы компрометации: сущности, enum, reference, идентификаторы, связь n:n",
    category: "domain",
    dsl: `domain: iocs.test
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
`,
  },

  {
    id: "assets",
    name: "Активы",
    description: "Оборудование с наследованием: Server и Workstation от Device",
    category: "domain",
    dsl: `domain: assets.test
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
`,
  },

  {
    id: "incidents",
    name: "Инциденты",
    description:
      "Инцидент ИБ с приоритетами, категориями и workflow на 7 статусов",
    category: "domain",
    dsl: `domain: incidents.test
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
`,
  },

  {
    id: "audit",
    name: "Аудит",
    description: "Аудиты с двумя workflow (статус аудита и статус требования)",
    category: "domain",
    dsl: `domain: audit.test
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
    description: Жизненный цикл аудита
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
    description: Оценка соответствия требования
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
`,
  },

  {
    id: "tasks",
    name: "Задачи",
    description: "Канбан-подобный домен: задачи, исполнители, проекты",
    category: "domain",
    dsl: `domain: tasks.test
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
`,
  },

  // ============================================================
  // WORKFLOW — примеры рабочих процессов
  // ============================================================
  {
    id: "workflow-simple",
    name: "Workflow: линейный",
    description: "Простой линейный процесс: 3 статуса, 2 перехода",
    category: "workflow",
    dsl: `domain: workflow-simple.test
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
`,
  },

  {
    id: "workflow-branching",
    name: "Workflow: с ветвлением",
    description: "Процесс с ветвями: согласование, отклонение, доработка",
    category: "workflow",
    dsl: `domain: workflow-branch.test
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
`,
  },

  {
    id: "workflow-cyclic",
    name: "Workflow: циклический",
    description: "Процесс с возвратами: можно откатывать и повторять",
    category: "workflow",
    dsl: `domain: workflow-cycle.test
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
`,
  },

  // ============================================================
  // ADVANCED — продвинутые паттерны
  // ============================================================
  {
    id: "inheritance",
    name: "Наследование",
    description:
      "Общая база с несколькими потомками: договор, акт, счёт от документа",
    category: "advanced",
    dsl: `domain: inheritance.test
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
`,
  },

  {
    id: "cross-domain",
    name: "Кросс-доменные ссылки",
    description: "Ссылки и связи с сущностями из другого домена",
    category: "advanced",
    dsl: `domain: cross-domain.test
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
`,
  },

  {
    id: "many-to-many",
    name: "Многие-ко-многим",
    description: "Две сущности, связанные через n:n, с полной инфраструктурой",
    category: "advanced",
    dsl: `domain: many-to-many.test
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
`,
  },

  {
    id: "tree",
    name: "Дерево",
    description: "Иерархия через деревья: оценка → категория → риск",
    category: "advanced",
    dsl: `domain: risk.test
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
`,
  },

  {
    id: "soft-delete",
    name: "Soft Delete",
    description: "Паттерн мягкого удаления: isDeleted, deletedAt, deletedBy",
    category: "advanced",
    dsl: `domain: soft-delete.test
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
`,
  },

  {
    id: "self-reference",
    name: "Самоссылающаяся сущность",
    description: "Иерархия через parent: Reference(Self) — без деревьев",
    category: "advanced",
    dsl: `domain: hierarchy.test
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
`,
  },

  {
    id: "many-links",
    name: "Несколько связей",
    description:
      "Сущность с несколькими связями к одной сущности: writer и reviewer",
    category: "advanced",
    dsl: `domain: reviews.test
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
`,
  },

  {
    id: "two-entities-crud",
    name: "Две сущности CRUD",
    description: "Две связанные сущности с полным CRUD и связью 1:n",
    category: "advanced",
    dsl: `domain: two-crud.test
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
      priority: Integer
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
`,
  },
];

/**
 * Группировка пресетов по категориям для UI.
 */
export const PRESET_CATEGORIES: Record<Preset["category"], string> = {
  starter: "Стартовые",
  domain: "Предметные области",
  workflow: "Workflow",
  advanced: "Продвинутые",
};
