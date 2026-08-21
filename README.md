# Quantum Circuit Studio

**Quantum Circuit Studio** is an independent, local-first visual tool for exploring small superconducting quantum-circuit schematics. It was designed as a transparent prototype: users can place a small set of components, create graph links, inspect basic physical parameters, run local consistency checks and export the resulting circuit model as JSON.

It is not a fabrication, simulation or tapeout system. It is a compact, inspectable starting point for research conversations and early circuit topology sketches.

## What it does

| Capability | Current implementation |
| --- | --- |
| Schematic graph | Interactive placement of transmons, tunable couplers, resonators, feedlines and flux lines. |
| Circuit links | Selection-based graph connections between placed elements. |
| Local checks | Unique identifier, positive frequency, qubit frequency-separation, readout-path and broken-link checks. |
| Portable output | Downloadable, neutral JSON model under `quantum-circuit-studio/v0.1`. |
| OpenQASM export | Downloadable OpenQASM 3 logical scaffold derived from transmons and coupler topology. |
| Topology Lens | Optional 3D WebGL view of the exact circuit graph; it supports camera exploration and component selection without changing the 2D schematic. |
| Layer Stack | Optional 3D separation of inferred metal, Josephson, resonator and control layers, with source-component selection. |
| Frequency Map | Local qubit-frequency heatmap with a 0.08 GHz collision threshold and a 0.20 GHz review zone. |
| Local optimizer | Applies a transparent spacing heuristic and proposes a 0.25 GHz minimum qubit-frequency separation. |
| Mechanical exports | Downloadable ASCII STL and STEP conceptual proxies of the Layer Stack. |
| Crosstalk Risk Map | Explainable local score for each qubit pair using graph adjacency, schematic proximity and frequency detuning. |
| Example design | A small two-transmon microcell with readout resonators and a shared feedline. |

## Local development

```bash
pnpm install
pnpm dev
```

Run the model tests with:

```bash
pnpm test
```

## Project boundary

This is an original implementation. It does not copy source code, UI assets, schemas or compiler implementations from SilicoFeller or other platforms. Its public reference review is recorded in [`DISCOVERY_NOTES.md`](DISCOVERY_NOTES.md). The tool currently makes **no third-party design API calls**.

## About the OpenQASM export

The `.qasm` export is intentionally a **logical topology adapter**. Each placed transmon becomes an OpenQASM register element; qubits connected through a tunable coupler become a `cz` interaction; and all logical qubits receive a measurement scaffold. It is useful as a portable starting point for logical-circuit workflows.

It does **not** turn a superconducting layout into calibrated pulses, an electromagnetic simulation, a fabrication file or a hardware-ready schedule. Component frequencies and layout geometry are retained as comments for traceability rather than treated as executable QASM parameters.

## Topology Lens

The studio now includes an optional **Topology 3D** view backed by the open-source `3d-force-graph` package. It renders exactly the same component IDs and graph links as the 2D schematic, but arranges them as a navigable relational graph. It is a reading and exploration view, not a substitute for the editable physical coordinates in the schematic.

The selection colour palette is semantic: transmons are mint, couplers violet, resonators amber, feedlines blue and flux lines rose. The research and selection rationale is retained in [`VISUALIZATION_TOOLS.md`](VISUALIZATION_TOOLS.md).

## Layer Stack and Frequency Map

**Layer Stack** projects the same local circuit graph into four explicit visual layers: metal, Josephson, resonator and control. A transmon or tunable coupler is shown both as a metal proxy and a Josephson proxy; resonators occupy the resonator layer; feedlines and flux lines occupy the control layer. This is an explanatory 3D stack for topology and design discussion, **not** a process-design kit, mask layer, fabrication stack or electromagnetic solution.

**Frequency Map** reads the current transmon frequencies directly from the local model. It marks nearest-neighbour separation below `0.08 GHz` as a collision and below `0.20 GHz` as a review zone. These are transparent design-aid thresholds already used by the studio’s local validation; they are not a substitute for hardware calibration or full crosstalk analysis.

## Optimizer and Mechanical Exports

**Optimize layout** makes two deliberately separate local proposals. First, it redistributes qubits on an inspectable grid, centers coupled elements between their connected qubits, aligns readout resonators and places the shared feedline beneath them. This is a **spacing heuristic**, not an electromagnetic, crosstalk, routing or yield solver. Second, it raises only the frequency targets that violate a local `0.25 GHz` minimum separation. The resulting placement and every frequency target changed are displayed in the Optimizer Trace. These target values remain proposals that need device-specific calibration.

The **STL** and **STEP** exports represent every inferred Layer Stack proxy as a simple conceptual solid. They are useful to carry the explanatory architecture into a mechanical/CAD review workflow. They are explicitly not a PDK, GDSII, mask, toleranced mechanical design, package model, fabrication geometry, or electromagnetic solution. Each exported file carries this warning in its own contents.

## Crosstalk Risk Map

The **Crosstalk Risk Map** is a local, transparent prioritisation aid. For each qubit pair, it combines three inspectable factors: whether a direct graph link or shared coupler creates adjacency, their 2D schematic distance, and their frequency detuning. The score labels a pair as low, medium or high risk and shows the factors that produced it. Its role is to help decide which pair deserves attention first in an early topology sketch.

It is **not** an electromagnetic extraction or prediction of a measured coupling value. It does not include capacitance, inductance, metal geometry, substrate, dielectric stack, package modes, drive amplitudes, flux bias, control pulses, crosstalk calibration or a full-wave solver. Those inputs are required before making an engineering or fabrication conclusion.

## Next technical directions

The neutral JSON model is intentionally independent. Future work can add a documented adapter for open tools such as Qiskit Metal or a self-hosted solver, but only through explicit integration configuration and separate validation.

## License

Private research prototype. All rights reserved.
