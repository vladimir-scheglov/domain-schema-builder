// web/src/components/WorkflowGraph.tsx
import { useMemo, useState } from 'react';
import type { UIWorkflow } from '../types';

interface Props {
    workflow: UIWorkflow;
}

interface Node {
    id: string;
    name: string;
    level: number;
    indexInLevel: number;
    x: number;
    y: number;
}

interface Edge {
    from: string;
    to: string;
    name?: string;
    parallelIndex: number;
    parallelCount: number;
}

const NODE_W = 140;
const NODE_H = 40;
const H_GAP = 80;
const V_GAP = 24;
const PADDING = 20;

// Смещение параллельных рёбер по вертикали
const PARALLEL_DY = 30;
// Смещение обратных рёбер по горизонтали (в обход узлов справа)
const BACK_EDGE_DX = 60;

export function WorkflowGraph({ workflow }: Props) {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

    const { nodes, edges, width, height } = useMemo(
        () => layout(workflow),
        [workflow]
    );

    if (nodes.length === 0) {
        return (
            <div className="workflow-graph-empty">
                Добавьте статусы, чтобы увидеть граф
            </div>
        );
    }

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    return (
        <div className="workflow-graph">
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ display: 'block', maxWidth: '100%' }}
            >
                <defs>
                    <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="10"
                        refY="5"
                        markerWidth="8"
                        markerHeight="8"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
                    </marker>
                    <marker
                        id="arrow-hl"
                        viewBox="0 0 10 10"
                        refX="10"
                        refY="5"
                        markerWidth="8"
                        markerHeight="8"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
                    </marker>
                </defs>

                {/* Рёбра */}
                {edges.map((e, i) => {
                    const a = nodeById.get(e.from);
                    const b = nodeById.get(e.to);
                    if (!a || !b) return null;

                    const highlight =
                        hoveredEdge === i ||
                        hoveredNode === e.from ||
                        hoveredNode === e.to;

                    const { path, labelX, labelY } = edgeGeometry(a, b, e);
                    const hasLabel = !!e.name;

                    return (
                        <g key={i}>
                            <path
                                d={path}
                                fill="none"
                                stroke={highlight ? '#2563eb' : '#9ca3af'}
                                strokeWidth={highlight ? 2 : 1.5}
                                markerEnd={highlight ? 'url(#arrow-hl)' : 'url(#arrow)'}
                                onMouseEnter={() => setHoveredEdge(i)}
                                onMouseLeave={() => setHoveredEdge(null)}
                                style={{ cursor: 'pointer' }}
                            />

                            {hasLabel && (
                                <g
                                    transform={`translate(${labelX}, ${labelY})`}
                                    onMouseEnter={() => setHoveredEdge(i)}
                                    onMouseLeave={() => setHoveredEdge(null)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <rect
                                        x={-estimateLabelWidth(e.name!) / 2 - 4}
                                        y={-9}
                                        width={estimateLabelWidth(e.name!) + 8}
                                        height={16}
                                        rx={3}
                                        ry={3}
                                        fill={highlight ? '#dbeafe' : '#ffffff'}
                                        stroke={highlight ? '#93c5fd' : '#e5e7eb'}
                                        strokeWidth={1}
                                    />
                                    <text
                                        x={0}
                                        y={3}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill={highlight ? '#1e40af' : '#374151'}
                                        fontFamily="ui-sans-serif, system-ui"
                                    >
                                        {e.name}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* Узлы */}
                {nodes.map(n => {
                    const isInitial = n.id === workflow.initial;
                    const isHovered = hoveredNode === n.id;
                    const fill = isHovered ? '#dbeafe' : isInitial ? '#dcfce7' : '#f9fafb';
                    const stroke = isHovered ? '#2563eb' : isInitial ? '#16a34a' : '#d1d5db';

                    return (
                        <g
                            key={n.id}
                            transform={`translate(${n.x}, ${n.y})`}
                            onMouseEnter={() => setHoveredNode(n.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            <rect
                                width={NODE_W}
                                height={NODE_H}
                                rx={6}
                                ry={6}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={isInitial || isHovered ? 2 : 1.5}
                            />
                            <text
                                x={NODE_W / 2}
                                y={NODE_H / 2 - 4}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="600"
                                fill="#111827"
                            >
                                {truncate(n.name, 18)}
                            </text>
                            <text
                                x={NODE_W / 2}
                                y={NODE_H / 2 + 10}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#6b7280"
                                fontFamily="ui-monospace, monospace"
                            >
                                {truncate(n.id, 20)}
                            </text>
                        </g>
                    );
                })}
            </svg>

            <div className="workflow-legend">
                <span><span className="dot" style={{ background: '#dcfce7', borderColor: '#16a34a' }} /> начальный</span>
                <span><span className="dot" style={{ background: '#f9fafb', borderColor: '#d1d5db' }} /> обычный</span>
            </div>
        </div>
    );
}

// ===================== layout =====================

function layout(w: UIWorkflow): {
    nodes: Node[];
    edges: Edge[];
    width: number;
    height: number;
} {
    const statuses = parseStatuses(w.statuses);
    const rawEdges = parseTransitions(w.transitions);

    if (statuses.length === 0) {
        return { nodes: [], edges: [], width: 0, height: 0 };
    }

    // Граф
    const adj = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    for (const s of statuses) {
        adj.set(s.id, []);
        incoming.set(s.id, []);
    }
    for (const e of rawEdges) {
        if (!adj.has(e.from) || !adj.has(e.to)) continue;
        adj.get(e.from)!.push(e.to);
        incoming.get(e.to)!.push(e.from);
    }

    // BFS уровни
    const levels = new Map<string, number>();
    const queue: Array<{ id: string; level: number }> = [];

    if (w.initial && adj.has(w.initial)) {
        levels.set(w.initial, 0);
        queue.push({ id: w.initial, level: 0 });
    } else {
        for (const s of statuses) {
            if (incoming.get(s.id)!.length === 0) {
                levels.set(s.id, 0);
                queue.push({ id: s.id, level: 0 });
            }
        }
    }

    if (queue.length === 0) {
        const start = w.initial && adj.has(w.initial) ? w.initial : statuses[0]!.id;
        levels.set(start, 0);
        queue.push({ id: start, level: 0 });
    }

    while (queue.length > 0) {
        const { id, level } = queue.shift()!;
        for (const next of adj.get(id) ?? []) {
            if (!levels.has(next)) {
                levels.set(next, level + 1);
                queue.push({ id: next, level: level + 1 });
            }
        }
    }

    const maxLevel = Math.max(0, ...Array.from(levels.values()));
    let nextLevel = maxLevel + 1;
    for (const s of statuses) {
        if (!levels.has(s.id)) {
            levels.set(s.id, nextLevel);
        }
    }

    // Группировка по уровням
    const byLevel = new Map<number, typeof statuses>();
    for (const s of statuses) {
        const lvl = levels.get(s.id) ?? 0;
        if (!byLevel.has(lvl)) byLevel.set(lvl, []);
        byLevel.get(lvl)!.push(s);
    }
    for (const arr of byLevel.values()) {
        arr.sort((a, b) => a.id.localeCompare(b.id));
    }

    // Координаты
    const nodes: Node[] = [];
    let maxRowCount = 0;
    for (const [lvl, arr] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
        maxRowCount = Math.max(maxRowCount, arr.length);
        arr.forEach((s, i) => {
            nodes.push({
                id: s.id,
                name: s.name || s.id,
                level: lvl,
                indexInLevel: i,
                x: PADDING + lvl * (NODE_W + H_GAP),
                y: PADDING + i * (NODE_H + V_GAP),
            });
        });
    }

    // Параллельные рёбра: считаем группы по (from, to)
    const groupKey = (e: { from: string; to: string }) => `${e.from}::${e.to}`;
    const groupCounts = new Map<string, number>();
    for (const e of rawEdges) {
        const k = groupKey(e);
        groupCounts.set(k, (groupCounts.get(k) ?? 0) + 1);
    }
    const groupSeen = new Map<string, number>();
    const edges: Edge[] = rawEdges.map(e => {
        const k = groupKey(e);
        const idx = groupSeen.get(k) ?? 0;
        groupSeen.set(k, idx + 1);
        return {
            from: e.from,
            to: e.to,
            name: e.name,
            parallelIndex: idx,
            parallelCount: groupCounts.get(k) ?? 1,
        };
    });

    const maxLevelUsed = Math.max(0, ...nodes.map(n => n.level));
    const width = PADDING * 2 + (maxLevelUsed + 1) * NODE_W + maxLevelUsed * H_GAP;
    const height =
        PADDING * 2 + maxRowCount * NODE_H + Math.max(0, maxRowCount - 1) * V_GAP;

    return { nodes, edges, width, height };
}

/**
 * Считает путь и позицию подписи для ребра.
 *
 * Прямые рёбра (a.x < b.x):
 *   - рисуем Безье из правой стороны a в левую сторону b
 *   - параллельные сдвигаем по вертикали на (index - center) * PARALLEL_DY
 *   - подпись — в середине пути
 *
 * Обратные рёбра (a.x >= b.x):
 *   - рисуем дугу снизу, обходящую узлы справа
 *   - параллельные смещаем на разное расстояние вправо
 *   - подпись — снизу под дугой
 */
function edgeGeometry(a: Node, b: Node, e: Edge): {
    path: string;
    labelX: number;
    labelY: number;
} {
    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x;
    const y2 = b.y + NODE_H / 2;

    // Сдвиг параллельных рёбер: центрируем относительно нуля
    const parallelOffset =
        e.parallelCount > 1
            ? (e.parallelIndex - (e.parallelCount - 1) / 2) * PARALLEL_DY
            : 0;

    if (x2 > x1) {
        // Прямое ребро
        const dy = parallelOffset;

        // Точки с учётом сдвига
        const sy = y1 + dy;
        const ey = y2 + dy;

        const midX = (x1 + x2) / 2;
        const path = `M ${x1} ${sy} C ${midX} ${sy}, ${midX} ${ey}, ${x2} ${ey}`;

        // Подпись: середина между x1 и x2, со сдвигом dy
        const labelX = (x1 + x2) / 2;
        const labelY = (sy + ey) / 2 - 12; // чуть выше линии

        return { path, labelX, labelY };
    }

    // Обратное ребро — рисуем дугу снизу
    // Обходим узлы справа от обоих
    const rightX = Math.max(x1, b.x + NODE_W) + BACK_EDGE_DX + e.parallelIndex * 20;

    // Стартуем с нижней стороны a, заканчиваем в нижней стороне b
    const startX = a.x + NODE_W / 2;
    const startY = a.y + NODE_H;
    const endX = b.x + NODE_W / 2;
    const endY = b.y + NODE_H;

    const path = `M ${startX} ${startY} C ${rightX} ${startY + 40}, ${rightX} ${endY + 40}, ${endX} ${endY}`;

    // Подпись — под дугой
    const labelX = (startX + endX) / 2;
    const labelY = Math.max(startY, endY) + 60 + e.parallelIndex * 16;

    return { path, labelX, labelY };
}

// ===================== parsing =====================

interface ParsedStatus {
    id: string;
    name: string;
}

interface ParsedTransition {
    from: string;
    to: string;
    name?: string;
}

function parseStatuses(raw: string): ParsedStatus[] {
    const out: ParsedStatus[] = [];
    for (const line of raw.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        if (t.startsWith('-')) {
            const id = t.slice(1).trim();
            out.push({ id, name: id });
        } else {
            const colon = t.indexOf(':');
            if (colon === -1) {
                out.push({ id: t, name: t });
            } else {
                const id = t.slice(0, colon).trim();
                const name = t.slice(colon + 1).trim();
                out.push({ id, name: name || id });
            }
        }
    }
    return out;
}

/**
 * Разбирает переходы.
 * Поддерживаемые формы:
 *   "planned -> inProgress"
 *   "planned -> inProgress: Согласование"
 *   "planned -> inProgress : Согласование"
 *   "- planned -> inProgress"
 */
function parseTransitions(raw: string): ParsedTransition[] {
    const out: ParsedTransition[] = [];
    for (const line of raw.split('\n')) {
        const t = line.trim().replace(/^-\s*/, '');
        if (!t) continue;

        // Сначала разберём "from -> rest"
        const arrowMatch = /^(\S+)\s*->\s*(.+)$/.exec(t);
        if (!arrowMatch) continue;

        const from = arrowMatch[1]!;
        let rest = arrowMatch[2]!.trim();

        // rest может содержать ": name"
        let to = rest;
        let name: string | undefined;

        const colonIdx = rest.indexOf(':');
        if (colonIdx !== -1) {
            to = rest.slice(0, colonIdx).trim();
            name = rest.slice(colonIdx + 1).trim() || undefined;
        }

        out.push({ from, to, name });
    }
    return out;
}

function truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** Приблизительная оценка ширины текста по количеству символов */
function estimateLabelWidth(s: string): number {
    return s.length * 6.2;
}