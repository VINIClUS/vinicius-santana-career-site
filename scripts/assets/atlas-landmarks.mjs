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
  'pec-source', 'read-only-link', 'rust-acquisition', 'verified-extract', 'java-core', 'indicator-result', 'authorized-panel',
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
  ['deepWater', '#173c50', 0.42, 0.12], ['paving', '#34454a', 1, 0],
  ['concrete', '#6f7c7a', 0.95, 0], ['bark', '#4a4038', 1, 0],
]) materials[name] = new T.MeshStandardMaterial({ color, roughness, metalness });
for (const [name, color, intensity] of [
  ['cnesLight', '#a1fff0', 1.8], ['stationLight', '#ffdb9d', 1.5],
  ['infraLight', '#c5bbff', 1.6], ['waterLight', '#8ccddd', 0.45],
  ['esusLight', '#e9bd88', 0.6], ['esusWindow', '#f2c68c', 0.95],
  ['esusGlow', '#ffd9a3', 1.6],
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
    // A thin box reduced to its camera-facing +x, +y or +z side: 4 vertices instead of 24.
    face(material, position, scale) {
      const axis = scale.indexOf(Math.min(...scale));
      const geometry = new T.PlaneGeometry(1, 1).toNonIndexed();
      if (axis === 0) geometry.rotateY(Math.PI / 2);
      if (axis === 1) geometry.rotateX(-Math.PI / 2);
      geometry.scale(...scale.map((size, i) => i === axis ? 1 : size));
      geometry.translate(...position.map((value, i) => i === axis ? value + scale[axis] / 2 : value));
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

// A three-blade rotor as its own animated node; blades are one draw above a static housing.
function fanRotor(parent, name, position, speed, span) {
  const rotor = new T.Group();
  rotor.name = name;
  rotor.position.fromArray(position);
  rotor.userData.atlasMotion = { kind: 'rotate', speed, phase: 0 };
  const blades = [];
  for (let blade = 0; blade < 3; blade++) {
    const geometry = new T.BoxGeometry(span * 0.55, 0.009, span * 0.2).toNonIndexed();
    geometry.translate(span * 0.27, 0, 0);
    geometry.rotateY(blade * Math.PI * 2 / 3);
    geometry.deleteAttribute('uv');
    blades.push(geometry);
  }
  const merged = mergeGeometries(blades);
  mesh(rotor, 'fan-blades', mergeVertices(merged), 'metal');
  merged.dispose();
  blades.forEach(geometry => geometry.dispose());
  parent.add(rotor);
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
  if (id === 'esusdata') {
    // A disconnected PEC source feeds one read-only bridge into the local observatory.
    // Paved yards and contact footprints seat each building on the raised pad.
    detail.box('paving', [-2.45, 0.145, -0.72], [1.9, 0.03, 2.75]);
    detail.box('paving', [0.45, 0.145, -0.95], [2.9, 0.03, 1.5]);
    detail.box('paving', [0.3, 0.145, 1.5], [3.1, 0.03, 2.15]);
    detail.box('paving', [2.4, 0.145, 1.2], [1.1, 0.03, 1.2]);
    detail.box('concrete', [1.15, 0.15, -0.15], [0.36, 0.03, 1.25]);
    detail.box('concrete', [-0.45, 0.15, 2.52], [0.7, 0.03, 0.28]);
    for (const [x, z, w, d] of [[-2.45, -0.95, 1.62, 1.72], [-0.3, -0.95, 1.46, 1.39], [1.2, -0.95, 1.28, 1.26], [0.3, 1.35, 2.86, 1.81], [2.45, 1.18, 0.72, 0.89]]) {
      detail.box('contact', [x, 0.163, z], [w, 0.006, d]);
    }

    // PEC source: an external depot with a loading dock, rooftop chiller and uplink mast.
    box(g, 'pec-source', 'equipment', [-2.45, 0.55, -0.95], [1.45, 0.72, 1.55]);
    box(g, 'pec-source-roof', 'metal', [-2.45, 0.94, -0.95], [1.58, 0.08, 1.68]);
    detail.face('esusLight', [-2.45, 0.93, -0.12], [1.5, 0.018, 0.012]);
    detail.face('esusLight', [-1.67, 0.93, -0.95], [0.012, 0.018, 1.6]);
    for (const z of [-1.45, -1.05, -0.65]) detail.box('esusLight', [-1.68, 0.59, z], [0.03, 0.09, 0.17]);
    for (let row = 0; row < 4; row++) detail.box('dark', [-1.715, 0.3 + row * 0.05, -1.05], [0.02, 0.022, 0.9]);
    detail.face('dark', [-2.8, 0.39, -0.165], [0.56, 0.4, 0.025]);
    for (let row = 0; row < 5; row++) detail.box('metal', [-2.8, 0.24 + row * 0.07, -0.15], [0.54, 0.014, 0.012]);
    detail.box('metal', [-2.8, 0.64, -0.08], [0.74, 0.03, 0.2]);
    detail.face('esusGlow', [-2.8, 0.618, -0.03], [0.2, 0.012, 0.05]);
    detail.box('concrete', [-2.8, 0.18, -0.02], [0.7, 0.07, 0.3]);
    detail.face('esusWindow', [-2.05, 0.35, -0.163], [0.2, 0.3, 0.02]);
    detail.face('metal', [-2.05, 0.52, -0.14], [0.3, 0.025, 0.08]);
    detail.box('equipment', [-2.1, 1.07, -1.25], [0.62, 0.18, 0.5]);
    detail.face('metal', [-2.1, 1.165, -1.25], [0.66, 0.02, 0.54]);
    detail.cylinder('dark', [-2.1, 1.18, -1.25], [0.17, 0.012, 0.17]);
    fanRotor(g, 'pec-fan', [-2.1, 1.19, -1.25], 1.2, 0.15);
    detail.box('metal', [-3.0, 1.35, -1.4], [0.035, 0.78, 0.035]);
    detail.box('metal', [-3.0, 1.4, -1.4], [0.18, 0.015, 0.015]);
    detail.box('metal', [-3.0, 0.99, -1.4], [0.14, 0.03, 0.14]);
    const beacon = new T.Group();
    beacon.name = 'pec-beacon';
    beacon.position.set(-3.0, 1.77, -1.4);
    beacon.userData.atlasMotion = { kind: 'bob', speed: 1.3, amplitude: 0.018, phase: 0 };
    mesh(beacon, 'beacon-lamp', cylinderGeometry, 'esusGlow', [0, 0, 0], [0.035, 0.05, 0.035]);
    g.add(beacon);
    // A service van waits at the dock; the fenced yard marks the source as external.
    detail.box('wall', [-2.8, 0.27, 0.28], [0.34, 0.24, 0.52]);
    detail.box('wall', [-2.8, 0.23, 0.62], [0.34, 0.16, 0.17]);
    detail.face('glass', [-2.8, 0.28, 0.705], [0.28, 0.07, 0.012]);
    detail.box('esusGlow', [-2.8, 0.2, 0.708], [0.26, 0.018, 0.01]);
    for (const x of [-3.3, -3.0, -2.7, -2.1, -1.8]) detail.box('metal', [x, 0.25, 0.95], [0.022, 0.24, 0.022]);
    for (const y of [0.22, 0.35]) {
      detail.box('metal', [-3.0, y, 0.95], [0.6, 0.012, 0.012]);
      detail.box('metal', [-1.95, y, 0.95], [0.3, 0.012, 0.012]);
    }

    // The read-only bridge: a raised cable tray through a one-way gate.
    box(g, 'read-only-link', 'esusdata', [-1.35, 0.2, -0.95], [0.75, 0.045, 0.07]);
    for (const x of [-1.62, -1.08]) detail.box('metal', [x, 0.16, -0.95], [0.035, 0.06, 0.13]);
    for (const x of [-1.55, -1.15]) detail.face('esusGlow', [x, 0.226, -0.95], [0.05, 0.008, 0.03]);
    box(g, 'read-only-gate', 'dark', [-1.35, 0.37, -0.95], [0.12, 0.34, 0.26]);
    for (const z of [-1.1, -0.8]) detail.box('metal', [-1.35, 0.39, z], [0.05, 0.4, 0.04]);
    detail.box('metal', [-1.35, 0.605, -0.95], [0.08, 0.035, 0.36]);
    detail.face('esusGlow', [-1.285, 0.47, -0.95], [0.012, 0.05, 0.12]);

    // Rust acquisition: a technical block with a lit instrument band and rooftop air handling.
    beveledBox(g, 'rust-acquisition', 'metal', [-0.3, 0.61, -0.95], [1.32, 0.8, 1.25]);
    detail.box('esusLight', [-0.3, 0.83, -0.305], [0.9, 0.07, 0.03]);
    detail.box('dark', [-0.3, 0.2, -0.95], [1.38, 0.08, 1.31]);
    detail.face('glass', [-0.3, 0.55, -0.314], [1.12, 0.24, 0.02]);
    detail.face('glass', [0.37, 0.55, -0.95], [0.02, 0.24, 1.05]);
    for (let b = 0; b <= 5; b++) detail.face('metal', [-0.86 + b * 0.224, 0.55, -0.305], [0.03, 0.26, 0.025]);
    for (let b = 0; b <= 4; b++) detail.face('metal', [0.38, 0.55, -1.475 + b * 0.2625], [0.025, 0.26, 0.03]);
    for (const [x, lit] of [[-0.75, 1], [-0.526, 0], [-0.302, 1], [-0.078, 1], [0.146, 0]]) {
      if (lit) detail.face('esusWindow', [x, 0.55, -0.302], [0.18, 0.2, 0.012]);
    }
    for (const z of [-1.345, -0.82]) detail.face('esusWindow', [0.382, 0.55, z], [0.012, 0.2, 0.22]);
    detail.box('metal', [-0.3, 1.035, -0.33], [1.32, 0.05, 0.04]);
    detail.box('metal', [0.345, 1.035, -0.95], [0.04, 0.05, 1.25]);
    detail.box('equipment', [-0.55, 1.1, -1.15], [0.56, 0.17, 0.46]);
    detail.face('metal', [-0.55, 1.19, -1.15], [0.6, 0.02, 0.5]);
    detail.cylinder('dark', [-0.55, 1.205, -1.15], [0.15, 0.012, 0.15]);
    fanRotor(g, 'acquisition-fan', [-0.55, 1.215, -1.15], -1.5, 0.13);
    for (const x of [0.02, 0.18]) detail.box('metal', [x, 1.09, -0.62], [0.06, 0.14, 0.06]);

    // Verified extract: a sealed vault framed in steel on a dark plinth.
    detail.box('dark', [1.2, 0.19, -0.95], [1.24, 0.06, 1.22]);
    box(g, 'verified-extract', 'glass', [1.2, 0.34, -0.95], [1.1, 0.21, 1.08]);
    for (const x of [0.66, 1.74]) for (const z of [-1.48, -0.42]) detail.box('metal', [x, 0.35, z], [0.045, 0.24, 0.045]);
    detail.box('metal', [1.2, 0.455, -0.41], [1.13, 0.03, 0.04]);
    detail.box('metal', [1.755, 0.455, -0.95], [0.04, 0.03, 1.1]);
    box(g, 'extract-seal', 'esusdata', [1.2, 0.47, -0.95], [0.65, 0.04, 0.65]);
    detail.face('esusGlow', [1.2, 0.494, -0.95], [0.22, 0.01, 0.22]);
    detail.face('metal', [1.2, 0.5, -0.95], [0.14, 0.012, 0.14]);
    box(g, 'local-path', 'esusdata', [1.15, 0.2, -0.15], [0.07, 0.035, 1.1]);
    for (const z of [-0.5, -0.2, 0.1, 0.35]) detail.face('esusGlow', [1.15, 0.22, z], [0.05, 0.008, 0.04]);

    // Java core: two occupied floors, a recessed penthouse and a solar roof.
    beveledBox(g, 'java-core', 'equipment', [0.3, 0.76, 1.35], [2.7, 1.06, 1.65]);
    detail.box('metal', [0.3, 1.32, 1.35], [2.82, 0.08, 1.78]);
    detail.box('dark', [0.3, 0.2, 1.35], [2.76, 0.08, 1.71]);
    const frontLit = [[1, 0, 1, 1, 0, 0, 1, 0, 1, 1], [0, 1, 1, 0, 1, 1, 1, 0, 0, 1]];
    for (const [floor, y] of [[0, 0.62], [1, 1.02]]) {
      detail.face('glass', [0.3, y, 2.184], [2.56, 0.24, 0.02]);
      detail.face('glass', [1.659, y, 1.35], [0.02, 0.24, 1.5]);
      for (let b = 0; b <= 10; b++) detail.face('metal', [-0.98 + b * 0.256, y, 2.194], [0.03, 0.26, 0.025]);
      for (let b = 0; b <= 5; b++) detail.face('metal', [1.668, y, 0.6 + b * 0.3], [0.025, 0.26, 0.03]);
      frontLit[floor].forEach((lit, b) => {
        if (lit) detail.face('esusWindow', [-0.852 + b * 0.256, y, 2.197], [0.21, 0.2, 0.012]);
      });
      for (let b = 0; b < 5; b++) {
        if ((b + floor) % 3 !== 1) detail.face('esusWindow', [1.671, y, 0.75 + b * 0.3], [0.012, 0.2, 0.25]);
      }
    }
    for (const y of [0.82, 1.2]) detail.box('metal', [0.3, y, 2.195], [2.66, 0.035, 0.03]);
    detail.box('metal', [1.668, 0.82, 1.35], [0.03, 0.035, 1.6]);
    detail.box('esusLight', [0.3, 1.255, 2.2], [2.62, 0.022, 0.018]);
    detail.box('esusLight', [1.675, 1.255, 1.35], [0.018, 0.022, 1.56]);
    detail.face('esusGlow', [-0.45, 0.35, 2.186], [0.46, 0.24, 0.02]);
    detail.box('metal', [-0.45, 0.35, 2.198], [0.025, 0.24, 0.02]);
    detail.box('metal', [-0.45, 0.5, 2.38], [0.82, 0.035, 0.42]);
    detail.box('esusLight', [-0.45, 0.482, 2.585], [0.72, 0.012, 0.012]);
    for (const x of [-0.8, -0.1]) detail.box('metal', [x, 0.33, 2.55], [0.022, 0.34, 0.022]);
    detail.box('equipment', [-0.15, 1.5, 1.15], [1.3, 0.28, 0.85]);
    detail.box('metal', [-0.15, 1.655, 1.15], [1.38, 0.035, 0.93]);
    detail.face('esusWindow', [-0.15, 1.5, 1.581], [1.0, 0.09, 0.012]);
    detail.face('esusWindow', [0.506, 1.5, 1.15], [0.012, 0.09, 0.6]);
    detail.box('equipment', [-0.6, 1.72, 1.0], [0.4, 0.1, 0.36]);
    detail.cylinder('dark', [-0.6, 1.775, 1.0], [0.12, 0.01, 0.12]);
    fanRotor(g, 'core-fan', [-0.6, 1.785, 1.0], 1.35, 0.11);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const [x, z] = [0.95 + col * 0.25, 0.85 + row * 0.62];
        detail.face('metal', [x, 1.372, z], [0.23, 0.014, 0.52]);
        detail.face('dark', [x, 1.382, z], [0.2, 0.012, 0.48]);
      }
    }
    for (const [x, z] of [[-0.85, 0.72], [-0.85, 2.0]]) detail.box('metal', [x, 1.52, z], [0.02, 0.36, 0.02]);

    // Indicator and authorized panel: a processing kiosk beside a lit bar-chart display.
    box(g, 'indicator-result', 'esusdata', [2.45, 0.58, 1.18], [0.58, 0.68, 0.75]);
    detail.box('metal', [2.45, 0.94, 1.18], [0.64, 0.04, 0.81]);
    detail.box('dark', [2.45, 0.19, 1.18], [0.66, 0.06, 0.83]);
    for (const y of [0.4, 0.55, 0.7]) detail.face('dark', [2.742, y, 1.18], [0.012, 0.03, 0.6]);
    for (const [y, material] of [[0.4, 'esusGlow'], [0.55, 'esusLight'], [0.7, 'esusGlow']]) detail.box(material, [2.746, y, 0.95], [0.01, 0.022, 0.05]);
    detail.face('dark', [2.45, 0.66, 1.557], [0.4, 0.3, 0.012]);
    detail.face('esusWindow', [2.45, 0.7, 1.562], [0.32, 0.14, 0.008]);
    box(g, 'authorized-panel', 'glass', [2.4, 0.84, 2.25], [1.3, 1.13, 0.18]);
    detail.box('metal', [2.4, 0.2, 2.25], [1.55, 0.15, 0.7]);
    for (const x of [1.72, 3.08]) detail.box('metal', [x, 0.84, 2.25], [0.07, 1.18, 0.22]);
    detail.box('metal', [2.4, 1.43, 2.25], [1.43, 0.06, 0.22]);
    detail.face('esusLight', [2.4, 1.3, 2.346], [1.1, 0.06, 0.012]);
    detail.box('metal', [2.4, 0.46, 2.346], [1.14, 0.012, 0.01]);
    [0.12, 0.2, 0.16, 0.3, 0.24, 0.38].forEach((height, i) => {
      detail.box(i === 5 ? 'esusGlow' : 'esusdata', [1.94 + i * 0.184, 0.47 + height / 2, 2.347], [0.12, height, 0.012]);
    });

    // Site life: street lights along the paths, planting at the edges of the pad.
    for (const [x, z] of [[0.85, -0.45], [1.45, 0.25], [-1.25, 2.55], [1.7, 2.6], [2.1, 0.3], [-1.55, 0.35]]) {
      detail.box('metal', [x, 0.37, z], [0.026, 0.46, 0.026]);
      detail.box('esusGlow', [x, 0.6, z], [0.07, 0.03, 0.07]);
    }
    for (const [x, z, size] of [[-3.15, 1.3, 0.24], [-2.7, 1.85, 0.2], [-3.3, 0.35, 0.18], [3.05, -1.25, 0.22], [2.65, -1.9, 0.19], [-0.65, -2.25, 0.2], [0.8, -2.35, 0.17], [3.1, 0.35, 0.18]]) {
      detail.box('bark', [x, 0.13 + size, z], [0.045, size * 1.3, 0.045]);
      detail.rock('foliage', [x, 0.2 + size * 1.55, z], [size, size * 1.1, size]);
      detail.rock('foliage', [x + size * 0.45, 0.2 + size * 1.2, z + size * 0.3], [size * 0.65, size * 0.75, size * 0.65]);
    }
    for (const x of [-0.95, -0.7, 0.05, 0.3, 0.55, 0.8]) detail.rock('foliage', [x, 0.2, 2.47], [0.09, 0.08, 0.08]);
    for (const [x, z] of [[-3.15, 1.2], [-2.9, 2.15], [3.1, -1.5], [2.95, 0.7]]) detail.rock('stone', [x, 0.18, z], [0.12, 0.08, 0.1]);
  }
  detail.finish();
  return g;
}
