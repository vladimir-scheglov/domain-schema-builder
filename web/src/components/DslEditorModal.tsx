// web/src/components/DslEditorModal.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { CodeMirrorEditor } from './dsl-editor/CodeMirrorEditor';
import {
    parseSchemaElements,
    diffSchemaElements,
    type ElementDiff,
} from './dsl-editor/schema-diff';
import { findDslPosition } from './dsl-editor/find-position';
import { setHighlight } from './dsl-editor/scroll-highlight';
import { useStore } from '../store';
import { uiToDsl } from '../lib/toDsl';
import { loadDslFromText } from '../lib/loadDsl';
import { SchemaViewer } from './dsl-editor/SchemaViewer';

interface Props {
    onClose: () => void;
}

type PanelMode = 'closed' | 'schema' | 'diff';

export function DslEditorModal({ onClose }: Props) {
    const { state, dispatch } = useStore();

    const [text, setText] = useState(() => uiToDsl(state));
    const [error, setError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    const [panelMode, setPanelMode] = useState<PanelMode>('closed');
    const [schema, setSchema] = useState('');
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [schemaDirty, setSchemaDirty] = useState(false);

    // Baseline для diff
    const [baselineSchema, setBaselineSchema] = useState<string | null>(null);
    const [baselineError, setBaselineError] = useState<string | null>(null);

    const editorViewRef = useRef<EditorView | null>(null);

    // === Генерация baseline при изменении state ===
    useEffect(() => {
        let cancelled = false;
        import('domain-schema-builder').then(mod => {
            if (cancelled) return;
            try {
                const yaml = mod.generateSchema(uiToDsl(state));
                setBaselineSchema(yaml);
                setBaselineError(null);
            } catch (e) {
                setBaselineSchema(null);
                setBaselineError(e instanceof Error ? e.message : String(e));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [state]);

    // === Генерация текущей схемы ===
    const generateSchema = () => {
        setSchemaError(null);
        import('domain-schema-builder').then(mod => {
            try {
                const yaml = mod.generateSchema(text);
                setSchema(yaml);
                setSchemaDirty(false);
            } catch (e) {
                setSchemaError(e instanceof Error ? e.message : String(e));
                setSchema('');
            }
        });
    };

    // === Автоперегенерация при открытой панели ===
    useEffect(() => {
        if (panelMode === 'closed') return;
        if (!schemaDirty) return;
        const t = setTimeout(() => generateSchema(), 800);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, panelMode, schemaDirty]);

    // === Semantic diff ===
    const elementDiffs = useMemo<ElementDiff[]>(() => {
        if (panelMode !== 'diff') return [];
        if (!baselineSchema || !schema) return [];

        const baselineElements = parseSchemaElements(baselineSchema);
        const currentElements = parseSchemaElements(schema);
        return diffSchemaElements(baselineElements, currentElements);
    }, [panelMode, baselineSchema, schema]);

    const diffStats = useMemo(() => {
        let added = 0, removed = 0, modified = 0;
        for (const d of elementDiffs) {
            if (d.change === 'added') added++;
            else if (d.change === 'removed') removed++;
            else modified++;
        }
        return { added, removed, modified };
    }, [elementDiffs]);

    // === Клик по элементу diff — переход в DSL ===
    const onElementClick = (d: ElementDiff) => {
        const view = editorViewRef.current;
        if (!view) return;

        const pos = findDslPosition(d, text);
        if (pos === null) {
            console.warn('Position not found for', d);
            return;
        }

        const line = view.state.doc.lineAt(pos);

        view.dispatch({
            selection: { anchor: line.from, head: line.to },
            effects: setHighlight.of(line.from),
            scrollIntoView: true,
        });

        view.focus();

        setTimeout(() => {
            view.dispatch({ effects: setHighlight.of(null) });
        }, 1500);
    };

    // === Открытие панели ===
    const openPanel = (mode: PanelMode) => {
        if (panelMode === mode) {
            setPanelMode('closed');
            return;
        }
        setPanelMode(mode);
        if (!schema) generateSchema();
    };

    // === Применить / закрыть ===
    const onApply = () => {
        const result = loadDslFromText(text);
        if (result.ok && result.state) {
            dispatch({ type: 'load', state: result.state });
            onClose();
        } else {
            setError(result.errors.map(e => e.message).join('\n'));
        }
    };

    const onCloseWithCheck = () => {
        if (dirty) {
            const ok = confirm('Есть неприменённые изменения. Закрыть?');
            if (!ok) return;
        }
        onClose();
    };

    const onDslChange = (v: string) => {
        setText(v);
        setDirty(true);
        if (panelMode !== 'closed') setSchemaDirty(true);
    };

    // === Горячие клавиши ===
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseWithCheck();
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onApply();
            }
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 's') {
                e.preventDefault();
                onApply();
            }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                openPanel('schema');
            }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                openPanel('diff');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, dirty, panelMode, schema]);

    const onFormat = () => {
        const result = loadDslFromText(text);
        if (result.ok && result.state) setText(uiToDsl(result.state));
    };

    const onCopySchema = async () => {
        if (!schema) return;
        try {
            await navigator.clipboard.writeText(schema);
        } catch {
            // fallback
        }
    };

    const onDownloadSchema = () => {
        if (!schema) return;
        const m = /^\s*domain:\s*([^\s\n]+)/m.exec(text);
        const domain = m ? m[1]! : 'schema';
        const blob = new Blob([schema], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${domain}.schema.yaml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="dsl-editor-backdrop">
            <div
                className={`dsl-editor-modal ${panelMode !== 'closed' ? 'with-schema' : ''}`}
            >
                <div className="dsl-editor-header">
                    <div className="dsl-editor-title">
                        DSL-редактор
                        {dirty && (
                            <span className="dsl-editor-dirty" title="Есть неприменённые изменения">●</span>
                        )}
                    </div>

                    <div className="dsl-editor-actions">
                        <button
                            className={panelMode === 'schema' ? 'active' : ''}
                            onClick={() => openPanel('schema')}
                            title="Показать сгенерированную схему (⌘⇧S)"
                        >
                            Схема
                        </button>
                        <button
                            className={panelMode === 'diff' ? 'active' : ''}
                            onClick={() => openPanel('diff')}
                            title="Показать изменения (⌘⇧D)"
                        >
                            Изменения
                        </button>

                        <button onClick={onFormat}>Форматировать</button>
                        <button onClick={onCloseWithCheck}>Отмена</button>
                        <button className="primary" onClick={onApply}>
                            Применить <span className="kbd">⌘↵</span>
                        </button>
                    </div>
                </div>

                {error && <div className="yaml-error">{error}</div>}

                <div className={`dsl-editor-body ${panelMode !== 'closed' ? 'split' : ''}`}>
                    <div className="dsl-editor-pane">
                        <CodeMirrorEditor
                            value={text}
                            onChange={onDslChange}
                            context={{ state }}
                            viewRef={editorViewRef}
                        />
                    </div>

                    {panelMode === 'schema' && (
                        <div className="schema-pane">
                            <div className="schema-pane-header">
                                <span className="schema-pane-title">
                                    Схема
                                    {schemaDirty && <span className="schema-dirty">●</span>}
                                </span>
                                <div className="schema-pane-actions">
                                    {schemaError ? (
                                        <span className="schema-status schema-status-error">Ошибка</span>
                                    ) : schema ? (
                                        <span className="schema-status schema-status-ok">
                                            {schema.split('\n').length} строк
                                        </span>
                                    ) : null}
                                    <button className="icon-btn" onClick={generateSchema} title="Перегенерировать">↻</button>
                                    <button className="icon-btn" onClick={onCopySchema} disabled={!schema} title="Копировать">📋</button>
                                    <button className="icon-btn" onClick={onDownloadSchema} disabled={!schema} title="Скачать">↓</button>
                                </div>
                            </div>

                            {schemaError ? (
                                <pre className="schema-pane-pre schema-pane-pre-error">
                                    {schemaError}
                                </pre>
                            ) : !schema ? (
                                <pre className="schema-pane-pre">Генерация...</pre>
                            ) : (
                                <div className="schema-viewer-wrapper">
                                    <SchemaViewer value={schema} />
                                </div>
                            )}
                        </div>
                    )}

                    {panelMode === 'diff' && (
                        <div className="schema-pane diff-pane">
                            <div className="schema-pane-header">
                                <span className="schema-pane-title">
                                    Изменения
                                    {schemaDirty && <span className="schema-dirty">●</span>}
                                </span>
                                <div className="schema-pane-actions">
                                    {!schemaError && baselineSchema && schema && (
                                        <>
                                            <span className="schema-status schema-status-add">
                                                +{diffStats.added}
                                            </span>
                                            <span className="schema-status schema-status-del">
                                                −{diffStats.removed}
                                            </span>
                                            <span className="schema-status schema-status-mod">
                                                ~{diffStats.modified}
                                            </span>
                                        </>
                                    )}
                                    {schemaError && (
                                        <span className="schema-status schema-status-error">Ошибка</span>
                                    )}
                                    <button className="icon-btn" onClick={generateSchema} title="Перегенерировать">↻</button>
                                </div>
                            </div>

                            {schemaError ? (
                                <pre className="schema-pane-pre schema-pane-pre-error">{schemaError}</pre>
                            ) : baselineError ? (
                                <pre className="schema-pane-pre schema-pane-pre-error">
                                    Не удалось получить baseline: {baselineError}
                                </pre>
                            ) : !baselineSchema || !schema ? (
                                <pre className="schema-pane-pre">Генерация...</pre>
                            ) : elementDiffs.length === 0 ? (
                                <pre className="schema-pane-pre">Нет изменений</pre>
                            ) : (
                                <div className="element-diff-list">
                                    {elementDiffs.map((d, i) => {
                                        // Разделитель при смене сущности
                                        const prev = elementDiffs[i - 1];
                                        const showGroupHeader = d.parentId && (!prev || prev.parentId !== d.parentId);

                                        return (
                                            <div key={`${d.kind}:${d.id}:${i}`}>
                                                {showGroupHeader && (
                                                    <div className="element-diff-group">{d.parentId}</div>
                                                )}
                                                <div
                                                    className={`element-diff element-diff-${d.change}`}
                                                    onClick={() => onElementClick(d)}
                                                    title="Нажмите, чтобы перейти к элементу"
                                                >
                                                    <span className="element-diff-marker">
                                                        {d.change === 'added' ? '+' : d.change === 'removed' ? '−' : '~'}
                                                    </span>
                                                    <span className="element-diff-kind">{d.kind}</span>
                                                    <span className="element-diff-id">
                                                        {d.parentId ? `${d.parentId}.` : ''}{d.id}
                                                    </span>
                                                    {d.fieldChanges && d.fieldChanges.length > 0 && (
                                                        <span className="element-diff-fields">
                                                            {d.fieldChanges.slice(0, 2).map((f, j) => (
                                                                <span key={j} className="element-diff-field">
                                                                    {f.field}
                                                                </span>
                                                            ))}
                                                            {d.fieldChanges.length > 2 && (
                                                                <span className="element-diff-field-more">
                                                                    +{d.fieldChanges.length - 2}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}