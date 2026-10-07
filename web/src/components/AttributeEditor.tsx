// web/src/components/AttributeEditor.tsx
import type { UIAttribute } from '../types';
import { isSystemAttribute, SYSTEM_ATTRIBUTE_INFO } from '../lib/systemAttributes';

const BASE_TYPES = [
    'String', 'Text', 'Integer', 'Decimal', 'Float', 'Bool',
    'Date', 'Time', 'Timestamp', 'Uuid', 'MAC', 'IpAddress',
    'CIDR', 'URL', 'Attachment', 'Identifier',
];

interface Props {
    attr: UIAttribute;
    enumIds: string[];
    workflowIds: string[];
    entityIds: string[];        // ← новое: список сущностей для Reference
    onChange: (patch: Partial<UIAttribute>) => void;
    onRemove: () => void;
}

export function AttributeEditor({
    attr, enumIds, workflowIds, entityIds, onChange, onRemove,
}: Props) {
    const isIdentifier = attr.type === 'Identifier';

    // Собираем все известные опции
    const knownTypes = new Set<string>([
        ...BASE_TYPES,
        ...enumIds.map(id => `enum(${id})`),
        ...workflowIds.map(id => `workflow(${id})`),
        ...entityIds.map(id => `Reference(${id})`),
        ...entityIds.map(id => `Array<Reference(${id})>`),
        'Array<String>',
        'Array<Integer>',
    ]);

    // Если текущее значение не входит в knownTypes — покажем его отдельной опцией
    const showCurrent = attr.type && !knownTypes.has(attr.type);

    const systemInfo =
        attr.id && isSystemAttribute(attr.id)
            ? SYSTEM_ATTRIBUTE_INFO[attr.id]
            : null;

    const isSystem = systemInfo !== null;
    
    return (
        <div className="attr-block">
            <div className="attr-row">
                <input
                    className="attr-id"
                    placeholder="id"
                    value={attr.id}
                    onChange={e => onChange({ id: e.target.value })}
                />
                {isSystem && systemInfo && (
                    <div className="attr-warning">
                        ⚠ Атрибут <code>{attr.id}</code> уже есть в каждой сущности автоматически
                        ({systemInfo.title}, {systemInfo.type}). Используйте другое имя.
                    </div>
                )}
                <input
                    className="attr-name"
                    placeholder="Название"
                    value={attr.name}
                    onChange={e => onChange({ name: e.target.value })}
                />
                <select value={attr.type} onChange={e => onChange({ type: e.target.value })}>
                    {showCurrent && (
                        <option value={attr.type}>{attr.type}</option>
                    )}
                    {BASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    <optgroup label="Перечисления">
                        {enumIds.map(id => <option key={id} value={`enum(${id})`}>enum({id})</option>)}
                    </optgroup>
                    <optgroup label="Workflow">
                        {workflowIds.map(id => <option key={id} value={`workflow(${id})`}>workflow({id})</option>)}
                    </optgroup>
                    <optgroup label="Ссылки">
                        {entityIds.map(id => <option key={id} value={`Reference(${id})`}>Reference({id})</option>)}
                    </optgroup>
                    <optgroup label="Массивы ссылок">
                        {entityIds.map(id => <option key={id} value={`Array<Reference(${id})>`}>Array&lt;Reference({id})&gt;</option>)}
                    </optgroup>
                    <optgroup label="Массивы">
                        <option value="Array<String>">Array&lt;String&gt;</option>
                        <option value="Array<Integer>">Array&lt;Integer&gt;</option>
                    </optgroup>
                </select>
                <input
                    className="attr-default"
                    placeholder="default"
                    value={attr.default}
                    onChange={e => onChange({ default: e.target.value })}
                />
                <label className="attr-readonly">
                    <input
                        type="checkbox"
                        checked={attr.readonly}
                        onChange={e => onChange({ readonly: e.target.checked })}
                    />
                    readonly
                </label>
                <button className="icon-btn" onClick={onRemove} title="Удалить">×</button>
            </div>

            {isIdentifier && (
                <div className="attr-row-extra">
                    <input
                        placeholder="sequence"
                        value={attr.sequence ?? ''}
                        onChange={e => onChange({ sequence: e.target.value || undefined })}
                    />
                    <input
                        placeholder="template"
                        value={attr.template ?? ''}
                        onChange={e => onChange({ template: e.target.value || undefined })}
                    />
                    <input
                        placeholder="defaultPrefix"
                        value={attr.defaultPrefix ?? ''}
                        onChange={e => onChange({ defaultPrefix: e.target.value || undefined })}
                    />
                    <input
                        placeholder="incrementTemplate"
                        value={attr.incrementTemplate ?? ''}
                        onChange={e => onChange({ incrementTemplate: e.target.value || undefined })}
                    />
                </div>
            )}
        </div>
    );
}