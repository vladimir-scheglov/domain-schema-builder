// web/src/App.tsx
import { useCallback, useEffect, useState } from 'react';
import { useStore } from './store';
import { useHotkeys, type Hotkey } from './hooks/useHotkeys';
import { Toolbar } from './components/Toolbar';
import { DomainForm } from './components/DomainForm';
import { EntityList } from './components/EntityList';
import { EntityEditor } from './components/EntityEditor';
import { EnumEditor } from './components/EnumEditor';
import { WorkflowEditor } from './components/WorkflowEditor';
import { LinkEditor } from './components/LinkEditor';
import { TreeEditor } from './components/TreeEditor';
import { MenuEditor } from './components/MenuEditor';
import { YamlPreview } from './components/YamlPreview';
import { CommandPalette } from './components/CommandPalette';
import { HotkeysDialog } from './components/HotkeysDialog';
import { computeNextCopyId, generateEntityId } from './lib/entityUtils';
import { DocsModal } from './components/DocsModal';
import { EntityTemplateDialog } from './components/EntityTemplateDialog';
import type { EntityTemplate } from './lib/entityTemplates';
import {generateKey} from "./lib/generateKey";

export default function App() {
    const { state, dispatch } = useStore();
    const [selected, setSelected] = useState<string | null>(null);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [hotkeysOpen, setHotkeysOpen] = useState(false);
    const [dslEditorOpen, setDslEditorOpen] = useState(false);
    const [docsOpen, setDocsOpen] = useState(false);
    const [pendingTemplate, setPendingTemplate] = useState<EntityTemplate | null>(null);

    // === Слушаем события от YamlPreview о состоянии модалки DSL ===
    useEffect(() => {
        const onOpen = () => setDslEditorOpen(true);
        const onClose = () => setDslEditorOpen(false);
        window.addEventListener('dsb:dsl-editor-open', onOpen);
        window.addEventListener('dsb:dsl-editor-close', onClose);
        return () => {
            window.removeEventListener('dsb:dsl-editor-open', onOpen);
            window.removeEventListener('dsb:dsl-editor-close', onClose);
        };
    }, []);

    // === Показ справки при первом запуске (если включено) ===
    useEffect(() => {
        try {
            const seen = localStorage.getItem('dsb.hotkeys.seen');
            const showOnStart = localStorage.getItem('dsb.hotkeys.showOnStart');
            if (!seen && showOnStart === '1') {
                setHotkeysOpen(true);
                localStorage.setItem('dsb.hotkeys.seen', '1');
            }
        } catch { }
    }, []);

    useEffect(() => {
        const handler = () => setDocsOpen(true);
        window.addEventListener('dsb:open-docs', handler);
        return () => window.removeEventListener('dsb:open-docs', handler);
    }, []);

    // ============================================================
    // Обработчики действий
    // ============================================================

    const onNewEntity = useCallback(() => {
        const newId = generateEntityId(state.entities.map(e => e.id));
        const _key = generateKey();
        dispatch({
            type: 'addEntity',
            entity: {
                id: newId,
                _key,
                name: '',
                label: '',
                description: '',
                inherits: '',
                attributes: [],
            } as any,
        });
        setSelected(_key);
    }, [dispatch, state.entities]);

    const onNewAttribute = useCallback(() => {
        if (!selected) return;
        dispatch({ type: 'addAttribute', entityId: selected });
    }, [dispatch, selected]);

    const onNewEnum = useCallback(() => {
        dispatch({
            type: 'addEnum',
            enum: { id: '', values: '' },
        });
    }, [dispatch]);

    const onNewWorkflow = useCallback(() => {
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
        });
    }, [dispatch]);

    const onNewTree = useCallback(() => {
        dispatch({
            type: 'addTree',
            tree: { id: '', type: 'ordinary', chain: '' },
        });
    }, [dispatch]);

    const onDuplicateEntity = useCallback(() => {
        if (!selected) return;
        const key = generateKey();
        dispatch({ type: 'duplicateEntity', id: selected, key });
        setSelected(key);
    }, [dispatch, selected, state.entities]);

    const onOpenPalette = useCallback(() => {
        setPaletteOpen(true);
    }, []);

    const onShowHotkeys = useCallback(() => {
        setHotkeysOpen(true);
    }, []);

    const onCloseHotkeys = useCallback(() => {
        setHotkeysOpen(false);
    }, []);

    const onShowDocs = useCallback(() => setDocsOpen(true), []);
    const onCloseDocs = useCallback(() => setDocsOpen(false), []);

    // ============================================================
    // Горячие клавиши
    // ============================================================

    const hotkeys: Hotkey[] = [
        // Создание (игнорируются в input/textarea/contenteditable)
        { combo: 'n', handler: onNewEntity },
        { combo: 'a', handler: onNewAttribute },
        { combo: 'e', handler: onNewEnum },
        { combo: 'w', handler: onNewWorkflow },
        { combo: 't', handler: onNewTree },

        // Действия (работают везде)
        {
            combo: 'cmd+d',
            handler: onDuplicateEntity,
            ignoreInInput: false,
        },
        {
            combo: 'cmd+k',
            handler: onOpenPalette,
            ignoreInInput: false,
        },

        // Справка
        { combo: '?', handler: onShowHotkeys, ignoreInInput: true },
        { combo: 'shift+?', handler: onShowHotkeys, ignoreInInput: true },
        { combo: 'f1', handler: onShowHotkeys, ignoreInInput: false },
        { combo: 'f2', handler: onShowDocs, ignoreInInput: false },
    ];

    // Хоткеи отключены, если открыта палитра, справка или DSL-редактор
    useHotkeys(hotkeys, !paletteOpen && !hotkeysOpen && !docsOpen && !dslEditorOpen);

    // ============================================================
    // Рендер
    // ============================================================

    return (
        <>
            <Toolbar onShowHotkeys={onShowHotkeys} onShowDocs={onShowDocs} />

            <div className="layout">
                <aside className="sidebar">
                    <EntityList selected={selected} onSelect={setSelected} />
                </aside>

                <main className="main">
                    <DomainForm />
                    {selected && <EntityEditor entityKey={selected} />}
                    <EnumEditor />
                    <WorkflowEditor />
                    <LinkEditor />
                    <TreeEditor />
                    <MenuEditor />
                </main>

                <aside className="preview">
                    <YamlPreview />
                </aside>
            </div>

            {paletteOpen && (
                <CommandPalette
                    onClose={() => setPaletteOpen(false)}
                    selected={selected}
                    onSelect={setSelected}
                    onCreateFromTemplate={tpl => {
                        setPaletteOpen(false);
                        setPendingTemplate(tpl);
                    }}
                />
            )}

            {hotkeysOpen && <HotkeysDialog onClose={onCloseHotkeys} />}
            {docsOpen && <DocsModal onClose={onCloseDocs} />}

            {pendingTemplate && (
                <EntityTemplateDialog
                    template={pendingTemplate}
                    onClose={() => setPendingTemplate(null)}
                    onCreated={(id, key) => {
                        setSelected(key);
                        setPendingTemplate(null);
                    }}
                />
            )}
        </>
    );
}