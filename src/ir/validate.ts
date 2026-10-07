import { BASE_TYPES, NO_DEFAULT_TYPES, SYSTEM_ATTRIBUTE_IDS } from "./consts";
import type {
  IR,
  ValidationIssue,
  ValidationResult,
  IRTreeChild,
  IRTreeNode,
} from "./types";
import {} from "./types";

export function validateIr(ir: IR): ValidationResult {
  const issues: ValidationIssue[] = [];

  validateEntities(ir, issues);
  validateAttributes(ir, issues);
  validateInheritance(ir, issues);
  validateLinkages(ir, issues);
  validateTrees(ir, issues);
  validateDataTypes(ir, issues);
  validateMenus(ir, issues);
  validateSystemAttributes(ir, issues);

  return {
    ok: issues.every((i) => i.level !== "error"),
    issues,
  };
}

function validateTrees(ir: IR, issues: ValidationIssue[]): void {
  const entityIds = new Set(ir.entities.map((e) => e.id));
  const linkageIds = new Set(ir.linkages.map((l) => l.id));
  const treeIds = new Set<string>();

  for (const t of ir.trees) {
    if (treeIds.has(t.id)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_TREE_ID",
        message: `Дерево '${t.id}' объявлено несколько раз`,
        path: `trees.${t.id}`,
      });
    }
    treeIds.add(t.id);

    if (
      !entityIds.has(t.hierarchy.entity) &&
      !t.hierarchy.entity.includes("/")
    ) {
      issues.push({
        level: "error",
        code: "UNRESOLVED_TREE_ENTITY",
        message: `Дерево '${t.id}': корневая сущность '${t.hierarchy.entity}' не найдена`,
        path: `trees.${t.id}.hierarchy.entity`,
      });
    }

    walkTree(t.hierarchy, t.id, entityIds, linkageIds, issues);
  }
}

function walkTree(
  node: IRTreeNode | IRTreeChild,
  treeId: string,
  entityIds: Set<string>,
  linkageIds: Set<string>,
  issues: ValidationIssue[],
): void {
  if ("linkage" in node) {
    if (!linkageIds.has(node.linkage)) {
      issues.push({
        level: "error",
        code: "UNRESOLVED_TREE_LINKAGE",
        message: `Дерево '${treeId}': связь '${node.linkage}' не найдена`,
        path: `trees.${treeId}`,
      });
    }
    if (!entityIds.has(node.entity) && !node.entity.includes("/")) {
      issues.push({
        level: "error",
        code: "UNRESOLVED_TREE_ENTITY",
        message: `Дерево '${treeId}': сущность '${node.entity}' не найдена`,
        path: `trees.${treeId}`,
      });
    }
  }

  for (const child of node.children ?? []) {
    walkTree(child, treeId, entityIds, linkageIds, issues);
  }
}

function validateEntities(ir: IR, issues: ValidationIssue[]): void {
  const seen = new Set<string>();
  for (const e of ir.entities) {
    if (seen.has(e.id)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_ENTITY_ID",
        message: `Сущность '${e.id}' объявлена несколько раз`,
        path: `entities.${e.id}`,
      });
    }
    seen.add(e.id);
  }
}

function validateAttributes(ir: IR, issues: ValidationIssue[]): void {
  const entityIds = new Set(ir.entities.map((e) => e.id));
  const dtIds = new Set(ir.dataTypes.map((dt) => dt.id));
  const seqIds = new Set(ir.sequences.map((s) => s.id));

  for (const e of ir.entities) {
    const attrIds = new Set<string>();
    for (const a of e.attributes) {
      const path = `entities.${e.id}.attributes.${a.id}`;

      if (attrIds.has(a.id)) {
        issues.push({
          level: "error",
          code: "DUPLICATE_ATTRIBUTE_ID",
          message: `Атрибут '${e.id}.${a.id}' объявлен несколько раз`,
          path,
        });
      }
      attrIds.add(a.id);

      // Reference → существующая сущность
      if (a.dataType === "Reference" && a.entity) {
        if (!isEntityRef(a.entity, entityIds, ir.domain)) {
          issues.push({
            level: "error",
            code: "UNRESOLVED_REFERENCE",
            message: `Атрибут '${e.id}.${a.id}' ссылается на несуществующую сущность '${a.entity}'`,
            path,
          });
        }
      }

      // Array<Reference>
      if (
        a.dataType === "Array" &&
        a.item?.dataType === "Reference" &&
        a.item.entity
      ) {
        if (!isEntityRef(a.item.entity, entityIds, ir.domain)) {
          issues.push({
            level: "error",
            code: "UNRESOLVED_REFERENCE",
            message: `Элемент массива '${e.id}.${a.id}' ссылается на несуществующую сущность '${a.item.entity}'`,
            path,
          });
        }
      }

      // Identifier — нужен sequence или template
      if (a.dataType === "Identifier") {
        if (!a.sequence && !a.template) {
          issues.push({
            level: "error",
            code: "IDENTIFIER_NO_SEQUENCE_NO_TEMPLATE",
            message: `Атрибут '${e.id}.${a.id}' типа Identifier требует sequence или template`,
            path,
          });
        }
        if (a.sequence && !seqIds.has(a.sequence)) {
          issues.push({
            level: "error",
            code: "UNRESOLVED_SEQUENCE",
            message: `Атрибут '${e.id}.${a.id}' ссылается на несуществующую последовательность '${a.sequence}'`,
            path,
          });
        }
      }

      // default — только для разрешённых типов
      if (a.default !== undefined && NO_DEFAULT_TYPES.has(a.dataType)) {
        issues.push({
          level: "error",
          code: "DEFAULT_NOT_ALLOWED",
          message: `Атрибут '${e.id}.${a.id}': default не поддерживается для типа '${a.dataType}'`,
          path,
        });
      }

      // пользовательский тип должен существовать
      if (!BASE_TYPES.has(a.dataType) && !dtIds.has(a.dataType)) {
        issues.push({
          level: "error",
          code: "UNRESOLVED_DATATYPE",
          message: `Атрибут '${e.id}.${a.id}': тип данных '${a.dataType}' не найден`,
          path,
        });
      }

      // prefixRules — проверка ссылок
      if (a.prefixRules?.length) {
        for (const r of a.prefixRules) {
          const own = e.attributes.find((x) => x.id === r.attribute);
          if (!own) {
            issues.push({
              level: "error",
              code: "PREFIX_RULE_ATTR_NOT_FOUND",
              message: `Правило подстановки префикса '${r.id}': атрибут '${r.attribute}' не найден в сущности '${e.id}'`,
              path,
            });
          }
        }
      }
    }
  }
}

function validateInheritance(ir: IR, issues: ValidationIssue[]): void {
  const entityIds = new Set(ir.entities.map((e) => e.id));

  for (const e of ir.entities) {
    if (!e.inherits) continue;

    if (!isEntityRef(e.inherits, entityIds, ir.domain)) {
      issues.push({
        level: "error",
        code: "UNRESOLVED_INHERITS",
        message: `Сущность '${e.id}' наследуется от несуществующей '${e.inherits}'`,
        path: `entities.${e.id}.inherits`,
      });
      continue;
    }

    if (hasInheritanceCycle(e.id, ir)) {
      issues.push({
        level: "error",
        code: "INHERITANCE_CYCLE",
        message: `Циклическое наследование у сущности '${e.id}'`,
        path: `entities.${e.id}.inherits`,
      });
    }
  }
}

function validateLinkages(ir: IR, issues: ValidationIssue[]): void {
  const entityIds = new Set(ir.entities.map((e) => e.id));

  for (const l of ir.linkages) {
    if (!isEntityRef(l.side1, entityIds, ir.domain)) {
      issues.push({
        level: "error",
        code: "UNRESOLVED_LINKAGE_SIDE",
        message: `Связь '${l.id}': side1 ссылается на несуществующую '${l.side1}'`,
        path: `linkages.${l.id}.side1`,
      });
    }
    if (!isEntityRef(l.side2, entityIds, ir.domain)) {
      issues.push({
        level: "error",
        code: "UNRESOLVED_LINKAGE_SIDE",
        message: `Связь '${l.id}': side2 ссылается на несуществующую '${l.side2}'`,
        path: `linkages.${l.id}.side2`,
      });
    }
  }
}

function validateDataTypes(ir: IR, issues: ValidationIssue[]): void {
  const seen = new Set<string>();
  for (const dt of ir.dataTypes) {
    if (seen.has(dt.id)) {
      issues.push({
        level: "error",
        code: "DUPLICATE_DATATYPE_ID",
        message: `Тип данных '${dt.id}' объявлен несколько раз`,
        path: `dataTypes.${dt.id}`,
      });
    }
    seen.add(dt.id);

    if (dt.kind === "Enum" && (!dt.values || dt.values.length === 0)) {
      issues.push({
        level: "error",
        code: "EMPTY_ENUM",
        message: `Перечисление '${dt.id}' не содержит значений`,
        path: `dataTypes.${dt.id}`,
      });
    }

    if (dt.kind === "Workflow") {
      if (!dt.statuses?.length) {
        issues.push({
          level: "error",
          code: "WORKFLOW_NO_STATUSES",
          message: `Workflow '${dt.id}' не содержит статусов`,
          path: `dataTypes.${dt.id}`,
        });
      }

      const statusIds = new Set((dt.statuses ?? []).map((s) => s.id));

      if (!dt.initial) {
        issues.push({
          level: "error",
          code: "WORKFLOW_NO_INITIAL",
          message: `Workflow '${dt.id}': не задан начальный статус (initial)`,
          path: `dataTypes.${dt.id}`,
        });
      } else if (!statusIds.has(dt.initial)) {
        issues.push({
          level: "error",
          code: "WORKFLOW_INITIAL_UNKNOWN",
          message: `Workflow '${dt.id}': начальный статус '${dt.initial}' не найден среди statuses`,
          path: `dataTypes.${dt.id}.initial`,
        });
      }

      for (const t of dt.transitions ?? []) {
        if (!statusIds.has(t.from)) {
          issues.push({
            level: "error",
            code: "WORKFLOW_TRANSITION_UNKNOWN_STATE",
            message: `Workflow '${dt.id}': переход из несуществующего статуса '${t.from}'`,
            path: `dataTypes.${dt.id}.transitions`,
          });
        }
        if (!statusIds.has(t.to)) {
          issues.push({
            level: "error",
            code: "WORKFLOW_TRANSITION_UNKNOWN_STATE",
            message: `Workflow '${dt.id}': переход в несуществующий статус '${t.to}'`,
            path: `dataTypes.${dt.id}.transitions`,
          });
        }
      }
    }
  }
}

function validateMenus(ir: IR, issues: ValidationIssue[]): void {
  for (const m of ir.menus) {
    for (const item of m.items ?? []) {
      const entityId = item.id.replace(/Menu$/, "");
      const entity = ir.entities.find((e) => e.id === entityId);

      if (!entity) continue;

      if (entity.generateList === false && !item.view?.startsWith("tree_")) {
        issues.push({
          level: "warning",
          code: "MENU_ITEM_WITHOUT_LIST",
          message:
            `Пункт меню '${item.id}' для сущности '${entityId}' будет пропущен: ` +
            `у сущности отключён список (ui.list: false). ` +
            `Либо включите список, либо уберите сущность из menus.`,
          path: `menus.${m.id}.items.${item.id}`,
        });
      }
    }
  }
}

// ---------- helpers ----------

function isEntityRef(
  ref: string,
  localIds: Set<string>,
  domain: string,
): boolean {
  if (typeof ref !== "string" || ref.length === 0) return false;
  // FQID на другой домен — не проверяем здесь
  if (ref.includes("/")) return true;
  return localIds.has(ref);
}

function hasInheritanceCycle(start: string, ir: IR): boolean {
  const seen = new Set<string>();
  let cur: string | undefined = start;
  while (cur) {
    if (seen.has(cur)) return true;
    seen.add(cur);
    const entity = ir.entities.find((e) => e.id === cur);
    if (!entity) return false;
    cur = entity.inherits;
    if (cur && cur.includes("/")) return false; // уходим в другой домен — цикл не наш
  }
  return false;
}

function validateSystemAttributes(ir: IR, issues: ValidationIssue[]): void {
  for (const e of ir.entities) {
    for (const a of e.attributes) {
      if (SYSTEM_ATTRIBUTE_IDS.has(a.id)) {
        issues.push({
          level: "warning",
          code: "SYSTEM_ATTRIBUTE_REDEFINITION",
          message:
            `Атрибут '${a.id}' в сущности '${e.id}' совпадает с системным. ` +
            `Системный атрибут уже доступен в каждой сущности. ` +
            `Этот атрибут может быть проигнорирован. Рекомендуется использовать другое имя.`,
          path: `entities.${e.id}.attributes.${a.id}`,
        });
      }
    }
  }
}