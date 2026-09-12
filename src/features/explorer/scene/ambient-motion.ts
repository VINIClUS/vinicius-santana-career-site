import type { Object3D } from 'three';

/** Capture the authored pose once; all samples are absolute and reversible. */
export function createAmbientMotion(world: Object3D) {
  const samples: ((seconds: number) => void)[] = [];
  world.traverse(object => {
    const metadata = object.userData.atlasMotion;
    if (!metadata || !Number.isFinite(metadata.speed)) return;
    const { kind, speed } = metadata;
    const phase = metadata.phase ?? 0;
    if (!Number.isFinite(phase)) return;
    if (kind === 'rotate') {
      const authored = object.rotation.y;
      samples.push(seconds => { object.rotation.y = authored + speed * seconds; });
    } else if (kind === 'bob' || kind === 'ripple') {
      const { amplitude } = metadata;
      const tilt = metadata.tilt ?? 0;
      if (!Number.isFinite(amplitude) || !Number.isFinite(tilt)) return;
      const origin = Math.sin(phase);
      if (kind === 'bob') {
        const height = object.position.y, rotation = object.rotation.z;
        samples.push(seconds => {
          const offset = Math.sin(speed * seconds + phase) - origin;
          object.position.y = height + amplitude * offset;
          object.rotation.z = rotation + tilt * offset;
        });
      } else {
        const x = object.scale.x, z = object.scale.z;
        samples.push(seconds => {
          const factor = 1 + amplitude * (Math.sin(speed * seconds + phase) - origin);
          object.scale.x = x * factor;
          object.scale.z = z * factor;
        });
      }
    }
  });
  return {
    size: samples.length,
    sample(seconds: number) { for (const sample of samples) sample(seconds); },
  };
}
