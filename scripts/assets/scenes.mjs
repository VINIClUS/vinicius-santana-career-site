import * as T from "three";

// Authored architectural miniatures. All dimensions share an illustrative metre.
// Repeated props deliberately share geometry and material instances.
const geometry = new Map();
const shape = (key, make) => {
  if (!geometry.has(key)) geometry.set(key, make());
  return geometry.get(key);
};
const colors = {
  base: "#253446",
  rim: "#526478",
  wall: "#667b90",
  roof: "#455769",
  dark: "#162332",
  glass: "#245267",
  cyan: "#74d7f0",
  green: "#29483b",
  bark: "#4d5051",
  ground: "#303f4b",
  water: "#206781",
  amber: "#b39e72",
  plan: "#536170",
};
const materials = Object.fromEntries(
  Object.entries(colors).map(([name, color]) => [
    name,
    new T.MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: name === "glass" ? 0.5 : 0.12,
      ...(name === "cyan" ? { emissive: color, emissiveIntensity: 0.35 } : {}),
    }),
  ]),
);
function mesh(parent, geo, material, pos, scale = [1, 1, 1]) {
  const m = new T.Mesh(geo, materials[material]);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(p, x, y, z, w, h, d, mat = "wall") {
  return mesh(
    p,
    shape("box", () => new T.BoxGeometry(1, 1, 1)),
    mat,
    [x, y, z],
    [w, h, d],
  );
}
function cylinder(p, x, y, z, r, h, mat = "roof") {
  return mesh(
    p,
    shape("cylinder", () => new T.CylinderGeometry(1, 1, 1, 24)),
    mat,
    [x, y, z],
    [r, h, r],
  );
}
function ring(p, x, y, z, r, mat = "cyan") {
  const m = mesh(
    p,
    shape("ring", () => new T.TorusGeometry(1, 0.022, 6, 64)),
    mat,
    [x, y, z],
    [r, r, r],
  );
  m.rotation.x = Math.PI / 2;
  return m;
}
function group(parent, id, data = {}) {
  const g = new T.Group();
  g.name = id;
  g.userData = { ...data };
  parent.add(g);
  return g;
}
function tree(p, x, z, h = 0.95) {
  cylinder(p, x, h * 0.4, z, 0.04, h * 0.8, "bark");
  for (let i = 0; i < 4; i++) {
    const k = 1 - i * 0.19;
    mesh(
      p,
      shape("tree", () => new T.ConeGeometry(1, 1, 9)),
      "green",
      [x + Math.sin(i * 3) * 0.025, h * 0.35 + i * h * 0.18 + 0.18, z],
      [h * 0.3 * k, h * 0.55 * k, h * 0.3 * k],
    );
  }
}
function plant(p, x, z) {
  for (let i = 0; i < 3; i++)
    mesh(
      p,
      shape("bush", () => new T.IcosahedronGeometry(1, 1)),
      "green",
      [x + i * 0.13, 0.47, z + Math.sin(i) * 0.1],
      [0.18, 0.18, 0.18],
    );
}
function vent(p, x, y, z) {
  box(p, x, y, z, 0.38, 0.2, 0.48, "rim");
  cylinder(p, x, y + 0.11, z, 0.135, 0.015, "dark");
  for (let i = 0; i < 3; i++) {
    const blade = box(p, x, y + 0.123, z, 0.2, 0.01, 0.035, "roof");
    blade.rotation.y = (i * Math.PI) / 3;
  }
}

function base(id, districtId, size = 8) {
  const g = new T.Group();
  g.name = id;
  g.userData = {
    assetId: id,
    ...(districtId ? { districtId } : {}),
    illustrative: true,
    upAxis: "Y",
    pivotConvention: "base-center",
    units: "illustrative-metre",
  };
  box(g, 0, 0.15, 0, size, 0.3, size, "base");
  box(g, 0, 0.325, 0, size - 0.22, 0.05, size - 0.22, "rim");
  box(g, 0, 0.37, 0, size - 0.5, 0.04, size - 0.5, "ground");
  return g;
}
function landscape(g) {
  for (const [x, z, h] of [
    [-3.3, -3.2, 1.3],
    [-2.6, -3.25, 0.9],
    [3.15, -3.25, 1.2],
    [3.35, 2.8, 1.3],
    [-3.2, 2.9, 1],
    [-3.3, 1.9, 0.8],
    [2.6, 3.25, 0.75],
  ])
    tree(g, x, z, h);
  for (let i = 0; i < 7; i++)
    box(g, -2.4 + i * 0.8, 0.41, 3, 0.5, 0.06, 0.45, "roof");
  for (let i = 0; i < 5; i++) {
    plant(g, -3.35, -1 + i * 0.5);
    plant(g, 3.3, -1 + i * 0.5);
  }
  box(g, 0, 0.405, 2.25, 6, 0.025, 0.07, "rim");
}
function building(p, x, z, w, h, d, mat = "wall") {
  const g = group(p, "building");
  box(g, x, 0.4 + h / 2, z, w, h, d, mat);
  box(g, x, 0.42 + h, z, w + 0.12, 0.12, d + 0.12, "roof");
  box(g, x, 0.48 + h, z, w - 0.12, 0.04, d - 0.12, "dark");
  for (let k = 0; k < Math.max(1, Math.floor(w / 0.7)); k++)
    vent(g, x - w / 2 + 0.36 + k * 0.65, 0.61 + h, z);
  for (let row = 0; row < Math.floor(h / 0.36); row++) {
    box(g, x, 0.52 + row * 0.36, z + d / 2 + 0.025, w, 0.035, 0.055, "rim");
    box(g, x + w / 2 + 0.025, 0.52 + row * 0.36, z, 0.055, 0.035, d, "rim");
    for (let col = 0; col < Math.floor(w / 0.34); col++)
      box(
        g,
        x - w / 2 + 0.17 + col * 0.34,
        0.69 + row * 0.36,
        z + d / 2 + 0.014,
        0.23,
        0.25,
        0.025,
        (row + col) % 7 === 0 ? "cyan" : "glass",
      );
    for (let col = 0; col < Math.floor(d / 0.34); col++)
      box(
        g,
        x + w / 2 + 0.014,
        0.69 + row * 0.36,
        z - d / 2 + 0.17 + col * 0.34,
        0.025,
        0.25,
        0.23,
        (row + col) % 9 === 0 ? "cyan" : "glass",
      );
  }
  for (let col = 0; col < Math.floor(w / 0.68); col++)
    box(
      g,
      x - w / 2 + 0.34 + col * 0.68,
      0.4 + h / 2,
      z + d / 2 + 0.033,
      0.035,
      h,
      0.045,
      "roof",
    );
  for (let col = 0; col < Math.floor(d / 0.68); col++)
    box(
      g,
      x + w / 2 + 0.033,
      0.4 + h / 2,
      z - d / 2 + 0.34 + col * 0.68,
      0.045,
      h,
      0.035,
      "roof",
    );
  box(g, x, 0.75, z + d / 2 + 0.04, 0.35, 0.65, 0.06, "dark");
  return g;
}

function rack(p, x, z, h = 2.6) {
  const g = group(p, "rack");
  box(g, x, 0.4 + h / 2, z, 1.25, h, 1.2, "dark");
  box(g, x, 0.45 + h, z, 1.34, 0.12, 1.3, "roof");
  for (let i = 0; i < 7; i++) {
    box(g, x, 0.63 + i * 0.31, z + 0.62, 1.07, 0.24, 0.045, "roof");
    for (let j = 0; j < 5; j++)
      box(
        g,
        x - 0.35 + j * 0.13,
        0.64 + i * 0.31,
        z + 0.65,
        0.055,
        0.055,
        0.024,
        j === 0 ? "cyan" : "dark",
      );
  }
  box(g, x - 0.61, 0.4 + h / 2, z + 0.63, 0.055, h, 0.04, "rim");
  box(g, x + 0.61, 0.4 + h / 2, z + 0.63, 0.055, h, 0.04, "rim");
  return g;
}
function link(p, a, b, mat = "cyan") {
  const v = new T.Vector3(...b).sub(new T.Vector3(...a));
  const m = mesh(
    p,
    shape("tube", () => new T.CylinderGeometry(0.022, 0.022, 1, 8)),
    mat,
    new T.Vector3(...a).addScaledVector(v, 0.5).toArray(),
  );
  m.scale.y = v.length();
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
}
function district(id) {
  const g = base(`district-${id}`, id);
  landscape(g);
  if (id === "cnesdata") {
    building(g, -1.8, -1.3, 1.6, 3.3, 1.6);
    building(g, 1.8, -1.6, 1.4, 2.6, 1.5);
    building(g, 0, 0.7, 3.6, 1.4, 2.1, "dark");
    for (let i = 0; i < 4; i++)
      box(g, -1.2 + i * 0.8, 1.97, 0.7, 0.52, 0.07, 1.2, "glass");
    link(g, [-1.8, 0.46, -1.3], [-1.8, 0.46, 2]);
    link(g, [-1.8, 0.46, 2], [1.8, 0.46, 2]);
  }
  if (id === "infrastructure") {
    for (let i = 0; i < 3; i++) {
      const r = rack(g, (i - 1) * 1.85, 0);
      r.userData = {
        districtId: id,
        simulationId: `node-0${i + 1}`,
        componentId: "reference-topology",
      };
    }
    box(g, 0, 0.47, 2.2, 5.6, 0.13, 0.8, "dark");
    for (let i = 0; i < 3; i++)
      link(g, [(i - 1) * 1.85, 0.5, 0.7], [(i - 1) * 1.85, 0.5, 2.2]);
    for (let i = 0; i < 3; i++)
      cylinder(g, -2.5 + i * 2.5, 0.65, -2.6, 0.42, 0.4, "roof");
  }
  if (id === "limnopulse") {
    const pond = cylinder(g, 0.3, 0.44, 0, 2.7, 0.12, "water");
    pond.scale.z *= 0.78;
    for (let i = 0; i < 4; i++) {
      const x = -2.3 + i * 1.55,
        z = i % 2 ? -1.1 : 1.2;
      cylinder(g, x, 0.58, z, 0.23, 0.12, "amber");
      cylinder(g, x, 1.05, z, 0.035, 0.9, "rim");
      mesh(
        g,
        shape("buoy", () => new T.SphereGeometry(0.09, 12, 8)),
        "cyan",
        [x, 1.55, z],
      );
      ring(g, x, 0.515, z, 0.38, "rim");
    }
    building(g, -2.55, -1.7, 0.8, 0.75, 0.9);
    for (let i = 0; i < 7; i++)
      box(g, 2.7, 0.46, -1.8 + i * 0.48, 0.5, 0.08, 0.38, "amber");
  }
  return g;
}
const cnesComponents = [
  "canonical-contracts",
  "edge-agent",
  "central-api",
  "tenant-isolation",
  "web-dashboard",
  "parquet-to-gold",
  "kubernetes",
];
function cnesDetail() {
  const g = base("detail-cnesdata", "cnesdata", 10);
  for (let i = 0; i < 7; i++) {
    const x = ((i % 4) - 1.5) * 2.2,
      z = i < 4 ? 1.8 : -1.5;
    const planned = i > 4;
    const c = group(g, cnesComponents[i], {
      districtId: "cnesdata",
      componentId: cnesComponents[i],
      status: planned ? "planned" : "implemented",
    });
    if (planned) {
      for (const dx of [-0.65, 0.65])
        for (const dz of [-0.65, 0.65])
          box(c, x + dx, 1.4, z + dz, 0.06, 2, 0.06, "plan");
      box(c, x, 2.4, z, 1.36, 0.06, 1.36, "plan");
      box(c, x, 0.43, z, 1.5, 0.06, 1.5, "plan");
    } else if (i === 3) {
      cylinder(c, x, 1.4, z, 0.65, 2, "dark");
      for (let j = 0; j < 4; j++) ring(c, x, 0.6 + j * 0.48, z, 0.66);
    } else {
      building(c, x, z, 1.4, 1.5 + i * 0.15, 1.4, i === 2 ? "dark" : "wall");
    }
    if (i > 0 && i < 4) link(g, [x - 2.2, 0.47, z], [x, 0.47, z]);
  }
  return g;
}
function infrastructureDetail() {
  const g = base("detail-infrastructure", "infrastructure", 8);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 2.1;
    const r = rack(g, x, -0.8, 2.9);
    r.userData = {
      districtId: "infrastructure",
      componentId: "reference-topology",
      simulationId: `node-0${i + 1}`,
    };
    link(g, [x, 0.48, 0], [x, 0.48, 2]);
  }
  const shared = group(g, "shared-layer", {
    districtId: "infrastructure",
    componentId: "reference-topology",
    simulationId: "shared-layer",
  });
  box(shared, 0, 0.7, 2, 5, 0.55, 1, "roof");
  for (let i = 0; i < 12; i++)
    box(shared, -2.2 + i * 0.4, 0.72, 2.51, 0.22, 0.1, 0.025, "glass");
  const workload = group(g, "workload", {
    districtId: "infrastructure",
    componentId: "reference-topology",
    simulationId: "workload",
  });
  box(workload, 0, 3.75, -0.8, 0.5, 0.5, 0.5, "cyan");
  return g;
}
function hub() {
  const g = base("hub", null, 3.5);
  cylinder(g, 0, 0.5, 0, 1.4, 0.23, "dark");
  ring(g, 0, 0.64, 0, 1.22);
  box(g, 0, 1.4, 0, 0.8, 0.8, 0.8, "cyan");
  const edges = new T.EdgesGeometry(new T.BoxGeometry(1.3, 1.3, 1.3));
  const frame = new T.LineSegments(
    edges,
    new T.LineBasicMaterial({ color: colors.cyan }),
  );
  frame.position.y = 1.4;
  g.add(frame);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    link(g, [0, 0.67, 0], [Math.cos(a) * 1.6, 0.67, Math.sin(a) * 1.6]);
  }
  return g;
}
export const districtIds = [
  "cnesdata",
  "limnopulse",
  "infrastructure",
];
export const overviewPositions = {
  cnesdata: [-7.5, 0, -5],
  limnopulse: [7.5, 0, -5],
  infrastructure: [0, 0, 6.5],
};
export const overviewLayouts = {
  desktop: {
    districtPositions: overviewPositions,
    hubPosition: [0, 0, 0],
    districtScale: 0.84,
  },
  mobile: {
    districtPositions: {
      cnesdata: [-6, 0, -6],
      limnopulse: [7, 0, -1],
      infrastructure: [-1, 0, 7],
    },
    hubPosition: [0, 0, 0],
    districtScale: 0.9,
  },
};
export const sceneIds = [
  ...districtIds.map((id) => `district-${id}`),
  "hub",
  "detail-cnesdata",
  "detail-infrastructure",
  "overview",
];
export function normalizeGeneratedMetadata(metadata) {
  const generatedSceneIds = [...sceneIds, "detail-infrastructure-failed"];
  const normalized = Object.fromEntries(
    Object.entries(metadata).filter(([id]) => generatedSceneIds.includes(id)),
  );
  if (!normalized.overview) return normalized;
  const keepPlacements = (positions = {}) =>
    Object.fromEntries(districtIds.map((id) => [id, positions[id]]));
  normalized.overview.districtPositions = keepPlacements(
    normalized.overview.districtPositions,
  );
  for (const layout of Object.values(normalized.overview.layouts ?? {})) {
    layout.districtPositions = keepPlacements(layout.districtPositions);
  }
  return normalized;
}
export function makeScene(id, variant = "desktop") {
  if (!sceneIds.includes(id)) throw new Error(`Unknown scene ${id}`);
  if (id.startsWith("district-")) return district(id.slice(9));
  if (id === "hub") return hub();
  if (id === "detail-cnesdata") return cnesDetail();
  if (id === "detail-infrastructure") return infrastructureDetail();
  const g = new T.Group();
  g.name = "overview";
  const layout = overviewLayouts[variant];
  const centralHub = hub();
  centralHub.position.set(...layout.hubPosition);
  g.add(centralHub);
  for (const id of districtIds) {
    const d = district(id);
    d.scale.setScalar(layout.districtScale);
    d.position.set(...layout.districtPositions[id]);
    g.add(d);
    link(
      g,
      [layout.hubPosition[0], 0.2, layout.hubPosition[2]],
      [d.position.x, 0.2, d.position.z],
    );
  }
  return g;
}
