import type { ProjectId } from '../../features/explorer/projects.ts';

/** Visual districts are broader than routable portfolio projects. */
export type DistrictId = ProjectId | 'public-health' | 'observability';
export type Vector3 = readonly [number, number, number];
export interface VisualImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}
export interface ResponsivePoster {
  readonly desktop: VisualImage;
  readonly mobile: VisualImage;
}
export interface SceneModel {
  readonly src: string;
  readonly bounds: { readonly min: Vector3; readonly max: Vector3 };
  readonly anchors: Readonly<Record<string, Vector3>>;
}
export interface SceneAsset {
  readonly id: string;
  readonly model: SceneModel;
  readonly poster: ResponsivePoster;
}
export interface SceneCamera {
  readonly projection: 'orthographic';
  readonly position: Vector3;
  readonly target: Vector3;
  readonly up: Vector3;
  readonly frustum: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number; readonly near: number; readonly far: number };
  readonly zoom: number;
}
export interface OverviewLayout {
  readonly placements: Readonly<Record<DistrictId, Vector3>>;
  readonly districtScale: number;
  readonly hubPosition: Vector3;
  readonly camera: SceneCamera;
}
