import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {renderWorker,localVersion} from './pages.mjs';
const root=process.cwd(),port=Number(process.env.PORT||4173),prefix='/NBA-Fantasy-Stats-Tracker/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.css':'text/css','.png':'image/png','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative=pathname.startsWith(prefix)?pathname.slice(prefix.length):pathname.replace(/^\//,'');
    // Preview exposes only the public site, never local config, source fixtures or secrets.
    if(!['','index.html','sw.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'].includes(relative)&&!/^assets\/[\w.-]+$/.test(relative)&&!/^data\/(?:releases\/)?[\w.-]+\.json$/.test(relative)){res.writeHead(404).end('Not found');return;}
    const file=path.join(root,relative||'index.html');let bytes=await fs.readFile(file);
    if(relative==='sw.js')bytes=Buffer.from(renderWorker(bytes.toString('utf8'),await localVersion(root)));
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${port}${prefix}`));
