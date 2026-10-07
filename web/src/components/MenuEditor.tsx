import { useStore } from '../store';

export function MenuEditor() {
    const { state, dispatch } = useStore();

    return (
        <section className="section-card">
            <h2>Меню</h2>
            <div className="menu-list">
                {state.entities.map(e => (
                    <label key={e.id} className="menu-item">
                        <input
                            type="checkbox"
                            checked={state.menus.includes(e.id)}
                            onChange={() => dispatch({ type: 'toggleMenu', entityId: e.id })}
                        />
                        {e.name || e.id}
                    </label>
                ))}
            </div>
        </section>
    );
}