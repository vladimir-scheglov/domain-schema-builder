// web/src/components/EntityTemplateDialog.tsx
import { useState } from 'react';
import type { EntityTemplate } from '../lib/entityTemplates';
import { useStore } from '../store';
import { isSystemAttribute } from '../lib/systemAttributes';
import {generateKey} from "../lib/generateKey";

interface Props {
    template: EntityTemplate;
    onClose: () => void;
    onCreated: (entityId: string, key: string) => void;
}

export function EntityTemplateDialog({ template, onClose, onCreated }: Props) {
    const { state, dispatch } = useStore();

    const defaultId = buildDefaultId(template.id, state.entities.map(e => e.id));
    const [entityId, setEntityId] = useState(defaultId);
    const [entityName, setEntityName] = useState('');
    const [error, setError] = useState('');

    const canCreate =
        /^[A-Z][A-Za-z0-9]*$/.test(entityId) &&
        !state.entities.some(e => e.id === entityId) &&
        !isSystemAttribute(entityId);

    const onCreate = () => {
        if (!canCreate) {
            if (isSystemAttribute(entityId)) {
                setError(`ID "${entityId}" зарезервирован системой`);
            } else if (!/^[A-Z][A-Za-z0-9]*$/.test(entityId)) {
                setError('ID должен быть в PascalCase (A-Za-z0-9)');
            } else {
                setError(`Сущность с ID "${entityId}" уже существует`);
            }
            return;
        }

        const result = template.build({ entityId, entityName });
        const key = generateKey();
        // Добавляем сущность (все четыре флага генерации reducer выставит сам)
        dispatch({
            type: 'addEntity',
            entity: {
                _key: key,
                id: result.entity.id,
                name: result.entity.name,
                label: result.entity.label,
                description: result.entity.description,
                inherits: result.entity.inherits,
                attributes: result.entity.attributes,
                generateList: result.entity.generateList,
                generateModals: result.entity.generateModals,
                generatePanel: result.entity.generatePanel,
                generatePage: result.entity.generatePage,
                generateSorting: result.entity.generateSorting,
                generateSearching: result.entity.generateSearching,
            } as any,
        });

        // Перезаписываем флаги, если шаблон их менял
        if (
            result.entity.generateList !== true ||
            result.entity.generateModals !== true ||
            result.entity.generatePanel !== true ||
            result.entity.generatePage !== false
        ) {
            dispatch({
                type: 'updateEntity',
                id: result.entity.id,
                patch: {
                    generateList: result.entity.generateList,
                    generateModals: result.entity.generateModals,
                    generatePanel: result.entity.generatePanel,
                    generatePage: result.entity.generatePage,
                },
            });
        }

        // Добавляем enum'ы (с проверкой дубликатов)
        for (const en of result.enums) {
            if (!state.enums.some(e => e.id === en.id)) {
                dispatch({ type: 'addEnum', enum: en });
            }
        }

        // Workflow
        for (const wf of result.workflows) {
            if (!state.workflows.some(w => w.id === wf.id)) {
                dispatch({ type: 'addWorkflow', workflow: wf });
            }
        }

        // Sequences
        for (const seq of result.sequences) {
            if (!state.sequences.some(s => s.id === seq.id)) {
                dispatch({ type: 'addSequence', seq });
            }
        }

        onCreated(entityId, key);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal entity-template-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Шаблон: {template.name}</h2>
                    <button className="icon-btn" onClick={onClose}>×</button>
                </div>

                <p className="template-description">{template.description}</p>

                <div className="template-fields">
                    <label>
                        ID сущности
                        <input
                            autoFocus
                            value={entityId}
                            onChange={e => { setEntityId(e.target.value); setError(''); }}
                            placeholder="Project"
                            onKeyDown={e => e.key === 'Enter' && onCreate()}
                        />
                        <span className="hint">PascalCase, только латиница и цифры</span>
                    </label>

                    <label>
                        Название (опционально)
                        <input
                            value={entityName}
                            onChange={e => setEntityName(e.target.value)}
                            placeholder="Проект"
                            onKeyDown={e => e.key === 'Enter' && onCreate()}
                        />
                        <span className="hint">Отображается в интерфейсе</span>
                    </label>
                </div>

                <div className="template-preview">
                    <div className="template-preview-title">Что будет создано:</div>
                    <ul>
                        {template.creates.map((c, i) => (
                            <li key={i}>{c}</li>
                        ))}
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

// ============================================================
// Утилиты
// ============================================================

function buildDefaultId(templateId: string, taken: string[]): string {
    const baseMap: Record<string, string> = {
        crud: 'Record',
        dictionary: 'Category',
        workflow: 'Task',
        'soft-delete': 'Document',
        published: 'Article',
        'tree-node': 'Node',
    };

    const base = baseMap[templateId] ?? 'Entity';
    if (!taken.includes(base)) return base;

    for (let i = 2; i < 100; i++) {
        const candidate = `${base}${i}`;
        if (!taken.includes(candidate)) return candidate;
    }
    return `${base}_${Date.now()}`;
}