import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {join,resolve,relative} from 'node:path';
import {createServer,projectRoot} from '../scripts/serve.mjs';

test('serveur : effet Monster Kill M4A lisible avec son type audio et une plage partielle',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const url='http://127.0.0.1:'+server.address().port+'/games/seek/assets/monster-kill.m4a';
  const response=await fetch(url,{headers:{Range:'bytes=0-15'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),'audio/mp4');assert.equal((await response.arrayBuffer()).byteLength,16);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('distribution : chaque ressource HTML est locale et présente, sans lien vers la version p5',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const [,path] of html.matchAll(/(?:src|href)="([^"]+)"/g)){assert.ok(!/^(?:https?:|\/\/|\.\.\/)/.test(path),path);assert.ok(existsSync(join(projectRoot,path)),path);}
 assert.ok(!html.includes('index-2d.html'));
 assert.ok(existsSync(join(projectRoot,'libraries/3d/LICENSE-THREE')));assert.ok(existsSync(join(projectRoot,'libraries/3d/LICENSE-YUKA')));
});

test('distribution : les fichiers de test référencés restent dans le dépôt autonome',()=>{
 const directory=new URL('./',import.meta.url);
 for(const name of readdirSync(directory).filter(name=>name.endsWith('.mjs'))){
  const file=new URL(name,directory),text=readFileSync(file,'utf8');
  for(const [,reference] of text.matchAll(/new URL\(['"]([^'"`]+)['"],\s*import\.meta\.url\)/g)){
   const path=fileURLToPath(new URL(reference,file));assert.ok(!relative(resolve(projectRoot),path).startsWith('..'),name+': '+reference);assert.ok(existsSync(path),reference);
  }
 }
});

test('serveur : page du jeu, bibliothèques, HEAD, fichier absent et refus des chemins hors du projet',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(page.headers.get('content-type'),/text\/html/);assert.match(await page.text(),/Petite ville 3D/);
  const library=await fetch(base+'/libraries/3d/yuka.js');assert.equal(library.status,200);assert.match(library.headers.get('content-type'),/javascript/);await library.arrayBuffer();
  const head=await fetch(base+'/index.html',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(base+'/absent.js')).status,404);assert.equal((await fetch(base+'/%2e%2e%2fsecret.txt')).status,403);
  assert.equal((await fetch(base+'/index.html',{method:'POST'})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
