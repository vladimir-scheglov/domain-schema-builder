// web/src/components/Toolbar.tsx
import { useState } from 'react';
import { useStore } from '../store';
import { uiToDsl } from '../lib/toDsl';
import { buildShareUrl } from '../lib/shareUrl';
import { ImportDialog } from './ImportDialog';
import { PresetMenu } from './PresetMenu';
import { hasDraft } from '../lib/draftStorage';
import { CMD, isMac } from '../lib/platform';

interface Props {
    onShowHotkeys?: () => void;
    onShowDocs?: () => void;
}

export function Toolbar({ onShowHotkeys, onShowDocs }: Props) {
    const { state, dispatch, lastSavedAt, clearDraftAndReset } = useStore();
    const [busy, setBusy] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    const onGenerate = async () => {
        setBusy(true);
        try {
            const dsl = uiToDsl(state);
            const mod = await import('domain-schema-builder');
            const yaml = mod.generateSchema(dsl);
            const blob = new Blob([yaml], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.domain}.schema.yaml`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert(`Ошибка: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const onReset = () => {
        if (!hasDraft()) {
            // Если черновика нет — можно просто сбросить без подтверждения
            dispatch({ type: 'reset' });
            return;
        }
        const ok = confirm(
            'Сбросить всё? Текущий черновик будет удалён.\n\n' +
            'Это действие нельзя отменить.'
        );
        if (ok) {
            clearDraftAndReset();
        }
    };

    const onShare = async () => {
        try {
            const url = buildShareUrl(state);
            await navigator.clipboard.writeText(url);
            const length = url.length;
            const warning = length > 2000
                ? `\n\n⚠ Ссылка длинная (${length} символов). Некоторые браузеры/мессенджеры могут её обрезать.`
                : '';
            alert(`Ссылка скопирована в буфер обмена.${warning}`);
        } catch {
            const url = buildShareUrl(state);
            prompt('Скопируйте ссылку вручную:', url);
        }
    };

    // Форматируем время последнего сохранения
    const savedLabel = lastSavedAt
        ? `Сохранено ${new Date(lastSavedAt).toLocaleTimeString('ru-RU')}`
        : null;

    return (
        <>
            <header className="toolbar">
                <div className="toolbar-left">
                    <div className="toolbar-title">Domain Schema Builder</div>
                    {savedLabel && (
                        <div className="toolbar-saved" title={`Черновик сохранён ${lastSavedAt}`}>
                            💾 {savedLabel}
                        </div>
                    )}
                </div>
                <div className="toolbar-actions">
                    <PresetMenu />
                    <button onClick={() => setImportOpen(true)}>Загрузить DSL</button>
                    <button onClick={onReset}>Очистить</button>
                    <button onClick={onShare}>Поделиться</button>
                    <button
                        className="primary"
                        onClick={onGenerate}
                        disabled={busy}
                        title={isMac ? 'Сгенерировать YAML (⌘↵)' : 'Сгенерировать YAML (Ctrl+Enter)'}
                    >
                        {busy ? 'Генерация...' : 'Сгенерировать YAML'}
                    </button>
                    {onShowDocs && (
                        <button
                            className="icon-btn toolbar-help"
                            onClick={onShowDocs}
                            title="Документация (F2)"
                        >
                            📚
                        </button>
                    )}
                    {onShowHotkeys && (
                        <button
                            className="icon-btn toolbar-help"
                            onClick={onShowHotkeys}
                            title="Горячие клавиши (?)"
                        >
                            ?
                        </button>
                    )}
                </div>
            </header>
            {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
        </>
    );
}