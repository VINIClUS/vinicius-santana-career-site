import {
  BufferGeometry, DirectionalLight, GridHelper, Group, HemisphereLight,
  LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, Object3D,
  OrthographicCamera, PlaneGeometry, Vector3,
} from 'three';
import { districts, hub, type OverviewLayout } from '../../../content/scenes/index.ts';
import { districtIds, type DistrictId } from '../districts.ts';
import type { createModelCache } from './resources.ts';

/** Shared authored visuals only; each mount owns its model cache and resources. */
export function createOverviewComposition(world = new Group()) {
  const groups = new Map<DistrictId, Group>();
  const connectors = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: '#335466', transparent: true, opacity: 0.55 }));
  world.add(connectors);
  let hubModel: Object3D | undefined;
  return {
    world,
    async load(cache: ReturnType<typeof createModelCache>, signal: AbortSignal) {
      const models = await Promise.all([cache.load(hub.model.src), ...districtIds.map(id => cache.load(districts[id].model.src))]);
      signal.throwIfAborted();
      hubModel = models[0]!;
      world.add(hubModel);
      districtIds.forEach((id, index) => {
        const group = new Group();
        group.name = `placement-${id}`;
        group.userData.districtId = id;
        group.add(models[index + 1]!);
        groups.set(id, group);
        world.add(group);
      });
      world.add(new HemisphereLight('#d9efff', '#17232d', 1.5));
      const key = new DirectionalLight('#d0e5ff', 2.5);
      key.position.set(-7, 14, 8);
      const fill = new DirectionalLight('#68b6df', 1.5);
      fill.position.set(8, 5, -6);
      world.add(key, fill);
      const floor = new Mesh(new PlaneGeometry(160, 160), new MeshStandardMaterial({ color: '#050a11', roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.025;
      world.add(floor);
      const grid = new GridHelper(60, 30, '#162835', '#12212d');
      grid.position.y = -0.02;
      world.add(grid);
    },
    applyLayout(layout: OverviewLayout) {
      for (const [id, group] of groups) {
        group.position.set(...layout.placements[id]);
        group.scale.setScalar(layout.districtScale);
      }
      hubModel?.position.set(...layout.hubPosition);
      const points: Vector3[] = [];
      for (const id of districtIds) points.push(new Vector3(layout.hubPosition[0], 0.2, layout.hubPosition[2]), new Vector3(layout.placements[id][0], 0.2, layout.placements[id][2]));
      connectors.geometry.dispose();
      connectors.geometry = new BufferGeometry().setFromPoints(points);
    },
  };
}

export function applyOverviewCamera(camera: OrthographicCamera, layout: OverviewLayout) {
  const preset = layout.camera;
  Object.assign(camera, preset.frustum);
  camera.position.set(...preset.position);
  camera.up.set(...preset.up);
  camera.zoom = preset.zoom;
  camera.lookAt(new Vector3(...preset.target));
  camera.updateProjectionMatrix();
}
