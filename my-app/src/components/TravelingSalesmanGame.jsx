import React, { useState, useEffect, useRef, useMemo } from "react";
import "./GraphCommon.css";
import "./TravelingSalesmanGame.css";

// ---------- Helper utilities ---------- //

// Lay out points randomly but not too close together
function planarLayout(nodes, width, height, radius) {
  const minDist = 120;
  const placed = [];

  for (let i = 0; i < nodes.length; i++) {
    let x, y;
    do {
      x = Math.random() * (width - 2 * radius) + radius;
      y = Math.random() * (height - 2 * radius) + radius;
    } while (placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist));
    placed.push({ id: nodes[i].id, x, y });
  }
  return placed;
}

// Euclidean distance rounded to nearest integer
function dist(a, b) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
}

// Brute‑force optimal TSP tour (n ≤ 7)
function getOptimalTour(nodes) {
  const n = nodes.length;
  const idxs = [...Array(n).keys()]; // 0,1,…,n‑1 so array index === id
  let bestLen = Infinity;
  let bestTour = [];

  function permute(path, remaining) {
    if (remaining.length === 0) {
      // Compute cycle length (include return to start)
      const len = path.reduce((sum, id, i) => {
        const nextId = path[(i + 1) % n];
        const u = nodes[id];
        const v = nodes[nextId];
        return sum + dist(u, v);
      }, 0);

      if (len < bestLen) {
        bestLen = len;
        bestTour = [...path, path[0]]; // closed tour for easier drawing
      }
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      permute([...path, remaining[i]], remaining.filter((_, j) => j !== i));
    }
  }
  permute([idxs[0]], idxs.slice(1));
  return { bestTour, bestLen };
}

// Generate a small complete graph with 5–7 nodes and its optimal tour
function generateTspGraph(width, height, radius) {
  const nodeCount = Math.floor(Math.random() * 3) + 5; // 5–7
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
  const placed = planarLayout(nodes, width, height, radius);

  const edges = [];
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const w = dist(placed[i], placed[j]);
      edges.push({ u: i, v: j, w });
    }
  }

  const { bestTour, bestLen } = getOptimalTour(placed);
  return { nodes: placed, edges, optimal: bestTour, optimalLen: bestLen };
}

// ---------- React component ---------- //

export default function TravelingSalesmanGame({ onBack }) {
  const TIMER = 45;
  const width = 400,
    height = 400,
    radius = 15;

  const init = useMemo(() => generateTspGraph(width, height, radius), []);
  const [graph, setGraph] = useState(init);
  const [selected, setSelected] = useState([]); // order of node ids forming current path
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  // Reset selection on new graph
  useEffect(() => setSelected([]), [graph]);

  // Timer logic
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

  // Handle time up
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(hs => Math.max(hs, score));
    }
  }, [timeLeft, score]);

  // Start next round
  const startNext = () => {
    setGraph(generateTspGraph(width, height, radius));
    setGameOver(false);
    setTimeLeft(TIMER);
  };

  // Win check (length equality with optimal)
  useEffect(() => {
    const n = graph.nodes.length;
    if (selected.length === n + 1) {
      const len = selected.reduce((sum, id, i) => {
        const u = graph.nodes[id];
        const v = graph.nodes[selected[(i + 1) % selected.length]];
        return sum + dist(u, v);
      }, 0);
      if (len === graph.optimalLen) {
        setScore(s => s + 1);
        setTimeout(startNext, 500);
      }
    }
  }, [selected, graph]);

  // Node click handler
  const handleNodeClick = id => {
    if (gameOver || showHelp) return;
    setSelected(prev => {
      if (prev.length === 0) return [id];
      // close cycle
      if (prev.length === graph.nodes.length && id === prev[0]) return [...prev, id];
      // ignore duplicates
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  // Retry
  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  

  // SVG renderer
  const renderSVG = path => (
    <svg width={width} height={height} className="svg">
      {graph.edges.map((e, idx) => {
        const u = graph.nodes[e.u];
        const v = graph.nodes[e.v];
        const isPathEdge = path.some((id, i) => {
          const next = path[i + 1];
          if (next === undefined) return false;
          return (
            (id === e.u && next === e.v) ||
            (id === e.v && next === e.u)
          );
        });
        return (
          <g key={idx} className="tsp-edge-group">
            <line
              x1={u.x}
              y1={u.y}
              x2={v.x}
              y2={v.y}
              className={isPathEdge ? "tsp-edge selected" : "tsp-edge"}
            />
            <text
              x={(u.x + v.x) / 2}
              y={(u.y + v.y) / 2 - 4}
              textAnchor="middle"
              className={isPathEdge ? "edge-weight selected" : "edge-weight"}
            >
              {e.w}
            </text>

          </g>
        );
      })}
      {graph.nodes.map(n => {
        const isSelected = selected.includes(n.id);
        return (
        <g key={n.id} onClick={() => handleNodeClick(n.id)} className={`node-group${isSelected ? " selected" : ""}`}>
          <circle
        cx={n.x}
        cy={n.y}
        r={radius}
        className={`tsp-node${isSelected ? " selected" : ""}`}
      />
        </g>
      )})}
    </svg>
  );

  return (
    <div className="graph-container">
      <button className="back-button" onClick={onBack}>Main Menu</button>
      <button
        className="help-button"
        onClick={() => setShowHelp(true)}
        aria-label="What is the Traveling Salesman Problem?"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="10"
            fontFamily="Arial, sans-serif"
            fill="currentColor"
          >
            ?
          </text>
        </svg>
      </button>

      {!gameOver && <h1 className="header">TSP Challenge</h1>}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}
      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>
      {!gameOver && (
        <div className="stats">
          Time Left: <span className="mono">{timeLeft}s</span> | Nodes: <span className="mono">{graph.nodes.length}</span>
        </div>
      )}

      {gameOver ? (
        <div className="game-over">
          <div className="graphs">
            <div>
              <div>
                Your tour (length {selected.length >= graph.nodes.length + 1
                  ? selected.reduce((sum, id, i) => {
                      const u = graph.nodes[id];
                      const v = graph.nodes[selected[(i + 1) % selected.length]];
                      return sum + dist(u, v);
                    }, 0)
                  : "—"}
                )
              </div>
              {renderSVG(selected)}
            </div>
            <div>
              <div>Optimal tour (length {graph.optimalLen})</div>
              {renderSVG(graph.optimal)}
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
            <h2>What is the Traveling Salesman Problem?</h2>
            <p>
              The <strong>Traveling Salesman Problem (TSP)</strong> asks for the shortest possible tour that visits every city exactly once and returns to the starting city. In this game you have 45&nbsp;seconds to build such a tour. Click the cities in order, then click the starting city again to close the cycle. If your tour length matches the optimal length, you win the round!
            </p>
            <p>The number on each edge shows its distance.</p>
            <button onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
