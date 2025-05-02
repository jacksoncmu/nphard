import React, { useState, useEffect, useRef, useMemo } from 'react';
import './VertexCoverGame.css';

// Utility to generate a random graph that is guaranteed to have a vertex cover
function generateGraph() {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nodeCount = Math.floor(Math.random() * 4) + 6; // 6–9 nodes
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < 0.3) edges.push({ u: i, v: j });
      }
    }
    if (edges.length === 0) edges.push({ u: 0, v: 1 });
    const k = findMinVertexCover(nodeCount, edges);
    if (k !== null) return { nodes, edges, k };
  }
  return { nodes: [{ id: 0 }, { id: 1 }], edges: [{ u: 0, v: 1 }], k: 1 };
}

// Utility to generate a random planar graph
function generatePlanarGraph() {
  const nodeCount = Math.floor(Math.random() * 4) + 6; // 6–9 nodes
  const minDist = 100;
  const nodes = [];

  while (nodes.length < nodeCount) {
    const x = Math.random() * 360 + 20;
    const y = Math.random() * 360 + 20;
    if (!nodes.some(n => Math.hypot(n.x - x, n.y - y) < minDist)) {
      nodes.push({ id: nodes.length, x, y });
    }
  }

  const edges = [];
  for (let i = 0; i < nodeCount; i++) {
    const dists = nodes
      .map(n => ({ id: n.id, dist: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
      .sort((a, b) => a.dist - b.dist);
    for (let j = 1; j <= 3 && j < dists.length; j++) {
      const v = dists[j].id;
      const candidate = { u: i, v };
      if (edges.some(e => (e.u === i && e.v === v) || (e.u === v && e.v === i))) continue;

      const crosses = edges.some(e => {
        const A = nodes.find(n => n.id === e.u);
        const B = nodes.find(n => n.id === e.v);
        const C = nodes[i];
        const D = nodes.find(n => n.id === v);
        function orient(P, Q, R) {
          return (Q.x - P.x) * (R.y - P.y) - (Q.y - P.y) * (R.x - P.x);
        }
        function intersect(P, Q, R, S) {
          return (
            orient(P, Q, R) * orient(P, Q, S) < 0 &&
            orient(R, S, P) * orient(R, S, Q) < 0
          );
        }
        return intersect(A, B, C, D);
      });
      if (!crosses) edges.push(candidate);
    }
  }

  if (edges.length < nodeCount - 1) {
    for (let i = 1; i < nodeCount; i++) {
      edges.push({ u: i - 1, v: i });
    }
  }

  const k = findMinVertexCover(nodeCount, edges);
  return { nodes, edges, k };
}

// Brute‑force solver for minimum vertex cover
function findMinVertexCover(n, edges) {
  let best = null;
  for (let mask = 0; mask < 1 << n; mask++) {
    const sel = [...Array(n).keys()].filter(i => mask & (1 << i));
    if (best !== null && sel.length >= best) continue;
    if (edges.every(({ u, v }) => sel.includes(u) || sel.includes(v))) {
      best = sel.length;
    }
  }
  return best;
}

// Pick a layout + graph together, rejecting grid if too many nodes
function newRound() {
  let layout, g;
  do {
    const r = Math.random();
    layout = r < 0.30 ? 'circle' : r < 0.60 ? 'grid' : 'planar';
    g = layout === 'planar' ? generatePlanarGraph() : generateGraph();
  } while (layout === 'grid' && g.nodes.length > 8);
  return { layout, graph: g };
}

export default function VertexCoverGame() {
  const TIMER = 30;
  const width = 400, height = 400, radius = 15;

  // initialize both layout and graph in one go
  const init = useMemo(() => newRound(), []);
  const [layout, setLayout] = useState(init.layout);
  const [graph, setGraph] = useState(init.graph);

  const [selected, setSelected] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const timerRef = useRef(null);

  // Reset selection when graph changes
  useEffect(() => setSelected(new Set()), [graph]);

  // Timer
  useEffect(() => {
    if (!gameOver) {
      clearInterval(timerRef.current);
      setTimeLeft(TIMER);
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, graph]);

  // Time's up
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(hs => Math.max(hs, score));
    }
  }, [timeLeft, score]);

  // Advance to next round
  const startNext = () => {
    const { layout: L, graph: G } = newRound();
    setLayout(L);
    setGraph(G);
    setGameOver(false);
    setTimeLeft(TIMER);
    setSelected(new Set());
  };

  // Check for correct cover
  useEffect(() => {
    const { edges, k } = graph;
    if (
      edges.every(({ u, v }) => selected.has(u) || selected.has(v)) &&
      selected.size === k
    ) {
      setScore(s => s + 1);
      setTimeout(startNext, 500);
    }
  }, [selected, graph]);

  const handleNodeClick = id => {
    if (gameOver) return;
    setSelected(prev => {
      const c = new Set(prev);
      if (c.has(id)) c.delete(id);
      else if (c.size < graph.k) c.add(id);
      return c;
    });
  };

  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  // Compute positions
  const positions = useMemo(() => {
    if (layout === 'grid' && graph.nodes.length <= 8) {
      const cols = 4, rows = 2;
      const xSp = width / (cols + 1), ySp = height / (rows + 1);
      const spots = Array.from({ length: cols * rows }, (_, i) => ({ row: Math.floor(i / cols), col: i % cols }))
        .sort(() => Math.random() - 0.5);
      return graph.nodes.map((n, i) => ({ ...n, x: xSp * (spots[i].col + 1), y: ySp * (spots[i].row + 1) }));
    } else if (layout === 'circle') {
      return graph.nodes.map((n, i) => ({
        ...n,
        x: width / 2 + (width / 2 - 2 * radius) * Math.cos((2 * Math.PI * i) / graph.nodes.length),
        y: height / 2 + (height / 2 - 2 * radius) * Math.sin((2 * Math.PI * i) / graph.nodes.length),
      }));
    } else {
      return graph.nodes;
    }
  }, [graph, layout]);

  return (
    <div className="vertex-cover-container">
      <h1 className="header">Vertex Cover Challenge</h1>
      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>

      {gameOver ? (
        <div className="game-over">
          <div className="game-over-text">Time’s up!</div>
          <button onClick={handleRetry} className="retry-button">Retry</button>
        </div>
      ) : (
        <>
          <div className="stats">
            Time Left: <span className="mono">{timeLeft}s</span> | Remaining: <span className="mono">{graph.k - selected.size}</span> vertices
          </div>
          <svg width={width} height={height} className="vertex-cover-svg">
            {graph.edges.map((e, i) => {
              const u = positions.find(p => p.id === e.u);
              const v = positions.find(p => p.id === e.v);
              const bold = selected.has(e.u) || selected.has(e.v);

              if (layout === 'grid') {
                const dx = v.x - u.x, dy = v.y - u.y;
                const len = Math.hypot(dx, dy) || 1;
                const offset = Math.max(30, len * 0.3);
                const cx = (u.x + v.x) / 2 + (-dy / len) * offset;
                const cy = (u.y + v.y) / 2 + ( dx / len) * offset;
                return (
                  <path
                    key={i}
                    d={`M ${u.x},${u.y} Q ${cx},${cy} ${v.x},${v.y}`}
                    className={bold ? 'edge bold' : 'edge'}
                  />
                );
              } else {
                return (
                  <line
                    key={i}
                    x1={u.x} y1={u.y}
                    x2={v.x} y2={v.y}
                    className={bold ? 'edge bold' : 'edge'}
                  />
                );
              }
            })}

            {positions.map(n => (
              <g key={n.id} onClick={() => handleNodeClick(n.id)} className="node-group">
                <circle
                  cx={n.x} cy={n.y} r={radius}
                  className={selected.has(n.id) ? 'node selected' : 'node'}
                />
                <text x={n.x} y={n.y + 4} textAnchor="middle" className="node-label">{n.id}</text>
              </g>
            ))}
          </svg>
        </>
      )}
    </div>
  );
}
