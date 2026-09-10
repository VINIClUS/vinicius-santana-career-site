import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Supply a generated original; only optimized final variants are versioned.
const [stem, input] = process.argv.slice(2);
const stems = ['home-globe', 'work-cnesdata', 'work-limnopulse', 'work-infrastructure', 'work-public-health'];
if (!stems.includes(stem) || !input) throw new Error(`Usage: node scripts/illustrations/optimize.mjs <${stems.join('|')}> <original.png>`);
const output = new URL('../../public/assets/posters/', import.meta.url);
await mkdir(output, { recursive: true });
for (const [variant, width, height] of [['desktop', 1200, 800], ['mobile', 600, 600]]) {
  await sharp(resolve(input)).resize(width, height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86, effort: 6 }).toFile(new URL(`${stem}-${variant}.webp`, output).pathname);
}
