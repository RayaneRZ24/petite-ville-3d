import {readFileSync} from 'node:fs';import vm from 'node:vm';
export function cityFixture(){
 let seed=42;const rng=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296),math=Object.create(Math);math.random=rng;
 const context=vm.createContext({console,Math:math,rng});
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const [,file] of html.matchAll(/<script src="([^"]+)"/g)){
  if(file==='3d/vehicleCamera3d.js')break;
  if(file.includes('three.min'))continue;
  vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
  if(file.endsWith('yuka.js'))vm.runInContext('const YUKA=globalThis.YUKA',context);
 }
 return {...vm.runInContext('({YUKA,CityMap3D,World3D,CitySolids3D,StreetNavigation3D,StreetBarricade3D,TownPerson3D,Robber3D,IncidentCar3D,ResponseCar3D,TrafficContacts3D,TrafficSteering3D})',context),rng};
}
