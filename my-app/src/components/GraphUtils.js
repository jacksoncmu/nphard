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
  export function generateRandomGraph({
    nodeCount,
    edgeProbability,
  }) {
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
  
  /** Returns { nodes: Array<{id,x,y}>, edges: Array<{u,v}>, k } */
  export function generatePlanarGraph({
    nodeCount,
    minDist,
    maxNeighbors,
    coordBounds: { x: [xMin, xMax], y: [yMin, yMax] }
  }) {
    const nodes = [];
    while (nodes.length < nodeCount) {
      const x = Math.random() * (xMax - xMin) + xMin;
      const y = Math.random() * (yMax - yMin) + yMin;
      if (!nodes.some(n => Math.hypot(n.x - x, n.y - y) < minDist)) {
        nodes.push({ id: nodes.length, x, y });
      }
    }
    const edges = [];
    nodes.forEach((ni, i) => {
      // sort by distance
      const byDist = nodes
        .map(n => ({ id: n.id, dist: Math.hypot(n.x - ni.x, n.y - ni.y) }))
        .sort((a, b) => a.dist - b.dist);
      for (let j = 1; j <= maxNeighbors && j < byDist.length; j++) {
        const v = byDist[j].id;
        if (!edges.some(e => (e.u === i && e.v === v) || (e.u === v && e.v === i))) {
          // check no crossing
          const crosses = edges.some(e => {
            const A = nodes.find(n => n.id === e.u);
            const B = nodes.find(n => n.id === e.v);
            const C = ni;
            const D = nodes.find(n => n.id === v);
            const orient = (P, Q, R) =>
              (Q.x - P.x) * (R.y - P.y) - (Q.y - P.y) * (R.x - P.x);
            const intersect = (P, Q, R, S) =>
              orient(P, Q, R) * orient(P, Q, S) < 0 &&
              orient(R, S, P) * orient(R, S, Q) < 0;
            return intersect(A, B, C, D);
          });
          if (!crosses) edges.push({ u: i, v });
        }
      }
    });
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
  
  /** High‑level API: pick a layout, generate the appropriate graph */
  export function newRound(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const { nodeCountRange, edgeProbability, layoutProportions, planar, ...rest } = opts;
    const nodeCount = Math.floor(
      Math.random() * (nodeCountRange[1] - nodeCountRange[0] + 1)
    ) + nodeCountRange[0];
  
    const layout = pickLayout(layoutProportions);
    let graph = null;
    if (layout === 'planar') {
      graph = generatePlanarGraph({ nodeCount, ...planar });
    } else {
      graph = generateRandomGraph({ nodeCount, edgeProbability });
    }
    return { layout, graph };
  }
  