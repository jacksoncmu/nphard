import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GraphCommon.css';
import './CliqueGame.css';

// Utility to generate a random graph that is guaranteed to have a clique
function generateGraph() {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nodeCount = Math.floor(Math.random() * 4) + 8; 
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < 0.8) edges.push({ u: i, v: j });
      }
    }
    if (edges.length === 0) edges.push({ u: 0, v: 1 });
    const k = findMinVertexCover(nodeCount, edges);  // now returns maximum clique size
    if (k > 1) return { nodes, edges, k };
  }
  // fallback to an edge
  return { nodes: [{ id: 0 }, { id: 1 }], edges: [{ u: 0, v: 1 }], k: 2 };
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
      if (!crosses) edges.push({ u: i, v });
    }
  }
  if (edges.length < nodeCount - 1) {
    for (let i = 1; i < nodeCount; i++) edges.push({ u: i - 1, v: i });
  }
  const k = findMinVertexCover(nodeCount, edges);  // now returns maximum clique size
  return { nodes, edges, k };
}

// Compute maximum clique size (formerly findMinVertexCover)
function findMinVertexCover(n, edges) {
  // build adjacency sets
  const adj = Array.from({ length: n }, () => new Set());
  edges.forEach(({ u, v }) => {
    adj[u].add(v);
    adj[v].add(u);
  });
  let best = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    const sel = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) sel.push(i);
    }
    if (sel.length <= best) continue;
    // check all pairs for clique property
    let isClique = true;
    for (let i = 0; i < sel.length; i++) {
      for (let j = i + 1; j < sel.length; j++) {
        if (!adj[sel[i]].has(sel[j])) {
          isClique = false;
          break;
        }
      }
      if (!isClique) break;
    }
    if (isClique) best = sel.length;
  }
  return best;
}

// Retrieve the actual maximum clique node set (formerly getMinVertexCoverNodes)
function getMinVertexCoverNodes(n, edges) {
  const adj = Array.from({ length: n }, () => new Set());
  edges.forEach(({ u, v }) => {
    adj[u].add(v);
    adj[v].add(u);
  });
  let best = 0;
  let bestSel = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const sel = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) sel.push(i);
    }
    if (sel.length < best) continue;
    let isClique = true;
    for (let i = 0; i < sel.length; i++) {
      for (let j = i + 1; j < sel.length; j++) {
        if (!adj[sel[i]].has(sel[j])) {
          isClique = false;
          break;
        }
      }
      if (!isClique) break;
    }
    if (isClique && sel.length > best) {
      best = sel.length;
      bestSel = sel;
    }
  }
  return new Set(bestSel);
}

// Pick a layout + graph together
function newRound() {
  let layout, g;
  do {
    const r = Math.random();
    layout = r < 0.30 ? 'circle' : r < 0.60 ? 'grid' : 'planar';
    g = layout === 'planar' ? generatePlanarGraph() : generateGraph();
  } while (layout === 'grid' && g.nodes.length > 8);
  return { layout, graph: g };
}

export default function CliqueGame({ onBack }) {
  const TIMER = 30;
  const width = 400, height = 400, radius = 15;

  const init = useMemo(() => newRound(), []);

  // game state
  const [layout, setLayout]           = useState(init.layout);
  const [graph,  setGraph]            = useState(init.graph);
  const [selected, setSelected]       = useState(new Set());
  const [timeLeft, setTimeLeft]       = useState(TIMER);
  const [gameOver, setGameOver]       = useState(false);
  const [score, setScore]             = useState(0);
  const [highScore, setHighScore]     = useState(0);
  const [errorFlash, setErrorFlash]   = useState(false);
  const [showHelp, setShowHelp]       = useState(false);
  const timerRef                      = useRef(null);

  // compute correct maximum clique
  const correctCover = useMemo(
    () => getMinVertexCoverNodes(graph.nodes.length, graph.edges),
    [graph]
  );

  useEffect(() => setSelected(new Set()), [graph]);
  useEffect(() => setTimeLeft(TIMER), [graph]);

  // timer logic
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

  // time's up
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(hs => Math.max(hs, score));
    }
  }, [timeLeft, score]);

  // start next round
  const startNext = () => {
    const next = newRound();
    setLayout(next.layout);
    setGraph(next.graph);
    setGameOver(false);
    setTimeLeft(TIMER);
  };

  // check for correct clique
  useEffect(() => {
    if (selected.size === graph.k) {
      const arr = Array.from(selected);
      const isClique = arr.every((u, i) =>
        arr.slice(i + 1).every(v =>
          graph.edges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u))
        )
      );
      if (isClique) {
        setScore(s => s + 1);
        setTimeout(startNext, 500);
      }
    }
  }, [selected, graph]);

  // node selection
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

  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  // compute positions (unchanged)
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

  // SVG renderer (unchanged for game)
  const renderSVG = highlightSet => (
    <svg width={width} height={height} className="svg">
      {graph.edges.map((e, i) => {
        const u = positions.find(p => p.id === e.u);
        const v = positions.find(p => p.id === e.v);
        const bold = highlightSet.has(e.u) && highlightSet.has(e.v);
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
            className={highlightSet.has(n.id) ? 'c-node selected' : 'c-node'}
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
    <div className="graph-container">
      <button className="back-button" onClick={onBack}>
        Main Menu
      </button>
      <button className="help-button" onClick={() => setShowHelp(true)}>?</button>

      {!gameOver && <h1 className="header">Clique Challenge</h1>}

      {gameOver && <h1 className="game-over-text">Time's up!</h1>}

      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>

      {!gameOver && (
        <div className={`stats ${errorFlash ? 'error' : ''}`}>
          Time Left: <span className="mono">{timeLeft}s</span> | You have to select{' '}
          <span className="mono">{graph.k - selected.size}</span> more vertices
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
              <div>Correct clique of {correctCover.size} vertices:</div>
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
      <h2>What is a Clique?</h2>
      <p>
        A <strong>clique</strong> is a set of vertices such that every pair
        of vertices in the set is connected by an edge.
      </p>
      <p>
        In each game, you will have 30 seconds and a target number of vertices to form a clique. Click on vertices to select them.
      </p>

      <div className="example-anim">
        {(() => {
          const coords = [
            [40, 40],
            [180, 40],
            [40, 140],
            [180, 140]
          ];
          const edges = [
            [0, 1], [0, 2], [0, 3],
            [1, 2], [1, 3],
            [2, 3]
          ];
          return (
            <svg width="220" height="180">
              {edges.map(([u, v], idx) => (
                <line
                  key={idx}
                  x1={coords[u][0]}
                  y1={coords[u][1]}
                  x2={coords[v][0]}
                  y2={coords[v][1]}
                  className="c-edge"
                />
              ))}
              {coords.map(([x, y], i) => (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    className="c-node selected"
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="c-node-label"
                  >
                    {i}
                  </text>
                </g>
              ))}
            </svg>
          );
        })()}
      </div>

      <p>This is a 4‑vertex clique since every pair of vertices are connected by an edge.</p>

      <button onClick={() => setShowHelp(false)}>Got it!</button>
    </div>
  </div>
)}

    </div>
  );
}
