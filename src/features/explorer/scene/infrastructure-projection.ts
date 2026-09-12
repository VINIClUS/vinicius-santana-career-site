import { Box3, Color, Material, Mesh, Object3D, Vector3 } from 'three';
import { infraNodeIds, type InfraState } from '../simulation/infrastructure.ts';

/** A reversible visual projection. The controller alone owns simulation transitions. */
export function createInfrastructureProjection(model: Object3D) {
  const groups = new Map<string, Object3D>();
  model.traverse(child => {
    if (!(child instanceof Mesh) && child.userData.simulationId) groups.set(child.userData.simulationId, child);
  });
  const workload = groups.get('workload');
  if (!workload?.parent || infraNodeIds.some(id => !groups.has(id)) || !groups.has('shared-layer')) {
    throw new Error('Missing Infrastructure simulation groups');
  }
  model.updateMatrixWorld(true);
  const originalPosition = workload.position.clone();
  const centers = new Map(infraNodeIds.map(id => [id, workload.parent!.worldToLocal(new Box3().setFromObject(groups.get(id)!).getCenter(new Vector3()))]));
  const origin = centers.get('node-02')!;
  const positions = new Map(infraNodeIds.map(id => {
    const center = centers.get(id)!;
    return [id, originalPosition.clone().add(new Vector3(center.x - origin.x, 0, center.z - origin.z))];
  }));
  const originals = new Map<Mesh, Material | Material[]>();
  const meshes = new Map(infraNodeIds.map(id => {
    const nodes: Mesh[] = [];
    groups.get(id)!.traverse(child => {
      if (child instanceof Mesh) { originals.set(child, child.material); nodes.push(child); }
    });
    return [id, nodes];
  }));
  const failureMaterials = new Map<Material, Material>();
  const replacements = new Map<Mesh, Material | Material[]>();
  let disposed = false;
  const tint = (original: Material) => {
    let replacement = failureMaterials.get(original);
    if (!replacement) {
      replacement = original.clone();
      const colored = replacement as Material & { color?: Color; emissive?: Color; emissiveIntensity?: number };
      colored.color?.set('#c53b3b');
      if (colored.emissive) { colored.emissive.set('#7a1717'); colored.emissiveIntensity = 0.3; }
      failureMaterials.set(original, replacement);
    }
    return replacement;
  };
  return {
    apply(state: InfraState) {
      if (disposed) return;
      workload.position.copy(positions.get(state.workloadNodeId)!);
      for (const id of infraNodeIds) for (const mesh of meshes.get(id)!) {
        const original = originals.get(mesh)!;
        if (state.nodes[id] === 'failed') {
          let replacement = replacements.get(mesh);
          if (!replacement) {
            replacement = Array.isArray(original) ? original.map(tint) : tint(original);
            replacements.set(mesh, replacement);
          }
          mesh.material = replacement;
        } else mesh.material = original;
      }
      model.updateMatrixWorld(true);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      workload.position.copy(originalPosition);
      for (const [mesh, material] of originals) mesh.material = material;
      for (const material of failureMaterials.values()) material.dispose();
      failureMaterials.clear();
      replacements.clear();
      model.updateMatrixWorld(true);
    },
  };
}
