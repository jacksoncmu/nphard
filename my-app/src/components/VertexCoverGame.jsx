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
  const nodeCount = Math.floor(Math.random() * 4) + 6;
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
    for (let i = 1; i < nodeCount; i++) edges.push({ u: i - 1, v: i });
  }

  const k = findMinVertexCover(nodeCount, edges);
  return { nodes, edges, k };
}

// Brute-force solver for minimum vertex cover size
function findMinVertexCover(n, edges) {
  let best = null;
  for (let mask = 0; mask < (1 << n); mask++) {
    const sel = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sel.push(i);
    if (best !== null && sel.length >= best) continue;
    if (edges.every(({ u, v }) => sel.includes(u) || sel.includes(v))) {
      best = sel.length;
    }
  }
  return best;
}

// Brute-force retriever of actual node set for minimum vertex cover
function getMinVertexCoverNodes(n, edges) {
  let best = Infinity;
  let bestSel = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const sel = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sel.push(i);
    if (sel.length > best) continue;
    if (edges.every(({ u, v }) => sel.includes(u) || sel.includes(v))) {
      if (sel.length < best) {
        best = sel.length;
        bestSel = sel;
      }
    }
  }
  return new Set(bestSel);
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

  // game state
  const init = useMemo(() => newRound(), []);
  const [layout, setLayout] = useState(init.layout);
  const [graph,  setGraph]  = useState(init.graph);
  const [selected, setSelected] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);
  

  // compute correct cover when graph changes
  const correctCover = useMemo(
    () => getMinVertexCoverNodes(graph.nodes.length, graph.edges),
    [graph]
  );

  // reset selection on new graph
  useEffect(() => setSelected(new Set()), [graph]);

  // timer logic
  useEffect(() => {
    if (!gameOver) {
      clearInterval(timerRef.current);
      setTimeLeft(TIMER);
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, graph]);

  // handle time up
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(hs => Math.max(hs, score));
    }
  }, [timeLeft, score]);

  // start next round
  const startNext = () => {
    const { layout: L, graph: G } = newRound();
    setLayout(L);
    setGraph(G);
    setGameOver(false);
    setTimeLeft(TIMER);
  };

  // check for correct cover
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

  // handle node click (with error flash at limit)
  const handleNodeClick = id => {
    if (gameOver || showHelp) return;
    setSelected(prev => {
      const c = new Set(prev);
      if (c.has(id)) {
        c.delete(id);
        return c;
      }
      if (c.size < graph.k) {
        c.add(id);
        return c;
      }
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 500);
      return prev;
    });
  };

  // retry button
  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  // compute positions
  const positions = useMemo(() => {
    if (layout === 'grid' && graph.nodes.length <= 8) {
      const cols = 4, rows = 2;
      const xSp = width / (cols + 1), ySp = height / (rows + 1);
      const spots = Array.from({ length: cols * rows }, (_, i) => ({
        row: Math.floor(i / cols),
        col: i % cols
      })).sort(() => Math.random() - 0.5);
      return graph.nodes.map((n, i) => ({
        ...n,
        x: xSp * (spots[i].col + 1),
        y: ySp * (spots[i].row + 1)
      }));
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

  const renderSVG = highlightSet => (
    <svg width={width} height={height} className="vertex-cover-svg">
      {graph.edges.map((e, i) => {
        const u = positions.find(p => p.id === e.u);
        const v = positions.find(p => p.id === e.v);
        const bold = highlightSet.has(e.u) || highlightSet.has(e.v);
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
        <g
          key={n.id}
          onClick={() => handleNodeClick(n.id)}
          className="node-group"
        >
          <circle
            cx={n.x}
            cy={n.y}
            r={radius}
            className={highlightSet.has(n.id) ? 'node selected' : 'node'}
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            className="node-label"
          >
            {n.id}
          </text>
        </g>
      ))}
    </svg>
  );

  return (
    <div className="vertex-cover-container">
      <button
        className="help-button"
        onClick={() => setShowHelp(true)}
        aria-label="What is Vertex Cover?"
      >
        ❓
      </button>

      {!gameOver && <h1 className="header">Vertex Cover Challenge</h1>}
      {/* 
      <div className="game-info">
        Layout: <span className="mono">{layout}</span> | Nodes: <span className="mono">{graph.nodes.length}, {}</span>
      </div>
      */}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}

      {!gameOver && (
        <div className={`stats ${errorFlash ? 'error' : ''}`}>
          Time Left: <span className="mono">{timeLeft}s</span> | Remaining:{' '}
          <span className="mono">{graph.k - selected.size}</span>
        </div>
      )}

      {gameOver ? (
        <div className="game-over">
          <div className="graphs">
            <div>
              <div>Your selection:</div>
              {renderSVG(selected)}
            </div>
            <div>
              <div>Correct cover of {correctCover.size} vertices:</div>
              {renderSVG(correctCover)}
            </div>
          </div>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      ) : (
        renderSVG(selected)
      )}

{showHelp && (
  <div className="help-overlay" onClick={() => setShowHelp(false)}>
    <div className="help-modal" onClick={e => e.stopPropagation()}>
      <h2>What is a Vertex Cover?</h2>
      <p>
        A <strong>vertex cover</strong> is a set of vertices such that every
        edge has at least one endpoint in that set.
      </p>
      <div className="example-anim">
        {/* 3-node example */}
        <svg width="140" height="100">
          <circle cx="30" cy="50" r="10" className="vc-node" />
          <circle cx="70" cy="20" r="10" className="vc-node" />
          <circle cx="110" cy="50" r="10" className="vc-node" />
          <line x1="30" y1="50" x2="70" y2="20" className="vc-edge" />
          <line x1="70" y1="20" x2="110" y2="50" className="vc-edge" />
        </svg>
        <p>Covering both top and one bottom node covers all edges.</p>
      </div>
      <button onClick={() => setShowHelp(false)}>Got it!</button>
    </div>
  </div>
)}

    </div>
  );
}
