// @ts-check
import { BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from 'three';

/** @typedef {typeof import('../../../content/scenes/atlas-authoring.json')} Visuals */
/** @typedef {import('../../../content/scenes/types.ts').OverviewLayout} Layout */

/** Distance to a polygon, zero inside. Land beneath maquettes stays at its authored level.
 * @param {number} x @param {number} z @param {number[][]} polygon
 */
function outsideDistance(x, z, polygon) {
  let inside = false, distance = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[j], [bx, bz] = polygon[i];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    distance = Math.min(distance, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return inside ? 0 : distance;
}

/** @param {number[]} positions */
function geometry(positions) {
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(positions, 3));
  result.computeVertexNormals();
  return result;
}

/** The radial grid needs a point visible from every sampled boundary edge.
 * A concave outline's centroid can be outside that kernel after curve sampling.
 * @param {Vector3[]} boundary
 */
function radialCenter(boundary) {
  const side = (/** @type {Vector3} */ a, /** @type {Vector3} */ b, /** @type {Vector3} */ point) => (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x);
  const average = (/** @type {Vector3[]} */ points) => points.reduce((sum, point) => sum.add(point), new Vector3()).multiplyScalar(1 / points.length);
  const valid = (/** @type {Vector3} */ point) => boundary.every((a, i) => side(a, boundary[(i + 1) % boundary.length], point) > 1e-8);
  const centroid = average(boundary);
  if (valid(centroid)) return centroid;
  const xs = boundary.map(point => point.x), zs = boundary.map(point => point.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  let kernel = [new Vector3(minX, 0, minZ), new Vector3(maxX, 0, minZ), new Vector3(maxX, 0, maxZ), new Vector3(minX, 0, maxZ)];
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length];
    kernel = kernel.flatMap((c, j) => {
      const d = kernel[(j + 1) % kernel.length], from = side(a, b, c), to = side(a, b, d);
      if (from >= 0 && to >= 0) return [d];
      if (from < 0 && to < 0) return [];
      const intersection = c.clone().lerp(d, from / (from - to));
      return from >= 0 ? [intersection] : [intersection, d];
    });
  }
  if (kernel.length < 3) throw new Error('Atlas terrain outline must have a nonempty radial kernel');
  const center = average(kernel);
  if (!valid(center)) throw new Error('Atlas terrain radial kernel must have positive area');
  return center;
}

/** A small static height field, with contour segments cut from its actual triangles.
 * Everything is generated once per responsive layout, never from an animation frame.
 * @param {Vector3[]} boundary
 * @param {Pick<Layout, 'placements' | 'rotations' | 'districtScale' | 'hubPosition'>} layout
 * @param {Visuals} visual
 */
export function atlasTerrainGeometry(boundary, layout, visual) {
  const ids = /** @type {(keyof Visuals['regions'])[]} */ (Object.keys(visual.regions));
  const scale = layout.districtScale;
  const regions = ids.map(id => {
    const [px, , pz] = layout.placements[id];
    const angle = layout.rotations[id][1], cos = Math.cos(angle), sin = Math.sin(angle);
    const transform = (/** @type {number} */ x, /** @type {number} */ z) => [px + scale * (x * cos + z * sin), pz + scale * (z * cos - x * sin)];
    return { id, transform, polygon: visual.regions[id].outline.map(([x, z]) => transform(x, z)) };
  });
  const hills = regions.flatMap(({ id, transform }) => visual.terrain.relief[id].map(([x, z, rx, rz, height]) => ({ point: transform(x, z), rx: rx * scale, rz: rz * scale, height: height * scale })));
  const heightAt = (/** @type {number} */ x, /** @type {number} */ z) => {
    const distance = Math.min(...regions.map(region => outsideDistance(x, z, region.polygon)));
    const edge = Math.min(1, distance / (0.75 * scale));
    const blend = edge * edge * (3 - 2 * edge);
    let height = 0.06 + 0.035 * Math.sin(x * 1.2 + z * 0.6) + 0.025 * Math.cos(z * 1.5 - x * 0.7);
    for (const hill of hills) {
      height += hill.height * Math.exp(-(((x - hill.point[0]) / hill.rx) ** 2 + ((z - hill.point[1]) / hill.rz) ** 2));
    }
    // The cartographic origin stays a quiet, flat clearing.
    const origin = Math.min(1, Math.hypot(x - layout.hubPosition[0], z - layout.hubPosition[2]) / 1.1);
    return -0.045 + height * blend * origin * origin;
  };
  const center = radialCenter(boundary);
  const count = boundary.length, rings = 32;
  const vertices = [new Vector3(center.x, heightAt(center.x, center.z), center.z)];
  for (let ring = 1; ring <= rings; ring++) {
    for (const edge of boundary) {
      const point = center.clone().lerp(edge, ring / rings);
      point.y = heightAt(point.x, point.z);
      vertices.push(point);
    }
  }
  /** @type {number[]} */
  const indices = [];
  for (let i = 0; i < count; i++) indices.push(0, 1 + (i + 1) % count, 1 + i);
  for (let ring = 1; ring < rings; ring++) {
    for (let i = 0; i < count; i++) {
      const a = 1 + (ring - 1) * count + i, b = 1 + (ring - 1) * count + (i + 1) % count;
      const c = a + count, d = b + count;
      indices.push(a, b, c, b, d, c);
    }
  }
  const surface = new BufferGeometry().setFromPoints(vertices);
  surface.setIndex(indices);
  surface.computeVertexNormals();
  const low = new Color(visual.palette.terrain).multiplyScalar(0.82), high = new Color(visual.palette.terrainRaised);
  const colors = vertices.flatMap(point => {
    const tint = low.clone().lerp(high, Math.min(1, Math.max(0, point.y + 0.045) / 0.55));
    return [tint.r, tint.g, tint.b];
  });
  surface.setAttribute('color', new Float32BufferAttribute(colors, 3));

  /** @type {number[]} */
  const rimPositions = [], contourPositions = [];
  for (let i = 0; i < count; i++) {
    const a = vertices[1 + (rings - 1) * count + i], b = vertices[1 + (rings - 1) * count + (i + 1) % count];
    rimPositions.push(a.x, a.y, a.z, b.x, b.y, b.z, a.x, -0.24, a.z, b.x, b.y, b.z, b.x, -0.24, b.z, a.x, -0.24, a.z);
  }
  for (let level = 0.015; level < 0.75; level += 0.055) {
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = [vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]];
      const crossings = [];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j], b = triangle[(j + 1) % 3];
        if ((a.y < level) === (b.y < level)) continue;
        const t = (level - a.y) / (b.y - a.y);
        crossings.push(a.x + (b.x - a.x) * t, level + 0.006, a.z + (b.z - a.z) * t);
      }
      if (crossings.length === 6) contourPositions.push(...crossings);
    }
  }
  // Offshore contours use a restrained, irregular cadence instead of concentric tiles.
  for (let ring = 1; ring <= 10; ring++) {
    const points = boundary.map((edge, i) => {
      const phase = i / count * Math.PI * 2;
      const expansion = 1 + ring * 0.034 + (Math.sin(phase * 5 + ring * 0.3) + Math.sin(phase * 9 - ring * 0.21)) * 0.0035 * ring;
      return center.clone().lerp(edge, expansion).setY(-0.22);
    });
    for (let i = 0; i < count; i++) {
      const a = points[i], b = points[(i + 1) % count];
      contourPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  /** @type {Record<'foliage' | 'trunk' | 'stone', number[]>} */
  const plants = { foliage: [], trunk: [], stone: [] };
  const cone = new ConeGeometry(1, 1, 7).toNonIndexed();
  const cylinder = new CylinderGeometry(1, 1, 1, 6).toNonIndexed();
  const rock = new IcosahedronGeometry(1, 0);
  const append = (/** @type {keyof typeof plants} */ material, /** @type {BufferGeometry} */ source, /** @type {number[]} */ position, /** @type {number[]} */ size, /** @type {number} */ angle) => {
    const points = source.getAttribute('position'), cos = Math.cos(angle), sin = Math.sin(angle);
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i) * size[0], z = points.getZ(i) * size[2];
      plants[material].push(position[0] + x * cos + z * sin, position[1] + points.getY(i) * size[1], position[2] + z * cos - x * sin);
    }
  };
  for (const { id, transform } of regions) {
    visual.terrain.trees[id].forEach(([localX, localZ, size], i) => {
      const [x, z] = transform(localX, localZ), h = size * scale;
      const ground = heightAt(x, z), angle = i * 2.399;
      append('trunk', cylinder, [x, ground + h * 0.21, z], [h * 0.055, h * 0.42, h * 0.055], angle);
      for (let whorl = 0; whorl < 3; whorl++) {
        const width = h * (0.32 - whorl * 0.07);
        append('foliage', cone, [x, ground + h * (0.4 + whorl * 0.21), z], [width, h * 0.56, width], angle + whorl * 0.3);
      }
      // Rocks are clustered beside a few trees; they never fill every clearing.
      if (i % 2 === 0) append('stone', rock, [x + 0.24 * scale, ground + 0.05, z + 0.18 * scale], [0.18 * scale, 0.11 * scale, 0.14 * scale], angle);
    });
  }
  cone.dispose(); cylinder.dispose(); rock.dispose();
  return {
    surface, rim: geometry(rimPositions), contours: new BufferGeometry().setAttribute('position', new Float32BufferAttribute(contourPositions, 3)),
    foliage: geometry(plants.foliage), trunk: geometry(plants.trunk), stone: geometry(plants.stone),
  };
}
