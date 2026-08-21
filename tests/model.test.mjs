import test from "node:test";
import assert from "node:assert/strict";
import { addNode, connectNodes, createDemoCircuit, createEmptyCircuit, exportCircuit, exportOpenQasm, removeNode, topologyGraph, validateCircuit } from "../src/model.mjs";

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
