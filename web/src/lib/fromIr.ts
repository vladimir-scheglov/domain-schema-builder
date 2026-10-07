// web/src/lib/fromIr.ts
import type {
  IR,
  IREntity,
  IRAttribute,
  IRDataType,
  IRSequence,
  IRWorkflowStatus,
  IRWorkflowTransition,
  IRTree,
  IRTreeNode,
  IRTreeChild,
} from "domain-schema-builder";
import type {
  UIState,
  UIEntity,
  UIAttribute,
  UIEnum,
  UILink,
  UISequence,
  UIWorkflow,
  UITree,
} from "../types";
import { generateKey } from "./generateKey";

export function irToUi(ir: IR): UIState {
  const enumIds = new Set(
    ir.dataTypes.filter((dt) => dt.kind === "Enum").map((dt) => dt.id),
  );

  const workflowIds = new Set(
    ir.dataTypes.filter((dt) => dt.kind === "Workflow").map((dt) => dt.id),
  );

  const entities: UIEntity[] = ir.entities.map((e) => ({
    _key: generateKey(),
    id: e.id,
    name: e.name ?? "",
    label: e.label ?? "",
    description: e.description ?? "",
    inherits: e.inherits ?? "",
    attributes: e.attributes.map((a) => attrToUi(a, enumIds, workflowIds)),
    generateList: e.generateList !== false,
    generateModals: e.generateModals !== false,
    generatePanel: e.generatePanel !== false,
    generatePage: e.generatePage === true,
    generateSorting: e.generateSorting !== false,
    generateSearching: e.generateSearching !== false,
    generateLinkages: e.generateLinkages !== false,
  }));

  const enums: UIEnum[] = ir.dataTypes
    .filter((dt) => dt.kind === "Enum")
    .map(dtToUiEnum);

  const workflows: UIWorkflow[] = ir.dataTypes
    .filter((dt) => dt.kind === "Workflow")
    .map(dtToUiWorkflow);

  const links: UILink[] = ir.linkages.map((l) => ({
    from: l.side1,
    to: l.side2,
    type: l.type.replace("_", ":") as UILink["type"],
    undirected: l.undirected ?? false,
  }));

  const sequences: UISequence[] = ir.sequences.map((s) => ({
    id: s.id,
    startFrom: s.startFrom ?? 1,
  }));

  // Меню: собираем id сущностей из пунктов root_group
  const menus: string[] = [];
  for (const m of ir.menus) {
    for (const item of m.items ?? []) {
      // item.id имеет вид "IocMenu", item.view — "lists_ioc".
      // Восстанавливаем entity id по view: lists_<entity-lowercase>
      if (item.view?.startsWith("lists_")) {
        const entityId = findEntityByListView(item.view, entities);
        if (entityId) menus.push(entityId);
      }
    }
  }

  const trees: UITree[] = (ir.trees ?? []).map(treeToUi);

  return {
    domain: ir.domain,
    version: ir.version,
    name: ir.name ?? "",
    description: ir.description ?? "",
    author: ir.author ?? "",
    tags: ir.tags ?? [],
    entities,
    enums,
    workflows,
    links,
    menus,
    sequences,
    trees,
  };
}

// ---------------- helpers ----------------

function attrToUi(
  a: IRAttribute,
  enumIds: Set<string>,
  workflowIds: Set<string>,
): UIAttribute {
  const type = reconstructType(a, enumIds, workflowIds);
  const result: UIAttribute = {
    _key: generateKey(),
    id: a.id,
    name: a.name ?? "",
    type,
    default: a.default !== undefined ? String(a.default) : "",
    readonly: a.readonly === true,
  };

  // Поля Identifier
  if (a.sequence) result.sequence = a.sequence;
  if (a.template) result.template = a.template;
  if (a.defaultPrefix) result.defaultPrefix = a.defaultPrefix;
  if (a.incrementTemplate) result.incrementTemplate = a.incrementTemplate;

  return result;
}
function reconstructType(
  a: IRAttribute,
  enumIds: Set<string>,
  workflowIds: Set<string>,
): string {
  if (a.dataType === "Array" && a.item) {
    if (a.item.dataType === "Reference" && a.item.entity) {
      return `Array<Reference(${a.item.entity})>`;
    }
    if (enumIds.has(a.item.dataType)) return `Array<enum(${a.item.dataType})>`;
    if (workflowIds.has(a.item.dataType))
      return `Array<workflow(${a.item.dataType})>`;
    return `Array<${a.item.dataType}>`;
  }

  if (a.dataType === "Reference" && a.entity) {
    return `Reference(${a.entity})`;
  }

  if (enumIds.has(a.dataType)) return `enum(${a.dataType})`;
  if (workflowIds.has(a.dataType)) return `workflow(${a.dataType})`;
  return a.dataType;
}

function isBaseType(t: string): boolean {
  return [
    "Uuid",
    "Timestamp",
    "Date",
    "Time",
    "TimestampRange",
    "String",
    "Text",
    "MAC",
    "Integer",
    "Decimal",
    "Float",
    "Bool",
    "Enum",
    "IpAddress",
    "CIDR",
    "Reference",
    "Workflow",
    "Array",
    "Table",
    "Calculation",
    "Configuration",
    "Variable",
    "URL",
    "Identifier",
    "Attachment",
    "Counter",
    "RQL",
    "Automation",
  ].includes(t);
}

function dtToUiEnum(dt: IRDataType): UIEnum {
  const values = (dt.values ?? []).map((v) =>
    v.name ? `${v.id}:${v.name}` : v.id,
  );
  return {
    id: dt.id,
    values: values.join("\n"),
  };
}

function dtToUiWorkflow(dt: IRDataType): UIWorkflow {
  return {
    id: dt.id,
    name: dt.name ?? "",
    description: dt.description ?? "",
    initial: dt.initial ?? "",
    statuses: (dt.statuses ?? [])
      .map((s) => {
        return s.name ? `${s.id}: ${s.name}` : s.id;
      })
      .join("\n"),
    transitions: (dt.transitions ?? [])
      .map((t) => `${t.from} -> ${t.to}`)
      .join("\n"),
  };
}

function findEntityByListView(
  viewId: string,
  entities: UIEntity[],
): string | null {
  // viewId = 'lists_<lowercase>'
  const suffix = viewId.replace(/^lists_/, "");
  for (const e of entities) {
    if (e.id.toLowerCase() === suffix) return e.id;
  }
  return null;
}

function treeToUi(t: IRTree): UITree {
  // Собираем цепочку из hierarchy
  const parts: string[] = [];
  parts.push(t.hierarchy.entity);

  let node: IRTreeNode | undefined = t.hierarchy;
  while (node?.children?.length) {
    const child: IRTreeChild = node.children[0]!;
    parts.push(`>${child.linkage ? `(${child.linkage})` : ""} ${child.entity}`);
    node = child;
  }

  // Восстанавливаем строку цепочки
  // Пробуем "A > B > C", но если в IR связи были явными, лучше их сохранить
  const chain = parts.join(" ");

  return {
    _key: generateKey(),
    id: t.id,
    type: t.type ?? "ordinary",
    chain,
  };
}