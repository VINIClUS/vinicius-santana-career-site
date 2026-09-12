import assert from 'node:assert/strict';
import test from 'node:test';
import { districtIds } from '../src/features/explorer/districts.ts';
import { districtIds as manifestIds, districts, overview } from '../src/content/scenes/index.ts';
import { projectIds } from '../src/features/explorer/projects.ts';
import { createObservatoryController } from '../src/features/explorer/observatory-controller.ts';
import { projectToPoster } from '../src/features/explorer/observatory-projection.ts';

test('the three project districts resolve to their canonical explorers', () => {
  assert.deepEqual(districtIds, projectIds);
  assert.deepEqual(districtIds, manifestIds);
  assert.deepEqual(projectIds, ['cnesdata', 'limnopulse', 'infrastructure']);
  for (const id of districtIds) {
    assert.ok(districts[id]);
  }
});

test('district selection starts empty, rejects invalid IDs and toggles repeated activation', () => {
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
  for (const districtId of ['unknown', 'toString', '__proto__']) controller.dispatch({ type: 'SELECT_DISTRICT', districtId });
  assert.equal(controller.getState(), selected);
  assert.equal(changes, 3);
  controller.dispatch({ type: 'ACTIVATE_DISTRICT', districtId: 'infrastructure' });
  assert.equal(controller.getState().selectedDistrictId, null);
  assert.equal(changes, 4);
  controller.dispatch({ type: 'ACTIVATE_DISTRICT', districtId: 'cnesdata' });
  controller.dispatch({ type: 'ACTIVATE_DISTRICT', districtId: 'cnesdata' });
  assert.equal(controller.getState().selectedDistrictId, null);
  assert.equal(changes, 6);
  unsubscribe();
  controller.dispatch({ type: 'SELECT_DISTRICT', districtId: 'cnesdata' });
  assert.equal(changes, 6);
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
