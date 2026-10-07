import { useStore } from '../store';
import { computeNextCopyId, generateEntityId } from '../lib/entityUtils';
import { useState } from 'react';
import { InheritEntityDialog } from './InheritEntityDialog';
import {generateKey} from "../lib/generateKey";

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
        const key = generateKey();
        dispatch({ type: 'duplicateEntity', id: entityId, key });
        onSelect(key);
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
                            const key = generateKey();
                            dispatch({
                                type: 'addEntity',
                                entity: {
                                    _key: key,
                                    id: newId,
                                    name: '',
                                    label: '',
                                    description: '',
                                    inherits: '',
                                    attributes: [],
                                } as any,
                            });
                            onSelect(key);
                        }}
                    >
                        +
                    </button>
                </div>
                <ul>
                    {state.entities.map(e => (
                        <li
                            key={e._key}
                            className={selected === e._key ? 'active' : ''}
                            onClick={() => onSelect(e._key)}
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
                                            if (selected === e._key) onSelect('');
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
                    onCreated={(id, key) => {
                        onSelect(key);
                        setInheritParent(null);
                    }}
                />
            )}
        </>
    );
}