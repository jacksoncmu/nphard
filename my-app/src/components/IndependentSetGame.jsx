import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GraphCommon.css';
import './IndependentSetGame.css';


function generateGraph() {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nodeCount = Math.floor(Math.random() * 4) + 6;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < 0.3) edges.push({ u: i, v: j });
      }
    }
    if (edges.length === 0) edges.push({ u: 0, v: 1 });
    const sel = getMaxIndependentSetNodes(nodeCount, edges);
    if (sel.size > 0) return { nodes, edges, k: sel.size };
  }
  return { nodes: [{ id: 0 }, { id: 1 }], edges: [{ u: 0, v: 1 }], k: 1 };
}

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
  const sel = getMaxIndependentSetNodes(nodeCount, edges);
  return { nodes, edges, k: sel.size };
}


function getMaxIndependentSetNodes(n, edges) {
  let best = new Set();
  for (let mask = 0; mask < (1 << n); mask++) {
    const sel = new Set();
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sel.add(i);
    if (sel.size <= best.size) continue;
    if (edges.every(({ u, v }) => !(sel.has(u) && sel.has(v)))) {
      best = sel;
    }
  }
  return best;
}


function newRound() {
  let layout, g;
  do {
    const r = Math.random();
    layout = r < 0.30 ? 'circle' : r < 0.60 ? 'grid' : 'planar';
    g = layout === 'planar' ? generatePlanarGraph() : generateGraph();
  } while (layout === 'grid' && g.nodes.length > 8);
  return { layout, graph: g };
}

export default function IndependentSetGame({ onBack }) {
  const TIMER = 30;
  const width = 400, height = 400, radius = 15;

  const init = useMemo(() => newRound(), []);
  const [layout, setLayout] = useState(init.layout);
  const [graph, setGraph] = useState(init.graph);
  const [selected, setSelected] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [blockedEdgeIdx, setBlockedEdgeIdx] = useState(null);
  const timerRef = useRef(null);

  // Reset selection on new graph
  useEffect(() => setSelected(new Set()), [graph]);

  // Timer 
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

  // Time up
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(hs => Math.max(hs, score));
    }
  }, [timeLeft, score]);

  // Start next round
  const startNext = () => {
    const next = newRound();
    setLayout(next.layout);
    setGraph(next.graph);
    setGameOver(false);
    setTimeLeft(TIMER);
  };

  // Winner
  useEffect(() => {
    const { edges, k } = graph;
    if (
      selected.size === k &&
      edges.every(({ u, v }) => !(selected.has(u) && selected.has(v)))
    ) {
      setScore(s => s + 1);
      setTimeout(startNext, 500);
    }
  }, [selected, graph]);


  const handleNodeClick = id => {
    if (gameOver || showHelp) return;
    setSelected(prev => {
      const c = new Set(prev);
      if (c.has(id)) {
        c.delete(id);
        setBlockedEdgeIdx(null);
      } else {
        c.add(id);
        const conflictIdx = graph.edges.findIndex(
          ({ u, v }) => (u === id && c.has(v)) || (v === id && c.has(u))
        );
        setBlockedEdgeIdx(conflictIdx !== -1 ? conflictIdx : null);
      }
      return c;
    });
  };

  // Retry
  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  // Compute positions
  const positions = useMemo(() => {
    if (layout === 'grid' && graph.nodes.length <= 8) {
      const cols = 4, rows = 2;
      const xSp = width / (cols + 1), ySp = height / (rows + 1);
      const spots = Array.from({ length: cols * rows }, (_, i) => ({ row: Math.floor(i / cols), col: i % cols })).sort(() => Math.random() - 0.5);
      return graph.nodes.map((n, i) => ({ ...n, x: xSp * (spots[i].col + 1), y: ySp * (spots[i].row + 1) }));
    } else if (layout === 'circle') {
      return graph.nodes.map((n, i) => ({
        ...n,
        x: width / 2 + (width / 2 - 2 * radius) * Math.cos((2 * Math.PI * i) / graph.nodes.length),
        y: height / 2 + (height / 2 - 2 * radius) * Math.sin((2 * Math.PI * i) / graph.nodes.length),
      }));
    }
    return graph.nodes;
  }, [graph, layout]);

  // SVG renderer
  const renderSVG = highlightSet => (
    <svg width={width} height={height} className="svg">
      {graph.edges.map((e, idx) => {
        const u = positions.find(p => p.id === e.u);
        const v = positions.find(p => p.id === e.v);
        const isBlocked = idx === blockedEdgeIdx;
        if (layout === 'grid') {
          const dx = v.x - u.x, dy = v.y - u.y;
          const len = Math.hypot(dx, dy) || 1;
          const offset = Math.max(30, len * 0.3);
          const cx = (u.x + v.x) / 2 + (-dy / len) * offset;
          const cy = (u.y + v.y) / 2 + (dx / len) * offset;
          return <path key={idx} d={`M ${u.x},${u.y} Q ${cx},${cy} ${v.x},${v.y}`} className={isBlocked ? 'is-edge block' : 'is-edge'} />;
        }
        return <line key={idx} x1={u.x} y1={u.y} x2={v.x} y2={v.y} className={isBlocked ? 'is-edge block' : 'is-edge'} />;
      })}
      {positions.map(n => (
        <g key={n.id} onClick={() => handleNodeClick(n.id)} className="node-group">
          <circle cx={n.x} cy={n.y} r={radius} className={highlightSet.has(n.id) ? 'is-node selected' : 'is-node'} />
          <text x={n.x} y={n.y + 4} textAnchor="middle" className="node-label">{n.id}</text>
        </g>
      ))}
    </svg>
  );

  return (
    <div className="graph-container">
      <button className="back-button" onClick={onBack}>Main Menu</button>
      <button className="help-button" onClick={() => setShowHelp(true)}>?</button>

      {!gameOver && <h1 className="header">Independent Set Challenge</h1>}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}
      <div className="scoreboard">Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span></div>
      {!gameOver && (
        <div className="stats">
          Time Left: <span className="mono">{timeLeft}s</span> | You need to pick <span className="mono">{graph.k}</span> more vertices
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
              <div>Maximum independent set of {getMaxIndependentSetNodes(graph.nodes.length, graph.edges).size} vertices:</div>
              {renderSVG(getMaxIndependentSetNodes(graph.nodes.length, graph.edges))}
            </div>
          </div>
          <button onClick={handleRetry} className="retry-button">Try Again</button>
        </div>
      ) : (
        renderSVG(selected)
      )}

      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <h2>What is an Independent Set?</h2>
            <p>
              An <strong>independent set</strong> is a set of vertices with no edges between them.
              In each game, you will have 30 seconds and a target number of vertices to form an independent set. You can click on vertices to select them.
            </p>
            <div className="example">
              {(() => {
                const coords = [
                  [30, 60],
                  [80, 20],
                  [80, 100],
                  [150, 20],
                  [150, 60],
                  [150, 100],
                ];
                const edges = [
                  [0,1],[0,2],[1,2],[1,3],[1,4],[1,5]
                ];
                
                const valid = new Set([0,3,4,5]);
                
                const invalid = new Set([1,4]);
                return (
                  <>
                    {/* Valid example */}
                    <div className="example">

                      <svg width="200" height="120">
                        {edges.map(([u,v],i) => (
                          <line
                            key={i}
                            x1={coords[u][0]} y1={coords[u][1]}
                            x2={coords[v][0]} y2={coords[v][1]}
                            className="is-edge"
                          />
                        ))}
                        {coords.map(([x,y],i) => (
                          <g key={i}>
                            <circle
                              cx={x} cy={y} r="12"
                              className={valid.has(i) ? 'is-node selected' : 'is-node'}
                            />
                            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle">{i}</text>
                          </g>
                        ))}
                      </svg>
                      <p>Here, nodes 0, 3, 4, 5 are selected. No edges between them → valid independent set.</p>
                    </div>
                    {/* Invalid example */}
                    <div className="example">

                      <svg width="200" height="120">
                        {edges.map(([u,v],i) => (
                          <line
                            key={i}
                            x1={coords[u][0]} y1={coords[u][1]}
                            x2={coords[v][0]} y2={coords[v][1]}
                            className={(u===1 && v===4)||(u===4 && v===1) ? 'is-edge block' : 'is-edge'}
                          />
                        ))}
                        {coords.map(([x,y],i) => (
                          <g key={i}>
                            <circle
                              cx={x} cy={y} r="12"
                              className={invalid.has(i) ? 'is-node selected' : 'is-node'}
                            />
                            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle">{i}</text>
                          </g>
                        ))}
                      </svg>
                      <p>Here, nodes 1 and 4 are selected but share an edge → <strong>not</strong> a valid independent set.</p>
                    </div>
                  </>
                );
              })()}
            </div>
            <button onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
