import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { allPosters, sceneAssets, overview, infrastructureFailurePoster } from '../../src/content/scenes/index.ts';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cards = [
  ...sceneAssets,
  overview,
  { id: 'detail-infrastructure-failed', poster: infrastructureFailurePoster },
];
const picture = poster => `<picture><source media="(max-width: 640px)" srcset="${escape(poster.mobile.src)}" width="${poster.mobile.width}" height="${poster.mobile.height}"><img src="${escape(poster.desktop.src)}" alt="${escape(poster.desktop.alt)}" width="${poster.desktop.width}" height="${poster.desktop.height}" loading="lazy"></picture>`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Systems Atlas asset inspection</title>
<style>body{margin:0;background:#09111f;color:#e3ecf5;font:16px/1.5 system-ui}header{max-width:1100px;margin:40px auto;padding:0 24px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;max-width:1400px;margin:auto;padding:24px}article{background:#111e30;border:1px solid #2a3b50;border-radius:16px;overflow:hidden}h2,p,button{margin:16px 20px}h2{font-size:18px}img{width:100%;height:auto;display:block}a{color:#93d9eb}button{background:#203c52;color:white;padding:10px;border:1px solid #5e859d;border-radius:6px;cursor:pointer}.viewer{height:400px}.viewer:empty{display:none}canvas{display:block;width:100%;height:100%}@media(max-width:640px){main{grid-template-columns:1fr;padding:12px}header{margin:24px auto}.viewer{height:320px}}</style>
<header><h1>Systems Atlas visual kit</h1><p>Development-only inspection. All posters below work without JavaScript or WebGL. Models load only when requested.</p><p>${allPosters.length} responsive poster pairs · ${sceneAssets.length} independent models</p></header>
<main>${cards.map(card => `<article id="${escape(card.id)}"><h2>${escape(card.id)}</h2>${picture(card.poster)}${card.model ? `<p><a href="${escape(card.model.src)}">Download GLB</a></p><button type="button" data-model="${escape(card.model.src)}">Inspect 3D model</button><div class="viewer"></div>` : ''}</article>`).join('')}</main>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><script type="module" src="/scripts/gallery/viewer.mjs"></script></html>`;

const mime = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.webp': 'image/webp', '.glb': 'model/gltf-binary' };
const port = Number(process.env.PORT ?? 4322);
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/') { response.writeHead(200, { 'Content-Type': mime['.html'] }); response.end(html); return; }
    const base = path.startsWith('/assets/') ? resolve(root, 'public') : root;
    if (!path.startsWith('/assets/') && !path.startsWith('/node_modules/three/') && path !== '/scripts/gallery/viewer.mjs') throw new Error('Not served');
    const filename = resolve(base, `.${path}`);
    if (!filename.startsWith(base + sep)) throw new Error('Not served');
    const data = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] ?? 'application/octet-stream' });
    response.end(data);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Asset inspection: http://127.0.0.1:${port}`));
