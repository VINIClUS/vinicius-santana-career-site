import assert from 'node:assert/strict';
import test from 'node:test';
import visual from '../src/content/scenes/atlas-authoring.json' with { type: 'json' };
import { contourPoints } from '../src/features/explorer/scene/atlas-world.mjs';
import { atlasTerrainGeometry } from '../src/features/explorer/scene/atlas-terrain.mjs';

test('both terrain layouts cover their concave boundary without folded surface triangles', () => {
  for (const [name, layout] of Object.entries(visual.layouts)) {
    const boundary = contourPoints(layout.terrainOutline).slice(0, -1);
    const terrain = atlasTerrainGeometry(boundary, layout, visual);
    try {
      const positions = terrain.surface.getAttribute('position'), indices = terrain.surface.index;
      let folded = 0, area = 0;
      for (let i = 0; i < indices.count; i += 3) {
        const [a, b, c] = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
        const upward = (positions.getZ(b) - positions.getZ(a)) * (positions.getX(c) - positions.getX(a))
          - (positions.getX(b) - positions.getX(a)) * (positions.getZ(c) - positions.getZ(a));
        if (upward <= 0) folded++;
        area += Math.abs(upward) / 2;
      }
      assert.equal(folded, 0, `${name}: every surface triangle must face up`);
      const expectedArea = Math.abs(boundary.reduce((sum, a, i) => {
        const b = boundary[(i + 1) % boundary.length];
        return sum + a.x * b.z - b.x * a.z;
      }, 0)) / 2;
      assert.ok(Math.abs(area - expectedArea) < 0.0001, `${name}: surface must cover the boundary exactly once`);
    } finally { Object.values(terrain).forEach(geometry => geometry.dispose()); }
  }
});
