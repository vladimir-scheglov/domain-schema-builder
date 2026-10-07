// web/src/components/YamlPreview.tsx
import { useEffect, useRef, useState } from 'react';
import { useDslSync } from '../lib/useDslSync';
import { DslEditorModal } from './DslEditorModal';
import { CMD } from '../lib/platform';

type Tab = 'dsl' | 'schema';

export function YamlPreview() {
    const [tab, setTab] = useState<Tab>('dsl');

    const { dslText, error, update, beginEditing, endEditing, selectionRef } =
        useDslSync({ debounceMs: 500, minLength: 10 });

    const [schema, setSchema] = useState('');
    const [schemaError, setSchemaError] = useState('');

    // Индикация копирования
    const [copied, setCopied] = useState<'idle' | 'success' | 'error'>('idle');
    const [editorOpen, setEditorOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimeoutRef = useRef<number | null>(null);

    const [copiedDsl, setCopiedDsl] = useState<'idle' | 'success' | 'error'>('idle');
    const copyDslTimeoutRef = useRef<number | null>(null);

    const openEditor = () => {
        setEditorOpen(true);
        window.dispatchEvent(new CustomEvent('dsb:dsl-editor-open'));
    };

    const closeEditor = () => {
        setEditorOpen(false);
        window.dispatchEvent(new CustomEvent('dsb:dsl-editor-close'));
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                openEditor();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;

        // Если содержимое совпадает — ничего не делаем
        if (ta.value === dslText) return;

        // Сохраняем позицию курсора
        const start = ta.selectionStart;
        const end = ta.selectionEnd;

        // Устанавливаем новое значение напрямую (в обход React)
        ta.value = dslText;

        // Восстанавливаем позицию, если textarea в фокусе
        if (document.activeElement === ta) {
            const newLength = ta.value.length;
            const safeStart = Math.min(start, newLength);
            const safeEnd = Math.min(end, newLength);
            ta.setSelectionRange(safeStart, safeEnd);
        }
    }, [dslText]);

    const onSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const ta = e.currentTarget;
        selectionRef.current = {
            start: ta.selectionStart,
            end: ta.selectionEnd,
        };
    };

    const onGenerateSchema = async () => {
        console.log("[generate] dslText содержит menus:", dslText.includes("menus:"));
        console.log("[generate] dslText:", dslText);

        setSchemaError('');
        try {
            const mod = await import('domain-schema-builder');
            const yaml = mod.generateSchema(dslText);
            console.log("[generate] yaml содержит menus:", yaml.includes("menus:"));
            console.log("[generate] yaml:", yaml);
            setSchema(yaml);
            return yaml;
        } catch (e) {
            setSchemaError(e instanceof Error ? e.message : String(e));
            setSchema('');
            return null;
        }
    };

    // === NEW: копирование в буфер обмена ===
    const onCopySchema = async () => {
        const generated = await onGenerateSchema();
        if (!generated) return;

        try {
            await navigator.clipboard.writeText(generated);
            setCopied('success');
        } catch {
            // Fallback для браузеров без clipboard API
            const ok = fallbackCopy(generated);
            setCopied(ok ? 'success' : 'error');
        }

        // Сброс индикации через 1.5 секунды
        if (copyTimeoutRef.current !== null) {
            window.clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(() => {
            setCopied('idle');
        }, 1500);
    };

    // Очистка таймера
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current !== null) {
                window.clearTimeout(copyTimeoutRef.current);
            }
            if (copyDslTimeoutRef.current !== null) {
                window.clearTimeout(copyDslTimeoutRef.current);
            }
        };
    }, []);


    // Автогенерация схемы при переключении на вкладку
    useEffect(() => {
        if (tab === 'schema') onGenerateSchema();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const onCopyDsl = async () => {
        try {
            await navigator.clipboard.writeText(dslText);
            setCopiedDsl('success');
        } catch {
            const ok = fallbackCopy(dslText);
            setCopiedDsl(ok ? 'success' : 'error');
        }

        if (copyDslTimeoutRef.current !== null) {
            window.clearTimeout(copyDslTimeoutRef.current);
        }
        copyDslTimeoutRef.current = window.setTimeout(() => {
            setCopiedDsl('idle');
        }, 1500);
    };

    const onDownloadDsl = () => {
        const m = /^\s*domain:\s*([^\s\n]+)/m.exec(dslText);
        const domain = m ? m[1]! : 'domain';

        const blob = new Blob([dslText], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${domain}.dsl.yaml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="yaml-preview">
            <div className="yaml-tabs">
                <button
                    className={tab === 'dsl' ? 'active' : ''}
                    onClick={() => setTab('dsl')}
                >
                    DSL
                </button>
                <button
                    className={tab === 'schema' ? 'active' : ''}
                    onClick={() => setTab('schema')}
                >
                    Схема
                </button>

                <div className="yaml-tabs-spacer" />

                {tab === 'dsl' && (
                    <>
                        <button
                            className={`icon-btn dsl-action-btn copy-btn ${copiedDsl}`}
                            onClick={onCopyDsl}
                            title={`Копировать DSL (${CMD}C)`}
                        >
                            {copiedDsl === 'success' ? '✓' : copiedDsl === 'error' ? '×' : '📋'}
                        </button>
                        <button
                            className="icon-btn dsl-action-btn"
                            onClick={onDownloadDsl}
                            title={`Скачать .dsl.yaml (${CMD}S)`}
                        >
                            ↓
                        </button>
                        <button
                            className="dsl-editor-open-btn"
                            onClick={openEditor}
                            title={`Открыть в расширенном редакторе (${CMD}E)`}
                        >
                            ⛶ Редактор
                        </button>
                    </>
                )}

                {tab === 'schema' && (
                    <>
                        <button className="icon-btn" onClick={onGenerateSchema} title="Обновить">
                            ↻
                        </button>
                        <button
                            className={`icon-btn copy-btn ${copied}`}
                            onClick={onCopySchema}
                            title="Копировать схему"
                        >
                            {copied === 'success' ? '✓' : copied === 'error' ? '×' : '📋'}
                        </button>
                    </>
                )}
            </div>

            {tab === 'dsl' && (
                <div className="yaml-dsl-container">
                    <textarea
                        ref={textareaRef}
                        className="yaml-textarea"
                        defaultValue={dslText}
                        onChange={e => update(e.target.value)}
                        onFocus={beginEditing}
                        onBlur={endEditing}
                        onSelect={onSelect}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        autoComplete="off"
                    />
                    {error && (
                        <div className="yaml-error-overlay">
                            {error}
                        </div>
                    )}
                </div>
            )}

            {tab === 'schema' && (
                <>
                    {schemaError && <div className="yaml-error">{schemaError}</div>}
                    <pre className="yaml-pre">{schema}</pre>
                </>
            )}

            {editorOpen && <DslEditorModal onClose={() => closeEditor()} />}
        </div>
    );
}

// === Fallback для старых браузеров ===
function fallbackCopy(text: string): boolean {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}