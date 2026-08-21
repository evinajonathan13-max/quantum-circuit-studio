import { COMPONENTS, addNode, connectNodes, createDemoCircuit, createEmptyCircuit, exportCircuit, exportOpenQasm, linksFor, removeNode, topologyGraph, updateNode, validateCircuit } from "./model.mjs";

const canvas = document.querySelector("#circuit-canvas");
const topologyCanvas = document.querySelector("#topology-canvas");
const topologyView = document.querySelector("#topology-view");
const layer = document.querySelector("#connection-layer");
const emptyCanvas = document.querySelector("#empty-canvas");
const inspector = document.querySelector("#inspector");
const inspectorEmpty = document.querySelector("#inspector-empty");
const projectInput = document.querySelector("#project-name");
const connectButton = document.querySelector("#connect-selection");
const state = { circuit: createDemoCircuit(), selection: [], issues: [], view: "schematic" };
let topologyLens;
let topologyLoading;

const $ = (selector) => document.querySelector(selector);
const kindClass = (kind) => `node-${kind}`;
const TOPOLOGY_COLORS = { qubit: "#7aefd4", coupler: "#c8a7fb", resonator: "#efbf77", feedline: "#a6d8ec", flux: "#f0a9d6" };

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
    button.innerHTML = `<span class="node-symbol">${COMPONENTS[node.kind].glyph}</span><span class="node-id">${node.id}</span><span class="node-frequency">${node.frequency || "CTRL"} ${node.frequency ? node.unit : ""}</span>`;
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
  $("#links-list").innerHTML = links.length ? links.map((id) => `<li><span></span>${id}</li>`).join("") : "<li class=\"muted\">No graph links yet</li>";
}

function renderValidation() {
  const results = $("#validation-results"); const badge = $("#validation-badge");
  if (!state.issues.length) { badge.className = "validation-badge neutral"; badge.textContent = "READY"; results.innerHTML = "<p>Run checks to inspect topology, frequency separation and required readout paths.</p>"; return; }
  const hasError = state.issues.some((issue) => issue.level === "error"); const hasWarning = state.issues.some((issue) => issue.level === "warning");
  badge.className = `validation-badge ${hasError ? "error" : hasWarning ? "warning" : "success"}`;
  badge.textContent = hasError ? "ACTION NEEDED" : hasWarning ? "REVIEW" : "PASS";
  results.innerHTML = state.issues.map((issue) => `<article class="issue ${issue.level}"><span>${issue.level === "success" ? "✓" : issue.level === "warning" ? "!" : "×"}</span><div><strong>${issue.title}</strong><p>${issue.detail}</p></div></article>`).join("");
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

async function renderTopology() {
  if (state.view !== "topology") return;
  const lens = await ensureTopologyLens();
  requestAnimationFrame(() => {
    lens.width(topologyCanvas.clientWidth).height(topologyCanvas.clientHeight).graphData(topologyGraph(state.circuit));
    lens.zoomToFit(350, 82);
  });
}

function setView(view) {
  state.view = view;
  const isTopology = view === "topology";
  canvas.hidden = isTopology;
  topologyCanvas.hidden = !isTopology;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  $("#canvas-instructions").innerHTML = isTopology
    ? "<kbd>Drag</kbd> rotate the graph <span>·</span> <kbd>Scroll</kbd> zoom <span>·</span> <kbd>Click</kbd> inspect a component"
    : "<kbd>Click</kbd> select a part <span>·</span> <kbd>Shift + click</kbd> select a second compatible part";
  void renderTopology();
}

function render() {
  renderConnections(); renderNodes(); renderInspector(); renderValidation();
  $("#node-count").textContent = `${state.circuit.nodes.length} NODES`; $("#edge-count").textContent = `${state.circuit.edges.length} LINKS`;
  $("#component-total").textContent = `${state.circuit.nodes.length} PARTS`;
  connectButton.disabled = state.selection.length !== 2;
  void renderTopology();
}

document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => {
  state.circuit = addNode(state.circuit, button.dataset.add); state.selection = [state.circuit.nodes.at(-1).id]; state.issues = []; render();
}));

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
connectButton.addEventListener("click", () => { state.circuit = connectNodes(state.circuit, ...state.selection); state.issues = []; render(); });
$("#validate-circuit").addEventListener("click", () => { syncProjectName(); state.issues = validateCircuit(state.circuit); render(); });
$("#load-demo").addEventListener("click", () => { state.circuit = createDemoCircuit(); projectInput.value = state.circuit.name; state.selection = []; state.issues = []; render(); });
$("#export-json").addEventListener("click", () => { syncProjectName(); downloadCircuit(exportCircuit(state.circuit), "application/json", "json"); });
$("#export-qasm").addEventListener("click", () => { syncProjectName(); downloadCircuit(exportOpenQasm(state.circuit), "text/plain;charset=utf-8", "qasm"); });

inspector.addEventListener("input", () => {
  const selected = state.selection.at(-1); if (!selected) return;
  const values = { id: $("#field-id").value.trim(), frequency: Number($("#field-frequency").value), unit: $("#field-unit").value, x: Number($("#field-x").value), y: Number($("#field-y").value), notes: $("#field-notes").value };
  state.circuit = updateNode(state.circuit, selected, values); state.selection = [values.id]; state.issues = []; render();
});
$("#remove-selected").addEventListener("click", () => { const selected = state.selection.at(-1); if (!selected) return; state.circuit = removeNode(state.circuit, selected); state.selection = []; state.issues = []; render(); });
projectInput.addEventListener("change", syncProjectName);
window.addEventListener("resize", () => void renderTopology());
render();
