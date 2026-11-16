import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
if(process.argv.includes('--build')){
  const result=spawnSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit',cwd:root});
  if(result.status!==0)process.exit(result.status||1);
}
try{await stat(path.join(dist,'index.html'));}catch{console.error('Run npm run build first, or npm run dev -- --build.');process.exit(1);}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.endsWith('/'))pathname+='index.html';
    const target=path.resolve(dist,`.${pathname}`);
    if(!target.startsWith(dist+path.sep)){res.writeHead(403);return res.end('Forbidden');}
    let body;try{body=await readFile(target);}catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});return res.end(await readFile(path.join(dist,'404.html')));}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});res.end('Bad request');}
});
const port=Number(process.env.ESPEDRO_PORT||4175);
server.listen(port,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${port}/`;
  console.log(`Espedro archive: ${url}`);
  if(process.argv.includes('--open')){
    const command=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';
    const args=process.platform==='win32'?['/c','start','',url]:[url];
    const opener=spawn(command,args,{stdio:'ignore',detached:true,windowsHide:true});
    opener.on('error',()=>console.log(`Open this address manually: ${url}`));
    opener.unref();
  }
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
