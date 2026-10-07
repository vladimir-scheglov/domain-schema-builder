// web/src/lib/entityTemplates.ts
import type {
  UIEntity,
  UIAttribute,
  UIEnum,
  UIWorkflow,
  UISequence,
} from "../types";
import { generateKey } from "./generateKey";

export interface EntityTemplate {
  id: string;
  name: string;
  description: string;
  /** Что создаётся — для превью в диалоге */
  creates: string[];
  build: (params: { entityId: string; entityName: string }) => {
    entity: UIEntity;
    enums: UIEnum[];
    workflows: UIWorkflow[];
    sequences: UISequence[];
  };
}

// ============================================================
// Утилиты
// ============================================================

function attr(
  id: string,
  name: string,
  type: string,
  opts: Partial<UIAttribute> = {},
): UIAttribute {
  return {
    _key: generateKey(),
    id,
    name,
    type,
    default: "",
    readonly: false,
    ...opts,
  };
}

// ============================================================
// Шаблоны
// ============================================================

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  // ============================================================
  // 1. CRUD-сущность
  // ============================================================
  {
    id: "crud",
    name: "CRUD-сущность",
    description: "Полный CRUD: identifier, status, priority, tags",
    creates: [
      "Сущность с 7 атрибутами",
      "enum Status (3 значения)",
      "enum Priority (4 значения)",
      "sequence для ID",
    ],
    build: ({ entityId, entityName }) => {
      const idLower = entityId.charAt(0).toLowerCase() + entityId.slice(1);
      const seqId = `${entityId}Seq`;
      const key = generateKey();
      const entity: UIEntity = {
        _key: key,
        id: entityId,
        name: entityName || entityId,
        label: `{${idLower}Id}: {title}`,
        description: "",
        inherits: "",
        attributes: [
          attr(`${idLower}Id`, "Идентификатор", "Identifier", {
            sequence: seqId,
            readonly: true,
          }),
          attr("title", "Заголовок", "String"),
          attr("description", "Описание", "Text"),
          attr("status", "Статус", "enum(Status)", { default: "ACTIVE" }),
          attr("priority", "Приоритет", "enum(Priority)"),
          attr("tags", "Теги", "Array<String>"),
          attr("isArchived", "В архиве", "Bool", { default: "false" }),
        ],
        generateList: true,
        generateModals: true,
        generatePanel: true,
        generatePage: true,
        generateSorting: true,
        generateSearching: true,
        generateLinkages: true,
      };

      return {
        entity,
        enums: [
          {
            id: "Status",
            values: "ACTIVE: Активна\nARCHIVED: Архивирована\nDRAFT: Черновик",
          },
          {
            id: "Priority",
            values:
              "LOW: Низкий\nMEDIUM: Средний\nHIGH: Высокий\nCRITICAL: Критический",
          },
        ],
        workflows: [],
        sequences: [{ id: seqId, startFrom: 1 }],
      };
    },
  },

  // ============================================================
  // 2. Справочник
  // ============================================================
  {
    id: "dictionary",
    name: "Справочник",
    description:
      "Простой классификатор без UI: используется только как Reference",
    creates: ["Сущность с 4 атрибутами", "UI отключён (list, modals, panel)"],
    build: ({ entityId, entityName }) => {
      const key = generateKey();
      return {
        entity: {
          _key: key,
          id: entityId,
          name: entityName || entityId,
          label: "{name}",
          description: "",
          inherits: "",
          attributes: [
            attr("name", "Название", "String"),
            attr("code", "Код", "String"),
            attr("description", "Описание", "Text"),
            attr("isActive", "Активен", "Bool", { default: "true" }),
          ],
          generateList: false,
          generateModals: false,
          generatePanel: false,
          generatePage: false,
          generateSorting: true,
          generateSearching: true,
          generateLinkages: true,
        },
        enums: [],
        workflows: [],
        sequences: [],
      };
    },
  },

  // ============================================================
  // 3. Workflow-сущность
  // ============================================================
  {
    id: "workflow",
    name: "Workflow-сущность",
    description:
      "Сущность со статусом через workflow: draft → inProgress → done",
    creates: [
      "Сущность с 4 атрибутами",
      "workflow с 3 статусами и 2 переходами",
      "sequence для ID",
    ],
    build: ({ entityId, entityName }) => {
      const idLower = entityId.charAt(0).toLowerCase() + entityId.slice(1);
      const seqId = `${entityId}Seq`;
      const workflowId = `${entityId}Workflow`;
      const key = generateKey();

      return {
        entity: {
          _key: key,
          id: entityId,
          name: entityName || entityId,
          label: `{${idLower}Id}`,
          description: "",
          inherits: "",
          attributes: [
            attr(`${idLower}Id`, "Идентификатор", "Identifier", {
              sequence: seqId,
              readonly: true,
            }),
            attr("title", "Заголовок", "String"),
            attr("description", "Описание", "Text"),
            attr("status", "Статус", `workflow(${workflowId})`),
          ],
          generateList: true,
          generateModals: true,
          generatePanel: true,
          generatePage: true,
          generateSorting: true,
          generateSearching: true,
          generateLinkages: true,
        },
        enums: [],
        workflows: [
          {
            id: workflowId,
            name: `Статус ${entityName || entityId}`,
            description: "",
            initial: "draft",
            statuses: "draft: Черновик\ninProgress: В работе\ndone: Готово",
            transitions: "draft -> inProgress\ninProgress -> done",
          },
        ],
        sequences: [{ id: seqId, startFrom: 1 }],
      };
    },
  },

  // ============================================================
  // 4. Soft-delete сущность
  // ============================================================
  // ВНИМАНИЕ: createdAt, createdBy, updatedAt, updatedBy, version
  // НЕ создаём — они системные.
  // ============================================================
  {
    id: "soft-delete",
    name: "Soft-delete сущность",
    description:
      "Мягкое удаление: isDeleted, deletedAt, deletedBy (audit-поля уже есть в системе)",
    creates: [
      "Сущность с 5 атрибутами",
      "Поля мягкого удаления readonly",
      "Audit-поля (createdAt, updatedAt, …) доступны автоматически",
    ],
    build: ({ entityId, entityName }) => {
      const key = generateKey();
      return {
        entity: {
          _key: key,
          id: entityId,
          name: entityName || entityId,
          label: "{title}",
          description: "",
          inherits: "",
          attributes: [
            attr("title", "Заголовок", "String"),
            attr("description", "Описание", "Text"),
            attr("isDeleted", "Удалён", "Bool", {
              default: "false",
              readonly: true,
            }),
            attr("deletedAt", "Дата удаления", "Timestamp", { readonly: true }),
            attr("deletedBy", "Кто удалил", "String", { readonly: true }),
          ],
          generateList: true,
          generateModals: true,
          generatePanel: true,
          generatePage: false,
          generateSorting: true,
          generateSearching: true,
          generateLinkages: true,
        },
        enums: [],
        workflows: [],
        sequences: [],
      };
    },
  },

  // ============================================================
  // 5. Сущность с публикацией
  // ============================================================
  // Заменяет прежний «Аудит-сущность» — все audit-поля системные,
  // их нет смысла создавать. Вместо этого — публикация.
  // ============================================================
  {
    id: "published",
    name: "Сущность с публикацией",
    description: "Поля публикации: isPublished, publishedAt, publishedBy",
    creates: ["Сущность с 5 атрибутами", "Поля публикации readonly"],
    build: ({ entityId, entityName }) => {
      const key = generateKey();
      return {
        entity: {
          _key: key,
          id: entityId,
          name: entityName || entityId,
          label: "{title}",
          description: "",
          inherits: "",
          attributes: [
            attr("title", "Заголовок", "String"),
            attr("description", "Описание", "Text"),
            attr("isPublished", "Опубликован", "Bool", {
              default: "false",
              readonly: true,
            }),
            attr("publishedAt", "Дата публикации", "Timestamp", {
              readonly: true,
            }),
            attr("publishedBy", "Кто опубликовал", "String", {
              readonly: true,
            }),
          ],
          generateList: true,
          generateModals: true,
          generatePanel: true,
          generatePage: false,
          generateSorting: true,
          generateSearching: true,
          generateLinkages: true,
        },
        enums: [],
        workflows: [],
        sequences: [],
      };
    },
  },

  // ============================================================
  // 6. Сущность с деревом
  // ============================================================
  {
    id: "tree-node",
    name: "Сущность с деревом",
    description: "Иерархия через parent: Reference(Self)",
    creates: ["Сущность с 5 атрибутами", "Ссылка parent на саму себя"],
    build: ({ entityId, entityName }) => {
      const key = generateKey();
      return {
        entity: {
          _key: key,
          id: entityId,
          name: entityName || entityId,
          label: "{name}",
          description: "",
          inherits: "",
          attributes: [
            attr("name", "Название", "String"),
            attr("description", "Описание", "Text"),
            attr("parent", "Родитель", `Reference(${entityId})`),
            attr("path", "Путь", "String", { readonly: true }),
            attr("order", "Порядок", "Integer", { default: "0" }),
          ],
          generateList: true,
          generateModals: true,
          generatePanel: true,
          generatePage: false,
          generateSorting: true,
          generateSearching: true,
          generateLinkages: true,
        },
        enums: [],
        workflows: [],
        sequences: [],
      };
    },
  },
];
