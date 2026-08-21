# Quantum Circuit Studio

<p align="center">
  <strong>Local-first exploration for small superconducting quantum-circuit topologies.</strong><br/>
  Build a compact graph, inspect it through 2D and 3D views, run transparent local checks, and export the right representation for the next engineering conversation.
</p>

<p align="center">
  <a href="#why-this-tool">Why this tool</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#capabilities">Capabilities</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="#model-boundary">Model boundary</a>
</p>

![Quantum Circuit Studio architecture](docs/images/architecture.png)

## Why this tool

Quantum Circuit Studio is an original, independent research tool for sketching and reviewing **small superconducting quantum-circuit topologies** without requiring a cloud design service. It makes the local circuit graph explicit, then derives readable views, checks and exports from that one source model. The goal is not to imitate a full foundry workflow in a browser. The goal is to make early architectural decisions transparent, traceable and inexpensive to revisit.

> **The local JSON circuit document is the source of truth.** The Schematic, Topology Lens, Layer Stack, Frequency Map, Crosstalk Risk Map, optimizer and exports all derive from it.

![One local model, several honest projections](docs/images/model-projections.png)

## Quick start

Install dependencies, start the local workstation and open the Vite address printed in the terminal.

```bash
pnpm install
pnpm dev
```

Validate the model contracts and produce a production build before sharing an implementation change.

```bash
pnpm test
pnpm build
```

Load the included **transmon-microcell** demonstration, inspect a component, run local checks, then open the 3D and analytical views. The full step-by-step workflow is in [Getting started](docs/GETTING_STARTED.md).

| Schematic | Topology Lens 3D |
|---|---|
| ![Real Schematic view](docs/images/screens/schematic.webp) | ![Real Topology Lens view](docs/images/screens/topology-3d.webp) |

## Capabilities

| Capability | What it provides now | Deliberate boundary |
|---|---|---|
| **Editable schematic** | Local graph editing for transmons, couplers, resonators, feedlines and flux lines. | It is not a GDSII or mask editor. |
| **Topology Lens 3D** | A selectable WebGL graph of the same nodes and links. | It is a relationship view, not physical 3D geometry. |
| **Layer Stack** | Metal, Josephson, resonator and control proxies. | It is not a PDK or process stack. |
| **Frequency Map** | Nearest-neighbour spacing with `0.08 GHz` collision and `0.20 GHz` review states. | Values are local working assumptions, not calibration. |
| **Crosstalk Risk Map** | Explainable priority score from adjacency, schematic distance and detuning. | It is not EM extraction or a measured coupling prediction. |
| **Transparent optimizer** | Visible spacing and `0.25 GHz` frequency-target proposals. | It is not an EM, routing, yield or calibration solver. |
| **JSON export** | Portable complete local source model. | It does not add physical geometry or process data. |
| **OpenQASM 3 export** | Logical qubit, inferred `cz` and measurement scaffold. | It is not a calibrated pulse schedule or hardware result. |
| **STL / STEP export** | Conceptual Layer Stack proxies for discussion. | They are not fabrication or mechanical-release files. |

## Local validation ladder

![Local validation ladder and external engineering boundary](docs/images/validation-ladder.png)

The studio checks what its local model can actually know: IDs, graph links, readout-path intent, nominal frequencies, close-frequency warnings, topology projections and export contracts. When the question becomes physical — materials, device modes, coupling extraction, calibration, package effects or QPU execution — the model points to the proper next stage instead of inventing precision.

Read [Validation](docs/VALIDATION.md) for each local check, threshold and model boundary.

## Documentation

| Guide | Purpose |
|---|---|
| [Getting started](docs/GETTING_STARTED.md) | Installation, first circuit, selection, connections and views. |
| [Architecture and local model](docs/ARCHITECTURE.md) | Schema, components, projections and code map. |
| [Validation and boundaries](docs/VALIDATION.md) | Checks, Frequency Map, optimizer, Crosstalk Risk Map and external handoffs. |
| [Exports and handoff](docs/EXPORTS.md) | JSON, OpenQASM, conceptual STL and STEP. |
| [Documentation index](docs/README.md) | Complete navigation and visual-assets note. |

## Model boundary

Quantum Circuit Studio is intentionally useful **before** a full fabrication or execution workflow. It has no third-party design API calls and does not copy code, assets, schemas or compiler implementations from SilicoFeller or other design platforms. The public-reference review that led to this independent implementation is recorded in [`DISCOVERY_NOTES.md`](DISCOVERY_NOTES.md).

The project does not claim to perform electromagnetic extraction, full-wave analysis, material modelling, PDK validation, mask generation, packaging analysis, calibration, pulse compilation or QPU execution. Those steps require additional physical or backend-specific data. [Qiskit Metal](https://qiskit-community.github.io/qiskit-metal/) and the [OpenQASM specification](https://openqasm.com/intro.html) are examples of the separate design and execution layers that can become relevant after a local topology is mature.

## Project structure

```text
src/model.mjs              Local graph, checks, projections, optimizer and OpenQASM
src/app.js                 Browser controller and interactive views
src/mechanical-export.mjs  Conceptual STL and STEP generators
tests/model.test.mjs       Reproducible model contracts
docs/                      Illustrated documentation and Mermaid source diagrams
```

## License

Private research prototype. All rights reserved.
