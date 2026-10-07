import { useStore } from '../store';

export function LinkEditor() {
    const { state, dispatch } = useStore();
    const entityIds = state.entities.map(e => e.id);

    return (
        <section className="section-card">
            <div className="card-header">
                <h2>Связи</h2>
                <button onClick={() => dispatch({
                    type: 'addLink',
                    link: { from: entityIds[0] ?? '', to: entityIds[0] ?? '', type: 'n:n', undirected: true },
                })}>+</button>
            </div>
            {state.links.map((l, i) => (
                <div key={i} className="link-row">
                    <select value={l.from} onChange={e => dispatch({ type: 'updateLink', index: i, patch: { from: e.target.value } })}>
                        {entityIds.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                    <select value={l.type} onChange={e => dispatch({ type: 'updateLink', index: i, patch: { type: e.target.value as any } })}>
                        <option value="1:1">1:1</option>
                        <option value="1:n">1:n</option>
                        <option value="n:n">n:n</option>
                    </select>
                    <label>
                        <input
                            type="checkbox"
                            checked={l.undirected}
                            onChange={e => dispatch({ type: 'updateLink', index: i, patch: { undirected: e.target.checked } })}
                        />
                        ненаправленная
                    </label>
                    <select value={l.to} onChange={e => dispatch({ type: 'updateLink', index: i, patch: { to: e.target.value } })}>
                        {entityIds.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                    <button className="icon-btn" onClick={() => dispatch({ type: 'removeLink', index: i })}>×</button>
                </div>
            ))}
        </section>
    );
}