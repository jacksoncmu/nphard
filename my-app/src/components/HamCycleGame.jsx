import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GraphCommon.css';
import './HamCycleGame.css'; 
import hamCycle from "../assets/ham-cycle.png";


// put this alongside your other helpers
function planarLayout(nodes, width, height, radius) {
  const minDist = 100;
  const placed = [];

  for (let i = 0; i < nodes.length; i++) {
    let x, y;
    do {
      x = Math.random() * (width  - 2 * radius) + radius;
      y = Math.random() * (height - 2 * radius) + radius;
    } while (placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist));
    placed.push({ id: nodes[i].id, x, y });
  }

  return placed;
}

function generateHamiltonianGraph() {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nodeCount = Math.floor(Math.random() * 4) + 5;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
    const edges = [];
    const cycle = nodes.map(n => n.id).sort(() => Math.random() - 0.5);
    for (let i = 0; i < nodeCount; i++) {
      const u = cycle[i];
      const v = cycle[(i + 1) % nodeCount];
      edges.push({ u, v });
    }
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (
          Math.random() < 0.2 &&
          !edges.some(e =>
            (e.u === i && e.v === j) || (e.u === j && e.v === i)
          )
        ) {
          edges.push({ u: i, v: j });
        }
      }
    }
    const cycleFound = findHamiltonianCycle(nodeCount, edges);
    if (cycleFound) {
      return { nodes, edges, cycle: cycleFound };
    }
  }
  return {
    nodes: [{ id: 0 }, { id: 1 }, { id: 2 }],
    edges: [
      { u: 0, v: 1 },
      { u: 1, v: 2 },
      { u: 2, v: 0 }
    ],
    cycle: [0, 1, 2]
  };
}

function findHamiltonianCycle(n, edges) {
  const adj = Array.from({ length: n }, () => new Set());
  edges.forEach(({ u, v }) => {
    adj[u].add(v);
    adj[v].add(u);
  });
  const path = [];
  const used = Array(n).fill(false);

  function dfs(u, depth) {
    path.push(u);
    used[u] = true;
    if (depth === n) {
      if (adj[u].has(path[0])) return true;
      used[u] = false;
      path.pop();
      return false;
    }
    for (let v of adj[u]) {
      if (!used[v] && dfs(v, depth + 1)) return true;
    }
    used[u] = false;
    path.pop();
    return false;
  }

  for (let start = 0; start < n; start++) {
    if (dfs(start, 1)) return [...path];
  }
  return null;
}

function newRoundHC() {
  let layout, g;
  do {
    const r = Math.random();
    layout = r < 0.30 ? 'circle' : r < 0.40 ? 'grid' : 'planar';
    g = generateHamiltonianGraph();
  } while (layout === 'grid' && g.nodes.length > 8);
  return { layout, graph: g };
}

export default function HamiltonianCycleGame({ onBack }) {
  const TIMER = 30;
  const width = 400,
    height = 400,
    radius = 15;

  const init = useMemo(() => newRoundHC(), []);
  const [layout, setLayout] = useState(init.layout);
  const [graph, setGraph] = useState(init.graph);
  const [selected, setSelected] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  const resetRound = () => {
    setSelected([]);
    setErrorFlash(false);
    setShowCorrect(false);
  };

  const positions = useMemo(() => {
    if (layout === 'grid' && graph.nodes.length <= 8) {
      const cols = 4,
        rows = 2;
      const xSp = width / (cols + 1);
      const ySp = height / (rows + 1);
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
        x:
          width / 2 +
          (width / 2 - 2 * radius) * Math.cos((2 * Math.PI * i) / graph.nodes.length),
        y:
          height / 2 +
          (height / 2 - 2 * radius) * Math.sin((2 * Math.PI * i) / graph.nodes.length)
      }));
    } else {
      return planarLayout(graph.nodes, width, height, radius);
    }
  }, [graph, layout]);

  useEffect(() => setTimeLeft(TIMER), [graph]);
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp && !showCorrect) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp, showCorrect]);

  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(h => Math.max(h, score));
    }
  }, [timeLeft, score]);

  const startNext = () => {
    const next = newRoundHC();
    setLayout(next.layout);
    setGraph(next.graph);
    setSelected([]);
    setGameOver(false);
    setTimeLeft(TIMER);
    setShowCorrect(false);
  };

  useEffect(() => {
    if (!gameOver && !showCorrect && selected.length === graph.nodes.length) {
      const cycle = graph.cycle;
      const n = cycle.length;
      let match = false;
      for (let offset = 0; offset < n; offset++) {
        const rotated = cycle.slice(offset).concat(cycle.slice(0, offset));
        if (rotated.every((v, i) => v === selected[i])) {
          match = true;
          break;
        }
        const rev = [...rotated].reverse();
        if (rev.every((v, i) => v === selected[i])) {
          match = true;
          break;
        }
      }
      if (match) {
        setScore(s => s + 1);
        setShowCorrect(true);
        setTimeout(startNext, 2000);
      } else {
        setErrorFlash(true);
        setTimeout(() => setErrorFlash(false), 500);
      }
    }
  }, [selected, graph, gameOver, showCorrect]);

  const handleNodeClick = id => {
    if (gameOver || showHelp || showCorrect) return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  /**
   * edgesToHighlight: array of [u,v] pairs to bold
   * selectedList: optional array of node IDs to force-selected
   */
  const renderSVG = (edgesToHighlight, selectedList = selected) => (
    <svg width={width} height={height} className="svg">
      {graph.edges.map((e, i) => {
        const u = positions.find(p => p.id === e.u);
        const v = positions.find(p => p.id === e.v);
        const bold = edgesToHighlight.some(
          ([a, b]) =>
            (a === e.u && b === e.v) || (a === e.v && b === e.u)
        );
        if (layout === 'grid') {
          const dx = v.x - u.x,
            dy = v.y - u.y;
          const len = Math.hypot(dx, dy) || 1;
          const offset = Math.max(30, len * 0.3);
          const cx = (u.x + v.x) / 2 + (-dy / len) * offset;
          const cy = (u.y + v.y) / 2 + (dx / len) * offset;
          return (
            <path
              key={i}
              d={`M ${u.x},${u.y} Q ${cx},${cy} ${v.x},${v.y}`}
              className={bold ? 'edge bold' : 'edge'}
            />
          );
        }
        return (
          <line
            key={i}
            x1={u.x}
            y1={u.y}
            x2={v.x}
            y2={v.y}
            className={bold ? 'edge bold' : 'edge'}
          />
        );
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
            className={selectedList.includes(n.id) ? 'ham-node selected' : 'ham-node'}
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

  const highlightEdges =
    selected.length > 1
      ? selected.map((v, i) => [v, selected[(i + 1) % selected.length]])
      : [];

  const correctEdges = graph.cycle.map((v, i) => [
    v,
    graph.cycle[(i + 1) % graph.cycle.length]
  ]);

  return (
    <div className="graph-container">
      <button className="back-button" onClick={onBack}>
        Main Menu
      </button>
      <button
        className="help-button"
        onClick={() => setShowHelp(true)}
        aria-label="What is Hamiltonian Cycle?"
      >
        ?
      </button>

      {!gameOver && !showCorrect && (
        <h1 className="header">Hamiltonian Cycle Challenge</h1>
      )}
      {gameOver && !showCorrect && <h1 className="game-over-text">Time's up!</h1>}
      {showCorrect && <h1 className="header">Correct!</h1>}

      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score:{' '}
        <span className="mono">{highScore}</span>
      </div>
      {!gameOver && !showCorrect && (
        <div className={`stats ${errorFlash ? 'error' : ''}`}>
          Time Left: <span className="mono">{timeLeft}s</span>
        </div>
      )}
      {!gameOver && !showCorrect && (
        <button className="retry-button" onClick={resetRound}>
          Reset
        </button>
      )}

      {showCorrect ? (
        <div className="game-over" style={{ display: 'flex', gap: '1rem' }}>
          <div>Correct cycle:</div>
          {renderSVG(correctEdges, graph.cycle)}
        </div>
      ) : gameOver ? (
        <div
          className="game-over"
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '2rem',
            justifyContent: 'center'
          }}
        >
          <div className="graphs">
            <div>Your selection:</div>
            {renderSVG(highlightEdges)}
          </div>
          <div className="graphs">
            <div>Correct cycle:</div>
            {renderSVG(correctEdges, graph.cycle)}
          </div>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      ) : (
        renderSVG(highlightEdges)
      )}

{showHelp && (
  <div className="help-overlay" onClick={() => setShowHelp(false)}>
    <div className="help-modal" onClick={e => e.stopPropagation()}>
      <h2>What is a Hamiltonian Cycle?</h2>
      <img
  src={hamCycle}
  alt="Hamiltonian cycle example"
  style={{
    display: 'block',      // make it a block so margin auto works
    margin: '1rem auto',   // center horizontally & give vertical space
    maxWidth: '70%',      // never overflow container
    height: 'auto'         // preserve aspect ratio
  }}
/>


      <p>
        A Hamiltonian cycle is a closed loop that visits every vertex exactly once. You need to select the vertices in the cycle's order. Click "retry" to de-select all vertices.
      </p>
      <button onClick={() => setShowHelp(false)}>Got it!</button>
    </div>
  </div>
)}

    </div>
  );
}
