import generated from './generated.json' with { type: 'json' };
import type { DistrictId, OverviewLayout, ResponsivePoster, SceneAsset, SceneCamera, Vector3 } from './types.ts';
export type { DistrictId, OverviewLayout, ResponsivePoster, SceneAsset, SceneCamera, SceneModel, Vector3, VisualImage } from './types.ts';

export const districtIds = ['cnesdata', 'public-health', 'infrastructure', 'observability', 'limnopulse'] as const satisfies readonly DistrictId[];

function vector(value: readonly number[]): Vector3 {
  if (value.length !== 3 || !value.every(Number.isFinite)) throw new Error('Invalid generated scene vector');
  return [value[0]!, value[1]!, value[2]!];
}
function camera(value: { projection: string; position: number[]; target: number[]; up: number[]; frustum: SceneCamera['frustum']; zoom: number }): SceneCamera {
  if (value.projection !== 'orthographic' || !Object.values(value.frustum).every(Number.isFinite) || !Number.isFinite(value.zoom)) throw new Error('Invalid generated scene camera');
  return { projection: 'orthographic', position: vector(value.position), target: vector(value.target), up: vector(value.up), frustum: value.frustum, zoom: value.zoom };
}
function layout(value: { districtPositions: Record<DistrictId, number[]>; districtScale: number; hubPosition: number[] }, sceneCamera: SceneCamera): OverviewLayout {
  return {
    placements: {
      cnesdata: vector(value.districtPositions.cnesdata),
      'public-health': vector(value.districtPositions['public-health']),
      infrastructure: vector(value.districtPositions.infrastructure),
      observability: vector(value.districtPositions.observability),
      limnopulse: vector(value.districtPositions.limnopulse),
    },
    districtScale: value.districtScale,
    hubPosition: vector(value.hubPosition),
    camera: sceneCamera,
  };
}

interface GeneratedAsset {
  model?: { src: string; bounds: { min: number[]; max: number[] }; anchors: Record<string, number[]> };
  posters: { desktop: { src: string; width: number; height: number }; mobile: { src: string; width: number; height: number } };
}
const generatedAssets: Record<string, GeneratedAsset> = generated;
function poster(id: string, alt: string): ResponsivePoster {
  const { posters } = generatedAssets[id]!;
  return { desktop: { ...posters.desktop, alt }, mobile: { ...posters.mobile, alt } };
}
function scene(id: string, alt: string): SceneAsset {
  const model = generatedAssets[id]?.model;
  if (!model) throw new Error(`Missing generated model ${id}`);
  return {
    id,
    model: {
      src: model.src,
      bounds: { min: vector(model.bounds.min), max: vector(model.bounds.max) },
      anchors: Object.fromEntries(Object.entries(model.anchors).map(([key, value]) => [key, vector(value)])),
    },
    poster: poster(id, alt),
  };
}
function illustration(stem: string, alt: string): ResponsivePoster {
  return {
    desktop: { src: `/assets/posters/${stem}-desktop.webp`, width: 1200, height: 800, alt },
    mobile: { src: `/assets/posters/${stem}-mobile.webp`, width: 600, height: 600, alt },
  };
}

export const homeVisual = illustration('home-globe', 'Luminous globe floating in navy space, connected by fine data-network arcs.');
export const workPosters = {
  cnesdata: illustration('work-cnesdata', 'Isometric data platform with connected processing and storage architecture.'),
  limnopulse: illustration('work-limnopulse', 'Aquatic environment with illustrative sensing instruments and telemetry connections.'),
  infrastructure: illustration('work-infrastructure', 'Isometric infrastructure cluster with illuminated server racks and shared connections.'),
  'public-health': illustration('work-public-health', 'Public-health campus with connected clinical and administrative buildings.'),
} as const satisfies Partial<Record<DistrictId, ResponsivePoster>>;

export const districts = {
  cnesdata: scene('district-cnesdata', 'Isometric data platform with distinct processing, storage, and orchestration buildings.'),
  'public-health': scene('district-public-health', 'Public-health campus of clinical buildings, paths, and planted courtyards.'),
  infrastructure: scene('district-infrastructure', 'Server-rack district with three connected infrastructure nodes.'),
  observability: scene('district-observability', 'Observability instruments arranged around a monitoring tower.'),
  limnopulse: scene('district-limnopulse', 'Water basin with sensing buoys and illustrative telemetry instruments.'),
} as const satisfies Record<DistrictId, SceneAsset>;
export const hub = scene('hub', 'Luminous central hub on a circular architectural platform.');
export const details = {
  cnesdata: scene('detail-cnesdata', 'Expanded CnesData architecture showing contract, edge, API, tenant, dashboard, processing, and orchestration elements.'),
  infrastructure: scene('detail-infrastructure', 'Infrastructure detail with three nodes, a shared layer, and an identifiable workload.'),
} as const;

/** Y-up, base-centred pivots; these positions use the shared illustrative model scale. */
const overviewLayouts = {
  desktop: layout(generated.overview.layouts.desktop, camera(generated.overview.cameras.desktop)),
  mobile: layout(generated.overview.layouts.mobile, camera(generated.overview.cameras.mobile)),
} as const;
export const overview = {
  id: 'overview',
  poster: poster('overview', 'Five distinct architectural districts arranged around a luminous central hub.'),
  layouts: overviewLayouts,
  placements: overviewLayouts.desktop.placements,
  districtScale: overviewLayouts.desktop.districtScale,
  hubPosition: overviewLayouts.desktop.hubPosition,
  camera: overviewLayouts.desktop.camera,
  cameras: { desktop: overviewLayouts.desktop.camera, mobile: overviewLayouts.mobile.camera },
} as const;

export const sceneAssets: readonly SceneAsset[] = [...Object.values(districts), hub, ...Object.values(details)];
export const allPosters: readonly ResponsivePoster[] = [homeVisual, ...Object.values(workPosters), ...sceneAssets.map(asset => asset.poster), overview.poster];
