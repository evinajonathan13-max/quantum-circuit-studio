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

## Next technical directions

The neutral JSON model is intentionally independent. Future work can add a documented adapter for open tools such as Qiskit Metal or a self-hosted solver, but only through explicit integration configuration and separate validation.

## License

Private research prototype. All rights reserved.
