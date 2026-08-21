# Visualization tools considered

This note records public documentation consulted on 21 August 2026 for the topological views in Quantum Circuit Studio.

| Tool | Relevant public capability | Decision role | Source |
| --- | --- | --- | --- |
| Cytoscape.js | Interactive graph model, layouts, gestures, graph algorithms and JSON serialisation in the browser under MIT. | Best candidate for a precise editable **2D circuit topology** view. | https://js.cytoscape.org/ |
| 3d-force-graph | WebGL / Three.js force-directed 3D graph component with custom nodes, selectable links and camera controls under MIT. | Best candidate for an exploratory **3D topology** view of the same circuit graph. | https://github.com/vasturiano/3d-force-graph |
| Sigma.js | WebGL rendering and interaction for larger graph sets, paired with Graphology. | Strong future option if the studio must render far larger circuit or dependency graphs. | https://www.sigmajs.org/ |

## Integration choice

The circuit studio currently holds a small, explicit graph with editable physical positions. For this scale, a 2D view must preserve those physical positions and labels; a force layout should never overwrite the schematic. The recommended implementation is therefore a separate **Topology Lens**: it consumes the same local nodes and edges, colours by component type, retains the schematic as the source of truth, and offers an optional force-directed 3D exploration mode.

The first integrated version should use `3d-force-graph` only for the optional 3D lens. The existing canvas remains the accurate 2D schematic. Sigma.js is deferred until graph size or analytical exploration requires its WebGL scaling profile.
