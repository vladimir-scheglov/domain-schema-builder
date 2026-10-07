// src/generators/views/list.ts
import { IREntity, IRViewList, IRTableSortingBy } from "../../ir/types";

export function buildListView(e: IREntity): IRViewList {
  const withPage = e.generatePage === true;

  return {
    id: `lists_${e.id.toLowerCase()}`,
    type: "list",
    entity: e.id,
    label: e.name ?? e.id,

    actionPanel: [
      { widget: `buttons_create${e.id}` },
      { widget: `buttons_bulkRemove${e.id}` },
    ],

    table: {
      columns: e.attributes.map((a) => ({
        id: a.id,
        attribute: a.id,
        label: a.name ?? a.id,
        layout: { width: { default: 120, min: 50, max: 300 } },
      })),

      filter: { attributes: { type: "all" } },

      ...(e.sorting && e.sorting.length > 0
        ? { sortingBy: buildListSortingBy(e) }
        : {}),

      paging: {
        sizes: [10, 50, 100],
        defaultSize: 50,
      },

      refresh: {
        mode: "all",
        defaults: { enabled: true, unit: "second", interval: 30 },
      },

      actions: [
        { type: "row_click", action: `actions_open${e.id}Panel` },
        {
          type: "row_context_menu",
          menu: [
            {
              action: `actions_edit${e.id}`,
              label: "Изменить",
              icon: "iconsEdit",
            },
            {
              action: `actions_remove${e.id}`,
              label: "Удалить",
              icon: "iconsDelete",
            },
            ...(withPage
              ? [
                  {
                    action: `actions_open${e.id}Page`,
                    label: "Полный экран",
                    icon: "iconsView",
                  },
                ]
              : []),
          ],
        },
      ],

      selection: true,
      empty: { message: "Данные отсутствуют" },
    },
  };
}

function buildListSortingBy(e: IREntity): IRTableSortingBy {
  const columns: IRTableSortingBy["columns"] = [];
  for (const rule of e.sorting ?? []) {
    const firstAttr = rule.by[0]?.attribute;
    if (!firstAttr) continue;
    columns.push({ column: firstAttr, sorting: rule.id });
  }

  const firstRule = e.sorting?.[0];
  const defaultAttr = firstRule?.by[0]?.attribute;
  const defaultDirection = firstRule?.by[0]?.direction ?? "asc";

  const result: IRTableSortingBy = {};
  if (columns.length > 0) result.columns = columns;
  if (defaultAttr)
    result.defaults = { column: defaultAttr, direction: defaultDirection };
  return result;
}
