export interface UIState {
  domain: string;
  version: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  entities: UIEntity[];
  enums: UIEnum[];
  workflows: UIWorkflow[];
  links: UILink[];
  menus: string[]; // entity ids
  sequences: UISequence[];
  trees: UITree[];
}

export interface UIEntity {
  id: string;
  name: string;
  label: string;
  description: string;
  inherits: string;
  attributes: UIAttribute[];

  generateList: boolean;
  generateModals: boolean;
  generatePanel: boolean;
  generatePage: boolean;
  generateSorting: boolean;
  generateSearching: boolean;
  generateLinkages: boolean;
}

export interface UIAttribute {
  _key: string;
  id: string;
  name: string;
  type: string; // 'String' | 'enum(X)' | 'Reference(X)' | 'Array<Reference(X)>' | ...
  default: string;
  readonly: boolean;
  sequence?: string;
  template?: string;
  defaultPrefix?: string;
  incrementTemplate?: string;
}

export interface UIEnum {
  id: string;
  values: string; // по строке на значение
}

export interface UILink {
  from: string;
  to: string;
  type: "1:1" | "1:n" | "n:n";
  undirected: boolean;
}

export interface UISequence {
  id: string;
  startFrom: number;
}

export interface UIWorkflow {
  id: string;
  name: string;
  description: string;
  initial: string;
  /** По строке на статус в формате "id: Название" или просто "id" */
  statuses: string;
  /** По строке на переход в формате "from -> to" */
  transitions: string;
}

export interface UITree {
  /** Технический ключ для React */
  _key: string;
  /** ID дерева, например "RiskTree" */
  id: string;
  /** Тип дерева */
  type: "ordinary" | "orderable" | "multiparent";
  /** Цепочка: "RiskAssessment > RiskCategory > Risk" */
  chain: string;
}