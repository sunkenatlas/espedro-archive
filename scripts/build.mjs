import { readFile, writeFile, mkdir, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homePage,dossierPage,aboutPage,notFoundPage,normalizeBasePath } from '../src/templates.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');
const basePath=normalizeBasePath(process.env.SITE_BASE_PATH || '/');
const entities=JSON.parse(await readFile(path.join(root,'data/entities.json'),'utf8'));
const images=JSON.parse(await readFile(path.join(root,'data/images.json'),'utf8'));
if(entities.length!==35||images.length!==42)throw new Error('Expected exactly35entries and42images.');
if(new Set(entities.map(e=>e.id)).size!==35)throw new Error('Duplicate archive id.');
for(const entity of entities){
  if(!/^EA-\d{3}$/.test(entity.id)||entity.slug!==entity.id.toLowerCase())throw new Error(`Invalid id: ${entity.id}`);
  if(images.filter(im=>im.entityId===entity.id&&im.primary).length!==1)throw new Error(`Primary image mismatch: ${entity.id}`);
}
await mkdir(path.join(out,'entries'),{recursive:true});
await mkdir(path.join(out,'assets'),{recursive:true});
for(const directory of ['images','thumbs','originals'])await cp(path.join(root,'assets',directory),path.join(out,'assets',directory),{recursive:true});
for(const filename of ['site.css','viewer.css','app.js','catalogue-core.js','viewer.js','viewer-math.js'])await cp(path.join(root,'src',filename),path.join(out,'assets',filename));
await writeFile(path.join(out,'assets/favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#111314"/><circle cx="32" cy="32" r="25" fill="none" stroke="#d5d6c9" stroke-width="1.5"/><path d="M15 46h34M21 46V28h7v18m0 0V15h8v31m0 0V32h7v14" fill="none" stroke="#d5d6c9" stroke-width="2"/><path d="M28 12h8" stroke="#b85d50" stroke-width="2"/></svg>');
await writeFile(path.join(out,'index.html'),homePage(entities,images));
for(const entity of entities)await writeFile(path.join(out,'entries',`${entity.slug}.html`),dossierPage(entity,entities,images));
await writeFile(path.join(out,'about.html'),aboutPage());
await writeFile(path.join(out,'404.html'),notFoundPage(basePath));
await writeFile(path.join(out,'.nojekyll'),'');
await writeFile(path.join(out,'build-metadata.json'),`${JSON.stringify({basePath},null,2)}\n`);
await writeFile(path.join(out,'_headers'),'/assets/*\n  Cache-Control: public, max-age=604800\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n');
await writeFile(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\n');
const total=(await Promise.all(images.map(async im=>(await stat(path.join(out,im.display))).size))).reduce((a,b)=>a+b,0);
console.log(`Built 35 dossiers + homepage + about + 404. All 42 images retained. Display images: ${(total/1024/1024).toFixed(2)} MiB.`);
console.log(`Output: ${out}`);
