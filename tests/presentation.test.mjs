import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function fixture(){
  const nodes=new Map([['mission-hud',{hidden:true}],['mission-status',{textContent:''}]]);
  const context=vm.createContext({console,document:{getElementById:id=>nodes.get(id),createElement:()=>({getContext:()=>({fillRect(){}})})}});
  for(const file of ['libraries/3d/three.min.js','3d/cityView3d.js','3d/cityActorsView3d.js','3d/scene3d.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
  return {...vm.runInContext('({THREE,CityView3D,CityActorsView3D,Scene3D})',context),nodes};
}
test('sol urbain : la texture habille une seule surface, même en vue éloignée',()=>{
  const {THREE,CityActorsView3D}=fixture();
  const scene=new THREE.Scene(),ground=new THREE.Mesh(new THREE.PlaneGeometry(280,240),new THREE.MeshStandardMaterial({color:'#64836b'}));
  ground.rotation.x=-Math.PI/2;ground.position.set(15,-.02,0);scene.add(ground);
  const before=ground.matrix.clone(),view={scene,ground,renderer:{capabilities:{getMaxAnisotropy:()=>8}},grey:new THREE.MeshStandardMaterial(),cityView:{label:()=>new THREE.Group()},world:{city:{districts:[]}}};
  new CityActorsView3D(view);
  const floors=[];scene.traverse(o=>{if(o.isMesh&&o.geometry.type==='PlaneGeometry')floors.push(o)});
  assert.deepEqual(floors,[ground]);assert.ok(ground.matrix.equals(before));
  assert.equal(ground.material.map.anisotropy,8);assert.equal(ground.material.color.getHexString(),'ffffff');
  assert.equal(ground.material.map.generateMipmaps,true);assert.equal(ground.material.depthTest,true);
  // Deux rayons éloignés n'intersectent qu'un sol : aucune surface verte concurrente.
  scene.updateMatrixWorld(true);
  for(const distance of [145,225,300]){
    const ray=new THREE.Raycaster(new THREE.Vector3(0,distance,distance),new THREE.Vector3(0,-1,-1).normalize());
    assert.equal(ray.intersectObjects(floors).length,1);
  }
});
test('HUD bus : absent hors mission, visible en trajet et embarquement, résultat conservé',()=>{
  const {CityView3D,nodes}=fixture(),view=Object.create(CityView3D.prototype);
  Object.assign(view,{city:{stops:[]},passengerViews:[]});
  const mission={state:'idle',bus:{getSpeed:()=>2},message:'Test',onboard:3,capacity:12,delivered:5,score:150};
  for(const state of ['idle','driving','boarding','complete','idle']){
    mission.state=state;view.render(mission);
    assert.equal(nodes.get('mission-hud').hidden,state==='idle');
    assert.equal(nodes.get('mission-status').textContent.includes('Score 150'),state!=='idle');
  }
  view.render({...mission,state:'driving',bus:null});assert.equal(nodes.get('mission-hud').hidden,true);
  view.render(null);assert.equal(nodes.get('mission-status').textContent,'');
});
