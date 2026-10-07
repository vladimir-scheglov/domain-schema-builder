// web/src/components/ImportDialog.tsx
import { useState, useRef } from 'react';
import { loadDslFromText } from '../lib/loadDsl';
import { useStore } from '../store';

interface Props {
    onClose: () => void;
}

type Tab = 'file' | 'text';

export function ImportDialog({ onClose }: Props) {
    const { dispatch } = useStore();
    const [tab, setTab] = useState<Tab>('file');
    const [text, setText] = useState('');
    const [errors, setErrors] = useState<Array<{ code: string; message: string }>>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const tryLoad = (dsl: string) => {
        const result = loadDslFromText(dsl);
        if (result.ok && result.state) {
            dispatch({ type: 'load', state: result.state });
            if (result.errors.length) {
                alert(`DSL загружен, но есть предупреждения:\n\n${result.errors.map(e => `• ${e.message}`).join('\n')}`);
            }
            onClose();
            return;
        }
        setErrors(result.errors);
    };

    const onFile = async (f: File) => {
        const text = await f.text();
        setText(text);
        tryLoad(text);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Загрузить DSL</h2>
                    <button className="icon-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-tabs">
                    <button className={tab === 'file' ? 'active' : ''} onClick={() => setTab('file')}>
                        Из файла
                    </button>
                    <button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>
                        Вставить текст
                    </button>
                </div>

                {tab === 'file' && (
                    <div
                        className="drop-zone"
                        onDragOver={e => e.preventDefault()}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".yaml,.yml,.dsl"
                            style={{ display: 'none' }}
                            onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) onFile(f);
                            }}
                        />
                        <p>Перетащите файл сюда</p>
                        <p className="hint">или нажмите, чтобы выбрать</p>
                    </div>
                )}

                {tab === 'text' && (
                    <>
                        <textarea
                            className="dsl-textarea"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Вставьте содержимое .dsl.yaml"
                            rows={16}
                        />
                        <div className="modal-actions">
                            <button onClick={onClose}>Отмена</button>
                            <button className="primary" onClick={() => tryLoad(text)} disabled={!text.trim()}>
                                Загрузить
                            </button>
                        </div>
                    </>
                )}

                {errors.length > 0 && (
                    <div className="error-list">
                        <strong>Ошибки загрузки:</strong>
                        <ul>
                            {errors.map((e, i) => (
                                <li key={i}>
                                    <code>[{e.code}]</code> {e.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}