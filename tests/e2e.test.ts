import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { generateSchema } from "../src/index";

const dsl = readFileSync("examples/iocs.dsl.yaml", "utf8");
const yaml = generateSchema(dsl);
const parsed = parseYaml(yaml) as any;

describe("E2E: генерация схемы домена", () => {
  it("metadata корректна", () => {
    expect(parsed.id).toBe("iocs.test");
    expect(parsed.type).toBe("domain");
    expect(parsed.version).toBe("0.0.1");
    expect(parsed.name).toBe("IOCs Domain");
    expect(parsed.tags).toEqual(["iocs"]);
  });

  it("3 сущности сгенерированы", () => {
    expect(parsed.entities).toHaveLength(3);
    const ids = parsed.entities.map((e: any) => e.id);
    expect(ids).toEqual(["Ioc", "IocSource", "Incident"]);
  });

  it("Ioc содержит правильные атрибуты", () => {
    const ioc = parsed.entities.find((e: any) => e.id === "Ioc");
    const attrIds = ioc.attributes.map((a: any) => a.id);
    expect(attrIds).toContain("value");
    expect(attrIds).toContain("type");
    expect(attrIds).toContain("sources");
    expect(attrIds).toContain("iocId");

    const sources = ioc.attributes.find((a: any) => a.id === "sources");
    expect(sources.dataType).toBe("Array");
    expect(sources.item.dataType).toBe("Reference");
    expect(sources.item.entity).toBe("IocSource");

    const iocId = ioc.attributes.find((a: any) => a.id === "iocId");
    expect(iocId.dataType).toBe("Identifier");
    expect(iocId.sequence).toBe("IOCSeq");
  });

  it("2 enum-типа сгенерированы", () => {
    expect(parsed.dataTypes).toHaveLength(2);
    const ids = parsed.dataTypes.map((dt: any) => dt.id).sort();
    expect(ids).toEqual(["IncidentStatus", "IocType"]);

    const iocType = parsed.dataTypes.find((dt: any) => dt.id === "IocType");
    expect(iocType.dataType).toBe("Enum");
    expect(iocType.values).toHaveLength(6);
  });

  it("связь Ioc_Incident сгенерирована", () => {
    expect(parsed.linkages).toHaveLength(1);
    const l = parsed.linkages[0];
    expect(l.id).toBe("Ioc_Incident");
    expect(l.side1).toBe("Ioc");
    expect(l.side2).toBe("Incident");
    expect(l.type).toBe("n_n");
    expect(l.undirected).toBe(true);
    expect(l.nameFrom.side1).toBe("Связан с Incident");
    expect(l.nameFrom.side2).toBe("Содержит Ioc");
  });

  it("последовательность IOCSeq сгенерирована", () => {
    expect(parsed.sequences).toHaveLength(1);
    expect(parsed.sequences[0].id).toBe("IOCSeq");
    expect(parsed.sequences[0].startFrom).toBe(1);
  });

  it("меню содержит root_group + 3 пункта", () => {
    expect(parsed.menus).toHaveLength(1);
    const root = parsed.menus[0];
    expect(root.type).toBe("root_group");
    expect(root.route).toBe("/iocs");
    expect(root.items).toHaveLength(3);
    expect(root.items[0].route).toBe("/iocs/ioc");
    expect(root.items[0].view).toBe("lists_ioc");
  });

  it("12 действий сгенерированы (по 4 на сущность)", () => {
    expect(parsed.actions).toHaveLength(12);
    const ids = parsed.actions.map((a: any) => a.id);
    expect(ids).toContain("actions_createIoc");
    expect(ids).toContain("actions_editIoc");
    expect(ids).toContain("actions_openIocPanel");
    expect(ids).toContain("actions_bulkRemoveIoc");
  });

  it("6 представлений (3 entity + 3 list)", () => {
    expect(parsed.views).toHaveLength(6);
    const entityViews = parsed.views.filter((v: any) => v.type === "entity");
    const listViews = parsed.views.filter((v: any) => v.type === "list");
    expect(entityViews).toHaveLength(3);
    expect(listViews).toHaveLength(3);
  });

  it("Ioc entity-view содержит формы создания и редактирования", () => {
    const view = parsed.views.find((v: any) => v.id === "viewIoc");
    const cardIds = view.views.map((c: any) => c.id);
    expect(cardIds).toContain("panels_infoIoc");
    expect(cardIds).toContain("forms_newIoc");
    expect(cardIds).toContain("forms_editIoc");

    const groupIds = view.groups.map((g: any) => g.id);
    expect(groupIds).toContain("blocks_forms_newIoc");
    expect(groupIds).toContain("blocks_forms_editIoc");
    expect(groupIds).toContain("blocks_infoIoc");
    expect(groupIds).toContain("tabs_infoIoc");
  });

  it("readonly-атрибуты: в new-форме есть, в edit-форме нет", () => {
    // специально добавим readonly в тестовый DSL
    const dslWithReadonly = dsl.replace(
      "value: String",
      "value:\n        type: String\n        readonly: true",
    );
    const yaml2 = generateSchema(dslWithReadonly);
    const parsed2 = parseYaml(yaml2) as any;
    const view = parsed2.views.find((v: any) => v.id === "viewIoc");

    const newForm = view.groups.find(
      (g: any) => g.id === "blocks_forms_newIoc",
    );
    const editForm = view.groups.find(
      (g: any) => g.id === "blocks_forms_editIoc",
    );

    const newWidgets = newForm.components.map((c: any) => c.widget);
    const editWidgets = editForm.components.map((c: any) => c.widget);

    expect(newWidgets).toContain("editors_ioc_value");
    expect(editWidgets).not.toContain("editors_ioc_value");
  });

  it("dataRules содержит default для Incident.status", () => {
    expect(parsed.dataRules).toHaveLength(1);
    const rule = parsed.dataRules[0];
    expect(rule.id).toBe("default_Incident");
    expect(rule.entity).toBe("Incident");
    expect(rule.rule.effect).toBe("default");
    expect(rule.rule.attributes[0].attribute).toBe("status");
    expect(rule.rule.attributes[0].value).toBe("OPEN");
  });

  it("Ioc list-view содержит только пользовательские атрибуты", () => {
    const listView = parsed.views.find((v: any) => v.id === "lists_ioc");
    const cols = listView.table.columns.map((c: any) => c.attribute);
    expect(cols).toEqual(["value", "type", "sources", "iocId"]);
    // системных атрибутов нет
    expect(cols).not.toContain("createdAt");
    expect(cols).not.toContain("updatedAt");
  });
});
