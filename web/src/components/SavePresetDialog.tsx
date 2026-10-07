// web/src/components/SavePresetDialog.tsx
import { useState } from 'react';
import { addUserPreset } from '../lib/presetStorage';
import { useStore } from '../store';

interface Props {
    onClose: () => void;
    onSaved: (name: string) => void;
}

export function SavePresetDialog({ onClose, onSaved }: Props) {
    const { state } = useStore();
    const [name, setName] = useState(state.name || '');
    const [description, setDescription] = useState(state.description || '');
    const [error, setError] = useState('');

    const onSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Введите имя пресета');
            return;
        }

        try {
            addUserPreset({
                name: trimmedName,
                description: description.trim(),
                state: JSON.parse(JSON.stringify(state)), // глубокая копия
            });
            onSaved(trimmedName);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
                <div className="modal-header">
                    <h2>Сохранить как пресет</h2>
                    <button className="icon-btn" onClick={onClose}>×</button>
                </div>

                <label>
                    Имя пресета
                    <input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Например: Мой домен активов"
                        onKeyDown={e => { if (e.key === 'Enter') onSave(); }}
                    />
                </label>

                <label>
                    Описание (опционально)
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Кратко опишите, для чего этот пресет"
                    />
                </label>

                {error && <div className="error-list">{error}</div>}

                <div className="modal-actions">
                    <button onClick={onClose}>Отмена</button>
                    <button className="primary" onClick={onSave}>Сохранить</button>
                </div>
            </div>
        </div>
    );
}