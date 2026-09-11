import { Box3, Vector3 } from 'three';

/** Apply the pure simulation snapshot to semantic groups, never shared materials. */
export function applyInfrastructureState(object, state) {
  const groups = new Map();
  object.traverse(child => {
    if (!child.isMesh && child.userData.simulationId) groups.set(child.userData.simulationId, child);
  });
  const workload = groups.get('workload');
  const initialNode = groups.get('node-02');
  const targetNode = groups.get(state.workloadNodeId);
  if (!workload || !initialNode || !targetNode) throw new Error('Missing Infrastructure simulation groups');
  object.updateMatrixWorld(true);
  const origin = new Box3().setFromObject(initialNode).getCenter(new Vector3());
  const target = new Box3().setFromObject(targetNode).getCenter(new Vector3());
  const parent = workload.parent;
  parent.worldToLocal(origin);
  parent.worldToLocal(target);
  workload.position.x += target.x - origin.x;
  workload.position.z += target.z - origin.z;
  for (const [id, status] of Object.entries(state.nodes)) {
    if (status !== 'failed') continue;
    const node = groups.get(id);
    if (!node) throw new Error(`Missing simulation node ${id}`);
    node.traverse(child => {
      if (!child.isMesh) return;
      const tint = material => {
        const clone = material.clone();
        clone.color.set('#c53b3b');
        if (clone.emissive) { clone.emissive.set('#7a1717'); clone.emissiveIntensity = 0.3; }
        return clone;
      };
      child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material);
    });
  }
}
