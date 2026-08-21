import { MATERIAL_LAYERS, layerStackGraph } from "./model.mjs";

const LAYER_DIMENSIONS = {
  metal: { width: 8, depth: 5, height: 0.35 },
  josephson: { width: 3.2, depth: 3.2, height: 0.22 },
  resonator: { width: 12, depth: 2.4, height: 0.3 },
  control: { width: 10, depth: 1.8, height: 0.26 }
};

function safeName(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "quantum_circuit";
}

export function conceptualLayerSolids(circuit) {
  return layerStackGraph(circuit).nodes.map((node, index) => {
    const dimensions = LAYER_DIMENSIONS[node.layer];
    return {
      id: node.id,
      label: `${node.sourceId}_${node.layer}`,
      layer: node.layer,
      x: (Number(node.x) - 50) * 0.5,
      y: (Number(node.y) - 50) * 0.5,
      z: MATERIAL_LAYERS[node.layer].z * 0.04,
      width: dimensions.width,
      depth: dimensions.depth,
      height: dimensions.height,
      index
    };
  });
}

function verticesForBox(solid) {
  const x0 = solid.x - solid.width / 2; const x1 = solid.x + solid.width / 2;
  const y0 = solid.y - solid.depth / 2; const y1 = solid.y + solid.depth / 2;
  const z0 = solid.z; const z1 = solid.z + solid.height;
  return [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
}

const TRIANGLES = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];

function normalFor(a, b, c) {
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

export function exportConceptualStl(circuit) {
  const name = safeName(circuit.name);
  const lines = [
    `solid ${name}_conceptual_layer_stack`,
    "  // CONCEPTUAL GEOMETRY ONLY — NOT A FABRICATION, PDK OR TOLERANCED MECHANICAL MODEL"
  ];
  conceptualLayerSolids(circuit).forEach((solid) => {
    const vertices = verticesForBox(solid);
    lines.push(`  // ${solid.label} · ${solid.layer} layer`);
    TRIANGLES.forEach(([first, second, third]) => {
      const normal = normalFor(vertices[first], vertices[second], vertices[third]);
      lines.push(`  facet normal ${normal.join(" ")}`, "    outer loop");
      [first, second, third].forEach((index) => lines.push(`      vertex ${vertices[index].join(" ")}`));
      lines.push("    endloop", "  endfacet");
    });
  });
  lines.push(`endsolid ${name}_conceptual_layer_stack`, "");
  return lines.join("\n");
}

export function exportConceptualStep(circuit) {
  const name = safeName(circuit.name);
  const solids = conceptualLayerSolids(circuit);
  const lines = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('Quantum Circuit Studio conceptual layer stack'),'2;1');",
    `FILE_NAME('${name}_conceptual_layer_stack.step','${new Date().toISOString()}',('Quantum Circuit Studio'),(''),'','','');`,
    "FILE_SCHEMA(('AUTOMOTIVE_DESIGN_CC2'));",
    "ENDSEC;",
    "DATA;",
    "/* CONCEPTUAL GEOMETRY ONLY — NOT A FABRICATION, PDK OR TOLERANCED MECHANICAL MODEL */"
  ];
  solids.forEach((solid, index) => {
    const entity = index + 1;
    lines.push(`/* #${entity}: ${solid.label} | layer=${solid.layer} | center=(${solid.x},${solid.y},${solid.z}) | dimensions=(${solid.width},${solid.depth},${solid.height}) */`);
    lines.push(`#${entity}=DESCRIPTIVE_REPRESENTATION_ITEM('${solid.label}: conceptual ${solid.layer} layer proxy');`);
  });
  lines.push("ENDSEC;", "END-ISO-10303-21;", "");
  return lines.join("\n");
}
