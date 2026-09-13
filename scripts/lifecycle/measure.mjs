import {readFile,readdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url);
const astro=new URL('dist/_astro/',root);
const files=[];
for(const name of await readdir(astro)){
  if(!/^(Lifecycle\.|infrastructure\.|scaling\.|cnesdata\.|limnopulse\.|preload-helper\.).*\.js$/.test(name))continue;
  const bytes=await readFile(new URL(name,astro));files.push({file:name,bytes:bytes.length,gzipBytes:gzipSync(bytes).length});
}
const routes={};
for(const project of ['infrastructure','limnopulse','cnesdata']){
  const html=await readFile(new URL(`dist/explore/${project}/index.html`,root));
  const data=html.toString().match(/<script[^>]*data-life-data[^>]*>(.*?)<\/script>/s)?.[1];assert.ok(data);
  assert.doesNotMatch(data,/"expected"|"stateRef"/);
  routes[project]={htmlBytes:html.length,htmlGzipBytes:gzipSync(html).length,tourDataGzipBytes:gzipSync(data).length};
}
for(const route of ['','explore/']){
  const html=await readFile(new URL(`dist/${route}index.html`,root),'utf8');
  assert.doesNotMatch(html,/\/assets\/services\/|Lifecycle\./);
}
const report={domainPlayerWorstCaseGzipBytes:files.reduce((total,f)=>total+f.gzipBytes,0),budgetGzipBytes:80*1024,files,routes,homeAtlasNewLifecycleAssets:false};
assert.ok(report.domainPlayerWorstCaseGzipBytes<=report.budgetGzipBytes);
await writeFile(new URL('docs/design/lifecycle-reports/bytes.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
