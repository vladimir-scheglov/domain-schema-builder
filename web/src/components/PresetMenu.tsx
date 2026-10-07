// web/src/components/PresetMenu.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, PRESET_CATEGORIES, type Preset } from '../presets';
import { loadDslFromText } from '../lib/loadDsl';
import { useStore } from '../store';
import { uiToDsl } from '../lib/toDsl';
import {
    loadUserPresets,
    removeUserPreset,
    exportUserPresetJson,
    parseUserPresetJson,
    addUserPreset,
    type UserPreset,
} from '../lib/presetStorage';
import { SavePresetDialog } from './SavePresetDialog';

export function PresetMenu() {
    const { state, dispatch } = useStore();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveOpen, setSaveOpen] = useState(false);
    const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
    const [hoveredPreset, setHoveredPreset] = useState<{
        dsl: string;
        rect: DOMRect;
    } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const importRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) setUserPresets(loadUserPresets());
    }, [open, saveOpen]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
                setHoveredPreset(null);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                setHoveredPreset(null);
            }
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const groupedPresets = useMemo(() => {
        const groups: Record<Preset['category'], Preset[]> = {
            starter: [],
            domain: [],
            workflow: [],
            advanced: [],
        };
        for (const p of PRESETS) groups[p.category].push(p);
        return groups;
    }, []);

    const isEmptyState = () =>
        state.entities.length === 0 &&
        state.enums.length === 0 &&
        state.workflows.length === 0 &&
        state.links.length === 0;

    const applyBuiltInPreset = (preset: Preset) => {
        setError(null);
        if (!isEmptyState()) {
            const ok = confirm(
                `Загрузить пресет «${preset.name}»?\n\nТекущее содержимое редактора будет заменено.`
            );
            if (!ok) return;
        }
        const result = loadDslFromText(preset.dsl);
        if (result.ok && result.state) {
            dispatch({ type: 'load', state: result.state });
            setOpen(false);
            setHoveredPreset(null);
            if (result.errors.length > 0) {
                alert(
                    `Пресет загружен, но есть предупреждения:\n\n` +
                    result.errors.map(e => `• ${e.message}`).join('\n')
                );
            }
        } else {
            setError(
                `Ошибка загрузки пресета:\n` +
                result.errors.map(e => `• ${e.message}`).join('\n')
            );
        }
    };

    const applyUserPreset = (preset: UserPreset) => {
        setError(null);
        if (!isEmptyState()) {
            const ok = confirm(
                `Загрузить пресет «${preset.name}»?\n\nТекущее содержимое редактора будет заменено.`
            );
            if (!ok) return;
        }
        dispatch({ type: 'load', state: preset.state });
        setOpen(false);
        setHoveredPreset(null);
    };

    const onDeleteUserPreset = (e: React.MouseEvent, preset: UserPreset) => {
        e.stopPropagation();
        if (!confirm(`Удалить пресет «${preset.name}»?`)) return;
        removeUserPreset(preset.id);
        setUserPresets(loadUserPresets());
    };

    const onExportUserPreset = (e: React.MouseEvent, preset: UserPreset) => {
        e.stopPropagation();
        const json = exportUserPresetJson(preset);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${preset.name.replace(/\s+/g, '_')}.preset.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const onImportFile = async (f: File) => {
        try {
            const text = await f.text();
            const preset = parseUserPresetJson(text);
            addUserPreset({
                name: preset.name,
                description: preset.description,
                state: preset.state,
            });
            setUserPresets(loadUserPresets());
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const hoverProps = (dsl: string) => ({
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            setHoveredPreset({ dsl, rect: e.currentTarget.getBoundingClientRect() });
        },
        onMouseLeave: () => setHoveredPreset(null),
    });

    const previewLines = useMemo(() => {
        if (!hoveredPreset) return [];
        return hoveredPreset.dsl.split('\n').slice(0, 12);
    }, [hoveredPreset]);

    return (
        <div className="preset-menu" ref={menuRef}>
            <button
                className={open ? 'active' : ''}
                onClick={() => setOpen(v => !v)}
                title="Загрузить готовый пример или сохранить текущий"
            >
                Примеры ▾
            </button>

            {open && (
                <div className="preset-dropdown">
                    {(Object.keys(groupedPresets) as Array<Preset['category']>).map(cat => {
                        const items = groupedPresets[cat];
                        if (items.length === 0) return null;
                        return (
                            <div key={cat}>
                                <div className="preset-section-header">
                                    {PRESET_CATEGORIES[cat]}
                                </div>
                                {items.map(p => (
                                    <button
                                        key={p.id}
                                        className="preset-item"
                                        onClick={() => applyBuiltInPreset(p)}
                                        {...hoverProps(p.dsl)}
                                    >
                                        <div className="preset-name">{p.name}</div>
                                        <div className="preset-desc">{p.description}</div>
                                    </button>
                                ))}
                            </div>
                        );
                    })}

                    {userPresets.length > 0 && (
                        <>
                            <div className="preset-section-header">
                                Мои пресеты ({userPresets.length})
                            </div>
                            {userPresets.map(p => {
                                const dsl = uiToDsl(p.state);
                                return (
                                    <div
                                        key={p.id}
                                        className="preset-item preset-user-item"
                                        onClick={() => applyUserPreset(p)}
                                        onMouseEnter={e =>
                                            setHoveredPreset({
                                                dsl,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                            })
                                        }
                                        onMouseLeave={() => setHoveredPreset(null)}
                                    >
                                        <div className="preset-item-body">
                                            <div className="preset-name">{p.name}</div>
                                            <div className="preset-desc">{p.description || '—'}</div>
                                        </div>
                                        <div className="preset-item-actions">
                                            <button
                                                className="icon-btn"
                                                title="Экспорт JSON"
                                                onClick={e => onExportUserPreset(e, p)}
                                            >
                                                ↓
                                            </button>
                                            <button
                                                className="icon-btn"
                                                title="Удалить"
                                                onClick={e => onDeleteUserPreset(e, p)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    <div className="preset-divider" />

                    <button
                        className="preset-item"
                        onClick={() => {
                            setSaveOpen(true);
                            setOpen(false);
                        }}
                    >
                        <div className="preset-name">＋ Сохранить текущее как пресет</div>
                    </button>

                    <button
                        className="preset-item"
                        onClick={() => importRef.current?.click()}
                    >
                        <div className="preset-name">↥ Импортировать из файла</div>
                    </button>
                    <input
                        ref={importRef}
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) onImportFile(f);
                            e.target.value = '';
                        }}
                    />

                    {error && <div className="preset-error">{error}</div>}
                </div>
            )}

            {hoveredPreset && previewLines.length > 0 && (
                <div
                    className="preset-preview"
                    style={{
                        position: 'fixed',
                        top: hoveredPreset.rect.top,
                        left: hoveredPreset.rect.right + 8,
                        maxHeight: hoveredPreset.rect.height + 200,
                    }}
                >
                    <pre>
                        {previewLines.join('\n')}
                        {hoveredPreset.dsl.split('\n').length > 12 ? '\n…' : ''}
                    </pre>
                </div>
            )}

            {saveOpen && (
                <SavePresetDialog
                    onClose={() => setSaveOpen(false)}
                    onSaved={name => {
                        setUserPresets(loadUserPresets());
                        setTimeout(() => alert(`Пресет «${name}» сохранён`), 100);
                    }}
                />
            )}
        </div>
    );
}