import { useStore } from '../store';

export function EnumEditor() {
    const { state, dispatch } = useStore();

    return (
        <section className="section-card">
            <div className="card-header">
                <h2>Перечисления</h2>
                <button onClick={() => dispatch({ type: 'addEnum', enum: { id: '', values: '' } })}>+</button>
            </div>
            {state.enums.map(en => (
                <div key={en.id} className="enum-row">
                    <input
                        placeholder="ID"
                        value={en.id}
                        onChange={e => dispatch({ type: 'updateEnum', id: en.id, patch: { id: e.target.value } })}
                    />
                    <label>
                        Значения
                        <span className="hint">
                            Формат: <code>ID</code> или <code>ID:Название</code>, по строке
                        </span>
                        <textarea
                            placeholder={'DRAFT:Черновик\nSIGNED:Подписан\nPAID:Оплачен'}
                            value={en.values}
                            rows={5}
                            onChange={e => dispatch({ type: 'updateEnum', id: en.id, patch: { values: e.target.value } })}
                        />
                    </label>
                    <button
                        className="icon-btn"
                        onClick={() => dispatch({ type: 'removeEnum', id: en.id })}
                    >×</button>
                </div>
            ))}
        </section>
    );
}