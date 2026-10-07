import { useStore } from '../store';

export function DomainForm() {
    const { state, dispatch } = useStore();
    const set = (patch: Partial<typeof state>) => dispatch({ type: 'set', patch });

    return (
        <section className="domain-card">
            <h2>Домен</h2>
            <div className="grid-2">
                <label>
                    ID (FQDN)
                    <input
                        value={state.domain}
                        onChange={e => set({ domain: e.target.value })}
                        placeholder="example.test"
                    />
                </label>
                <label>
                    Версия
                    <input value={state.version} onChange={e => set({ version: e.target.value })} />
                </label>
                <label>
                    Название
                    <input value={state.name} onChange={e => set({ name: e.target.value })} />
                </label>
                <label>
                    Автор
                    <input value={state.author} onChange={e => set({ author: e.target.value })} />
                </label>
                <label className="full">
                    Описание
                    <input value={state.description} onChange={e => set({ description: e.target.value })} />
                </label>
                <label className="full">
                    Теги (через запятую)
                    <input
                        value={state.tags.join(', ')}
                        onChange={e => set({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                </label>
            </div>
        </section>
    );
}