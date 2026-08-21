import { COMPONENTS, MATERIAL_LAYERS, addNode, connectNodes, createDemoCircuit, exportCircuit, exportOpenQasm, frequencyCollisions, frequencyHeatmap, layerStackGraph, linksFor, optimizeCircuit, removeNode, topologyGraph, updateNode, validateCircuit } from "./model.mjs";
import { exportConceptualStep, exportConceptualStl } from "./mechanical-export.mjs";

const canvas = document.querySelector("#circuit-canvas");
const topologyCanvas = document.querySelector("#topology-canvas");
const topologyView = document.querySelector("#topology-view");
const layerStackCanvas = document.querySelector("#layer-stack-canvas");
const layerStackView = document.querySelector("#layer-stack-view");
const frequencyCanvas = document.querySelector("#frequency-canvas");
const layer = document.querySelector("#connection-layer");
const emptyCanvas = document.querySelector("#empty-canvas");
const inspector = document.querySelector("#inspector");
const inspectorEmpty = document.querySelector("#inspector-empty");
const projectInput = document.querySelector("#project-name");
const connectButton = document.querySelector("#connect-selection");
const state = { circuit: createDemoCircuit(), selection: [], issues: [], view: "schematic", optimizer: null };
let topologyLens;
let topologyLoading;
let layerLens;
let layerLoading;

const $ = (selector) => document.querySelector(selector);
const kindClass = (kind) => `node-${kind}`;
const TOPOLOGY_COLORS = { qubit: "#7aefd4", coupler: "#c8a7fb", resonator: "#efbf77", feedline: "#a6d8ec", flux: "#f0a9d6" };
const LAYER_COLORS = { metal: "#78b6d9", josephson: "#d5a5ff", resonator: "#f4bb6b", control: "#73e2bc" };
const VIEW_PANELS = { schematic: canvas, topology: topologyCanvas, layers: layerStackCanvas, frequency: frequencyCanvas };

function syncProjectName() {
  state.circuit = { ...state.circuit, name: projectInput.value.trim() || "untitled-circuit" };
}

function downloadCircuit(contents, type, extension) {
  const safeName = state.circuit.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "circuit";
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeText(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function selectNode(id, additive = false) {
  if (!additive) state.selection = [id];
  else if (state.selection.includes(id)) state.selection = state.selection.filter((selected) => selected !== id);
  else state.selection = [...state.selection.slice(-1), id];
  render();
}

function renderConnections() {
  layer.innerHTML = "";
  state.circuit.edges.forEach(([first, second]) => {
    const a = state.circuit.nodes.find((node) => node.id === first);
    const b = state.circuit.nodes.find((node) => node.id === second);
    if (!a || !b) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${a.x}%`); line.setAttribute("y1", `${a.y}%`);
    line.setAttribute("x2", `${b.x}%`); line.setAttribute("y2", `${b.y}%`);
    line.setAttribute("class", "graph-link");
    layer.append(line);
  });
}

function renderNodes() {
  canvas.querySelectorAll(".circuit-node").forEach((node) => node.remove());
  emptyCanvas.hidden = state.circuit.nodes.length > 0;
  state.circuit.nodes.forEach((node) => {
    const button = document.createElement("button");
    button.className = `circuit-node ${kindClass(node.kind)} ${state.selection.includes(node.id) ? "is-selected" : ""}`;
    button.style.left = `${node.x}%`; button.style.top = `${node.y}%`;
    button.innerHTML = `<span class="node-symbol">${COMPONENTS[node.kind].glyph}</span><span class="node-id">${escapeText(node.id)}</span><span class="node-frequency">${node.frequency || "CTRL"} ${node.frequency ? node.unit : ""}</span>`;
    button.title = `${COMPONENTS[node.kind].label}: ${node.id}`;
    button.addEventListener("click", (event) => selectNode(node.id, event.shiftKey));
    canvas.append(button);
  });
}

function renderInspector() {
  const selected = state.circuit.nodes.find((node) => node.id === state.selection.at(-1));
  $("#selection-state").textContent = selected ? selected.id.toUpperCase() : "NO SELECTION";
  inspector.hidden = !selected; inspectorEmpty.hidden = Boolean(selected);
  if (!selected) return;
  $("#inspect-kind").textContent = COMPONENTS[selected.kind].glyph;
  $("#inspect-type").textContent = COMPONENTS[selected.kind].label.toUpperCase();
  $("#inspect-name").textContent = selected.id;
  $("#field-id").value = selected.id; $("#field-frequency").value = selected.frequency;
  $("#field-unit").value = selected.unit; $("#field-x").value = selected.x; $("#field-y").value = selected.y; $("#field-notes").value = selected.notes || "";
  const links = linksFor(state.circuit, selected.id);
  $("#links-list").innerHTML = links.length ? links.map((id) => `<li><span></span>${escapeText(id)}</li>`).join("") : "<li class=\"muted\">No graph links yet</li>";
}

function renderValidation() {
  const results = $("#validation-results"); const badge = $("#validation-badge");
  if (!state.issues.length) { badge.className = "validation-badge neutral"; badge.textContent = "READY"; results.innerHTML = "<p>Run checks to inspect topology, frequency separation and required readout paths.</p>"; return; }
  const hasError = state.issues.some((issue) => issue.level === "error"); const hasWarning = state.issues.some((issue) => issue.level === "warning");
  badge.className = `validation-badge ${hasError ? "error" : hasWarning ? "warning" : "success"}`;
  badge.textContent = hasError ? "ACTION NEEDED" : hasWarning ? "REVIEW" : "PASS";
  results.innerHTML = state.issues.map((issue) => `<article class="issue ${issue.level}"><span>${issue.level === "success" ? "✓" : issue.level === "warning" ? "!" : "×"}</span><div><strong>${escapeText(issue.title)}</strong><p>${escapeText(issue.detail)}</p></div></article>`).join("");
}

function renderOptimizer() {
  const results = $("#optimizer-results"); const badge = $("#optimizer-badge");
  if (!state.optimizer) { badge.className = "validation-badge neutral"; badge.textContent = "IDLE"; results.innerHTML = "<p>Optimize layout to receive spacing adjustments and frequency-target proposals.</p>"; return; }
  const { placementChanges, frequencyChanges, targetFrequencySeparationGHz, assumptions } = state.optimizer;
  badge.className = "validation-badge success";
  badge.textContent = "APPLIED";
  const placement = placementChanges.length ? `${placementChanges.length} placement adjustment${placementChanges.length > 1 ? "s" : ""}` : "Placement already matched the spacing heuristic";
  const frequencies = frequencyChanges.length ? frequencyChanges.map((change) => `${escapeText(change.id)} ${change.from.toFixed(3)} → ${change.to.toFixed(3)} GHz`).join("<br>") : "No frequency target changes were required.";
  results.innerHTML = `<p><strong>${placement}</strong></p><p>Target separation: ${targetFrequencySeparationGHz.toFixed(2)} GHz.</p><p>${frequencies}</p><p class="optimizer-note">${assumptions.map(escapeText).join(" ")}</p>`;
}

async function ensureTopologyLens() {
  if (topologyLens) return topologyLens;
  if (!topologyLoading) {
    topologyLoading = import("3d-force-graph").then(({ default: ForceGraph3D }) => {
      topologyLens = new ForceGraph3D(topologyView)
        .backgroundColor("#081420")
        .showNavInfo(false)
        .nodeRelSize(4.8)
        .nodeColor((node) => TOPOLOGY_COLORS[node.kind] || "#9bb8c7")
        .nodeLabel((node) => `${node.id} · ${COMPONENTS[node.kind].label} · ${node.frequency || "control"} ${node.frequency ? node.unit : ""}`)
        .linkColor(() => "#5cc7b5")
        .linkOpacity(0.72)
        .linkWidth(0.8)
        .onNodeClick((node) => selectNode(node.id));
      return topologyLens;
    });
  }
  return topologyLoading;
}

async function ensureLayerLens() {
  if (layerLens) return layerLens;
  if (!layerLoading) {
    layerLoading = import("3d-force-graph").then(({ default: ForceGraph3D }) => {
      layerLens = new ForceGraph3D(layerStackView)
        .backgroundColor("#081420")
        .showNavInfo(false)
        .nodeRelSize(4.3)
        .nodeColor((node) => LAYER_COLORS[node.layer] || "#9bb8c7")
        .nodeLabel((node) => `${node.sourceId} · ${MATERIAL_LAYERS[node.layer].label} layer`)
        .linkColor((link) => link.type === "vertical" ? "#4c5e73" : "#66dbc4")
        .linkOpacity(0.76)
        .linkWidth((link) => link.type === "vertical" ? 0.45 : 0.95)
        .nodePositionUpdate((object, coords, node) => { object.position.set(coords.x, coords.y, node.z); return true; })
        .onNodeClick((node) => selectNode(node.sourceId));
      return layerLens;
    });
  }
  return layerLoading;
}

async function renderTopology() {
  if (state.view !== "topology") return;
  const lens = await ensureTopologyLens();
  requestAnimationFrame(() => {
    lens.width(topologyCanvas.clientWidth).height(topologyCanvas.clientHeight).graphData(topologyGraph(state.circuit));
    lens.zoomToFit(350, 82);
  });
}

async function renderLayerStack() {
  if (state.view !== "layers") return;
  const lens = await ensureLayerLens();
  requestAnimationFrame(() => {
    lens.width(layerStackCanvas.clientWidth).height(layerStackCanvas.clientHeight).graphData(layerStackGraph(state.circuit));
    lens.zoomToFit(350, 92);
  });
}

function renderFrequencyMap() {
  if (state.view !== "frequency") return;
  const entries = frequencyHeatmap(state.circuit);
  const collisions = frequencyCollisions(state.circuit);
  const summary = $("#collision-summary");
  summary.className = collisions.length ? "collision-alert" : "collision-clear";
  summary.textContent = collisions.length ? `${collisions.length} COLLISION${collisions.length > 1 ? "S" : ""}` : entries.length ? "CLEAR" : "NO QUBITS";
  if (!entries.length) { $("#frequency-heatmap").innerHTML = "<p class=\"frequency-empty\">Place transmons to generate a frequency map.</p>"; return; }
  const frequencies = entries.map((entry) => entry.frequency);
  const min = Math.min(...frequencies) - 0.18;
  const max = Math.max(...frequencies) + 0.18;
  const span = Math.max(max - min, 0.4);
  $("#frequency-heatmap").innerHTML = entries.map((entry) => {
    const position = ((entry.frequency - min) / span) * 100;
    const detail = entry.nearestId ? `${entry.nearestId} · Δ ${entry.separation.toFixed(3)} GHz` : "No neighbour";
    const label = entry.risk === "collision" ? "COLLISION" : entry.risk === "watch" ? "WATCH" : "STABLE";
    return `<article class="frequency-row risk-${entry.risk}"><div class="frequency-copy"><div><strong>${escapeText(entry.id)}</strong><span>${entry.frequency.toFixed(3)} ${entry.unit}</span></div><p>${escapeText(detail)}</p></div><div class="frequency-track"><i style="left:${position}%"></i></div><b>${label}</b></article>`;
  }).join("");
}

function renderActiveView() {
  void renderTopology();
  void renderLayerStack();
  renderFrequencyMap();
}

function setView(view) {
  state.view = view;
  Object.entries(VIEW_PANELS).forEach(([name, panel]) => { panel.hidden = name !== view; });
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  const instructions = {
    schematic: "<kbd>Click</kbd> select a part <span>·</span> <kbd>Shift + click</kbd> select a second compatible part",
    topology: "<kbd>Drag</kbd> rotate the graph <span>·</span> <kbd>Scroll</kbd> zoom <span>·</span> <kbd>Click</kbd> inspect a component",
    layers: "<kbd>Drag</kbd> explore the material stack <span>·</span> <kbd>Click</kbd> inspect the source component",
    frequency: "<kbd>Frequency Map</kbd> collision threshold is 0.08 GHz <span>·</span> amber watch zone is 0.20 GHz"
  };
  $("#canvas-instructions").innerHTML = instructions[view];
  renderActiveView();
}

function render() {
  renderConnections(); renderNodes(); renderInspector(); renderValidation(); renderOptimizer();
  $("#node-count").textContent = `${state.circuit.nodes.length} NODES`; $("#edge-count").textContent = `${state.circuit.edges.length} LINKS`;
  $("#component-total").textContent = `${state.circuit.nodes.length} PARTS`;
  connectButton.disabled = state.selection.length !== 2;
  renderActiveView();
}

document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => {
  state.circuit = addNode(state.circuit, button.dataset.add); state.selection = [state.circuit.nodes.at(-1).id]; state.issues = []; state.optimizer = null; render();
}));

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
connectButton.addEventListener("click", () => { state.circuit = connectNodes(state.circuit, ...state.selection); state.issues = []; state.optimizer = null; render(); });
$("#validate-circuit").addEventListener("click", () => { syncProjectName(); state.issues = validateCircuit(state.circuit); render(); });
$("#load-demo").addEventListener("click", () => { state.circuit = createDemoCircuit(); projectInput.value = state.circuit.name; state.selection = []; state.issues = []; state.optimizer = null; render(); });
$("#optimize-circuit").addEventListener("click", () => { syncProjectName(); state.optimizer = optimizeCircuit(state.circuit); state.circuit = state.optimizer.circuit; state.selection = []; state.issues = validateCircuit(state.circuit); render(); });
$("#export-json").addEventListener("click", () => { syncProjectName(); downloadCircuit(exportCircuit(state.circuit), "application/json", "json"); });
$("#export-qasm").addEventListener("click", () => { syncProjectName(); downloadCircuit(exportOpenQasm(state.circuit), "text/plain;charset=utf-8", "qasm"); });
$("#export-stl").addEventListener("click", () => { syncProjectName(); downloadCircuit(exportConceptualStl(state.circuit), "model/stl", "stl"); });
$("#export-step").addEventListener("click", () => { syncProjectName(); downloadCircuit(exportConceptualStep(state.circuit), "application/step", "step"); });

inspector.addEventListener("input", () => {
  const selected = state.selection.at(-1); if (!selected) return;
  const values = { id: $("#field-id").value.trim(), frequency: Number($("#field-frequency").value), unit: $("#field-unit").value, x: Number($("#field-x").value), y: Number($("#field-y").value), notes: $("#field-notes").value };
  state.circuit = updateNode(state.circuit, selected, values); state.selection = [values.id]; state.issues = []; state.optimizer = null; render();
});
$("#remove-selected").addEventListener("click", () => { const selected = state.selection.at(-1); if (!selected) return; state.circuit = removeNode(state.circuit, selected); state.selection = []; state.issues = []; state.optimizer = null; render(); });
projectInput.addEventListener("change", syncProjectName);
window.addEventListener("resize", renderActiveView);
render();
