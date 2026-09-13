import { Group, OrthographicCamera, Vector3 } from 'three';
import { districts, hub, type OverviewLayout } from '../../../content/scenes/index.ts';
import visual from '../../../content/scenes/atlas-authoring.json' with { type: 'json' };
import { type DistrictId } from '../districts.ts';
import type { createModelCache } from './resources.ts';
import { applyAtlasCamera, configureAtlasRenderer, createAtlasWorld } from './atlas-world.mjs';

export const atlasVisual = visual;
export const configureOverviewRenderer = (renderer: Parameters<typeof configureAtlasRenderer>[0]) => configureAtlasRenderer(renderer, visual);

/** Loading adapter only. The harness and both runtimes use the same world factory. */
export function createOverviewComposition(world = new Group()) {
  let composition: ReturnType<typeof createAtlasWorld> | undefined;
  return {
    world,
    async load(cache: ReturnType<typeof createModelCache>, signal: AbortSignal) {
      const models = new Map(await Promise.all(Object.entries({ hub, ...districts }).map(async ([id, asset]) => [id, await cache.load(asset.model.src)] as const)));
      signal.throwIfAborted();
      composition = createAtlasWorld({
        world, visual,
        models: { hub: models.get('hub')!, cnesdata: models.get('cnesdata')!, limnopulse: models.get('limnopulse')!, infrastructure: models.get('infrastructure')! },
      });
    },
    applyLayout(layout: OverviewLayout) { composition?.applyLayout(layout); },
    get groups() { return composition?.groups; },
    labelPosition(id: DistrictId, target: Vector3) { return composition?.labelPosition(id, target); },
    regionOutline(id: DistrictId) { return composition?.regionOutline(id); },
  };
}

export function applyOverviewCamera(camera: OrthographicCamera, layout: OverviewLayout) {
  applyAtlasCamera(camera, layout.camera);
}
