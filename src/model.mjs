export const COMPONENTS = {
  qubit: { label: "Transmon", glyph: "Q", frequency: 5.0, note: "Fixed-frequency superconducting qubit" },
  coupler: { label: "Tunable coupler", glyph: "⌁", frequency: 5.45, note: "Flux-controlled coupling element" },
  resonator: { label: "Readout resonator", glyph: "λ", frequency: 6.7, note: "Quarter-wave readout structure" },
  feedline: { label: "Feedline", glyph: "—", frequency: 7.0, note: "50 Ω microwave feedline" },
  flux: { label: "Flux line", glyph: "ϕ", frequency: 0, note: "Low-frequency control infrastructure" }
};

export function createEmptyCircuit(name = "untitled-circuit") {
  return { schema: "quantum-circuit-studio/v0.1", name, nodes: [], edges: [] };
}

export function createDemoCircuit() {
  return {
    schema: "quantum-circuit-studio/v0.1",
    name: "transmon-microcell",
    nodes: [
      { id: "q0", kind: "qubit", frequency: 4.96, unit: "GHz", x: 28, y: 48, notes: "Reference qubit" },
      { id: "q1", kind: "qubit", frequency: 5.18, unit: "GHz", x: 68, y: 48, notes: "Detuned neighbour" },
      { id: "c0", kind: "coupler", frequency: 5.45, unit: "GHz", x: 48, y: 48, notes: "Tunable interaction path" },
      { id: "r0", kind: "resonator", frequency: 6.63, unit: "GHz", x: 28, y: 76, notes: "Readout for q0" },
      { id: "r1", kind: "resonator", frequency: 6.81, unit: "GHz", x: 68, y: 76, notes: "Readout for q1" },
      { id: "fl0", kind: "feedline", frequency: 7.0, unit: "GHz", x: 48, y: 84, notes: "Shared readout path" }
    ],
    edges: [
      ["q0", "c0"], ["q1", "c0"], ["q0", "r0"], ["q1", "r1"], ["r0", "fl0"], ["r1", "fl0"]
    ]
  };
}

export function nextId(circuit, kind) {
  const prefix = { qubit: "q", coupler: "c", resonator: "r", feedline: "fl", flux: "phi" }[kind];
  let index = 0;
  while (circuit.nodes.some((node) => node.id === `${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

export function addNode(circuit, kind) {
  const component = COMPONENTS[kind];
  if (!component) throw new Error(`Unsupported component kind: ${kind}`);
  const index = circuit.nodes.length;
  const x = 22 + ((index * 19) % 60);
  const y = 26 + ((Math.floor(index / 3) * 24) % 54);
  const node = { id: nextId(circuit, kind), kind, frequency: component.frequency, unit: "GHz", x, y, notes: component.note };
  return { ...circuit, nodes: [...circuit.nodes, node] };
}

export function updateNode(circuit, id, changes) {
  return { ...circuit, nodes: circuit.nodes.map((node) => node.id === id ? { ...node, ...changes } : node) };
}

export function removeNode(circuit, id) {
  return { ...circuit, nodes: circuit.nodes.filter((node) => node.id !== id), edges: circuit.edges.filter(([a, b]) => a !== id && b !== id) };
}

export function connectNodes(circuit, firstId, secondId) {
  if (firstId === secondId) return circuit;
  if (!circuit.nodes.some((node) => node.id === firstId) || !circuit.nodes.some((node) => node.id === secondId)) return circuit;
  const edge = [firstId, secondId].sort();
  const exists = circuit.edges.some(([a, b]) => [a, b].sort().join("|") === edge.join("|"));
  return exists ? circuit : { ...circuit, edges: [...circuit.edges, edge] };
}

export function linksFor(circuit, id) {
  return circuit.edges.flatMap(([a, b]) => a === id ? [b] : b === id ? [a] : []);
}

export function topologyGraph(circuit) {
  const nodeIds = new Set(circuit.nodes.map((node) => node.id));
  return {
    nodes: circuit.nodes.map((node) => ({ ...node })),
    links: circuit.edges
      .filter(([source, target]) => nodeIds.has(source) && nodeIds.has(target))
      .map(([source, target]) => ({ source, target }))
  };
}

export const MATERIAL_LAYERS = {
  metal: { label: "Metal", z: 0 },
  josephson: { label: "Josephson", z: 16 },
  resonator: { label: "Resonator", z: 32 },
  control: { label: "Control", z: 48 }
};

export function layerStackGraph(circuit) {
  const nodes = [];
  const links = [];
  const primaryId = new Map();
  const addNode = (source, layer, suffix) => {
    const id = `${source.id}:${suffix}`;
    nodes.push({ ...source, id, sourceId: source.id, layer, z: MATERIAL_LAYERS[layer].z });
    return id;
  };

  circuit.nodes.forEach((node) => {
    if (node.kind === "qubit" || node.kind === "coupler") {
      const metalId = addNode(node, "metal", "metal");
      const junctionId = addNode(node, "josephson", "jj");
      links.push({ source: metalId, target: junctionId, type: "vertical" });
      primaryId.set(node.id, junctionId);
      return;
    }
    const layer = node.kind === "resonator" ? "resonator" : "control";
    primaryId.set(node.id, addNode(node, layer, layer));
  });

  circuit.edges.forEach(([source, target]) => {
    if (primaryId.has(source) && primaryId.has(target)) links.push({ source: primaryId.get(source), target: primaryId.get(target), type: "circuit" });
  });
  return { nodes, links };
}

export function frequencyCollisions(circuit, thresholdGHz = 0.08) {
  const qubits = circuit.nodes.filter((node) => node.kind === "qubit" && Number.isFinite(Number(node.frequency)));
  const collisions = [];
  for (let first = 0; first < qubits.length; first += 1) {
    for (let second = first + 1; second < qubits.length; second += 1) {
      const separation = Math.abs(Number(qubits[first].frequency) - Number(qubits[second].frequency));
      if (separation < thresholdGHz) collisions.push({ first: qubits[first].id, second: qubits[second].id, separation });
    }
  }
  return collisions;
}

export function frequencyHeatmap(circuit, collisionThresholdGHz = 0.08, watchThresholdGHz = 0.2) {
  const qubits = circuit.nodes.filter((node) => node.kind === "qubit" && Number.isFinite(Number(node.frequency)));
  return qubits.map((qubit) => {
    const nearest = qubits
      .filter((candidate) => candidate.id !== qubit.id)
      .map((candidate) => ({ id: candidate.id, separation: Math.abs(Number(qubit.frequency) - Number(candidate.frequency)) }))
      .sort((first, second) => first.separation - second.separation)[0];
    const separation = nearest?.separation ?? Infinity;
    const risk = separation < collisionThresholdGHz ? "collision" : separation < watchThresholdGHz ? "watch" : "stable";
    return { id: qubit.id, frequency: Number(qubit.frequency), unit: qubit.unit, nearestId: nearest?.id ?? null, separation, risk };
  });
}

export function optimizeCircuit(circuit, { targetFrequencySeparationGHz = 0.25 } = {}) {
  const nodes = circuit.nodes.map((node) => ({ ...node }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const placementChanges = [];
  const frequencyChanges = [];
  const move = (id, x, y) => {
    const node = nodeById.get(id);
    if (!node) return;
    const nextX = Math.round(x * 10) / 10;
    const nextY = Math.round(y * 10) / 10;
    if (node.x !== nextX || node.y !== nextY) placementChanges.push({ id, from: { x: node.x, y: node.y }, to: { x: nextX, y: nextY } });
    node.x = nextX;
    node.y = nextY;
  };

  const qubits = nodes.filter((node) => node.kind === "qubit");
  const columns = Math.max(1, Math.ceil(Math.sqrt(qubits.length)));
  qubits.forEach((qubit, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = columns === 1 ? 50 : 24 + column * (52 / (columns - 1));
    move(qubit.id, x, 32 + row * 28);
  });

  nodes.filter((node) => node.kind === "coupler").forEach((coupler) => {
    const attached = linksFor(circuit, coupler.id).map((id) => nodeById.get(id)).filter((node) => node?.kind === "qubit");
    if (attached.length >= 2) move(coupler.id, (attached[0].x + attached[1].x) / 2, (attached[0].y + attached[1].y) / 2);
  });
  nodes.filter((node) => node.kind === "resonator").forEach((resonator) => {
    const qubit = linksFor(circuit, resonator.id).map((id) => nodeById.get(id)).find((node) => node?.kind === "qubit");
    if (qubit) move(resonator.id, qubit.x, Math.min(84, qubit.y + 30));
  });
  nodes.filter((node) => node.kind === "feedline").forEach((feedline) => {
    const resonators = linksFor(circuit, feedline.id).map((id) => nodeById.get(id)).filter((node) => node?.kind === "resonator");
    if (resonators.length) move(feedline.id, resonators.reduce((sum, node) => sum + node.x, 0) / resonators.length, 84);
  });
  nodes.filter((node) => node.kind === "flux").forEach((flux) => {
    const coupler = linksFor(circuit, flux.id).map((id) => nodeById.get(id)).find((node) => node?.kind === "coupler");
    if (coupler) move(flux.id, coupler.x, Math.max(12, coupler.y - 26));
  });

  const orderedQubits = [...qubits].sort((first, second) => Number(first.frequency) - Number(second.frequency));
  orderedQubits.forEach((qubit, index) => {
    if (index === 0) return;
    const previous = orderedQubits[index - 1];
    const requiredMinimum = Number(previous.frequency) + targetFrequencySeparationGHz;
    if (Number(qubit.frequency) < requiredMinimum) {
      const from = Number(qubit.frequency);
      qubit.frequency = Math.round(requiredMinimum * 1000) / 1000;
      frequencyChanges.push({ id: qubit.id, from, to: qubit.frequency, minimumSeparationGHz: targetFrequencySeparationGHz });
    }
  });

  return {
    circuit: { ...circuit, nodes },
    placementChanges,
    frequencyChanges,
    targetFrequencySeparationGHz,
    assumptions: ["Placement is a local spacing heuristic, not an EM or crosstalk solver.", "Frequency targets are a local proposal; they require hardware calibration before use."]
  };
}

export function crosstalkRiskAnalysis(circuit) {
  const qubits = circuit.nodes.filter((node) => node.kind === "qubit" && Number.isFinite(Number(node.frequency)));
  const couplers = circuit.nodes.filter((node) => node.kind === "coupler");
  const hasDirectLink = (first, second) => circuit.edges.some(([a, b]) => (a === first && b === second) || (a === second && b === first));
  const sharedCouplers = (first, second) => couplers.filter((coupler) => {
    const links = linksFor(circuit, coupler.id);
    return links.includes(first) && links.includes(second);
  }).map((coupler) => coupler.id);
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const pairs = [];

  for (let first = 0; first < qubits.length; first += 1) {
    for (let second = first + 1; second < qubits.length; second += 1) {
      const a = qubits[first]; const b = qubits[second];
      const couplingPaths = sharedCouplers(a.id, b.id);
      const direct = hasDirectLink(a.id, b.id);
      const distance = Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
      const detuning = Math.abs(Number(a.frequency) - Number(b.frequency));
      const topologyFactor = couplingPaths.length ? 0.9 : direct ? 0.7 : 0.15;
      const spatialFactor = clamp((60 - distance) / 60);
      const spectralFactor = clamp((0.5 - detuning) / 0.5);
      const score = Math.round((0.5 * topologyFactor + 0.32 * spectralFactor + 0.18 * spatialFactor) * 100);
      const level = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
      pairs.push({
        first: a.id,
        second: b.id,
        adjacent: couplingPaths.length > 0 || direct,
        couplingPaths,
        distance,
        detuning,
        factors: { topology: Math.round(topologyFactor * 100), spatial: Math.round(spatialFactor * 100), spectral: Math.round(spectralFactor * 100) },
        score,
        level
      });
    }
  }
  return pairs.sort((first, second) => second.score - first.score);
}

export function validateCircuit(circuit) {
  const issues = [];
  if (circuit.nodes.length === 0) issues.push({ level: "error", title: "Empty circuit", detail: "Place at least one component before running checks." });
  const ids = new Set();
  circuit.nodes.forEach((node) => {
    if (ids.has(node.id)) issues.push({ level: "error", title: "Duplicate ID", detail: `${node.id} is used more than once.` });
    ids.add(node.id);
    if (node.kind !== "flux" && (!Number.isFinite(Number(node.frequency)) || Number(node.frequency) <= 0)) issues.push({ level: "error", title: "Invalid frequency", detail: `${node.id} needs a positive frequency.` });
  });
  const qubits = circuit.nodes.filter((node) => node.kind === "qubit");
  frequencyCollisions(circuit).forEach(({ first, second, separation }) => issues.push({ level: "warning", title: "Possible frequency collision", detail: `${first} and ${second} are separated by only ${separation.toFixed(3)} GHz.` }));
  qubits.forEach((qubit) => {
    const neighbours = linksFor(circuit, qubit.id).map((id) => circuit.nodes.find((node) => node.id === id));
    if (!neighbours.some((node) => node?.kind === "resonator")) issues.push({ level: "warning", title: "No readout path", detail: `${qubit.id} is not linked to a readout resonator.` });
  });
  circuit.edges.forEach(([a, b]) => {
    if (!ids.has(a) || !ids.has(b)) issues.push({ level: "error", title: "Broken graph link", detail: `${a} ↔ ${b} references a missing component.` });
  });
  if (issues.length === 0) issues.push({ level: "success", title: "Topology check passed", detail: "The local circuit graph has unique IDs, valid links and a readout path for each qubit." });
  return issues;
}

export function exportCircuit(circuit) {
  return JSON.stringify({ ...circuit, exportedAt: new Date().toISOString() }, null, 2);
}

export function exportOpenQasm(circuit) {
  const qubits = circuit.nodes.filter((node) => node.kind === "qubit");
  const indexById = new Map(qubits.map((qubit, index) => [qubit.id, index]));
  const lines = [
    "OPENQASM 3.0;",
    'include "stdgates.inc";',
    "",
    `// Quantum Circuit Studio logical topology export: ${circuit.name}`,
    "// This file maps a schematic graph to a logical circuit scaffold.",
    "// It is not an EM simulation, calibration schedule, or fabrication recipe.",
    ""
  ];

  if (qubits.length === 0) {
    lines.push("// No transmon components are present; no logical qubits were emitted.");
    return `${lines.join("\n")}\n`;
  }

  lines.push(`qubit[${qubits.length}] q;`, `bit[${qubits.length}] c;`, "", "// Physical-to-logical register map");
  qubits.forEach((qubit, index) => lines.push(`// q[${index}] ← ${qubit.id} (${qubit.frequency} ${qubit.unit})`));

  const couplers = circuit.nodes.filter((node) => node.kind === "coupler");
  const emittedPairs = new Set();
  const emitInteraction = (firstId, secondId, source) => {
    const firstIndex = indexById.get(firstId);
    const secondIndex = indexById.get(secondId);
    if (firstIndex === undefined || secondIndex === undefined || firstIndex === secondIndex) return;
    const key = [firstIndex, secondIndex].sort((a, b) => a - b).join(":");
    if (emittedPairs.has(key)) return;
    emittedPairs.add(key);
    lines.push(`// ${source}`, `cz q[${firstIndex}], q[${secondIndex}];`);
  };

  lines.push("", "// Entangling topology inferred from schematic links");
  couplers.forEach((coupler) => {
    const attachedQubits = linksFor(circuit, coupler.id).filter((id) => indexById.has(id));
    for (let index = 0; index < attachedQubits.length - 1; index += 1) {
      emitInteraction(attachedQubits[index], attachedQubits[index + 1], `coupler ${coupler.id}`);
    }
  });
  circuit.edges.forEach(([first, second]) => {
    if (indexById.has(first) && indexById.has(second)) emitInteraction(first, second, "direct qubit graph link");
  });
  if (emittedPairs.size === 0) lines.push("// No qubit-to-qubit interaction was inferred from the current graph.");

  lines.push("", "// Readout scaffold");
  qubits.forEach((_, index) => lines.push(`c[${index}] = measure q[${index}];`));
  return `${lines.join("\n")}\n`;
}
