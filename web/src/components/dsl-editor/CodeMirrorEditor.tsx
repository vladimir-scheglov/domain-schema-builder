// web/src/components/dsl-editor/CodeMirrorEditor.tsx
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { EditorState, Prec } from '@codemirror/state';
import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLineGutter,
    highlightActiveLine,
    drawSelection,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
} from '@codemirror/view';
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from '@codemirror/commands';
import {
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentOnInput,
} from '@codemirror/language';
import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { lintGutter, linter } from '@codemirror/lint';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { yaml } from '@codemirror/lang-yaml';

import { dslCompletions, type DslEditorContext } from './completions';
import { dslLinter } from './diagnostics';
import { dslTheme } from './cm-theme';
import { emmetKeymap } from './emmet-keymap';
import { emmetHighlighter } from './emmet-highlighter';
import { dslTooltip } from './dsl-tooltip';
import { highlightField } from './scroll-highlight';

interface Props {
    value: string;
    onChange: (value: string) => void;
    context: DslEditorContext;
    viewRef?: MutableRefObject<EditorView | null>;
}

export function CodeMirrorEditor({
    value,
    onChange,
    context,
    viewRef: externalViewRef,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const internalViewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const contextRef = useRef(context);

    useEffect(() => {
        onChangeRef.current = onChange;
        contextRef.current = context;
    }, [onChange, context]);

    useEffect(() => {
        if (!containerRef.current) return;

        const state = EditorState.create({
            doc: value,
            extensions: [
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightActiveLine(),
                history(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                rectangularSelection(),
                crosshairCursor(),
                indentOnInput(),
                bracketMatching(),
                closeBrackets(),
                highlightSelectionMatches(),

                yaml(),
                dslTheme,

                dslTooltip(() => contextRef.current),

                autocompletion({
                    override: [(ctx) => dslCompletions(contextRef.current)(ctx)],
                    activateOnTyping: true,
                }),

                linter((view) => dslLinter(contextRef.current)(view), { delay: 400 }),
                lintGutter(),

                emmetHighlighter,
                highlightField,

                Prec.highest(keymap.of([...emmetKeymap])),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...searchKeymap,
                    ...completionKeymap,
                    indentWithTab,
                ]),

                EditorView.updateListener.of(update => {
                    if (update.docChanged) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                }),

                EditorView.theme({
                    '&': { height: '100%' },
                }),
            ],
        });

        const view = new EditorView({
            state,
            parent: containerRef.current,
        });

        internalViewRef.current = view;
        if (externalViewRef) externalViewRef.current = view;

        return () => {
            view.destroy();
            internalViewRef.current = null;
            if (externalViewRef) externalViewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Синхронизация value извне
    useEffect(() => {
        const view = internalViewRef.current;
        if (!view) return;
        const current = view.state.doc.toString();
        if (current !== value) {
            view.dispatch({
                changes: { from: 0, to: current.length, insert: value },
            });
        }
    }, [value]);

    return (
        <div
            ref={containerRef}
            style={{ height: '100%', overflow: 'hidden' }}
        />
    );
}