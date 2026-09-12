import assert from 'node:assert/strict';
import test from 'node:test';
import { districtIds, districtRegistry } from '../src/features/explorer/districts.ts';
import { districtIds as manifestIds, districts, overview } from '../src/content/scenes/index.ts';
import { projectIds } from '../src/features/explorer/projects.ts';
import { createObservatoryController } from '../src/features/explorer/observatory-controller.ts';
import { projectToPoster } from '../src/features/explorer/observatory-projection.ts';

test('Atlas exposes exactly three project identities and canonical destinations', () => {
  assert.deepEqual(districtIds, ['cnesdata', 'limnopulse', 'infrastructure']);
  assert.deepEqual(districtIds, manifestIds);
  assert.deepEqual(districtIds.map(id => districtRegistry[id].href), ['/explore/cnesdata/', '/explore/limnopulse/', '/explore/infrastructure/']);
  assert.deepEqual(projectIds, ['cnesdata', 'limnopulse', 'infrastructure']);
  for (const id of districtIds) {
    assert.equal(districtRegistry[id].id, id);
    assert.ok(districtRegistry[id].description.length > 0);
    assert.ok(districts[id]);
    assert.equal(districtRegistry[id].kind, 'project');
  }
});

test('district selection starts empty and notifies only valid changes', () => {
  const controller = createObservatoryController();
  assert.equal(controller.getState().selectedDistrictId, null);
  let changes = 0;
  const unsubscribe = controller.subscribe(() => changes++);
  for (const districtId of districtIds) {
    controller.dispatch({ type: 'SELECT_DISTRICT', districtId });
    assert.equal(controller.getState().selectedDistrictId, districtId);
  }
  assert.equal(changes, 3);
  const selected = controller.getState();
  for (const districtId of ['infrastructure', 'public-health', 'observability', 'hub', 'unknown', 'toString', '__proto__']) controller.dispatch({ type: 'SELECT_DISTRICT', districtId });
  assert.equal(controller.getState(), selected);
  assert.equal(changes, 3);
  controller.dispatch({ type: 'SELECT_DISTRICT', districtId: null });
  assert.equal(controller.getState().selectedDistrictId, null);
  assert.equal(changes, 4);
  unsubscribe();
  controller.dispatch({ type: 'SELECT_DISTRICT', districtId: 'cnesdata' });
  assert.equal(changes, 4);
  assert.equal(createObservatoryController().getState().selectedDistrictId, null);
});

test('orthographic projection respects camera orientation, frustum and zoom', () => {
  const camera = { position: [0, 0, 10], target: [0, 0, 0], up: [0, 1, 0], projection: 'orthographic', frustum: { left: -2, right: 2, top: 1, bottom: -1, near: .1, far: 100 }, zoom: 1 };
  assert.deepEqual(projectToPoster([0, 0, 0], camera), { x: 50, y: 50 });
  assert.deepEqual(projectToPoster([1, .5, 0], camera), { x: 75, y: 25 });
  assert.deepEqual(projectToPoster([1, .5, 0], { ...camera, zoom: 2 }), { x: 100, y: 0 });
  for (const layout of Object.values(overview.layouts)) for (const position of Object.values(layout.placements)) {
    const point = projectToPoster(position, layout.camera);
    assert.ok(point.x > 0 && point.x < 100 && point.y > 0 && point.y < 100);
  }
});
