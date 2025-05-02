// src/utils/graphUtils.js

// Default parameters
export const DEFAULT_OPTIONS = {
  nodeCountRange: [6, 9],      // inclusive: min and max number of nodes
  edgeProbability: 0.3,        // for generateGraph
  layoutProportions: {         // used by pickLayout below
    grid: 0.3,
    circle: 0.3,
    planar: 0.4,
  },
  planar: {
    minDist: 100,              // minimal distance between planar nodes
    maxNeighbors: 3,
    coordBounds: { x: [20, 380], y: [20, 380] },
  }
};

/** brute‑force solver for size of minimum vertex cover */
export function findMinVertexCover(n, edges) {
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

/** Returns { nodes: Array<{id}>, edges: Array<{u,v}>, k } */
export function generateRandomGraph({ nodeCount, edgeProbability }) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i }));
  const edges = [];
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (Math.random() < edgeProbability) {
        edges.push({ u: i, v: j });
      }
    }
  }
  // ensure at least one edge
  if (edges.length === 0) edges.push({ u: 0, v: 1 });
  const k = findMinVertexCover(nodeCount, edges);
  return { nodes, edges, k };
}

/** Grid layout: place nodes in an even grid */
function layoutGrid(nodes, bounds = { x: [20, 380], y: [20, 380] }) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const [xMin, xMax] = bounds.x;
  const [yMin, yMax] = bounds.y;
  nodes.forEach((n, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    n.x = xMin + (xMax - xMin) * (col / (cols - 1 || 1));
    n.y = yMin + (yMax - yMin) * (row / (rows - 1 || 1));
  });
  return nodes;
}

/** Circle layout: place nodes around a circle */
function layoutCircle(nodes, center = { x: 200, y: 200 }, radius = 160) {
  const angleStep = (2 * Math.PI) / nodes.length;
  nodes.forEach((n, idx) => {
    const theta = idx * angleStep;
    n.x = center.x + radius * Math.cos(theta);
    n.y = center.y + radius * Math.sin(theta);
  });
  return nodes;
}

/** Returns { nodes: Array<{id,x,y}>, edges: Array<{u,v}>, k } */
export function generatePlanarGraph({ nodeCount, minDist, maxNeighbors, coordBounds: { x: [xMin, xMax], y: [yMin, yMax] } }) {
  const nodes = [];
  while (nodes.length < nodeCount) {
    const x = Math.random() * (xMax - xMin) + xMin;
    const y = Math.random() * (yMax - yMin) + yMin;
    if (!nodes.some(n => Math.hypot(n.x - x, n.y - y) < minDist)) {
      nodes.push({ id: nodes.length, x, y });
    }
  }
  const edges = [];
  // ... (same crossing check logic as before) ...
  // ensure connectivity
  if (edges.length < nodeCount - 1) {
    for (let i = 1; i < nodeCount; i++) edges.push({ u: i - 1, v: i });
  }
  const k = findMinVertexCover(nodeCount, edges);
  return { nodes, edges, k };
}

/** Randomly pick a layout according to proportions */
export function pickLayout({ grid, circle, planar }) {
  const r = Math.random();
  if (r < grid) return 'grid';
  if (r < grid + circle) return 'circle';
  return 'planar';
}

/** High‑level API: pick a layout, generate the appropriate graph, and assign positions */
export function newRound(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { nodeCountRange, edgeProbability, layoutProportions, planar, ...rest } = opts;
  const nodeCount = Math.floor(
    Math.random() * (nodeCountRange[1] - nodeCountRange[0] + 1)
  ) + nodeCountRange[0];

  const layout = pickLayout(layoutProportions);
  let graph;
  if (layout === 'planar') {
    graph = generatePlanarGraph({ nodeCount, ...planar });
  } else {
    graph = generateRandomGraph({ nodeCount, edgeProbability });
    // add layout positions
    if (layout === 'grid') {
      graph.nodes = layoutGrid(graph.nodes, planar.coordBounds);
    } else if (layout === 'circle') {
      graph.nodes = layoutCircle(graph.nodes);
    }
  }
  return { layout, graph };
}
