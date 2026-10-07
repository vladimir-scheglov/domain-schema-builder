// src/ir/types.ts

export type LinkType = '1_1' | '1_n' | 'n_n';

// ============================================================
// IR
// ============================================================

export interface IR {
  domain: string;
  version: string;
  name?: string;
  description?: string;
  author?: string;
  tags?: string[];
  status?: string;
  date?: string;

  entities: IREntity[];
  dataTypes: IRDataType[];
  sequences: IRSequence[];
  linkages: IRLinkage[];
  trees: IRTree[];
  actions: IRAction[];
  views: Array<IRViewEntity | IRViewList | IRViewTree>;
  menus: IRMenu[];
  dataRules: IRDataRule[];
  medias: IRMedia[];
}

// ============================================================
// Entities
// ============================================================

export interface IREntity {
  id: string;
  name?: string;
  label?: string;
  description?: string;
  inherits?: string;
  attributes: IRAttribute[];

  generateList?: boolean;
  generateModals?: boolean;
  generatePanel?: boolean;
  generatePage?: boolean;
  generateSorting?: boolean;
  generateSearching?: boolean;
  generateLinkages?: boolean;

  sorting?: IRSortingRule[];
  searching?: IRSearching[];
}

// ============================================================
// Sorting
// ============================================================

export interface IRSortingRule {
  id: string;
  name?: string;
  by: IRSortingBy[];
}

export interface IRSortingBy {
  attribute: string;
  direction: 'asc' | 'desc';
}

export interface IRTreeSortingRule {
  id: string;
  name?: string;
  by: IRTreeSortingBy[];
}

export interface IRTreeSortingBy {
  entity: string;
  by: IRSortingBy[];
}

// ============================================================
// Searching
// ============================================================

export interface IRSearching {
  id: string;
  name?: string;
  attribute: string;
}

// ============================================================
// Attributes
// ============================================================

export interface IRAttribute {
  id: string;
  name?: string;
  description?: string;
  dataType: string;
  entity?: string;
  item?: IRArrayItem;
  sequence?: string;
  template?: string;
  defaultPrefix?: string;
  incrementTemplate?: string;
  prefixRules?: IRPrefixRule[];
  constraints?: IRConstraint[];
  readonly?: boolean;
  default?: unknown;
}

export interface IRArrayItem {
  dataType: string;
  entity?: string;
  constraints?: IRConstraint[];
}

export interface IRConstraint {
  kind: string;
  message?: string;
  min?: number;
  max?: number;
  regexp?: string;
  mimeTypes?: string[];
}

export interface IRPrefixRule {
  id: string;
  attribute: string;
  source: { entity: string; key: string; value: string };
}

// ============================================================
// DataTypes
// ============================================================

export interface IRDataType {
  id: string;
  name?: string;
  description?: string;
  kind: 'Enum' | 'Workflow' | 'Table';
  values?: IREnumValue[];
  statuses?: IRWorkflowStatus[];
  initial?: string;
  transitions?: IRWorkflowTransition[];
}

export interface IREnumValue {
  id: string;
  name?: string;
  value?: string | number;
}

export interface IRWorkflowStatus {
  id: string;
  name?: string;
  description?: string;
}

export interface IRWorkflowTransition {
  from: string;
  to: string;
}

// ============================================================
// Sequences
// ============================================================

export interface IRSequence {
  id: string;
  startFrom?: number;
  description?: string;
}

// ============================================================
// Linkages
// ============================================================

export interface IRLinkage {
  id: string;
  name?: string;
  description?: string;
  side1: string;
  side2: string;
  type: LinkType;
  undirected?: boolean;
  nameFrom: { side1: string; side2: string };
  attributes?: IRAttribute[];
}

// ============================================================
// Trees
// ============================================================

export interface IRTree {
  id: string;
  type?: 'ordinary' | 'orderable' | 'multiparent';
  maxDepth?: number;
  hierarchy: IRTreeNode;
  sorting?: IRTreeSortingRule[];
}

export interface IRTreeNode {
  entity: string;
  maxInstances?: number;
  maxChildren?: number;
  children?: IRTreeChild[];
}

export interface IRTreeChild {
  linkage: string;
  entity: string;
  maxInstances?: number;
  maxChildren?: number;
  side?: 1 | 2;
  children?: IRTreeChild[];
}

// ============================================================
// Actions
// ============================================================

export type IRActionType =
  | 'open_panel' | 'open_modal' | 'open_page' | 'open_list'
  | 'open_tree' | 'open_view' | 'open_graph_view' | 'open_board_view'
  | 'remove' | 'bulk' | 'set_attribute_value'
  | 'automation' | 'playbook'
  | 'generate_qr_code' | 'copy_entity_link';

export interface IRAction {
  id: string;
  name: string;
  type: IRActionType;
  entity: string;
  description?: string;

  modal?: string;
  operation?: 'create' | 'edit' | 'view' | 'remove' | 'edit_attribute';
  panel?: string;
  pageView?: string;
  view?: string;
  tree?: string;
}

// ============================================================
// Views
// ============================================================

export interface IRViewEntity {
  id: string;
  type: 'entity';
  entity: string;
  label?: string;
  description?: string;
  widgets: IRWidget[];
  groups: IRGroup[];
  views: IRCard[];
}

export interface IRViewList {
  id: string;
  type: 'list';
  entity: string;
  label?: string;
  description?: string;
  actionPanel: IRWidgetRef[];
  table: IRTable;
}

export interface IRViewTree {
  id: string;
  type: 'tree';
  tree: string;
  label?: string;
  description?: string;
  nodeChunkSize: number;
  variant: 'splitted' | 'merged';
  ordering?: boolean;

  actionPanel?: IRWidgetRef[];
  menuOptions?: Array<{ action: string }>;

  list?: string;
  showLeaf?: boolean;
  rootText?: string;
  catalogTitle?: string;
  table?: IRTable;
}

// ============================================================
// Widgets
// ============================================================

export interface IRWidgetRef {
  widget: string;
}

export type IRWidget =
  | IRWidgetAttribute
  | IRWidgetAction
  | IRWidgetLinkage
  | IRWidgetLinkageList;

export interface IRWidgetAttribute {
  id: string;
  type: 'attribute';
  attribute: string;
  description?: string;
}

export interface IRWidgetAction {
  id: string;
  type: 'action';
  action?: string;                  // один action
  actions?: string[];               // массив actions (взаимоисключающее с action)
  description?: string;
  control?: { type: 'regular_button'; label?: string };
}

export interface IRWidgetLinkage {
  id: string;
  type: 'linkage';
  side: 1 | 2;
  label?: string;
  description?: string;
  linkage: string;
}

export interface IRWidgetLinkageList {
  id: string;
  type: 'linkage_list';
  side: 1 | 2;
  label?: string;
  description?: string;
  rules: {
    includes?: Array<{ id: string; only?: string[]; except?: string[] }>;
    excludes?: Array<{ id: string; only?: string[]; except?: string[] }>;
  };
}

// ============================================================
// Groups
// ============================================================

export type IRGroup = IRGroupBlock | IRGroupForm | IRGroupTab;

export interface IRGroupBlock {
  id: string;
  type: 'block';
  description?: string;
  layout: { direction: 'column'; expandable?: boolean };
  components: IRWidgetRef[];
}

export interface IRGroupForm {
  id: string;
  type: 'form';
  description?: string;
  layout: { direction: 'column' };
  components: IRWidgetRef[];
}

export interface IRGroupTab {
  id: string;
  type: 'tab';
  label?: string;
  description?: string;
  components: Array<{ block: string }>;
}

// ============================================================
// Cards
// ============================================================

export type IRCard = IRCardPanel | IRCardModal | IRCardPage;

export interface IRCardPanel {
  id: string;
  type: 'panel';
  description?: string;
  label?: string;
  menu?: Array<{ action: string }>;
  tabs: Array<{ tab: string }>;
}

export interface IRCardModal {
  id: string;
  type: 'modal';
  description?: string;
  form: string;
  label?: string;
}

export interface IRCardPage {
  id: string;
  type: 'page';
  label?: string;
  menuItem: string;
  actionPanel?: IRWidgetRef[]; 
  tabs?: Array<{ tab: string }>;
  block?: string;
}

// ============================================================
// Table
// ============================================================

export interface IRTable {
  columns: IRTableColumn[];
  filter?: IRTableFilter | IRTreeFilterEntry[];
  sortingBy?: IRTableSortingBy;
  paging?: IRTablePaging;
  refresh?: IRTableRefresh;
  actions: IRTableAction[];
  selection?: boolean;
  empty?: IRTableEmpty;
}

export interface IRTableSortingBy {
  columns?: Array<{ column: string; sorting: string }>;
  defaults?: { column: string; direction: 'asc' | 'desc' };
}

export interface IRTableFilter {
  attributes?: { type: 'all' | 'specific'; use?: Array<{ attribute: string }> };
  linkages?: { type: 'all' | 'specific'; use?: any[] };
}

export interface IRTreeFilterEntry {
  entity: string;
  attributes?: { type: 'all' | 'specific'; use?: Array<{ attribute: string }> };
  linkages?: { type: 'all' | 'specific'; use?: Array<{ linkage: string }> };
}

export interface IRTablePaging {
  sizes: number[];
  defaultSize: number;
}

export interface IRTableRefresh {
  mode: 'manual' | 'auto' | 'all';
  defaults?: {
    enabled: boolean;
    unit: 'second' | 'minute' | 'hour';
    interval: number;
  };
}

export interface IRTableEmpty {
  message: string;
}

export interface IRTableAction {
  type: 'row_click' | 'row_double_click' | 'row_context_menu';
  action?: string;
  menu?: IRTableActionItem[];
}

export interface IRTableActionItem {
  action: string;
  label?: string;
  icon?: string;
}

export interface IRTableColumn {
  id: string;
  attribute: string;
  label: string;
  expanded?: boolean;              // ← NEW
  layout?: { width?: { default: number; min: number; max: number } };
}

// ============================================================
// Menus
// ============================================================

export interface IRMenu {
  id: string;
  route: string;
  label: string;
  type: 'root_group' | 'menu';
  description?: string;
  placement: 'top' | 'settings';
  view?: string;
  items?: IRMenuItem[];
}

export interface IRMenuItem {
  id: string;
  route: string;
  label: string;
  type: 'menu';
  view: string;
  description?: string;
}

// ============================================================
// DataRules
// ============================================================

export interface IRDataRule {
  id: string;
  name: string;
  entity: string;
  description?: string;
  condition: boolean | string;
  effect: 'hidden' | 'readonly' | 'required' | 'default' | 'allowed';
  attributes: IRDataRuleAttribute[];
}

export interface IRDataRuleAttribute {
  attribute: string;
  value?: unknown;
  message?: string;
}

// ============================================================
// Medias
// ============================================================

export interface IRMedia {
  id: string;
  description?: string;
  type: 'icon_name';
  iconName: string;
}

// ============================================================
// Validation
// ============================================================

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}