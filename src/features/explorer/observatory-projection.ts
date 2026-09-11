import type { SceneCamera, Vector3 } from '../../content/scenes/types.ts';

const subtract = (a: Vector3, b: Vector3): Vector3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vector3, b: Vector3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector3, b: Vector3): Vector3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v: Vector3): Vector3 => {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
};
/** Project scene coordinates into poster percentages without a browser renderer. */
export function projectToPoster(position: Vector3, camera: SceneCamera): { x: number; y: number } {
  const backward = normalize(subtract(camera.position, camera.target));
  const right = normalize(cross(camera.up, backward));
  const up = cross(backward, right);
  const relative = subtract(position, camera.position);
  const { left, right: edge, top, bottom } = camera.frustum;
  const centerX = (left + edge) / 2;
  const centerY = (top + bottom) / 2;
  return {
    x: 50 + (dot(relative, right) - centerX) * camera.zoom / (edge - left) * 100,
    y: 50 - (dot(relative, up) - centerY) * camera.zoom / (top - bottom) * 100,
  };
}
