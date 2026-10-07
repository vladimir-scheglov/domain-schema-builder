// web/src/components/EntityList.tsx
import { useStore } from '../store';
import { computeNextCopyId, generateEntityId } from '../lib/entityUtils';
import { useState } from 'react';
import { InheritEntityDialog } from './InheritEntityDialog';

interface Props {
    selected: string | null;
    onSelect: (id: string) => void;
}

export function EntityList({ selected, onSelect }: Props) {
    const { state, dispatch } = useStore();
    const [inheritParent, setInheritParent] = useState<string | null>(null);

    const onDuplicate = (
        e: React.MouseEvent,
        entityId: string,
    ) => {
        e.stopPropagation();
        const newId = computeNextCopyId(entityId, state.entities.map(x => x.id));
        dispatch({ type: 'duplicateEntity', id: entityId });
        onSelect(newId);
    };

    const onInherit = (e: React.MouseEvent, parentId: string) => {
        e.stopPropagation();
        setInheritParent(parentId);
    };

    return (
        <>
            <div className="entity-list">
                <div className="entity-list-header">
                    <span>Сущности ({state.entities.length})</span>
                    <button
                        title={`Новая сущность (N)`}
                        onClick={() => {
                            const newId = generateEntityId(state.entities.map(e => e.id));
                            dispatch({
                                type: 'addEntity',
                                entity: {
                                    id: newId,
                                    name: '',
                                    label: '',
                                    description: '',
                                    inherits: '',
                                    attributes: [],
                                } as any,
                            });
                            onSelect(newId);
                        }}
                    >
                        +
                    </button>
                </div>
                <ul>
                    {state.entities.map(e => (
                        <li
                            key={e.id}
                            className={selected === e.id ? 'active' : ''}
                            onClick={() => onSelect(e.id)}
                        >
                            <div className="entity-name">{e.name || e.id}</div>
                            <div className="entity-id">{e.id}</div>
                            <div className="entity-actions">
                                <button
                                    className="icon-btn"
                                    title="Наследовать от этой сущности"
                                    onClick={ev => onInherit(ev, e.id)}
                                >
                                    ⤴
                                </button>
                                <button
                                    className="icon-btn"
                                    title="Дублировать"
                                    onClick={ev => onDuplicate(ev, e.id)}
                                >
                                    ⧉
                                </button>
                                <button
                                    className="icon-btn"
                                    title="Удалить"
                                    onClick={ev => {
                                        ev.stopPropagation();
                                        if (confirm(`Удалить сущность ${e.id}?`)) {
                                            dispatch({ type: 'removeEntity', id: e.id });
                                            if (selected === e.id) onSelect('');
                                        }
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            {inheritParent && (
                <InheritEntityDialog
                    parentId={inheritParent}
                    onClose={() => setInheritParent(null)}
                    onCreated={id => {
                        onSelect(id);
                        setInheritParent(null);
                    }}
                />
            )}
        </>
    );
}