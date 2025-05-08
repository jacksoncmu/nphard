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
  const idxs = [...Array(n).keys()]; // 0,1,…,n‑1
  let bestLen = Infinity;
  let bestTour = [];

  function permute(path, remaining) {
    if (remaining.length === 0) {
      const len = path.reduce((sum, id, i) => {
        const nextId = path[(i + 1) % n];
        return sum + dist(nodes[id], nodes[nextId]);
      }, 0);
      if (len < bestLen) {
        bestLen = len;
        bestTour = [...path, path[0]];
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
  const nodeCount = Math.floor(Math.random() * 3) + 3; // 4–6
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
  const placed = planarLayout(nodes, width, height, radius);

  const edges = [];
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      edges.push({ u: i, v: j, w: dist(placed[i], placed[j]) });
    }
  }

  const { bestTour, bestLen } = getOptimalTour(placed);
  return { nodes: placed, edges, optimal: bestTour, optimalLen: bestLen };
}

// ---------- React component ---------- //

export default function TravelingSalesmanGame({ onBack }) {
  const TIMER = 5;
  const width = 400, height = 400, radius = 15;

  const init = useMemo(() => generateTspGraph(width, height, radius), []);
  const [graph, setGraph] = useState(init);
  const [selected, setSelected] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => setSelected([]), [graph]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(hs => Math.max(hs, score));
    }
  }, [timeLeft, score]);

  const startNext = () => {
    setGraph(generateTspGraph(width, height, radius));
    setGameOver(false);
    setTimeLeft(TIMER);
  };

  // Win check: once you've selected each node once
  useEffect(() => {
    const n = graph.nodes.length;
    if (selected.length === n) {
      const len = selected.reduce((sum, id, i) => {
        const next = selected[(i + 1) % n];
        return sum + dist(graph.nodes[id], graph.nodes[next]);
      }, 0);
      if (len === graph.optimalLen) {
        setScore(s => s + 1);
        setTimeout(startNext, 500);
      }
    }
  }, [selected, graph]);

  const handleNodeClick = id => {
    if (gameOver || showHelp) return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRetry = () => {
    setScore(0);
    startNext();
  };

  const renderSVG = path => (
    <svg width={width} height={height} className="svg">
      {graph.edges.map((e, idx) => {
        const u = graph.nodes[e.u];
        const v = graph.nodes[e.v];
        const isPathEdge = path.some((id, i) => {
          const next = path[i + 1];
          return next !== undefined && 
            ((id === e.u && next === e.v) || (id === e.v && next === e.u));
        });
        return (
          <g key={idx} className="tsp-edge-group">
            <line
              x1={u.x} y1={u.y} x2={v.x} y2={v.y}
              className={isPathEdge ? "tsp-edge selected" : "tsp-edge"}
            />
            <text
              x={(u.x + v.x) / 2} y={(u.y + v.y) / 2 - 4}
              textAnchor="middle"
              className={isPathEdge ? "edge-weight selected" : "edge-weight"}
            >{e.w}</text>
          </g>
        );
      })}
      {graph.nodes.map(n => (
        <g key={n.id} onClick={() => handleNodeClick(n.id)}
           className={`node-group${selected.includes(n.id) ? " selected" : ""}`}>
          <circle cx={n.x} cy={n.y} r={radius}
                  className={`tsp-node${selected.includes(n.id) ? " selected" : ""}`} />
        </g>
      ))}
    </svg>
  );

  return (
    <div className="graph-container">
      <button className="back-button" onClick={onBack}>Main Menu</button>
      <button className="help-button" onClick={() => setShowHelp(true)} aria-label="What is the Traveling Salesman Problem?">
        {/* help icon */}
      </button>

      {!gameOver && <h1 className="header">TSP Challenge</h1>}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}
      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>
      {!gameOver && (
        <>
          <div className="stats">
            Time Left: <span className="mono">{timeLeft}s</span>
          </div>
          <button className="retry-button" onClick={() => setSelected([])}>Reset</button>
        </>
      )}

{gameOver ? (
        <div
          className="game-over"
          style={{ display: 'flex', flexDirection: 'row', gap: '2rem', justifyContent: 'center' }}
        >
          <div className="graphs">
            <div>Your solution:</div>
            {renderSVG(selected)}
          </div>
          <div className="graphs">
            <div>Correct cycle:</div>
            {renderSVG(graph.optimal)}
          </div>
          <button onClick={handleRetry} className="retry-button">Retry</button>
        </div>
      ) : (
        renderSVG(selected)
      )}

      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <h2>What is the Traveling Salesman Problem?</h2>
            <p>
              The <strong>Traveling Salesman Problem (TSP)</strong> asks for the shortest possible tour that visits every city exactly once and returns to the starting city. In this game you have 45 seconds to build such a tour—just select each city once; the cycle back to start is automatic!
            </p>
            <button onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
