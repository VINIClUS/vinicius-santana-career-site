import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BufferGeometry, Material, Mesh, Object3D, Texture } from 'three';

/** GLBs share resources between meshes, so release each resource once per visit. */
export function disposeObjects(objects: Iterable<Object3D>): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  for (const object of objects) object.traverse(child => {
    const mesh = child as Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) {
    const source = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close();
    texture.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
}

export function createModelCache(signal: AbortSignal) {
  const loader = new GLTFLoader();
  const pending = new Map<string, Promise<Object3D>>();
  const objects = new Set<Object3D>();
  return {
    load(src: string): Promise<Object3D> {
      const cached = pending.get(src);
      if (cached) return cached;
      const result = (async () => {
        const response = await fetch(src, { signal });
        if (!response.ok) throw new Error(`Unable to load scene model: ${response.status}`);
        const bytes = await response.arrayBuffer();
        signal.throwIfAborted();
        const gltf = await loader.parseAsync(bytes, new URL('.', new URL(src, location.href)).href);
        // Parsing itself cannot be aborted; a late completion must never enter the scene.
        if (signal.aborted) {
          disposeObjects(gltf.scenes);
          signal.throwIfAborted();
        }
        for (const scene of gltf.scenes) objects.add(scene);
        return gltf.scene;
      })();
      pending.set(src, result);
      return result;
    },
    dispose(additional: Iterable<Object3D> = []) {
      disposeObjects([...objects, ...additional]);
      objects.clear();
      pending.clear();
    },
  };
}
