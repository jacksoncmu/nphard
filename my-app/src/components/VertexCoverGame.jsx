import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GraphCommon.css';
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

export default function VertexCoverGame({ onBack }) {
  const TIMER = 30;
  const width = 400, height = 400, radius = 15;

  const init = useMemo(() => newRound({
    layoutProportions: { grid: 0.2, circle: 0.5, planar: 0.3 },
    edgeProbability: 0.4,
    nodeCountRange: [5, 12],
  }), []);

  // game state
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
    setTimeLeft(TIMER);
  }, [graph]);

  // 2) Start/pause the countdown based on gameOver or help
  useEffect(() => {
    // always clear any existing interval
    clearInterval(timerRef.current);

    // only run the timer if the game is live *and* help is not showing
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    }

    // clean up on unmount or dependency change
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

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
    const next = newRound(/* you can pass the same overrides again */);
    setLayout(next.layout);
    setGraph(next.graph); 
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
    <svg width={width} height={height} className="svg">
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
            className={highlightSet.has(n.id) ? 'vc-node selected' : 'vc-node'}
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
      <button
  className="help-button"
  onClick={() => setShowHelp(true)}
  aria-label="What is Vertex Cover?"
>
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
    <text
      x="8"
      y="11"
      textAnchor="middle"
      fontSize="10"
      fontFamily="Arial, sans-serif"
      fill="currentColor"
    >?</text>
  </svg>
</button>


      {!gameOver && <h1 className="header">Vertex Cover Challenge</h1>}
      {/* 
      <div className="game-info">
        Layout: <span className="mono">{layout}</span> | Nodes: <span className="mono">{graph.nodes.length}, {}</span>
      </div>
      */}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}
      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>
      {!gameOver && (
        
        <div className={`stats ${errorFlash ? 'error' : ''}`}>
          Time Left: <span className="mono">{timeLeft}s</span> | You can use {' '}
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

      <p>
      In each game, you will have 30 seconds and a limited number of vertices for selection. You can click on vertices to select them.
      </p>

      <div className="example-anim">
        {/* Shared data */}
        {(() => {
          const coords = [
            [30, 60], [80, 20], [80, 100],
            [150, 20], [150, 60], [150, 100]
          ];
          const edges = [
            [0,1], [0,2], [1,2],
            [1,3], [1,4], [1,5]
          ];

          return (
            <>
              {/* Step 1: select vertex 2 */}
              <div className="step">
                <h3>Step 1: select vertex 2</h3>
                <svg width="200" height="120">
                  {/* draw edges first */}
                  {edges.map(([u, v], idx) => {
                    const covered = (u === 2 || v === 2);
                    return (
                      <line
                        key={idx}
                        x1={coords[u][0]} y1={coords[u][1]}
                        x2={coords[v][0]} y2={coords[v][1]}
                        className={`vc-edge${covered ? ' covered' : ''}`}
                      />
                    );
                  })}

                  {/* draw nodes + labels on top */}
                  {coords.map(([x, y], i) => {
                    const isSelected = (i === 2);
                    return (
                      <g key={i}>
                        <circle
                          cx={x} cy={y} r="12"
                          className={`vc-node${isSelected ? ' selected' : ''}`}
                        />
                        <text
                          x={x} y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="vc-node-label"
                        >
                          {i}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Step 2: select vertex 1 (keep vertex 2) */}
              <div className="step">
                <h3>Step 2: select vertex 1</h3>
                <svg width="200" height="120">
                  {/* edges first, covered by step1 or step2 */}
                  {edges.map(([u, v], idx) => {
                    const coveredBy1 = (u === 2 || v === 2);
                    const coveredBy2 = (u === 1 || v === 1);
                    const covered = coveredBy1 || coveredBy2;
                    return (
                      <line
                        key={idx}
                        x1={coords[u][0]} y1={coords[u][1]}
                        x2={coords[v][0]} y2={coords[v][1]}
                        className={`vc-edge${covered ? ' covered' : ''}`}
                      />
                    );
                  })}

                  {/* nodes + labels on top */}
                  {coords.map(([x, y], i) => {
                    const wasSelected = (i === 2);
                    const isNowSelected = (i === 1);
                    const isSelected = wasSelected || isNowSelected;
                    return (
                      <g key={i}>
                        <circle
                          cx={x} cy={y} r="12"
                          className={`vc-node${isSelected ? ' selected' : ''}`}
                        />
                        <text
                          x={x} y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="vc-node-label"
                        >
                          {i}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </>
          );
        })()}

        <p>
          All edges are covered, so we're done! 
        </p>
      </div>
      <button onClick={() => setShowHelp(false)}>Got it!</button>
    </div>
  </div>
)}



    </div>
  );
}
