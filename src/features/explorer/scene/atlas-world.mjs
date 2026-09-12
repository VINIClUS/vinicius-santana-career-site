// @ts-check
import {
  ACESFilmicToneMapping, BufferGeometry, CatmullRomCurve3, Color,
  DirectionalLight, Float32BufferAttribute, Group, HemisphereLight,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PointLight, Shape, ShapeGeometry, SRGBColorSpace, Vector3,
} from 'three';
import { atlasTerrainGeometry } from './atlas-terrain.mjs';

/** @typedef {import('../../../content/scenes/types.ts').DistrictId} DistrictId */
/** @typedef {import('../../../content/scenes/types.ts').OverviewLayout} OverviewLayout */
/** @typedef {typeof import('../../../content/scenes/atlas-authoring.json')} Visuals */
/** @typedef {Pick<OverviewLayout, 'placements' | 'rotations' | 'districtScale' | 'hubPosition' | 'terrainOutline'>} WorldLayout */

/** Closed authored curves; fixed sampling, no random or time-dependent geometry.
 * @param {readonly (readonly number[])[]} outline
 * @param {number} [scale]
 */
export function contourPoints(outline, scale = 1) {
  return new CatmullRomCurve3(outline.map(([x, z]) => new Vector3(x * scale, 0, z * scale)), true, 'centripetal').getPoints(128);
}

/** Local footprint shared by the selection overlay and region hit surface.
 * @param {readonly (readonly number[])[]} outline
 * @param {boolean} angular
 */
export function regionPoints(outline, angular) {
  const corners = outline.map(([x, z]) => new Vector3(x, 0.16, z));
  return angular ? corners : new CatmullRomCurve3(corners, true, 'centripetal').getPoints(48).slice(0, -1);
}

/** A low, irregular landform, in Y-up coordinates with a base at zero.
 * @param {readonly (readonly number[])[]} outline
 * @param {number} height
 * @param {boolean} [smooth]
 */
export function landformGeometry(outline, height, smooth = true) {
  const points = smooth ? contourPoints(outline).slice(0, -1) : outline.map(([x, z]) => new Vector3(x, 0, z));
  const shape = new Shape();
  points.forEach((p, i) => i === 0 ? shape.moveTo(p.x, -p.z) : shape.lineTo(p.x, -p.z));
  shape.closePath();
  const cap = new ShapeGeometry(shape).toNonIndexed();
  cap.rotateX(-Math.PI / 2);
  cap.translate(0, height, 0);
  const positions = Array.from(cap.getAttribute('position').array);
  cap.dispose();
  // Sloped shoulders meet the common terrain, avoiding a vertical tray edge.
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    positions.push(a.x, height, a.z, b.x, height, b.z, a.x * 1.075, -0.04, a.z * 1.075,
      b.x, height, b.z, b.x * 1.075, -0.04, b.z * 1.075, a.x * 1.075, -0.04, a.z * 1.075);
  }
  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Static soft contact around a region, with vertex alpha fading into the terrain.
 * @param {readonly (readonly number[])[]} outline
 * @param {boolean} angular
 * @param {number} spread
 * @param {number} opacity
 */
function contactGeometry(outline, angular, spread, opacity) {
  const points = regionPoints(outline, angular);
  /** @type {number[]} */
  const positions = [];
  /** @type {number[]} */
  const colors = [];
  const vertex = (/** @type {Vector3} */ point, /** @type {number} */ scale, /** @type {number} */ alpha) => {
    positions.push(point.x * scale, 0.008, point.z * scale);
    colors.push(1, 1, 1, alpha);
  };
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    vertex(a, 0.98, opacity); vertex(b, 0.98, opacity); vertex(a, spread, 0);
    vertex(a, spread, 0); vertex(b, 0.98, opacity); vertex(b, spread, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  return geometry;
}

/** One renderer policy for overview exports, Atlas and Home. Details retain theirs.
 * @param {import('three').WebGLRenderer} renderer
 * @param {Visuals} visual
 */
export function configureAtlasRenderer(renderer, visual) {
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = visual.lighting.exposure;
  renderer.outputColorSpace = SRGBColorSpace;
}

/** @param {import('three').OrthographicCamera} camera
 * @param {import('../../../content/scenes/types.ts').SceneCamera} preset
 */
export function applyAtlasCamera(camera, preset) {
  Object.assign(camera, preset.frustum);
  camera.position.fromArray(preset.position);
  camera.up.fromArray(preset.up);
  camera.zoom = preset.zoom;
  camera.lookAt(new Vector3().fromArray(preset.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

/** Assembly only: no fetching, navigation, React, generated metadata or landmark factories.
 * The caller owns all models/resources, including both cached responsive environments.
 * @param {{ models: Record<DistrictId | 'hub', import('three').Object3D>, visual: Visuals, world?: Group }} options
 */
export function createAtlasWorld({ models, visual, world = new Group() }) {
  const ids = /** @type {DistrictId[]} */ (Object.keys(visual.regions));
  const groups = new Map(ids.map(id => {
    const group = new Group();
    group.name = `placement-${id}`;
    group.userData.districtId = id;
    group.add(models[id]);
    const fixture = visual.lighting.local[id];
    const light = new PointLight(fixture.color, fixture.intensity, fixture.distance, 2);
    light.name = `local-light-${id}`;
    light.position.fromArray(fixture.position);
    group.add(light);
    world.add(group);
    return [id, group];
  }));
  world.add(models.hub);
  const { lighting, palette } = visual;
  world.add(new HemisphereLight(lighting.sky, lighting.ground, lighting.ambientIntensity));
  for (const light of [lighting.key, lighting.fill]) {
    const source = new DirectionalLight(light.color, light.intensity);
    source.position.fromArray(light.position);
    world.add(source);
  }
  const ground = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const rim = new MeshStandardMaterial({ color: palette.terrainRaised, roughness: 1 });
  const ink = new LineBasicMaterial({ color: palette.contour, transparent: true, opacity: visual.presentation.contourOpacity, depthWrite: false });
  const contact = new MeshBasicMaterial({ color: palette.contact, transparent: true, vertexColors: true, depthWrite: false });
  const planting = Object.fromEntries(['foliage', 'trunk', 'stone'].map(name => [name, new MeshStandardMaterial({ color: visual.terrain[/** @type {'foliage' | 'trunk' | 'stone'} */ (name)], roughness: 1 })]));
  /** @type {Map<WorldLayout['terrainOutline'], Group>} */
  const environments = new Map();
  /** @type {Group | undefined} */
  let environment;

  /** @param {WorldLayout} layout */
  const makeEnvironment = layout => {
    const outline = layout.terrainOutline;
    const group = new Group();
    group.name = 'continuous-territory';
    // The same low relief and true height contours cross all three regions.
    const terrain = atlasTerrainGeometry(contourPoints(outline).slice(0, -1), layout, visual);
    const edge = new Mesh(terrain.rim, rim);
    const surface = new Mesh(terrain.surface, ground);
    group.add(edge, surface);
    for (const name of /** @type {const} */ (['foliage', 'trunk', 'stone'])) {
      const batch = new Mesh(terrain[name], planting[name]);
      batch.name = `terrain-${name}`;
      group.add(batch);
    }
    for (const id of ids) {
      const shade = new Mesh(contactGeometry(visual.regions[id].outline, id === 'infrastructure', visual.presentation.contactSpread, visual.presentation.contactOpacity), contact);
      shade.name = `static-contact-${id}`;
      shade.position.fromArray(layout.placements[id]);
      shade.rotation.set(...layout.rotations[id]);
      shade.scale.setScalar(layout.districtScale);
      group.add(shade);
    }
    const contours = new LineSegments(terrain.contours, ink);
    contours.name = 'authored-contours';
    group.add(contours);
    // The environment never consumes a pointer hit, including cartography and origin.
    group.traverse(object => { object.raycast = () => {}; });
    world.add(group);
    environments.set(outline, group);
    return group;
  };
  models.hub.traverse(object => { object.raycast = () => {}; });
  return {
    world,
    groups,
    background: new Color(palette.background),
    /** @param {WorldLayout} layout */
    applyLayout(layout) {
      for (const [id, group] of groups) {
        group.position.fromArray(layout.placements[id]);
        group.rotation.set(...layout.rotations[id]);
        group.scale.setScalar(layout.districtScale);
      }
      models.hub.position.fromArray(layout.hubPosition);
      if (environment) environment.visible = false;
      environment = environments.get(layout.terrainOutline) ?? makeEnvironment(layout);
      environment.visible = true;
      world.updateMatrixWorld(true);
    },
    /** Anchor includes the full placement matrix, including rotation and scale.
     * @param {DistrictId} id
     * @param {Vector3} target
     */
    labelPosition(id, target) {
      const group = groups.get(id);
      if (!group) throw new Error(`Unknown district: ${id}`);
      return group.localToWorld(target.fromArray(visual.regions[id].labelAnchor));
    },
    /** @param {DistrictId} id */
    regionOutline(id) {
      const group = groups.get(id);
      if (!group) throw new Error(`Unknown district: ${id}`);
      return regionPoints(visual.regions[id].outline, id === 'infrastructure').map(point => group.localToWorld(point));
    },
  };
}
