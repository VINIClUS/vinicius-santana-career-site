import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Object3D } from 'three';
import { createAmbientMotion } from '../src/features/explorer/scene/ambient-motion.ts';

test('ambient motion preserves authored pose, samples without drift and restores every transform', () => {
  const world = new Group();
  const rotor = new Object3D();
  rotor.rotation.y = 0.3;
  rotor.userData.atlasMotion = { kind: 'rotate', speed: 2, phase: 0.7 };
  const buoy = new Group();
  buoy.position.y = 3;
  buoy.rotation.z = 0.2;
  buoy.userData.atlasMotion = { kind: 'bob', speed: 1, amplitude: 0.1, tilt: 0.02, phase: Math.PI / 2 };
  const instrument = new Object3D();
  instrument.position.y = 1;
  buoy.add(instrument);
  const ripple = new Object3D();
  ripple.scale.set(2, 3, 4);
  ripple.userData.atlasMotion = { kind: 'ripple', speed: 1, amplitude: 0.2, phase: Math.PI / 2 };
  const unknown = new Object3D();
  unknown.userData.atlasMotion = { kind: 'traffic', speed: 100 };
  world.add(rotor, buoy, ripple, unknown);
  const snapshot = () => [rotor, buoy, instrument, ripple, unknown].map(object => ({
    position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(),
  }));
  const authored = snapshot();
  const motion = createAmbientMotion(world);
  assert.equal(motion.size, 3);
  motion.sample(0);
  assert.deepEqual(snapshot(), authored);
  motion.sample(Math.PI);
  assert.ok(Math.abs(rotor.rotation.y - (0.3 + 2 * Math.PI)) < 1e-12);
  assert.equal(buoy.position.y, 2.8);
  assert.equal(buoy.rotation.z, 0.16);
  assert.deepEqual(instrument.position.toArray(), [0, 1, 0]);
  assert.deepEqual(ripple.scale.toArray(), [1.2, 3, 2.4]);
  const moved = snapshot();
  for (let index = 0; index < 100; index++) motion.sample(Math.PI);
  assert.deepEqual(snapshot(), moved);
  motion.sample(500);
  motion.sample(Math.PI);
  assert.deepEqual(snapshot(), moved);
  motion.sample(0);
  assert.deepEqual(snapshot(), authored);
});

test('unknown and malformed motion metadata stays inert', () => {
  const world = new Group();
  for (const metadata of [null, { kind: 'traffic', speed: 1 }, { kind: 'bob', speed: NaN }, { kind: 'rotate', speed: 'fast' }]) {
    const object = new Object3D();
    object.userData.atlasMotion = metadata;
    world.add(object);
  }
  const motion = createAmbientMotion(world);
  assert.equal(motion.size, 0);
  motion.sample(10);
  assert.ok(world.children.every(object => object.position.y === 0 && object.rotation.y === 0));
});
