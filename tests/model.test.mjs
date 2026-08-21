import test from "node:test";
import assert from "node:assert/strict";
import { addNode, connectNodes, createDemoCircuit, createEmptyCircuit, exportCircuit, exportOpenQasm, frequencyCollisions, frequencyHeatmap, layerStackGraph, optimizeCircuit, removeNode, topologyGraph, updateNode, validateCircuit } from "../src/model.mjs";
import { exportConceptualStep, exportConceptualStl } from "../src/mechanical-export.mjs";

test("adds components with a stable unique identifier", () => {
  const first = addNode(createEmptyCircuit(), "qubit");
  const second = addNode(first, "qubit");
  assert.equal(first.nodes[0].id, "q0");
  assert.equal(second.nodes[1].id, "q1");
});

test("connection is unique even if selected in the reverse order", () => {
  const circuit = addNode(addNode(createEmptyCircuit(), "qubit"), "qubit");
  const once = connectNodes(circuit, "q0", "q1");
  const twice = connectNodes(once, "q1", "q0");
  assert.equal(twice.edges.length, 1);
});

test("removing a component also removes its graph links", () => {
  const circuit = createDemoCircuit();
  const withoutCoupler = removeNode(circuit, "c0");
  assert.equal(withoutCoupler.nodes.some((node) => node.id === "c0"), false);
  assert.equal(withoutCoupler.edges.some(([a, b]) => a === "c0" || b === "c0"), false);
});

test("demo circuit passes local checks", () => {
  const issues = validateCircuit(createDemoCircuit());
  assert.equal(issues.length, 1);
  assert.equal(issues[0].level, "success");
});

test("export creates a portable JSON document", () => {
  const exported = JSON.parse(exportCircuit(createDemoCircuit()));
  assert.equal(exported.schema, "quantum-circuit-studio/v0.1");
  assert.equal(exported.nodes.length, 6);
  assert.ok(exported.exportedAt);
});

test("OpenQASM export maps transmons and coupler topology to a logical circuit scaffold", () => {
  const qasm = exportOpenQasm(createDemoCircuit());
  assert.match(qasm, /^OPENQASM 3\.0;/);
  assert.match(qasm, /qubit\[2\] q;/);
  assert.match(qasm, /coupler c0/);
  assert.match(qasm, /cz q\[0\], q\[1\];/);
  assert.match(qasm, /c\[0\] = measure q\[0\];/);
});

test("OpenQASM export explains an empty schematic instead of emitting invalid registers", () => {
  const qasm = exportOpenQasm(createEmptyCircuit());
  assert.match(qasm, /No transmon components are present/);
  assert.doesNotMatch(qasm, /qubit\[/);
});

test("topology graph preserves the local components and only valid graph links", () => {
  const graph = topologyGraph(createDemoCircuit());
  assert.equal(graph.nodes.length, 6);
  assert.equal(graph.links.length, 6);
  assert.deepEqual(graph.links[0], { source: "q0", target: "c0" });
});

test("layer stack projects the circuit into metal, Josephson, resonator and control layers", () => {
  const graph = layerStackGraph(createDemoCircuit());
  assert.equal(graph.nodes.length, 9);
  assert.deepEqual(new Set(graph.nodes.map((node) => node.layer)), new Set(["metal", "josephson", "resonator", "control"]));
  assert.ok(graph.links.some((link) => link.type === "vertical"));
  assert.ok(graph.links.some((link) => link.type === "circuit"));
});

test("frequency heatmap flags a true qubit collision and validation carries the same warning", () => {
  const collisionCircuit = updateNode(createDemoCircuit(), "q1", { frequency: 5.01 });
  const collisions = frequencyCollisions(collisionCircuit);
  const heatmap = frequencyHeatmap(collisionCircuit);
  const issues = validateCircuit(collisionCircuit);
  assert.equal(collisions.length, 1);
  assert.ok(Math.abs(collisions[0].separation - 0.05) < 1e-9);
  assert.equal(heatmap.find((entry) => entry.id === "q0").risk, "collision");
  assert.ok(issues.some((issue) => issue.title === "Possible frequency collision"));
});

test("optimizer separates a collision in frequency targets and records transparent placement changes", () => {
  const collisionCircuit = updateNode(createDemoCircuit(), "q1", { frequency: 5.01 });
  const result = optimizeCircuit(collisionCircuit);
  const optimizedQubits = result.circuit.nodes.filter((node) => node.kind === "qubit").sort((first, second) => first.id.localeCompare(second.id));
  assert.ok(result.placementChanges.length > 0);
  assert.equal(result.frequencyChanges.length, 1);
  assert.ok(Math.abs(optimizedQubits[1].frequency - optimizedQubits[0].frequency) >= 0.25);
  assert.equal(frequencyCollisions(result.circuit).length, 0);
});

test("conceptual mechanical exports retain explicit non-fabrication markers", () => {
  const stl = exportConceptualStl(createDemoCircuit());
  const step = exportConceptualStep(createDemoCircuit());
  assert.match(stl, /^solid transmon-microcell_conceptual_layer_stack/);
  assert.match(stl, /NOT A FABRICATION/);
  assert.match(stl, /facet normal/);
  assert.match(step, /^ISO-10303-21;/);
  assert.match(step, /CONCEPTUAL GEOMETRY ONLY/);
  assert.match(step, /conceptual metal layer proxy/);
});
