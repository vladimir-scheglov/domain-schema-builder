// web/src/lib/systemAttributes.ts

/**
 * Системные атрибуты, которые автоматически создаются для каждой сущности.
 * Их нельзя описывать в схеме домена — это приведёт к конфликту или
 * будет проигнорировано целевой системой.
 */
export const SYSTEM_ATTRIBUTE_IDS = [
  "id",
  "organizationId",
  "domainId",
  "entityId",
  "entityName",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "tenantId",
  "label",
  "version",
] as const;

export type SystemAttributeId = (typeof SYSTEM_ATTRIBUTE_IDS)[number];

const SYSTEM_SET = new Set<string>(SYSTEM_ATTRIBUTE_IDS);

/**
 * Type guard: сужает тип до SystemAttributeId.
 */
export function isSystemAttribute(id: string): id is SystemAttributeId {
  return SYSTEM_SET.has(id);
}


/**
 * Таблица для UI-подсказок.
 */
export const SYSTEM_ATTRIBUTE_INFO: Record<
  SystemAttributeId,
  { type: string; title: string; description: string }
> = {
  id: {
    type: "Uuid",
    title: "Идентификатор объекта",
    description: "Уникальный идентификатор в текущем экземпляре домена",
  },
  organizationId: {
    type: "Reference (Organization)",
    title: "Организация",
    description: "Отображаемое название организации, присвоенное объекту",
  },
  domainId: {
    type: "String (FQDN)",
    title: "Идентификатор домена",
    description: "Идентификатор домена из схемы домена",
  },
  entityId: {
    type: "String (Definition ID)",
    title: "Идентификатор сущности",
    description: "Идентификатор сущности из схемы домена",
  },
  entityName: {
    type: "String",
    title: "Название сущности",
    description: "Название сущности из поля name",
  },
  createdAt: {
    type: "Timestamp",
    title: "Дата создания",
    description: "Дата и время создания объекта с точностью до секунд",
  },
  createdBy: {
    type: "Reference (User)",
    title: "Создал",
    description: "Пользователь, создавший объект",
  },
  updatedAt: {
    type: "Timestamp",
    title: "Дата изменения",
    description: "Дата и время последнего обновления объекта",
  },
  updatedBy: {
    type: "Reference (User)",
    title: "Изменил",
    description: "Пользователь, последним обновивший объект",
  },
  tenantId: {
    type: "Reference (Tenant)",
    title: "Идентификатор тенанта",
    description: "Тенант-владелец объекта",
  },
  label: {
    type: "String",
    title: "Лейбл",
    description: "Неуникальный человекочитаемый идентификатор объекта",
  },
  version: {
    type: "Integer",
    title: "Версия объекта",
    description: "Версия объекта",
  },
};
