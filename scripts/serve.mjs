import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';

export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const types={'.ogg':'audio/ogg','.mp3':'audio/mpeg','.m4a':'audio/mp4','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};

export function createServer(){
  const root=resolve(projectRoot);
  return http.createServer(async(request,response)=>{
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405,{'Allow':'GET, HEAD'});response.end();return;}
    try{
      const pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
      const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(path!==root&&!path.startsWith(root+sep)){response.writeHead(403);response.end('Accès interdit');return;}
      const info=await stat(path);
      if(!info.isFile()){response.writeHead(404);response.end('Fichier introuvable');return;}
      const headers={'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes','Content-Length':info.size};
      let start=0,end=info.size-1,status=200;
      if(request.headers.range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if(match&&(match[1]||match[2])){
          if(match[1]){start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;}
          else start=Math.max(0,info.size-Number(match[2]));
        }
        if(!match||!(match[1]||match[2])||start> end||start>=info.size||(!match[1]&&Number(match[2])===0)){
          response.writeHead(416,{'Content-Range':'bytes */'+info.size});response.end();return;
        }
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;headers['Content-Length']=end-start+1;
      }
      response.writeHead(status,headers);
      response.end(request.method==='HEAD'?undefined:(await readFile(path)).subarray(start,end+1));
    }catch(error){response.writeHead(error instanceof URIError?400:error.code==='ENOENT'?404:500);response.end('Ressource indisponible');}
  });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||8080);
  if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('PORT doit être un entier de 1 à 65535.');
  createServer().listen(port,'127.0.0.1',()=>console.log(`Petite ville 3D : http://127.0.0.1:${port} — Ctrl+C pour arrêter.`));
}
