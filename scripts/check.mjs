import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const {basePath}=JSON.parse(await readFile(path.join(dist,'build-metadata.json'),'utf8'));
assert.ok(basePath.startsWith('/')&&basePath.endsWith('/'),'build: expected a normalized base path');
assert.ok((await stat(path.join(dist,'.nojekyll'))).isFile(),'build: missing .nojekyll marker');
const entities=JSON.parse(await readFile(path.join(root,'data/entities.json'),'utf8'));
const images=JSON.parse(await readFile(path.join(root,'data/images.json'),'utf8'));
assert.equal(entities.length,35);assert.equal(images.length,42);
const ids=new Set(entities.map(e=>e.id));
assert.equal(ids.size,35);
for(let i=0;i<entities.length;i++){
  const e=entities[i];assert.equal(e.id,`EA-${String(i+1).padStart(3,'0')}`);assert.equal(e.slug,e.id.toLowerCase());
  for(const field of ['appearance','behavior','response','rules','notes','sourceExcerpts','tags','locations'])assert.ok(e[field]?.length,`${e.id}: empty ${field}`);
  assert.ok(e.quote&&e.quoteSource&&e.summary,`${e.id}: missing quotation`);
  assert.ok(e.related.every(id=>ids.has(id)&&id!==e.id),`${e.id}: invalid related id`);
  assert.equal(images.filter(image=>image.entityId===e.id&&image.primary).length,1);
}
for(const image of images){
  assert.ok(ids.has(image.entityId));assert.ok(image.width>0&&image.height>0);
  assert.ok(image.displayWidth<=image.width&&image.displayHeight<=image.height);
  assert.ok(Math.abs(image.width/image.height-image.displayWidth/image.displayHeight)<.005);
  for(const key of ['original','display','thumb']){
    assert.ok(image[key].startsWith('assets/'));assert.ok(!image[key].includes('..'));
    assert.ok((await stat(path.join(dist,image[key]))).size>0,`${image.id}: missing ${key}`);
  }
}
const pages=['index.html','about.html','404.html',...entities.map(e=>`entries/${e.slug}.html`)];
let checkedLinks=0;
for(const page of pages){
  const file=path.join(dist,page),html=await readFile(file,'utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,`${page}: exactly one h1`);
  assert.match(html,/<html lang="zh-CN">/);assert.match(html,/name="viewport"/);
  const idSet=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const [,raw] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
    if(/^(?:https?:|data:|mailto:)/.test(raw))continue;
    const [pathname,fragment]=raw.split('#');
    if(!pathname){if(fragment)assert.ok(idSet.has(fragment),`${page}: missing #${fragment}`);continue;}
    assert.ok(!pathname.startsWith('/'),`${page}: absolute asset URL ${raw}`);
    const target=path.resolve(path.dirname(file),decodeURIComponent(pathname.split('?')[0]));
    assert.ok(target.startsWith(dist+path.sep),`${page}: link escapes dist`);
    assert.ok((await stat(target)).isFile(),`${page}: broken link ${raw}`);checkedLinks++;
  }
}
const built=await readdir(path.join(dist,'entries'));
assert.equal(built.filter(f=>f.endsWith('.html')).length,35);
// Hosts serve this same document for unknown URLs while preserving the requested pathname.
const fallback=await readFile(path.join(dist,'404.html'),'utf8');
const fallbackHead=fallback.match(/<head>([\s\S]*?)<\/head>/)[1];
const baseScript=[...fallbackHead.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].find(match=>!match[0].includes('src='));
assert.ok(baseScript,'404: missing synchronous recovery base');
assert.ok(fallbackHead.indexOf(baseScript[0])<fallbackHead.indexOf('<link'),'404: recovery base must precede assets');
const recoveryCases=[...['404.html','entries/missing.html?q=missing','a/b/c','a/b/?q=test'].map(suffix=>({pathname:`${basePath}${suffix}`,expectedBase:basePath})),{pathname:'/entries/missing.html?q=preview',expectedBase:'/'}];
for(const {pathname,expectedBase} of recoveryCases){
  const requested=new URL(pathname,'https://archive.example');
  let base=requested;
  const skipLink={href:'#main'},listeners=new Map();
  const document={createElement:tagName=>({tagName}),head:{append:element=>{assert.equal(element.tagName,'base');base=new URL(element.href,requested);}},addEventListener:(type,callback)=>listeners.set(type,callback),querySelector:selector=>selector==='.skip-link'?skipLink:null};
  vm.runInNewContext(baseScript[1],{document,location:requested,URL});
  listeners.get('DOMContentLoaded')?.();
  assert.equal(new URL(skipLink.href,base).href,new URL('#main',requested).href,`${pathname}: 404 skip link must retain the requested document URL`);
  for(const resource of ['assets/site.css','assets/viewer.css','assets/app.js','assets/favicon.svg','index.html#catalogue','about.html'])assert.equal(new URL(resource,base).href,new URL(`${expectedBase}${resource}`,requested).href,`${pathname}: 404 recovery URL ${resource}`);
}
console.log(`PASS: ${entities.length} entries, ${images.length} image records, ${pages.length} pages, ${checkedLinks} local links/assets, nested 404 recovery at ${basePath}, no missing files or anchor targets.`);
