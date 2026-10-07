// web/src/components/dsl-editor/SchemaViewer.tsx
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
    highlightActiveLineGutter,
    drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history } from '@codemirror/commands';
import {
    bracketMatching,
    foldGutter,
    foldKeymap,
    syntaxHighlighting,
    HighlightStyle,
} from '@codemirror/language';
import {
    searchKeymap,
    highlightSelectionMatches,
} from '@codemirror/search';
import { yaml } from '@codemirror/lang-yaml';
import { tags } from '@lezer/highlight';

interface Props {
    value: string;
}

export function SchemaViewer({ value }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Создание view один раз
    useEffect(() => {
        if (!containerRef.current) return;

        const state = EditorState.create({
            doc: value,
            extensions: [
                // Базовое
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightActiveLine(),
                history(),
                foldGutter(),
                drawSelection(),
                bracketMatching(),
                highlightSelectionMatches(),

                // YAML
                yaml(),

                // Тема
                schemaTheme,

                // Read-only
                EditorState.readOnly.of(true),
                EditorView.editable.of(false),

                // Keymap — только поиск и сворачивание
                keymap.of([
                    ...foldKeymap,
                    ...searchKeymap,
                    ...defaultKeymap,
                ]),

                EditorView.theme({
                    '&': { height: '100%' },
                }),
            ],
        });

        const view = new EditorView({
            state,
            parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);   // создаём один раз

    // Обновление содержимого при изменении value
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;

        const current = view.state.doc.toString();
        if (current === value) return;

        view.dispatch({
            changes: {
                from: 0,
                to: current.length,
                insert: value,
            },
        });
    }, [value]);

    return (
        <div
            ref={containerRef}
            className="schema-viewer-container"
            style={{ height: '100%' }}
        />
    );
}

// ============================================================
// Тема для просмотра схемы (светлая, компактная)
// ============================================================

const schemaTheme = [
    EditorView.theme({
        '&': {
            height: '100%',
            fontSize: '11px',
            fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            backgroundColor: '#ffffff',
            color: '#111827',
        },
        '.cm-scroller': {
            fontFamily: 'inherit',
            lineHeight: '1.45',
            overflow: 'auto',
        },
        '.cm-content': {
            padding: '12px 0',
            fontFamily: 'inherit',
        },
        '.cm-line': {
            padding: '0 8px',
        },
        '.cm-gutters': {
            backgroundColor: '#f9fafb',
            color: '#9ca3af',
            border: 'none',
        },
        '.cm-activeLine': {
            boxShadow: 'inset 0 0 0 9999px rgba(240, 249, 255, 0.6)',
        },
        '.cm-activeLineGutter': {
            backgroundColor: '#dbeafe',
        },
        '.cm-foldGutter': {
            width: '12px',
        },
    }),

    syntaxHighlighting(
        HighlightStyle.define([
            { tag: tags.propertyName, color: '#7c3aed' },     // ключи
            { tag: tags.string, color: '#16a34a' },            // строки
            { tag: tags.number, color: '#2563eb' },            // числа
            { tag: tags.bool, color: '#2563eb' },
            { tag: tags.null, color: '#6b7280' },
            { tag: tags.comment, color: '#9ca3af', fontStyle: 'italic' },
            { tag: tags.keyword, color: '#dc2626' },
        ]),
    ),
];