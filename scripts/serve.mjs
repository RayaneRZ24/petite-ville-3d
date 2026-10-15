import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';

export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};

export function createServer(){
  const root=resolve(projectRoot);
  return http.createServer(async(request,response)=>{
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405,{'Allow':'GET, HEAD'});response.end();return;}
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
      const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(path!==root&&!path.startsWith(root+sep)){response.writeHead(403);response.end('Accès interdit');return;}
      if(!(await stat(path)).isFile()){response.writeHead(404);response.end('Fichier introuvable');return;}
      response.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});
      response.end(request.method==='HEAD'?undefined:await readFile(path));
    }catch(error){response.writeHead(error instanceof URIError?400:error.code==='ENOENT'?404:500);response.end('Ressource indisponible');}
  });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||8080);
  if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('PORT doit être un entier de 1 à 65535.');
  createServer().listen(port,'127.0.0.1',()=>console.log(`Petite ville 3D : http://127.0.0.1:${port} — Ctrl+C pour arrêter.`));
}
