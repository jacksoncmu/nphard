import React, { useState, useEffect, useRef, useMemo } from 'react';

// Utility to generate a random graph that is guaranteed to have a vertex cover
function generateGraph() {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nodeCount = Math.floor(Math.random() * 4) + 6; // 6-9 nodes
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < 0.3) edges.push({ u: i, v: j });
      }
    }
    if (edges.length === 0) edges.push({ u: 0, v: 1 });
    const minCover = findMinVertexCover(nodeCount, edges);
    if (minCover !== null) return { nodes, edges, k: minCover };
  }
  return { nodes: [{ id: 0 }, { id: 1 }], edges: [{ u: 0, v: 1 }], k: 1 };
}

function findMinVertexCover(n, edges) {
  let best = null;
  for (let mask = 0; mask < (1 << n); mask++) {
    const selected = [...Array(n).keys()].filter(i => mask & (1 << i));
    if (best !== null && selected.length >= best) continue;
    if (edges.every(({ u, v }) => selected.includes(u) || selected.includes(v))) {
      best = selected.length;
    }
  }
  return best;
}

export default function VertexCoverGame() {
  const TIMER = 30;
  const width = 400, height = 400, radius = 15;
  const ARC_OFFSET = 50;

  const [graph, setGraph] = useState(generateGraph());
  const [selected, setSelected] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const timerRef = useRef(null);
  const layout = useMemo(() => (Math.random() < 0.5 ? 'circle' : 'grid'), [graph]);

  // Reset timer when a new game starts or graph changes
  useEffect(() => {
    if (!gameOver) {
      clearInterval(timerRef.current);
      setTimeLeft(TIMER);
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, graph]);

  // End game when time runs out
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(hs => Math.max(hs, score));
    }
  }, [timeLeft, score]);

  // Check for correct cover
  useEffect(() => {
    const { edges, k } = graph;
    if (
      edges.every(({ u, v }) => selected.has(u) || selected.has(v)) &&
      selected.size === k
    ) {
      setScore(s => s + 1);
      setTimeout(() => {
        setGraph(generateGraph());
        setSelected(new Set());
      }, 500);
    }
  }, [selected, graph]);

  const handleNodeClick = id => {
    if (gameOver) return;
    setSelected(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else if (copy.size < graph.k) copy.add(id);
      return copy;
    });
  };

  const handleRetry = () => {
    setScore(0);
    setGameOver(false);
    setGraph(generateGraph());
    setSelected(new Set());
  };

  // Compute node positions once per graph/layout
  const positions = useMemo(() => {
    if (layout === 'grid' && graph.nodes.length <= 8) {
      const cols = 4, rows = 2;
      const xSpacing = width / (cols + 1);
      const ySpacing = height / (rows + 1);
      const availableSpots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          availableSpots.push({ row: r, col: c });
        }
      }
      for (let i = availableSpots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableSpots[i], availableSpots[j]] = [
          availableSpots[j],
          availableSpots[i]
        ];
      }
      return graph.nodes.map((n, i) => {
        const { row, col } = availableSpots[i];
        return {
          ...n,
          row,
          col,
          x: xSpacing * (col + 1),
          y: ySpacing * (row + 1)
        };
      });
    } else {
      return graph.nodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / graph.nodes.length;
        return {
          ...n,
          x:
            width / 2 +
            (width / 2 - 2 * radius) * Math.cos(angle),
          y:
            height / 2 +
            (height / 2 - 2 * radius) * Math.sin(angle)
        };
      });
    }
  }, [graph, layout]);

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-2">Vertex Cover Challenge</h1>
      <div className="mb-2">
        Score: <span className="font-mono">{score}</span> | High Score:{' '}
        <span className="font-mono">{highScore}</span>
      </div>

      {gameOver ? (
        <div className="flex flex-col items-center">
          <div className="text-xl text-red-600 mb-2">
            Time's up! Game over.
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2">
            Time Left: <span className="font-mono">{timeLeft}s</span> | Remaining:{' '}
            <span className="font-mono">{graph.k - selected.size}</span> vertices
          </div>
          <svg width={width} height={height} className="border">
          {graph.edges.map((edge, idx) => {
  const uPos = positions.find(p => p.id === edge.u);
  const vPos = positions.find(p => p.id === edge.v);
  const bold = selected.has(edge.u) || selected.has(edge.v);

  // —— new: straight lines for circle layout ——
  if (layout === 'circle') {
    return (
      <line
        key={idx}
        x1={uPos.x}
        y1={uPos.y}
        x2={vPos.x}
        y2={vPos.y}
        strokeWidth={bold ? 4 : 2}
        stroke={bold ? 'black' : 'gray'}
      />
    );
  }

  // —— existing grid-only code below ——
  // top-row circle arcs
  if (
    uPos.row === 0 &&
    vPos.row === 0 &&
    Math.abs(uPos.col - vPos.col) > 1
  ) {
    const x1 = uPos.x, y1 = uPos.y, x2 = vPos.x, y2 = vPos.y;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = ARC_OFFSET;
    return (
      <path
        key={idx}
        d={`M ${x1} ${y1} A ${rx} ${ry} 0 0 1 ${x2} ${y2}`}
        fill="none"
        strokeWidth={bold ? 4 : 2}
        stroke={bold ? 'black' : 'gray'}
      />
    );
  }

  const useArc =
    (uPos.row === vPos.row && Math.abs(uPos.col - vPos.col) > 1) ||
    (uPos.col === vPos.col && Math.abs(uPos.row - vPos.row) > 0);

  if (!useArc && (uPos.x === vPos.x || uPos.y === vPos.y)) {
    return (
      <line
        key={idx}
        x1={uPos.x}
        y1={uPos.y}
        x2={vPos.x}
        y2={vPos.y}
        strokeWidth={bold ? 4 : 2}
        stroke={bold ? 'black' : 'gray'}
      />
    );
  } else {
    const midX = (uPos.x + vPos.x) / 2;
    const midY = (uPos.y + vPos.y) / 2;
    const dx = vPos.x - uPos.x;
    const dy = vPos.y - uPos.y;
    const len = Math.hypot(dx, dy) || 1;
    const normX = -dy / len;
    const normY = dx / len;
    const cx = midX + normX * ARC_OFFSET;
    const cy = midY + normY * ARC_OFFSET;
    return (
      <path
        key={idx}
        d={`M ${uPos.x} ${uPos.y} Q ${cx} ${cy} ${vPos.x} ${vPos.y}`}
        fill="none"
        strokeWidth={bold ? 4 : 2}
        stroke={bold ? 'black' : 'gray'}
      />
    );
  }
})} 

            {positions.map(node => (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  stroke={selected.has(node.id) ? 'black' : 'gray'}
                  strokeWidth={selected.has(node.id) ? 4 : 2}
                  fill={selected.has(node.id) ? 'lightgreen' : 'white'}
                />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  className="pointer-events-none text-sm"
                >
                  {node.id}
                </text>
              </g>
            ))}
          </svg>
        </>
      )}
    </div>
  );
}
