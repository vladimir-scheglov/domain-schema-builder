import { useStore } from '../store';
import { useState } from 'react';
import { AttributeEditor } from './AttributeEditor';
import { BulkAttributesDialog } from './BulkAttributesDialog';

interface Props {
    entityId: string;
}

// web/src/components/EntityEditor.tsx
export function EntityEditor({ entityId }: Props) {
    const { state, dispatch } = useStore();
    const [bulkOpen, setBulkOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const entity = state.entities.find(e => e.id === entityId);
    if (!entity) return <div className="entity-editor-empty">Сущность не найдена</div>;

    const enumIds = state.enums.map(e => e.id);
    const workflowIds = state.workflows.map(w => w.id);

    return (
        <section className="card entity-card">
            <div
                className="entity-card-header"
                onClick={() => setCollapsed(v => !v)}
                style={{ cursor: 'pointer' }}
            >
                <div className="entity-card-title">
                    <span className="entity-card-badge">Сущность</span>
                    <span className="entity-card-id">{entity.id || '(без ID)'}</span>
                    <span className="entity-card-toggle">{collapsed ? '▸' : '▾'}</span>
                </div>
                <div className="entity-card-subtitle">{entity.name || 'без названия'}</div>
            </div>

            {!collapsed && (
                <div className="entity-card-body">
                    <div className="grid-2">
                        <label>
                            ID
                            <input
                                value={entity.id}
                                onChange={e => dispatch({ type: 'updateEntity', id: entity.id, patch: { id: e.target.value } })}
                            />
                        </label>
                        <label>
                            Название
                            <input
                                value={entity.name}
                                onChange={e => dispatch({ type: 'updateEntity', id: entity.id, patch: { name: e.target.value } })}
                            />
                        </label>
                        <label className="full">
                            Label
                            <input
                                value={entity.label}
                                placeholder='Например: "{type}: {value}"'
                                onChange={e => dispatch({ type: 'updateEntity', id: entity.id, patch: { label: e.target.value } })}
                            />
                        </label>
                        <label className="full">
                            Inherits
                            <input
                                value={entity.inherits}
                                onChange={e => dispatch({ type: 'updateEntity', id: entity.id, patch: { inherits: e.target.value } })}
                            />
                        </label>
                        <label className="full">
                            Описание
                            <input
                                value={entity.description}
                                onChange={e => dispatch({ type: 'updateEntity', id: entity.id, patch: { description: e.target.value } })}
                            />
                        </label>
                    </div>

                    <h4 className="entity-attributes-title">Атрибуты</h4>

                    <div className="attr-list">
                        {entity.attributes.map(a => (
                            <AttributeEditor
                                key={a._key}
                                attr={a}
                                enumIds={enumIds}
                                workflowIds={workflowIds}
                                entityIds={state.entities.map(e => e.id)} 
                                onChange={patch =>
                                    dispatch({
                                        type: 'updateAttribute',
                                        entityId: entity.id,
                                        attrId: a._key,
                                        patch,
                                    })
                                }
                                onRemove={() =>
                                    dispatch({
                                        type: 'removeAttribute',
                                        entityId: entity.id,
                                        attrId: a._key,
                                    })
                                }
                            />
                        ))}
                    </div>

                    <div className="attr-actions">
                        <button
                            title="Новый атрибут (A)"
                            onClick={() =>
                                dispatch({ type: 'addAttribute', entityId: entity.id })
                            }
                        >
                            + Атрибут
                        </button>
                        <button onClick={() => setBulkOpen(true)}>+ Списком</button>
                    </div>
                </div>
            )}

            {bulkOpen && (
                <BulkAttributesDialog
                    existingIds={entity.attributes.map(a => a.id)}
                    onClose={() => setBulkOpen(false)}
                    onApply={attrs =>
                        dispatch({
                            type: 'addAttributesBatch',
                            entityId: entity.id,
                            attributes: attrs,
                        })
                    }
                />
            )}

            <div className="entity-ui-flags">
                <div className="ui-flags-grid">
                    {/* Колонка 1: Генерация UI */}
                    <div className="ui-flags-column">
                        <div className="ui-flags-column-title">Генерация UI</div>

                        <label className="ui-flag">
                            <input
                                type="checkbox"
                                checked={entity.generateList !== false}
                                onChange={e => dispatch({
                                    type: 'updateEntity',
                                    id: entity.id,
                                    patch: { generateList: e.target.checked },
                                })}
                            />
                            <span className="ui-flag-label">
                                <strong>Список</strong>
                                <span className="ui-flag-hint">Табличное представление объектов</span>
                            </span>
                        </label>

                        <label className="ui-flag">
                            <input
                                type="checkbox"
                                checked={entity.generateModals !== false}
                                onChange={e => dispatch({
                                    type: 'updateEntity',
                                    id: entity.id,
                                    patch: { generateModals: e.target.checked },
                                })}
                            />
                            <span className="ui-flag-label">
                                <strong>Модальные окна</strong>
                                <span className="ui-flag-hint">Формы создания и редактирования</span>
                            </span>
                        </label>

                        <label className="ui-flag">
                            <input
                                type="checkbox"
                                checked={entity.generatePanel !== false}
                                onChange={e => dispatch({
                                    type: 'updateEntity',
                                    id: entity.id,
                                    patch: { generatePanel: e.target.checked },
                                })}
                            />
                            <span className="ui-flag-label">
                                <strong>Панель просмотра</strong>
                                <span className="ui-flag-hint">Боковая панель с деталями</span>
                            </span>
                        </label>

                        <label className="ui-flag">
                            <input
                                type="checkbox"
                                checked={entity.generatePage === true}
                                onChange={e => dispatch({
                                    type: 'updateEntity',
                                    id: entity.id,
                                    patch: { generatePage: e.target.checked },
                                })}
                            />
                            <span className="ui-flag-label">
                                <strong>Полноэкранная карточка</strong>
                                <span className="ui-flag-hint">Открывается на весь экран</span>
                            </span>
                        </label>
                    </div>

                    {/* Колонка 2: Сортировка и поиск */}
                    <div className="ui-flags-column">
                        <div className="ui-flags-column-title">Связи и поиск</div>

                        <label className="ui-flag">
                            <input
                                type="checkbox"
                                checked={entity.generateLinkages !== false}
                                onChange={e => dispatch({
                                    type: 'updateEntity',
                                    id: entity.id,
                                    patch: { generateLinkages: e.target.checked },
                                })}
                            />
                            <span className="ui-flag-label">
                                <strong>Виджеты связей</strong>
                                <span className="ui-flag-hint">
                                    Показывать связи в карточках и формах
                                </span>
                            </span>
                        </label>

                        <label className="ui-flag">
                            <input
                                type="checkbox"
                                checked={entity.generateSorting !== false}
                                onChange={e => dispatch({
                                    type: 'updateEntity',
                                    id: entity.id,
                                    patch: { generateSorting: e.target.checked },
                                })}
                            />
                            <span className="ui-flag-label">
                                <strong>Сортировка</strong>
                                <span className="ui-flag-hint">
                                    Правила сортировки по всем атрибутам
                                </span>
                            </span>
                        </label>

                        <label className="ui-flag">
                            <input
                                type="checkbox"
                                checked={entity.generateSearching !== false}
                                onChange={e => dispatch({
                                    type: 'updateEntity',
                                    id: entity.id,
                                    patch: { generateSearching: e.target.checked },
                                })}
                            />
                            <span className="ui-flag-label">
                                <strong>Поиск</strong>
                                <span className="ui-flag-hint">
                                    Поиск по текстовым атрибутам и ссылкам
                                </span>
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </section>
    );
}