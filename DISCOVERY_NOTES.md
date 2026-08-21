# Public reference notes — SilicoFeller

This file records only the public product documentation and unauthenticated endpoints observed on 21 August 2026. It is not copied source code and is not a dependency of the application built in this repository.

## Public product patterns observed

- Visual schematic editing for superconducting quantum hardware.
- Component placement for qubits, couplers, resonators and readout structures.
- Parameter editing, layout verification, simulation-oriented export and versioned workspaces.
- Public documentation also describes superconducting, trapped-ion and future photonic or neutral-atom design directions.

## Public documentation and endpoints

| Resource | URL | Public purpose observed |
| --- | --- | --- |
| Product home | https://test.silicofeller.com/ | Public description of the schematic editor and component library. |
| Documentation | https://test.silicofeller.com/docs/index.html | Public product, simulation and language documentation. |
| API reference | https://test.silicofeller.com/docs/reference/api-reference.html | Documents status, examples, parse and compile routes for QCLang. |
| Compiler status | https://test.silicofeller.com/api/qclang/status | Reports two available public compiler dialects and their documented targets. |
| Compiler examples | https://test.silicofeller.com/api/qclang/examples | Returns public example source material. |

## Design boundary for Quantum Circuit Studio

Quantum Circuit Studio is an independent implementation. It uses its own neutral JSON circuit model, local layout visualisation and original validation logic. It does not copy SilicoFeller’s user interface, source code, visual assets, compiler implementation, QCLang source examples, or proprietary backend.

Public documentation is retained only as a reference for the kinds of workflow users expect from a quantum-hardware design environment.
