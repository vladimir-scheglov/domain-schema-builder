import { useState } from 'react';
import { useStore } from '../store';
import { generateKey } from '../lib/generateKey';

interface Props {
    parentId: string;
    onClose: () => void;
    onCreated: (id: string, key: string) => void;
}

export function InheritEntityDialog({ parentId, onClose, onCreated }: Props) {
    const { state, dispatch } = useStore();

    const parent = state.entities.find(e => e.id === parentId);
    if (!parent) return null;

    const [entityId, setEntityId] = useState('');
    const [entityName, setEntityName] = useState('');
    const [error, setError] = useState('');

    const canCreate =
        entityId.length > 0 &&
        /^[A-Z][A-Za-z0-9]*$/.test(entityId) &&
        !state.entities.some(e => e.id === entityId);

    const onCreate = () => {
        if (!canCreate) {
            if (!/^[A-Z][A-Za-z0-9]*$/.test(entityId)) {
                setError('ID должен быть в PascalCase (A-Za-z0-9)');
            } else {
                setError(`Сущность с ID "${entityId}" уже существует`);
            }
            return;
        }

        const key = generateKey();
        dispatch({
            type: 'addEntity',
            entity: {
                _key: key,
                id: entityId,
                name: entityName || entityId,
                label: '',                    // унаследуется, если пусто
                description: '',
                inherits: parentId,           // ← главное
                attributes: [],               // свои пустые, родительские наследуются
            } as any,
        });

        onCreated(entityId, key);
    };

    // Считаем количество наследуемых атрибутов
    const inheritedAttrs = parent.attributes.length;

    const trimmed = entityId.trim();
    const isValidId = /^[A-Z][A-Za-z0-9]*$/.test(trimmed);
    const isDuplicate = state.entities.some(e => e.id === trimmed);

    const idError = trimmed.length > 0 && !isValidId
        ? 'ID должен начинаться с заглавной латинской буквы и содержать только латиницу и цифры'
        : trimmed.length > 0 && isDuplicate
            ? `Сущность с ID "${trimmed}" уже существует`
            : null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal inherit-entity-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Наследовать от {parent.name || parent.id}</h2>
                    <button className="icon-btn" onClick={onClose}>×</button>
                </div>

                <div className="template-fields">
                    <label>
                        ID потомка
                        <input
                            autoFocus
                            value={entityId}
                            onChange={e => { setEntityId(e.target.value); setError(''); }}
                            placeholder="Server"
                            onKeyDown={e => e.key === 'Enter' && onCreate()}
                        />
                        {idError ? (
                            <span className="hint hint-error">{idError}</span>
                        ) : (
                            <span className="hint">PascalCase, только латиница и цифры</span>
                        )}
                    </label>

                    <label>
                        Название
                        <input
                            value={entityName}
                            onChange={e => setEntityName(e.target.value)}
                            placeholder="Сервер"
                            onKeyDown={e => e.key === 'Enter' && onCreate()}
                        />
                        <span className="hint">Отображается в интерфейсе</span>
                    </label>
                </div>

                <div className="template-preview">
                    <div className="template-preview-title">
                        Что унаследуется от {parent.name || parent.id}:
                    </div>
                    <ul>
                        {inheritedAttrs > 0 && (
                            <li>{inheritedAttrs} атрибут{inheritedAttrs === 1 ? '' : 'ов'}</li>
                        )}
                        <li>Правила данных</li>
                        <li>Действия</li>
                        <li>Интерфейсы (панели, формы, виджеты)</li>
                        {parent.label && <li>Label: <code>{parent.label}</code></li>}
                    </ul>
                </div>

                {error && <div className="error-list">{error}</div>}

                <div className="modal-actions">
                    <button onClick={onClose}>Отмена</button>
                    <button className="primary" onClick={onCreate} disabled={!canCreate}>
                        Создать
                    </button>
                </div>
            </div>
        </div>
    );
}