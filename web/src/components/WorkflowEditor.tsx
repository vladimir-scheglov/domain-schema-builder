// web/src/components/WorkflowEditor.tsx
import { useStore } from '../store';
import { WorkflowGraph } from './WorkflowGraph';

export function WorkflowEditor() {
    const { state, dispatch } = useStore();

    return (
        <section className="section-card">
            <div className="card-header">
                <h2>Workflow</h2>
                <button onClick={() => dispatch({
                    type: 'addWorkflow',
                    workflow: {
                        id: '',
                        name: '',
                        description: '',
                        initial: '',
                        statuses: '',
                        transitions: '',
                    },
                })}>+</button>
            </div>
            {state.workflows.map(w => (
                <div key={w.id} className="workflow-row">
                    <div className="workflow-header">
                        <input
                            placeholder="ID"
                            value={w.id}
                            onChange={e => dispatch({ type: 'updateWorkflow', id: w.id, patch: { id: e.target.value } })}
                        />
                        <input
                            placeholder="Название"
                            value={w.name}
                            onChange={e => dispatch({ type: 'updateWorkflow', id: w.id, patch: { name: e.target.value } })}
                        />
                        <button
                            className="icon-btn"
                            onClick={() => dispatch({ type: 'removeWorkflow', id: w.id })}
                        >×</button>
                    </div>

                    <input
                        placeholder="Описание"
                        value={w.description}
                        onChange={e => dispatch({ type: 'updateWorkflow', id: w.id, patch: { description: e.target.value } })}
                    />

                    <input
                        placeholder="Начальный статус (initial)"
                        value={w.initial}
                        onChange={e => dispatch({ type: 'updateWorkflow', id: w.id, patch: { initial: e.target.value } })}
                    />

                    <div className="workflow-body">
                        <label>
                            Статусы
                            <span className="hint">"planned: Запланирован" или "planned"</span>
                            <textarea
                                placeholder={'planned: Запланирован\ninProgress: В работе\ncompleted: Завершен'}
                                value={w.statuses}
                                rows={5}
                                onChange={e => dispatch({ type: 'updateWorkflow', id: w.id, patch: { statuses: e.target.value } })}
                            />
                        </label>
                        <label>
                            Переходы
                            <span className="hint">"from -&gt; to"</span>
                            <textarea
                                placeholder={'planned -> inProgress\ninProgress -> completed'}
                                value={w.transitions}
                                rows={5}
                                onChange={e => dispatch({ type: 'updateWorkflow', id: w.id, patch: { transitions: e.target.value } })}
                            />
                        </label>
                    </div>

                    {/* Вот сюда вставляем граф */}
                    <WorkflowGraph workflow={w} />
                </div>
            ))}
        </section>
    );
}