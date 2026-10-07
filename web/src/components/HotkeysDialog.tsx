// web/src/components/HotkeysDialog.tsx
interface Props {
    onClose: () => void;
}

interface HotkeyRow {
    keys: string[];
    label: string;
}

interface HotkeyGroup {
    title: string;
    rows: HotkeyRow[];
}

const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const CMD = isMac ? '⌘' : 'Ctrl';
const ENTER = isMac ? '↵' : 'Enter';
const SHIFT = isMac ? '⇧' : 'Shift';

const GROUPS: HotkeyGroup[] = [
    {
        title: 'Создание',
        rows: [
            { keys: ['N'], label: 'Новая сущность' },
            { keys: ['A'], label: 'Новый атрибут (у выбранной сущности)' },
            { keys: ['E'], label: 'Новый enum' },
            { keys: ['W'], label: 'Новый workflow' },
            { keys: ['T'], label: 'Новое дерево' },
        ],
    },
    {
        title: 'Действия',
        rows: [
            { keys: [CMD, 'D'], label: 'Дублировать выбранную сущность' },
            { keys: [CMD, 'K'], label: 'Палитра команд' },
            { keys: [CMD, 'S'], label: 'Скачать DSL' },
            { keys: [CMD, ENTER], label: 'Сгенерировать YAML' },
            { keys: [CMD, SHIFT, 'S'], label: 'Открыть схему в редакторе' },
        ],
    },
    {
        title: 'DSL-редактор',
        rows: [
            { keys: ['Tab'], label: 'Развернуть Emmet-аббревиатуру (ent:, enum:, wf:, …)' },
            { keys: [CMD, ENTER], label: 'Применить изменения' },
            { keys: [CMD, 'S'], label: 'Применить и закрыть' },
            { keys: [CMD, SHIFT, 'D'], label: 'Показать изменения (diff)' },
            { keys: ['Esc'], label: 'Закрыть модалку' },
        ],
    },
    {
        title: 'Интерфейс',
        rows: [
            { keys: ['?'], label: 'Эта справка' },
            { keys: [CMD, 'F'], label: 'Поиск в DSL-редакторе' },
        ],
    },
];

export function HotkeysDialog({ onClose }: Props) {
    return (
        <div className="hotkeys-backdrop" onClick={onClose}>
            <div className="hotkeys-modal" onClick={e => e.stopPropagation()}>
                <div className="hotkeys-header">
                    <h2>Горячие клавиши</h2>
                    <button
                        className="icon-btn"
                        onClick={onClose}
                        title="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <div className="hotkeys-body">
                    {GROUPS.map(group => (
                        <div key={group.title} className="hotkeys-group">
                            <div className="hotkeys-group-title">{group.title}</div>
                            <div className="hotkeys-list">
                                {group.rows.map((row, i) => (
                                    <div key={i} className="hotkeys-row">
                                        <div className="hotkeys-keys">
                                            {row.keys.map((k, j) => (
                                                <kbd key={j} className="hotkeys-key">
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                        <div className="hotkeys-label">{row.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hotkeys-footer">
                    <label className="hotkeys-checkbox">
                        <input
                            type="checkbox"
                            checked={readShowOnStart()}
                            onChange={e => {
                                if (e.target.checked) {
                                    localStorage.setItem('dsb.hotkeys.showOnStart', '1');
                                } else {
                                    localStorage.removeItem('dsb.hotkeys.showOnStart');
                                }
                            }}
                        />
                        Показывать при запуске
                    </label>
                </div>
            </div>
        </div>
    );
}

function readShowOnStart(): boolean {
    try {
        return localStorage.getItem('dsb.hotkeys.showOnStart') === '1';
    } catch {
        return false;
    }
}