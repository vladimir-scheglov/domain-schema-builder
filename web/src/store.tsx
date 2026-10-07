import {
  createContext, useContext, useReducer, useEffect, useRef,
  useState,
  type ReactNode,
} from 'react';
import { UIState, UIWorkflow, UIEntity, UIAttribute, UITree } from './types';
import { loadDraft, saveDraft, clearDraft, hasDraft } from './lib/draftStorage';
import { decodeState } from './lib/shareUrl';
import { PRESETS } from './presets';
import { loadDslFromText } from './lib/loadDsl';
import { cloneEntity } from './lib/entityUtils';
import { generateKey } from './lib/generateKey';

const EMPTY: UIState = {
  domain: 'example.test',
  version: '0.0.1',
  name: 'Example Domain',
  description: '',
  author: '',
  tags: [],
  entities: [],
  enums: [],
  workflows: [],
  links: [],
  menus: [],
  sequences: [],
  trees: [],
};

type Action =
  | { type: 'set'; patch: Partial<UIState> }
  | { type: 'addEntity'; entity: Omit<UIEntity, 'generateList' | 'generateModals' | 'generatePanel' | 'generatePage' | 'generateSorting' | 'generateSearching'> }
  | { type: 'updateEntity'; id: string; patch: Partial<UIState['entities'][number]> }
  | { type: 'removeEntity'; id: string }
  | { type: 'addAttribute'; entityId: string }
  | { type: 'updateAttribute'; entityId: string; attrId: string; patch: Partial<UIState['entities'][number]['attributes'][number]> }
  | { type: 'removeAttribute'; entityId: string; attrId: string }
  | { type: 'addEnum'; enum: UIState['enums'][number] }
  | { type: 'updateEnum'; id: string; patch: Partial<UIState['enums'][number]> }
  | { type: 'removeEnum'; id: string }
  | { type: 'addLink'; link: UIState['links'][number] }
  | { type: 'updateLink'; index: number; patch: Partial<UIState['links'][number]> }
  | { type: 'removeLink'; index: number }
  | { type: 'toggleMenu'; entityId: string }
  | { type: 'addSequence'; seq: UIState['sequences'][number] }
  | { type: 'updateSequence'; id: string; patch: Partial<UIState['sequences'][number]> }
  | { type: 'removeSequence'; id: string }
  | { type: 'reset' }
  | { type: 'load'; state: UIState }
  | { type: 'addWorkflow'; workflow: UIWorkflow }
  | { type: 'updateWorkflow'; id: string; patch: Partial<UIWorkflow> }
  | { type: 'removeWorkflow'; id: string }
  | { type: 'duplicateEntity'; id: string }
  | { type: 'addAttributesBatch'; entityId: string; attributes: UIAttribute[] }
  | { type: 'addTree'; tree: Omit<UITree, '_key'> }
  | { type: 'updateTree'; treeKey: string; patch: Partial<Omit<UITree, '_key'>> }
  | { type: 'removeTree'; treeKey: string };;

function reducer(state: UIState, action: Action): UIState {
  switch (action.type) {
    case 'set':
      return { ...state, ...action.patch };

    case 'addEntity': {
      const id = action.entity.id
        ? action.entity.id
        : uniqueId('Entity', state.entities.map(e => e.id));

      // Проверка на дубликат
      if (state.entities.some(e => e.id === id)) {
        return state;
      }

      return {
        ...state,
        entities: [
          ...state.entities,
          {
            ...action.entity,
            id,
            generateList: true,
            generateModals: true,
            generatePanel: true,
            generatePage: false,   
            generateSorting: true, 
            generateSearching: true,  
            generateLinkages: true,   
          },
        ],
      };
    }
    case 'updateEntity':
      return {
        ...state,
        entities: state.entities.map(e => e.id === action.id ? { ...e, ...action.patch } : e),
      };
    case 'removeEntity':
      return {
        ...state,
        entities: state.entities.filter(e => e.id !== action.id),
        menus: state.menus.filter(m => m !== action.id),
        links: state.links.filter(l => l.from !== action.id && l.to !== action.id),
      };

    case 'addAttribute':
      return {
        ...state,
        entities: state.entities.map(e =>
          e.id === action.entityId
            ? { ...e, attributes: [...e.attributes, { _key: crypto.randomUUID(), id: uniqueId('attr', e.attributes.map(a => a.id)), name: '', type: 'String', default: '', readonly: false }] }
            : e
        ),
      };
    case 'updateAttribute':
      return {
        ...state,
        entities: state.entities.map(e =>
          e.id === action.entityId
            ? { ...e, attributes: e.attributes.map(a => a._key === action.attrId ? { ...a, ...action.patch } : a) }
            : e
        ),
      };
    case 'removeAttribute':
      return {
        ...state,
        entities: state.entities.map(e =>
          e.id === action.entityId
            ? { ...e, attributes: e.attributes.filter(a => a._key !== action.attrId) }
            : e
        ),
      };

    case 'addEnum': {
      const id = action.enum.id
        ? action.enum.id
        : uniqueId('MyEnum', state.enums.map(e => e.id));

      if (state.enums.some(e => e.id === id)) {
        return state;
      }

      return {
        ...state,
        enums: [...state.enums, { ...action.enum, id }],
      };
    }
    case 'updateEnum':
      return {
        ...state,
        enums: state.enums.map(e => e.id === action.id ? { ...e, ...action.patch } : e),
      };
    case 'removeEnum':
      return { ...state, enums: state.enums.filter(e => e.id !== action.id) };

    case 'addLink':
      return { ...state, links: [...state.links, action.link] };
    case 'updateLink':
      return {
        ...state,
        links: state.links.map((l, i) => i === action.index ? { ...l, ...action.patch } : l),
      };
    case 'removeLink':
      return { ...state, links: state.links.filter((_, i) => i !== action.index) };

    case 'toggleMenu':
      return {
        ...state,
        menus: state.menus.includes(action.entityId)
          ? state.menus.filter(m => m !== action.entityId)
          : [...state.menus, action.entityId],
      };

    case 'addSequence': {
      if (state.sequences.some(s => s.id === action.seq.id)) {
        return state;
      }
      return {
        ...state,
        sequences: [...state.sequences, action.seq],
      };
    }
    case 'updateSequence':
      return {
        ...state,
        sequences: state.sequences.map(s => s.id === action.id ? { ...s, ...action.patch } : s),
      };
    case 'removeSequence':
      return { ...state, sequences: state.sequences.filter(s => s.id !== action.id) };

    case 'reset':
      return EMPTY;

    case 'load':
      return normalizeLoadedState(action.state);

    case 'addWorkflow': {
      const id = action.workflow.id
        ? action.workflow.id
        : uniqueId('MyWorkflow', state.workflows.map(w => w.id));

      if (state.workflows.some(w => w.id === id)) {
        return state;
      }

      return {
        ...state,
        workflows: [...state.workflows, { ...action.workflow, id }],
      };
    }
    case 'updateWorkflow':
      return {
        ...state,
        workflows: state.workflows.map(w => w.id === action.id ? { ...w, ...action.patch } : w),
      };
    case 'removeWorkflow':
      return { ...state, workflows: state.workflows.filter(w => w.id !== action.id) };

    case 'duplicateEntity': {
      const original = state.entities.find(e => e.id === action.id);
      if (!original) return state;

      const copy = cloneEntity(
        original,
        state.entities.map(e => e.id),
      );

      return {
        ...state,
        entities: [...state.entities, copy],
      };
    }

    case 'addAttributesBatch':
      return {
        ...state,
        entities: state.entities.map(e =>
          e.id === action.entityId
            ? { ...e, attributes: [...e.attributes, ...action.attributes] }
            : e,
        ),
      };

    case 'addTree': {
      const id = action.tree.id
        ? action.tree.id
        : uniqueId('MyTree', state.trees.map(t => t.id));

      if (state.trees.some(t => t.id === id)) {
        return state;
      }

      return {
        ...state,
        trees: [...state.trees, { ...action.tree, id, _key: generateKey() }],
      };
    }

    case 'updateTree':
      return {
        ...state,
        trees: state.trees.map(t =>
          t._key === action.treeKey ? { ...t, ...action.patch } : t,
        ),
      };

    case 'removeTree':
      return {
        ...state,
        trees: state.trees.filter(t => t._key !== action.treeKey),
      };
  }
}

function uniqueId(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}${i}`;
    if (!taken.includes(candidate)) return candidate;
  }
}

function generateUniqueEntityId(base: string, taken: string[]): string {
  // Первая попытка: <base>Copy
  const candidates = [
    `${base}Copy`,
    `${base}Copy2`,
    `${base}Copy3`,
    // ...
  ];

  // Или проще — ищем первое свободное
  if (!taken.includes(`${base}Copy`)) return `${base}Copy`;

  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}Copy${i}`;
    if (!taken.includes(candidate)) return candidate;
  }

  // Fallback — теоретически недостижимо
  return `${base}Copy_${Date.now()}`;
}

function normalizeLoadedState(s: UIState): UIState {
  return {
    ...s,
    trees: (s.trees ?? []).map(t => ({
      ...t,
      _key: t._key ?? generateKey(),
      id: t.id ?? '',
      type: t.type ?? 'ordinary',
      chain: t.chain ?? '',
    })),
    entities: s.entities.map(e => ({
      ...e,
      generateList: e.generateList !== false,
      generateModals: e.generateModals !== false,
      generatePanel: e.generatePanel !== false,
      generatePage: e.generatePage === true,
      generateSorting: e.generateSorting !== false, 
      generateSearching: e.generateSearching !== false,
      generateLinkages: e.generateLinkages !== false,
      attributes: (e.attributes ?? []).map(a => ({
        ...a,
        _key: a._key ?? generateKey(),
      })),
    })),
  };
}

const STORAGE_KEY = 'dsb.state.v1';

/** Определяем начальное состояние: URL → черновик → пусто */
function resolveInitialState(): UIState {
  if (typeof window === 'undefined') return EMPTY;

  const params = new URLSearchParams(window.location.search);

  // 1. ?state=<base64>
  const stateParam = params.get('state');
  if (stateParam) {
    const decoded = decodeState(stateParam);
    if (decoded) return decoded;
  }

  // 2. ?preset=<id>
  const presetId = params.get('preset');
  if (presetId) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      const result = loadDslFromText(preset.dsl);
      if (result.ok && result.state) return result.state;
    }
  }

  // 3. Черновик
  const draft = loadDraft();
  if (draft) return draft.state;

  // 4. Пустое
  return EMPTY;
}

/** Очищаем URL от ?state= и ?preset= после первой загрузки */
function cleanUrlOnce() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  let changed = false;
  if (url.searchParams.has('state')) {
    url.searchParams.delete('state');
    changed = true;
  }
  if (url.searchParams.has('preset')) {
    url.searchParams.delete('preset');
    changed = true;
  }
  if (changed) {
    window.history.replaceState({}, '', url.toString());
  }
}

interface Ctx {
  state: UIState;
  dispatch: React.Dispatch<Action>;
  lastSavedAt: string | null;
  clearDraftAndReset: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY, resolveInitialState);

  // Очищаем URL один раз при монтировании
  const urlCleanedRef = useRef(false);
  if (!urlCleanedRef.current) {
    urlCleanedRef.current = true;
    cleanUrlOnce();
  }

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Автосохранение с дебаунсом
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = saveDraft(state);
      setLastSavedAt(draft.savedAt);
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  const clearDraftAndReset = () => {
    clearDraft();
    dispatch({ type: 'reset' });
    setLastSavedAt(null);
  };

  return (
    <StoreContext.Provider value={{ state, dispatch, lastSavedAt, clearDraftAndReset }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}