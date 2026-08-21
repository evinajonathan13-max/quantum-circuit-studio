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

## Next technical directions

The neutral JSON model is intentionally independent. Future work can add a documented adapter for open tools such as Qiskit Metal or a self-hosted solver, but only through explicit integration configuration and separate validation.

## License

Private research prototype. All rights reserved.
