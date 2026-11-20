import type { ParsedSentence, Element } from "../../../src/ansci/sentence";

export const ELEMENT_COLORS: Record<Element, string> = {
  Wood: "#6aa84f",
  Fire: "#d95336",
  Earth: "#c9973f",
  Metal: "#8d99ae",
  Water: "#4a7fb5",
};

/** Layered SVG rendering of a meaning graph: root at top, edges down by
 *  BFS depth. Fill = syntactic element (the word's job); the ring and
 *  badge = semantic element (its place in the ontology), when it has one. */
export default function GraphView({ parsed }: { parsed: ParsedSentence }) {
  const { nodes, edges, rootId } = parsed.meaning;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]);
    adj.set(e.to, [...(adj.get(e.to) ?? []), e.from]);
  }
  const depth = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, (depth.get(id) ?? 0) + 1);
        queue.push(next);
      }
    }
  }
  for (const n of nodes) if (!depth.has(n.id)) depth.set(n.id, 1);
  const levels = new Map<number, string[]>();
  for (const [id, d] of depth) levels.set(d, [...(levels.get(d) ?? []), id]);
  const maxDepth = Math.max(0, ...depth.values());
  const maxWidth = Math.max(1, ...[...levels.values()].map((l) => l.length));
  const W = Math.max(360, maxWidth * 130);
  const H = (maxDepth + 1) * 118 + 30;
  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of levels) {
    ids.forEach((id, i) => {
      pos.set(id, { x: ((i + 1) * W) / (ids.length + 1), y: 52 + d * 118 });
    });
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="graphview" role="img" aria-label="meaning graph">
      {edges.map((e, i) => {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b9bec7" strokeWidth="1.5" />
            <text x={mx} y={my - 3} textAnchor="middle" className="edge-label">
              {e.relation}
            </text>
          </g>
        );
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const sem = n.semanticElement;
        return (
          <g key={n.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r="23"
              fill={ELEMENT_COLORS[n.syntacticElement]}
              fillOpacity="0.85"
              stroke={sem ? ELEMENT_COLORS[sem] : "#ffffff"}
              strokeWidth={sem ? 4 : 1.5}
            />
            <text x={p.x} y={p.y + 4} textAnchor="middle" className="node-glyph">
              {n.syntacticElement[0]}
            </text>
            <text x={p.x} y={p.y + 40} textAnchor="middle" className="node-lemma">
              {n.lemma}
            </text>
            <text x={p.x} y={p.y + 54} textAnchor="middle" className="node-role">
              {n.role ?? n.syntacticElement}
              {sem ? ` · in the net: ${sem}` : ""}
            </text>
          </g>
        );
      })}
      <text x={8} y={16} className="node-role">
        fill = syntactic element (job in the sentence) · ring = semantic element (place in the ontology)
      </text>
      <title>{byId.get(rootId)?.lemma ?? "graph"}</title>
    </svg>
  );
}
