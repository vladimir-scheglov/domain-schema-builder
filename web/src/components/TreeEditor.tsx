// web/src/components/TreeEditor.tsx
import { useMemo } from 'react';
import { useStore } from '../store';

export function TreeEditor() {
    const { state, dispatch } = useStore();

    // Множество ID сущностей для подсказок
    const entityNames = useMemo(
        () => state.entities.map(e => e.id),
        [state.entities],
    );

    return (
        <section className="section-card">
            <div className="card-header">
                <h2>Деревья</h2>
                <button
                    onClick={() =>
                        dispatch({
                            type: 'addTree',
                            tree: {
                                id: '',
                                type: 'ordinary',
                                chain: '',
                            },
                        })
                    }
                >
                    +
                </button>
            </div>

            {state.trees?.length === 0 && (
                <div className="section-empty">
                    Деревья не заданы. Создайте цепочку вида{' '}
                    <code>Root &gt; Child &gt; GrandChild</code>, используя уже
                    определённые связи между сущностями.
                </div>
            )}

            {state.trees?.map(t => (
                <TreeRow
                    key={t._key}
                    tree={t}
                    entityNames={entityNames}
                    onChange={patch =>
                        dispatch({ type: 'updateTree', treeKey: t._key, patch })
                    }
                    onRemove={() => dispatch({ type: 'removeTree', treeKey: t._key })}
                />
            ))}
        </section>
    );
}

// ============================================================
// Строка дерева
// ============================================================

import type { UITree } from '../types';

interface TreeRowProps {
    tree: UITree;
    entityNames: string[];
    onChange: (patch: Partial<Omit<UITree, '_key'>>) => void;
    onRemove: () => void;
}

function TreeRow({ tree, entityNames, onChange, onRemove }: TreeRowProps) {
    // Живой разбор цепочки
    const parsed = useMemo(() => parseChain(tree.chain), [tree.chain]);

    return (
        <div className="tree-row">
            <div className="tree-row-header">
                <input
                    className="tree-id"
                    placeholder="ID дерева"
                    value={tree.id}
                    onChange={e => onChange({ id: e.target.value })}
                />
                <select
                    className="tree-type"
                    value={tree.type}
                    onChange={e =>
                        onChange({ type: e.target.value as UITree['type'] })
                    }
                >
                    <option value="ordinary">ordinary</option>
                    <option value="orderable">orderable</option>
                    <option value="multiparent">multiparent</option>
                </select>
                <button
                    className="icon-btn"
                    onClick={onRemove}
                    title="Удалить дерево"
                >
                    ×
                </button>
            </div>

            <input
                className="tree-chain"
                placeholder="RiskAssessment > RiskCategory > Risk"
                value={tree.chain}
                onChange={e => onChange({ chain: e.target.value })}
                spellCheck={false}
            />

            <div className="tree-chain-preview">
                {parsed.length === 0 && tree.chain.trim().length > 0 && (
                    <span className="tree-chain-error">
                        Не удалось разобрать цепочку
                    </span>
                )}
                {parsed.length > 0 && (
                    <>
                        <span className="tree-chain-label">Цепочка:</span>
                        {parsed.map((step, i) => (
                            <span key={i} className="tree-chain-step">
                                {i > 0 && <span className="tree-chain-arrow">→</span>}
                                <span
                                    className={`tree-chain-entity ${step.entity && entityNames.includes(step.entity)
                                        ? 'ok'
                                        : 'unknown'
                                        }`}
                                >
                                    {step.entity || '?'}
                                </span>
                                {step.linkage && (
                                    <span className="tree-chain-linkage">
                                        через {step.linkage}
                                    </span>
                                )}
                            </span>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Парсер цепочки (для превью)
// ============================================================

interface ChainStep {
    entity: string;
    linkage?: string;
}

function parseChain(chain: string): ChainStep[] {
    if (!chain.trim()) return [];

    try {
        const tokens: ChainStep[] = [];

        const firstMatch = /^\s*([A-Za-z][\w./]*)\s*/.exec(chain);
        if (!firstMatch) return [];
        tokens.push({ entity: firstMatch[1]! });

        let rest = chain.slice(firstMatch[0].length);

        while (rest.length > 0) {
            const m = /^\s*>\s*(?:\(([\w_]+)\)\s*)?([A-Za-z][\w./]*)\s*/.exec(rest);
            if (!m) {
                if (rest.trim().length === 0) break;
                return [];    // не удалось разобрать — считаем всю цепочку невалидной
            }
            tokens.push({
                entity: m[2]!,
                linkage: m[1],
            });
            rest = rest.slice(m[0].length);
        }

        return tokens;
    } catch {
        return [];
    }
}