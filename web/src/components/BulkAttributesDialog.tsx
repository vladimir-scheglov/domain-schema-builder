// web/src/components/BulkAttributesDialog.tsx
import { useMemo, useState } from 'react';
import { parseAttributeLines } from '../lib/parseAttributeLines';
import type { UIAttribute } from '../types';

interface Props {
    existingIds: string[];        // чтобы предупредить о конфликтах
    onClose: () => void;
    onApply: (attrs: UIAttribute[]) => void;
}

export function BulkAttributesDialog({ existingIds, onClose, onApply }: Props) {
    const [text, setText] = useState('');
    const [showErrors, setShowErrors] = useState(false);

    const result = useMemo(() => parseAttributeLines(text), [text]);

    // Конфликты с уже существующими атрибутами
    const conflicts = useMemo(() => {
        const set = new Set(existingIds);
        return result.attributes.filter(a => set.has(a.id));
    }, [result.attributes, existingIds]);

    const hasErrors = result.errors.length > 0;
    const hasConflicts = conflicts.length > 0;
    const canApply = result.attributes.length > 0 && !hasErrors && !hasConflicts;

    const onApplyClick = () => {
        if (!canApply) {
            setShowErrors(true);
            return;
        }
        onApply(result.attributes);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal bulk-attrs-modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>Добавить атрибуты списком</h2>
                    <button className="icon-btn" onClick={onClose}>×</button>
                </div>

                <div className="bulk-hint">
                    По одному атрибуту на строку:
                    <code>id: type</code>
                    <code>id: type : Название</code>
                    <code>id: type : Название : readonly</code>
                    <span>или просто</span>
                    <code>id</code>
                </div>

                <div className="bulk-body">
                    <textarea
                        autoFocus
                        className="bulk-textarea"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={
                            'title: String\n' +
                            'description: Text\n' +
                            'status: enum(Status) : Статус\n' +
                            'priority: enum(Priority) : Приоритет\n' +
                            'tags: Array<String> : Теги\n' +
                            'externalId: String : ID во внешней системе : readonly\n' +
                            'count: Integer'
                        }
                        rows={14}
                        spellCheck={false}
                    />

                    <div className="bulk-preview">
                        <div className="bulk-preview-header">
                            Предпросмотр ({result.attributes.length})
                        </div>

                        {result.attributes.length === 0 && (
                            <div className="bulk-empty">
                                Начните вводить — предпросмотр появится здесь
                            </div>
                        )}

                        {result.attributes.length > 0 && (
                            <ul className="bulk-preview-list">
                                {result.attributes.map((a, i) => {
                                    const isConflict = existingIds.includes(a.id);
                                    return (
                                        <li
                                            key={i}
                                            className={isConflict ? 'bulk-conflict' : ''}
                                        >
                                            <span className="bulk-attr-id">{a.id}</span>
                                            <span className="bulk-attr-type">{a.type}</span>
                                            {a.name && (
                                                <span className="bulk-attr-name">«{a.name}»</span>
                                            )}
                                            {a.readonly && (
                                                <span className="bulk-attr-badge">readonly</span>
                                            )}
                                            {isConflict && (
                                                <span className="bulk-attr-badge bulk-attr-badge-error">
                                                    уже существует
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {(showErrors || hasErrors) && result.errors.length > 0 && (
                    <div className="error-list">
                        <strong>Ошибки в строках:</strong>
                        <ul>
                            {result.errors.map((e, i) => (
                                <li key={i}>
                                    <code>строка {e.line}</code> {e.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {hasConflicts && (
                    <div className="error-list">
                        <strong>Конфликты:</strong> атрибуты с такими ID уже есть:{' '}
                        {conflicts.map(c => c.id).join(', ')}
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose}>Отмена</button>
                    <button
                        className="primary"
                        onClick={onApplyClick}
                        disabled={result.attributes.length === 0}
                    >
                        Добавить {result.attributes.length}
                    </button>
                </div>
            </div>
        </div>
    );
}