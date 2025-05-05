import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GraphCommon.css';
import './ThreeColorGame.css';

// Utility to generate a random graph guaranteed to be 3-colorable
function generate3ColorableGraph() {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nodeCount = Math.floor(Math.random() * 4) + 6;
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < 0.4) edges.push({ u: i, v: j });
      }
    }
    const coloring = find3Coloring(nodeCount, edges, 3);
    if (coloring) return { nodes, edges, correctColoring: coloring };
  }
  return {
    nodes: [{ id: 0 }, { id: 1 }, { id: 2 }],
    edges: [{ u: 0, v: 1 }, { u: 1, v: 2 }],
    correctColoring: [0, 1, 2]
  };
}

// backtracking solver for graph coloring
function find3Coloring(n, edges, maxColors) {
  const adj = Array.from({ length: n }, () => []);
  edges.forEach(({ u, v }) => {
    adj[u].push(v);
    adj[v].push(u);
  });
  const colors = Array(n).fill(0);
  function dfs(node) {
    if (node === n) return true;
    for (let c = 0; c < maxColors; c++) {
      if (adj[node].every(nei => colors[nei] !== c)) {
        colors[node] = c;
        if (dfs(node + 1)) return true;
      }
    }
    return false;
  }
  return dfs(0) ? colors : null;
}

export default function ThreeColorGame({ onBack }) {
  const TIMER = 40;
  const timerRef = useRef(null);

  const [gameData, setGameData] = useState(() => generate3ColorableGraph());
  const { nodes, edges, correctColoring } = gameData;
  const [selection, setSelection] = useState(nodes.map(() => 0));
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Start or restart round
  const startNext = () => {
    clearInterval(timerRef.current);
    const next = generate3ColorableGraph();
    setGameData(next);
    setSelection(next.nodes.map(() => 0));
    setTimeLeft(TIMER);
    setGameOver(false);
  };

  // Timer decrement
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameData, gameOver]);

  // Time-up handling triggers game over
  useEffect(() => {
    if (timeLeft <= 0 && !gameOver) {
      clearInterval(timerRef.current);
      setHighScore(hs => Math.max(hs, score));
      setGameOver(true);
    }
  }, [timeLeft, score, gameOver]);

  // Cycle color helper
  const cycleColor = (current, forward) => (current + (forward ? 1 : 2)) % 3;

  // On valid full coloring: win immediately
  const tryWin = newSel => {
    const conflict = edges.some(({ u, v }) => newSel[u] === newSel[v]);
    if (!conflict && !gameOver) {
      clearInterval(timerRef.current);
      setScore(s => s + 1);
      setHighScore(hs => Math.max(hs, score + 1));
      setTimeout(startNext, 500);
    }
  };

  const handleLeftClick = id => {
    if (gameOver) return;
    setSelection(sel => {
      const newSel = [...sel];
      newSel[id] = cycleColor(newSel[id], true);
      tryWin(newSel);
      return newSel;
    });
  };

  const handleRightClick = (e, id) => {
    e.preventDefault();
    if (gameOver) return;
    setSelection(sel => {
      const newSel = [...sel];
      newSel[id] = cycleColor(newSel[id], false);
      tryWin(newSel);
      return newSel;
    });
  };

  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  // Layout positions (circle)
  const positions = useMemo(() => {
    const width = 400, height = 400, radius = 15;
    return nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (width / 2 - 2 * radius) * Math.cos((2 * Math.PI * i) / nodes.length),
      y: height / 2 + (height / 2 - 2 * radius) * Math.sin((2 * Math.PI * i) / nodes.length)
    }));
  }, [nodes]);

  // Render colored SVG
  const renderSVG = arr => (
    <svg width={400} height={400} className="svg">
      {edges.map((e, i) => {
        const u = positions.find(p => p.id === e.u);
        const v = positions.find(p => p.id === e.v);
        return <line key={i} x1={u.x} y1={u.y} x2={v.x} y2={v.y} className="edge" />;
      })}
      {positions.map(n => (
        <g
          key={n.id}
          onClick={() => handleLeftClick(n.id)}
          onContextMenu={e => handleRightClick(e, n.id)}
          className="node-group"
        >
          <circle
            cx={n.x}
            cy={n.y}
            r={15}
            className={`color-node color-${arr[n.id]}`}
          />
          <text x={n.x} y={n.y + 4} textAnchor="middle" className="node-label">
            {n.id}
          </text>
        </g>
      ))}
    </svg>
  );

  return (
    <div className="graph-container">
      <button className="back-button" onClick={onBack}>Main Menu</button>
      {!gameOver && <h1 className="header">3-Colorability Challenge</h1>}
      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>
      {!gameOver && <div className="stats">Time Left: <span className="mono">{timeLeft}s</span></div>}
      {/* Main SVG or overlay */}
      {gameOver ? (
        <div className="game-over">
          <div className="graphs">
            <div>
              <div>Your last coloring:</div>
              {renderSVG(selection)}
            </div>
            <div>
              <div>One valid 3-coloring:</div>
              {renderSVG(correctColoring)}
            </div>
          </div>
          <button onClick={handleRetry} className="retry-button">Retry</button>
        </div>
      ) : (
        renderSVG(selection)
      )}
    </div>
  );
}
