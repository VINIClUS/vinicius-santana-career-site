import * as T from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import visual from '../../src/content/scenes/atlas-authoring.json' with { type: 'json' };
import { contourPoints, landformGeometry } from '../../src/features/explorer/scene/atlas-world.mjs';

// Overview-only landmarks. Detail factories and their shared helpers stay independent.
const boxGeometry = new T.BoxGeometry(1, 1, 1);
const cylinderGeometry = new T.CylinderGeometry(1, 1, 1, 16);
const pickableNames = new Set([
  'layer-0', 'layer-1', 'layer-2', 'layer-edge-0', 'layer-edge-1', 'layer-edge-2',
  'gateway-pier', 'gateway-header', 'entry-module', 'entry-surface',
  'shore-station', 'shore-roof', 'station-aperture',
  'node-volume', 'node-top', 'node-face', 'shared-layer', 'shared-surface',
]);
const materials = Object.fromEntries(Object.entries(visual.palette).map(([name, color]) => [name,
  new T.MeshStandardMaterial({ color, roughness: name === 'water' ? 0.45 : 0.82, metalness: 0.08 }),
]));
materials.waterContour = new T.MeshStandardMaterial({
  color: new T.Color(visual.palette.water).lerp(new T.Color(visual.palette.wall), 0.24),
  roughness: 0.65,
  metalness: 0.08,
});
// Local material separation keeps the construction readable under shared world lighting.
for (const [name, color, roughness, metalness] of [
  ['glass', '#112d38', 0.38, 0.25], ['metal', '#617783', 0.7, 0.3],
  ['equipment', '#34454d', 0.8, 0.15], ['bank', '#58645a', 1, 0],
  ['stone', '#7b8174', 1, 0], ['foliage', '#35584d', 1, 0],
  ['reeds', '#65775c', 1, 0], ['shallow', '#347582', 0.55, 0.08],
  ['deepWater', '#173c50', 0.42, 0.12],
]) materials[name] = new T.MeshStandardMaterial({ color, roughness, metalness });
for (const [name, color, intensity] of [
  ['cnesLight', '#a1fff0', 1.8], ['stationLight', '#ffdb9d', 1.5],
  ['infraLight', '#c5bbff', 1.6], ['waterLight', '#8ccddd', 0.45],
]) materials[name] = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });
function mesh(parent, name, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new T.Mesh(geometry, materials[material]);
  object.name = name;
  object.position.fromArray(position);
  object.scale.fromArray(scale);
  if (pickableNames.has(name) || /^instrument-(base|mast|cap)-[1-3]$/.test(name)) {
    object.userData.atlasPickable = true;
  }
  parent.add(object);
  return object;
}
const box = (p, name, material, position, scale) => mesh(p, name, boxGeometry, material, position, scale);
const bevelGeometries = new Map();
// Normalize after beveling in world units, retaining each named mesh's original transform.
function beveledBox(parent, name, material, position, scale, bevel = 0.035) {
  const key = [...scale, bevel].join(':');
  if (!bevelGeometries.has(key)) {
    const [width, height, depth] = scale;
    const b = Math.min(bevel, height / 3);
    const x = width / 2 - b;
    const z = depth / 2 - b;
    const shape = new T.Shape().moveTo(-x, -z).lineTo(x, -z).lineTo(x, z).lineTo(-x, z);
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, {
      depth: height - b * 2, steps: 1, bevelEnabled: true,
      bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, b - height / 2, 0);
    geometry.scale(1 / width, 1 / height, 1 / depth);
    bevelGeometries.set(key, geometry);
  }
  return mesh(parent, name, bevelGeometries.get(key), material, position, scale);
}

// Only new decoration is merged; existing named geometry and semantic node groups survive.
function decoration(parent) {
  const byMaterial = new Map();
  const add = (material, geometry) => {
    // All surfaces use solid materials; omitting UVs also welds cylinder seams.
    geometry.deleteAttribute('uv');
    if (!byMaterial.has(material)) byMaterial.set(material, []);
    byMaterial.get(material).push(geometry);
  };
  return {
    box(material, position, scale) {
      const geometry = boxGeometry.toNonIndexed();
      geometry.scale(...scale);
      geometry.translate(...position);
      add(material, geometry);
    },
    cylinder(material, position, scale) {
      const geometry = cylinderGeometry.toNonIndexed();
      geometry.scale(...scale);
      geometry.translate(...position);
      add(material, geometry);
    },
    rock(material, position, scale) {
      const geometry = new T.OctahedronGeometry(1, 0);
      geometry.rotateY(position[0] * 2);
      geometry.scale(...scale);
      geometry.translate(...position);
      add(material, geometry);
    },
    waterContour(outline, scale, from, to) {
      const points = contourPoints(outline, scale);
      const positions = [];
      for (let i = from; i < to; i++) {
        const a = points[i];
        const b = points[i + 1];
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const dx = -(b.z - a.z) / length * 0.014;
        const dz = (b.x - a.x) / length * 0.014;
        positions.push(
          a.x + dx, 0.219, a.z + dz, b.x + dx, 0.219, b.z + dz, a.x - dx, 0.219, a.z - dz,
          a.x - dx, 0.219, a.z - dz, b.x + dx, 0.219, b.z + dz, b.x - dx, 0.219, b.z - dz,
        );
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      add('waterContour', geometry);
    },
    finish() {
      for (const [material, geometries] of byMaterial) {
        const merged = mergeGeometries(geometries);
        mesh(parent, `decoration-${material}`, mergeVertices(merged), material);
        merged.dispose();
        geometries.forEach(geometry => geometry.dispose());
      }
    },
  };
}
function root(id) {
  const group = new T.Group();
  group.name = id === 'hub' ? id : `district-${id}`;
  group.userData = { assetId: group.name, illustrative: true, upAxis: 'Y', pivotConvention: 'base-center', units: 'illustrative-metre', ...(id === 'hub' ? {} : { districtId: id }) };
  return group;
}

function basinSurface(outline, scale) {
  const points = contourPoints(outline, scale).filter((_, i) => i % 4 === 0).slice(0, -1);
  const shape = new T.Shape(points.map(p => new T.Vector2(p.x, -p.z)));
  const geometry = new T.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function shorelineGeometry(outline) {
  const outer = contourPoints(outline).filter((_, i) => i % 4 === 0).slice(0, -1);
  const positions = [];
  const indices = [];
  outer.forEach((p, i) => {
    positions.push(p.x, 0.27 + Math.sin(i * 1.7) * 0.018, p.z, p.x * 0.91, 0.217, p.z * 0.91);
    const a = i * 2;
    const b = ((i + 1) % outer.length) * 2;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  });
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function makeAtlasLandmark(id) {
  const g = root(id);
  if (id === 'hub') {
    const ring = mesh(g, 'origin-ring', new T.RingGeometry(0.47, 0.49, 48), 'contour', [0, 0.025, 0]);
    ring.rotation.x = -Math.PI / 2;
    box(g, 'register-x', 'contour', [0, 0.015, 0], [0.36, 0.015, 0.018]);
    box(g, 'register-z', 'contour', [0, 0.015, 0], [0.018, 0.015, 0.36]);
    return g;
  }
  const outline = visual.regions[id].outline;
  const detail = decoration(g);
  mesh(g, 'regional-rise', landformGeometry(outline, 0.13, id !== 'infrastructure'), 'terrainRaised');
  // Thin dark footprints provide the same static contact in exported posters and runtime.
  if (id === 'cnesdata') {
    box(g, 'layer-contact', 'contact', [-0.3, 0.14, 0.1], [5.3, 0.025, 3.9]);
    for (const [i, width, depth, x, z] of [[0, 4.6, 3.3, -0.4, 0.3], [1, 3.65, 2.6, -0.65, 0.0], [2, 2.75, 1.8, -0.9, -0.25]]) {
      const y = 0.38 + i * 0.58;
      box(g, `layer-${i}`, 'glass', [x, y, z], [width, 0.44, depth]);
      beveledBox(g, `layer-edge-${i}`, 'metal', [x, y + 0.24, z], [width + 0.14, 0.075, depth + 0.14], 0.022);
      box(g, `layer-contract-${i}`, 'cnesLight', [x, y + 0.17, z + depth / 2 + 0.015], [width - 0.16, 0.026, 0.03]);
      detail.box('roof', [x, y + 0.295, z], [width - 0.12, 0.035, depth - 0.12]);
      detail.box('metal', [x, y - 0.19, z + depth / 2 + 0.02], [width + 0.04, 0.045, 0.06]);
      detail.box('metal', [x + width / 2 + 0.02, y - 0.19, z], [0.06, 0.045, depth]);
      detail.box('cnesLight', [x + width / 2 + 0.014, y + 0.17, z], [0.03, 0.026, depth - 0.16]);
      // Structural mullions split both camera-facing recessed elevations into bays.
      const bays = 6 - i;
      for (let b = 0; b <= bays; b++) {
        const bx = x - width / 2 + 0.08 + b * (width - 0.16) / bays;
        detail.box('metal', [bx, y - 0.01, z + depth / 2 + 0.025], [0.055, 0.3, 0.05]);
      }
      for (let b = 0; b < 4 - i; b++) {
        const bz = z - depth / 2 + 0.22 + b * 0.65;
        detail.box('metal', [x + width / 2 + 0.025, y - 0.01, bz], [0.05, 0.3, 0.055]);
        detail.box('equipment', [x + width / 2 + 0.028, y, bz + 0.23], [0.055, 0.19, 0.29]);
      }
      // Plant follows the exposed terrace, where it survives the overview camera.
      const plantZ = z + depth / 2 - 0.3;
      for (let b = 0; b < 3; b++) {
        const px = x - width * 0.29 + b * width * 0.29;
        detail.box('equipment', [px, y + 0.36, plantZ], [0.48, 0.11, 0.3]);
        detail.box('metal', [px, y + 0.422, plantZ], [0.4, 0.024, 0.24]);
        for (const offset of [-0.1, 0, 0.1]) detail.box('dark', [px + offset, y + 0.438, plantZ], [0.035, 0.014, 0.18]);
      }
      if (i === 2) {
        detail.box('equipment', [x - 0.35, y + 0.38, z - 0.35], [0.85, 0.15, 0.56]);
        for (const offset of [-0.19, 0.19]) {
          detail.cylinder('metal', [x - 0.35 + offset, y + 0.48, z - 0.35], [0.13, 0.05, 0.13]);
          detail.cylinder('dark', [x - 0.35 + offset, y + 0.511, z - 0.35], [0.08, 0.015, 0.08]);
          const rotor = new T.Group();
          rotor.name = `roof-fan-${offset < 0 ? '01' : '02'}`;
          rotor.position.set(x - 0.35 + offset, y + 0.528, z - 0.35);
          rotor.userData.atlasMotion = { kind: 'rotate', speed: offset < 0 ? 1.6 : -1.35, phase: 0 };
          const blades = [];
          for (let blade = 0; blade < 3; blade++) {
            const angle = blade * Math.PI * 2 / 3;
            // One asymmetric low rotor; real local transforms survive GLB export.
            const geometry = new T.BoxGeometry(0.085, 0.009, 0.028).toNonIndexed();
            geometry.translate(0.041, 0, 0);
            geometry.rotateY(angle);
            geometry.deleteAttribute('uv');
            // Three blades are one draw, independent from the stationary housing.
            blades.push(geometry);
          }
          const mergedBlades = mergeGeometries(blades);
          const rotorGeometry = mergeVertices(mergedBlades);
          mergedBlades.dispose();
          blades.forEach(geometry => geometry.dispose());
          mesh(rotor, 'fan-blades', rotorGeometry, 'metal');
          g.add(rotor);
        }
      }
    }
    for (const x of [1.3, 2.55]) box(g, 'gateway-pier', 'wall', [x, 1.55, -1.65], [0.27, 2.8, 0.45]);
    beveledBox(g, 'gateway-header', 'metal', [1.92, 2.96, -1.65], [1.55, 0.16, 0.6]);
    detail.box('glass', [1.925, 1.96, -1.7], [0.98, 1.8, 0.25]);
    detail.box('cnesLight', [1.925, 2.94, -1.335], [1.28, 0.04, 0.032]);
    detail.box('equipment', [1.92, 0.23, -1.65], [1.7, 0.16, 0.74]);
    for (const x of [1.3, 2.55]) {
      detail.box('roof', [x, 1.6, -1.409], [0.13, 2.35, 0.032]);
      detail.box('cnesLight', [x, 2.1, -1.382], [0.035, 1.45, 0.022]);
    }
    for (let row = 0; row < 6; row++) detail.box('metal', [1.925, 1.2 + row * 0.29, -1.55], [0.92, 0.045, 0.06]);
    detail.box('metal', [1.925, 1.98, -1.54], [0.07, 1.7, 0.07]);
    beveledBox(g, 'entry-module', 'dark', [2.25, 0.46, 1.3], [1.0, 0.62, 1.25]);
    box(g, 'entry-surface', 'metal', [2.25, 0.79, 1.3], [1.12, 0.055, 1.37]);
    detail.box('glass', [2.25, 0.51, 1.941], [0.7, 0.32, 0.025]);
    detail.box('metal', [2.25, 0.51, 1.96], [0.045, 0.34, 0.035]);
    detail.box('cnesLight', [2.25, 0.735, 1.98], [0.92, 0.032, 0.025]);
    detail.box('roof', [2.25, 0.29, 2.07], [1.05, 0.15, 0.29]);
    detail.box('metal', [2.25, 0.19, 2.29], [1.18, 0.07, 0.25]);
    for (const x of [-1.9, -1.3, -0.7]) detail.box('metal', [x, 0.17, 2.28], [0.42, 0.045, 0.3]);
    for (const [x, z, size] of [[-2.92, 1.45, 0.25], [-2.93, 0.94, 0.18], [0.8, 2.32, 0.22], [2.98, -0.8, 0.2]]) {
      detail.rock('foliage', [x, 0.18 + size / 2, z], [size, size * 0.7, size]);
      detail.rock('stone', [x + 0.22, 0.19, z + 0.12], [0.12, 0.1, 0.14]);
    }
  }
  if (id === 'limnopulse') {
    const waterOutline = outline.map(([x, z]) => [x * 0.83 + 0.2, z * 0.85]);
    mesh(g, 'irregular-basin', basinSurface(waterOutline, 0.93), 'shallow', [0, 0.218, 0]);
    mesh(g, 'basin-shoreline', shorelineGeometry(waterOutline), 'bank');
    mesh(g, 'basin-water', basinSurface(waterOutline, 0.81), 'water', [0.12, 0.22, -0.03]);
    mesh(g, 'basin-depth', basinSurface(waterOutline, 0.59), 'deepWater', [0.3, 0.222, -0.12]);
    // Deliberately broken contour follows the shallow edge without suggesting flow.
    detail.waterContour(waterOutline, 0.87, 39, 69);
    for (const [i, x, z] of [[1, -0.9, -1.0], [2, 1.5, 0.05], [3, 0.2, 1.45]]) {
      const buoy = new T.Group();
      buoy.name = `buoy-0${i}`;
      buoy.position.set(x, 0.22, z);
      buoy.userData.atlasMotion = { kind: 'bob', speed: 0.9, amplitude: 0.035, tilt: 0.015, phase: i * 0.7 };
      g.add(buoy);
      const buoyDetail = decoration(buoy);
      mesh(buoy, `instrument-base-${i}`, cylinderGeometry, 'metal', [0, 0.07, 0], [0.23, 0.13, 0.23]);
      buoyDetail.cylinder('dark', [0, 0.146, 0], [0.18, 0.03, 0.18]);
      buoyDetail.cylinder('waterLight', [0, 0.173, 0], [0.15, 0.025, 0.15]);
      mesh(buoy, `instrument-mast-${i}`, cylinderGeometry, 'metal', [0, 0.44, 0], [0.052, 0.53, 0.052]);
      box(buoy, `instrument-cap-${i}`, 'wall', [0, 0.72, 0], [0.21, 0.22, 0.19]);
      buoyDetail.box('glass', [0, 0.72, 0.102], [0.12, 0.09, 0.018]);
      buoyDetail.box('metal', [0.13, 0.61, 0], [0.22, 0.035, 0.05]);
      buoyDetail.box('roof', [0.23, 0.65, 0], [0.23, 0.04, 0.26]);
      buoyDetail.box('glass', [0.23, 0.679, 0], [0.18, 0.012, 0.21]);
      buoyDetail.box('metal', [-0.05, 0.9, 0], [0.018, 0.2, 0.018]);
      buoyDetail.cylinder('wall', [0, 0.3, 0], [0.088, 0.12, 0.088]);
      buoyDetail.finish();
      // Horizontal XZ ring: the shared sampler can change X/Z scale at t>0.
      const rippleGeometry = new T.RingGeometry(0.36, 0.372, 40);
      rippleGeometry.rotateX(-Math.PI / 2);
      const ripple = mesh(g, `water-ripple-${i}`, rippleGeometry, 'waterContour', [x, 0.226, z]);
      ripple.userData.atlasMotion = { kind: 'ripple', speed: 1, amplitude: 0.13, phase: i * 0.7 };
    }
    box(g, 'shore-contact', 'contact', [-2.65, 0.14, 0.45], [1.28, 0.03, 1.6]);
    beveledBox(g, 'shore-station', 'wall', [-2.65, 0.57, 0.45], [1.0, 0.8, 1.35]);
    beveledBox(g, 'shore-roof', 'metal', [-2.65, 1.0, 0.45], [1.24, 0.09, 1.58]);
    box(g, 'station-aperture', 'glass', [-2.65, 0.65, 1.135], [0.74, 0.3, 0.03]);
    detail.box('metal', [-2.65, 0.65, 1.158], [0.04, 0.32, 0.035]);
    detail.box('equipment', [-2.65, 0.29, 1.143], [0.88, 0.16, 0.038]);
    detail.box('roof', [-2.65, 1.058, 0.45], [1.05, 0.025, 1.35]);
    detail.box('glass', [-2.8, 1.085, 0.74], [0.5, 0.026, 0.57]);
    for (const z of [0.55, 0.74, 0.93]) detail.box('metal', [-2.8, 1.103, z], [0.49, 0.015, 0.025]);
    detail.box('equipment', [-2.46, 1.14, 0.05], [0.42, 0.14, 0.36]);
    detail.cylinder('metal', [-2.46, 1.235, 0.05], [0.12, 0.05, 0.12]);
    detail.box('glass', [-2.138, 0.66, 0.25], [0.024, 0.29, 0.66]);
    for (const z of [0.05, 0.3, 0.53]) detail.box('metal', [-2.117, 0.66, z], [0.035, 0.31, 0.035]);
    detail.box('equipment', [-2.132, 0.51, 0.91], [0.026, 0.59, 0.26]);
    detail.box('stationLight', [-2.65, 0.865, 1.151], [0.79, 0.028, 0.018]);
    // Compact shore deck and pier, with boards and two supporting piles.
    detail.box('equipment', [-1.89, 0.29, 0.98], [0.52, 0.1, 0.7]);
    detail.box('metal', [-1.45, 0.29, 1.05], [0.6, 0.08, 0.39]);
    for (let i = 0; i < 5; i++) detail.box('bank', [-1.94 + i * 0.16, 0.346, 1.05], [0.13, 0.018, 0.37]);
    for (const z of [0.87, 1.23]) detail.cylinder('equipment', [-1.2, 0.215, z], [0.04, 0.3, 0.04]);
    const bankPoints = contourPoints(waterOutline);
    for (const index of [4, 10, 17, 29, 40, 46, 55, 69, 78, 86, 95, 108, 115]) {
      const p = bankPoints[index];
      const size = 0.11 + (index % 3) * 0.025;
      detail.rock('stone', [p.x * 0.985, 0.28, p.z * 0.985], [size * 1.5, size, size]);
      if (index % 2 === 0) {
        detail.rock('foliage', [p.x * 1.035, 0.35, p.z * 1.035], [0.21, 0.21, 0.19]);
        for (const offset of [-0.08, 0.02, 0.1]) detail.box('reeds', [p.x * 0.965 + offset, 0.36, p.z * 0.965], [0.024, 0.21 + offset, 0.024]);
      }
    }
    for (const z of [-0.75, -1.08, -1.41]) detail.box('stone', [-2.6, 0.18, z], [0.42, 0.05, 0.22]);
  }
  if (id === 'infrastructure') {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 1.85;
      const node = new T.Group();
      node.name = `node-0${i + 1}`;
      node.userData = { districtId: id, simulationId: node.name, componentId: 'reference-topology' };
      g.add(node);
      const nodeDetail = decoration(node);
      box(node, 'node-contact', 'contact', [x, 0.14, -0.6], [1.65, 0.03, 1.7]);
      beveledBox(node, 'node-volume', 'roof', [x, 1.36, -0.6], [1.24, 2.4, 1.35], 0.045);
      beveledBox(node, 'node-top', 'metal', [x, 2.61, -0.6], [1.32, 0.12, 1.43]);
      box(node, 'node-face', 'dark', [x, 1.36, 0.088], [1.02, 2.16, 0.028]);
      box(node, 'node-identity', 'infraLight', [x - 0.49, 1.4, 0.137], [0.028, 1.8, 0.018]);
      for (const offset of [-0.56, 0.56]) nodeDetail.box('metal', [x + offset, 1.37, 0.104], [0.065, 2.18, 0.08]);
      for (let row = 0; row < 7; row++) {
        const y = 0.49 + row * 0.282;
        nodeDetail.box('equipment', [x + 0.015, y, 0.122], [0.86, 0.222, 0.045]);
        nodeDetail.box('metal', [x + 0.02, y + 0.082, 0.154], [0.69, 0.024, 0.018]);
        nodeDetail.box('dark', [x - 0.07, y - 0.027, 0.154], [0.49, 0.048, 0.02]);
        nodeDetail.box(row === i + 2 ? 'infraLight' : 'wall', [x + 0.34, y + 0.004, 0.159], [0.034, 0.038, 0.018]);
      }
      nodeDetail.box('dark', [x, 2.678, -0.6], [1.03, 0.016, 1.13]);
      for (let slot = 0; slot < 5; slot++) nodeDetail.box('equipment', [x, 2.695, -0.99 + slot * 0.19], [0.83, 0.022, 0.065]);
      nodeDetail.box('infraLight', [x - 0.48, 2.699, -0.61], [0.035, 0.023, 0.9]);
      nodeDetail.box('dark', [x + 0.628, 1.36, -0.61], [0.016, 1.98, 1.02]);
      for (let slot = 0; slot < 8; slot++) nodeDetail.box('equipment', [x + 0.647, 0.53 + slot * 0.24, -0.61], [0.035, 0.064, 0.84]);
      for (const z of [-1.18, -0.05]) nodeDetail.box('metal', [x + 0.635, 1.36, z], [0.055, 2.12, 0.045]);
      nodeDetail.box('metal', [x, 0.23, -0.59], [1.4, 0.14, 1.49]);
      nodeDetail.finish();
      box(g, 'local-shared-channel', 'infrastructure', [x, 0.18, 0.93], [0.06, 0.04, 1.6]);
    }
    box(g, 'shared-contact', 'contact', [0, 0.145, 1.75], [5.5, 0.03, 1.1]);
    beveledBox(g, 'shared-layer', 'equipment', [0, 0.43, 1.75], [5.3, 0.52, 0.85]);
    box(g, 'shared-surface', 'metal', [0, 0.71, 1.75], [5.4, 0.06, 0.93]);
    detail.box('dark', [0, 0.44, 2.182], [5.02, 0.29, 0.018]);
    for (const x of [-1.85, 0, 1.85]) {
      detail.box('roof', [x, 0.758, 1.75], [1.45, 0.045, 0.66]);
      detail.box('infrastructure', [x, 0.79, 1.52], [1.15, 0.023, 0.035]);
      for (const offset of [-0.43, 0, 0.43]) {
        detail.box('equipment', [x + offset, 0.45, 2.2], [0.35, 0.19, 0.045]);
        detail.box('metal', [x + offset, 0.49, 2.231], [0.25, 0.025, 0.018]);
      }
      detail.box('metal', [x - 0.74, 0.45, 2.213], [0.055, 0.3, 0.035]);
      detail.box('roof', [x, 0.21, 0.98], [0.28, 0.08, 0.14]);
    }
    for (const [x, z] of [[-2.95, 0.13], [-2.87, 0.58], [2.93, -1.15], [2.99, -0.64]]) {
      detail.rock('foliage', [x, 0.3, z], [0.2, 0.19, 0.24]);
      detail.rock('stone', [x - 0.12, 0.2, z + 0.18], [0.14, 0.08, 0.12]);
    }
    for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) detail.box('metal', [x, 0.17, -1.86], [0.54, 0.04, 0.24]);
  }
  detail.finish();
  return g;
}
