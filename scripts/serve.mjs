import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {headersFor} from './headers.mjs';
await import('./build.mjs');
const root = resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.pdf':'application/pdf','.svg':'image/svg+xml','.json':'application/json','.bin':'application/octet-stream','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
http.createServer(async (req,res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (file !== root && !file.startsWith(root+sep)) {res.writeHead(403).end(); return;}
    if ((await stat(file)).isDirectory()) file=resolve(file,'index.html');
    const body=await readFile(file),etag='"'+createHash('sha256').update(body).digest('hex')+'"';
    const headers={...headersFor(new URL(req.url,'http://localhost').pathname),'Content-Type':types[extname(file)]||'application/octet-stream','ETag':etag};
    if(req.headers['if-none-match']===etag){res.writeHead(304,headers).end();return;}
    res.writeHead(200,headers).end(body);
  } catch {res.writeHead(404,{...headersFor('/404.html'),'Content-Type':'text/html; charset=utf-8'}).end(await readFile(resolve(root,'404.html')));}
}).listen(4186,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4186'));
