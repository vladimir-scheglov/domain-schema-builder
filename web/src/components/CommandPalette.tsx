// web/src/components/CommandPalette.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { computeNextCopyId } from '../lib/entityUtils';
import { ENTITY_TEMPLATES, type EntityTemplate } from '../lib/entityTemplates';
import {generateKey} from "../lib/generateKey";

interface Props {
    onClose: () => void;
    selected: string | null;
    onSelect: (id: string) => void;
    onCreateFromTemplate: (tpl: EntityTemplate) => void;
}

interface Command {
    id: string;
    label: string;
    hint?: string;
    group: string;
    run: () => void;
}

export function CommandPalette({
    onClose,
    selected,
    onSelect,
    onCreateFromTemplate,
}: Props) {
    const { state, dispatch } = useStore();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const commands: Command[] = useMemo(() => {
        const cmds: Command[] = [];

        // === Создать по шаблону ===
        for (const tpl of ENTITY_TEMPLATES) {
            cmds.push({
                id: `template-${tpl.id}`,
                label: `Создать: ${tpl.name}`,
                hint: `${tpl.creates.length} элемент(ов)`,
                group: 'Создать по шаблону',
                run: () => onCreateFromTemplate(tpl),
            });
        }

        // === Создание ===
        cmds.push({
            id: 'new-entity',
            label: 'Новая сущность',
            group: 'Создать',
            run: () => {
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
            },
        });

        cmds.push({
            id: 'new-enum',
            label: 'Новый enum',
            group: 'Создать',
            run: () =>
                dispatch({
                    type: 'addEnum',
                    enum: { id: '', values: '' },
                }),
        });

        cmds.push({
            id: 'new-workflow',
            label: 'Новый workflow',
            group: 'Создать',
            run: () =>
                dispatch({
                    type: 'addWorkflow',
                    workflow: {
                        id: '',
                        name: '',
                        description: '',
                        initial: '',
                        statuses: '',
                        transitions: '',
                    },
                }),
        });

        cmds.push({
            id: 'new-tree',
            label: 'Новое дерево',
            group: 'Создать',
            run: () =>
                dispatch({
                    type: 'addTree',
                    tree: { id: '', type: 'ordinary', chain: '' },
                }),
        });

        // === Действия ===
        if (selected) {
            cmds.push({
                id: 'duplicate-entity',
                label: `Дублировать ${selected}`,
                group: 'Действия',
                run: () => {
                    const key = generateKey();
                    dispatch({ type: 'duplicateEntity', id: selected, key });
                    onSelect(key);
                },
            });

            cmds.push({
                id: 'add-attribute',
                label: `Добавить атрибут к ${selected}`,
                group: 'Действия',
                run: () => dispatch({ type: 'addAttribute', entityId: selected }),
            });
        }

        // === Перейти ===
        for (const e of state.entities) {
            cmds.push({
                id: `goto-entity-${e.id}`,
                label: `Перейти к ${e.name || e.id}`,
                hint: e.id,
                group: 'Перейти',
                run: () => onSelect(e._key),
            });
        }

        // === Интерфейс ===
        cmds.push({
            id: 'open-docs',
            label: 'Открыть документацию',
            group: 'Интерфейс',
            run: () => {
                window.dispatchEvent(new CustomEvent('dsb:open-docs'));
            },
        });

        return cmds;
    }, [state, selected, dispatch, onSelect, onCreateFromTemplate]);

    const filtered = useMemo(() => {
        if (!query.trim()) return commands;
        const q = query.toLowerCase();
        return commands.filter(
            c =>
                c.label.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q) ||
                (c.hint?.toLowerCase().includes(q) ?? false) ||
                c.group.toLowerCase().includes(q),
        );
    }, [commands, query]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = filtered[activeIndex];
            if (cmd) {
                cmd.run();
                onClose();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const grouped = useMemo(() => {
        const groups = new Map<string, Command[]>();
        for (const c of filtered) {
            if (!groups.has(c.group)) groups.set(c.group, []);
            groups.get(c.group)!.push(c);
        }
        return groups;
    }, [filtered]);

    let flatIndex = 0;

    return (
        <div className="palette-backdrop" onClick={onClose}>
            <div className="palette" onClick={e => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    className="palette-input"
                    placeholder="Команда или поиск…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                />

                <div className="palette-list" ref={listRef}>
                    {filtered.length === 0 ? (
                        <div className="palette-empty">Ничего не найдено</div>
                    ) : (
                        Array.from(grouped.entries()).map(([group, cmds]) => (
                            <div key={group}>
                                <div className="palette-group">{group}</div>
                                {cmds.map(cmd => {
                                    const idx = flatIndex++;
                                    return (
                                        <div
                                            key={cmd.id}
                                            className={`palette-item ${idx === activeIndex ? 'active' : ''}`}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onClick={() => {
                                                cmd.run();
                                                onClose();
                                            }}
                                        >
                                            <div className="palette-item-label">{cmd.label}</div>
                                            {cmd.hint && (
                                                <div className="palette-item-hint">{cmd.hint}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                <div className="palette-footer">
                    <span><kbd>↑↓</kbd> навигация</span>
                    <span><kbd>Enter</kbd> выбрать</span>
                    <span><kbd>Esc</kbd> закрыть</span>
                </div>
            </div>
        </div>
    );
}

function generateEntityId(taken: string[]): string {
    let counter = 1;
    for (; ;) {
        const candidate = `Entity${counter}`;
        if (!taken.includes(candidate)) return candidate;
        counter++;
    }
}