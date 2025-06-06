import React, { useState, useEffect, useRef, useMemo } from "react";
import "./GraphCommon.css";
import "./TravelingSalesmanGame.css";
import tspExample from "../assets/tsp-game.png"; 



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

function dist(a, b) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
}

function getOptimalTour(nodes) {
  const n = nodes.length;
  const idxs = [...Array(n).keys()];
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
      permute(
        [...path, remaining[i]],
        remaining.filter((_, j) => j !== i)
      );
    }
  }

  permute([idxs[0]], idxs.slice(1));
  return { bestTour, bestLen };
}

function generateTspGraph(width, height, radius) {
  const nodeCount = Math.floor(Math.random() * 3) + 3;
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



export default function TravelingSalesmanGame({ onBack }) {
  const TIMER = 40;
  const width = 400, height = 400, radius = 15;

  const init = useMemo(() => generateTspGraph(width, height, radius), []);
  const [graph, setGraph] = useState(init);
  const [selected, setSelected] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('TSPHighScore');
    return saved !== null ? Number(saved) : 0;
  });
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => setSelected([]), [graph]);

  useEffect(() => {
    localStorage.setItem('TSPHighScore', highScore);
  }, [highScore]);
  

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
          return (
            next !== undefined &&
            ((id === e.u && next === e.v) || (id === e.v && next === e.u))
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
        const isSelected = path.includes(n.id);
        return (
          <g
            key={n.id}
            onClick={() => handleNodeClick(n.id)}
            className={`node-group${isSelected ? " selected" : ""}`}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={radius}
              className={`tsp-node${isSelected ? " selected" : ""}`}
            />
          </g>
        );
      })}
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
        aria-label="What is the Traveling Salesman Problem?"
      >
        ?
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
          <button className="retry-button" onClick={() => setSelected([])}>
            Reset
          </button>
        </>
      )}

      {gameOver ? (
        <div
          className="game-over"
          style={{ display: "flex", flexDirection: "row", gap: "2rem", justifyContent: "center" }}
        >
          <div className="graphs">
            <div>Your solution:</div>
            {renderSVG(selected)}
          </div>
          <div className="graphs">
            <div>Correct cycle:</div>
            {renderSVG(graph.optimal)}
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
            <h2>What is the Traveling Salesman Problem?</h2>
            <img
              src={tspExample}
              alt="Sample TSP tour"
              style={{ display: 'block', margin: '1rem auto', maxWidth: '50%', height: 'auto' }}
            />
            <p>
              The <strong>Traveling Salesman Problem (TSP)</strong> asks for the shortest possible cycle that visits every vertex exactly once. The distance between each vertex is shown as a number next to the edge between them. Press "Reset" to de-select all vertices.
            </p>
            <button onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
