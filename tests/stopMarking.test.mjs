import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup(){
  const context=vm.createContext({console,document:{getElementById:()=>null}});
  for(const name of ['libraries/3d/three.min.js','libraries/3d/yuka.js','3d/circuit3d.js','3d/cityRoute3d.js','3d/busStop3d.js','3d/cityView3d.js'])vm.runInContext(readFileSync(new URL('../'+name,import.meta.url),'utf8'),context);
  const {THREE,CityView3D,BusStop3D,CityRoute3D}=vm.runInContext('({THREE,CityView3D,BusStop3D,CityRoute3D})',context);
  const view=Object.create(CityView3D.prototype);view.group=new THREE.Group();view.stopMarkers=new Map();view.passengerViews=[];view.view={grey:new THREE.MeshBasicMaterial(),black:new THREE.MeshBasicMaterial()};view.label=()=>new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());
  const stops=[12,28,44,60].map(i=>new BusStop3D('Arrêt '+i,i,new CityRoute3D(),3));view.city={stops};for(const stop of stops)view.addStop(stop);view.group.updateMatrixWorld(true);return {THREE,view,stops};
}
test('marquage arrêt : anneau au-dessus de toutes les routes et peintures, profondeur conservée',()=>{
  const {THREE,view,stops}=setup();for(const stop of stops){const marker=view.stopMarkers.get(stop),vertices=marker.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){const p=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(marker.matrixWorld);assert.ok(p.y>.2525);}
    assert.equal(marker.position.x,stop.position.x);assert.equal(marker.position.z,stop.position.z);assert.equal(marker.geometry.parameters.innerRadius,.9);assert.equal(marker.geometry.parameters.outerRadius,1.15);
    assert.equal(marker.material.depthTest,true);assert.equal(marker.material.polygonOffset,true);assert.ok(marker.material.polygonOffsetFactor<0);assert.ok(marker.material.polygonOffsetUnits<0);
  }
});
test('marquage arrêt : sélection de mission change la couleur sans changer la hauteur ni les entités',()=>{
  const {view,stops}=setup(),before=stops.map(stop=>stop.position.clone());view.render({stop:stops[0],state:'boarding'});assert.equal(view.stopMarkers.get(stops[0]).material.color.getHexString(),'55ffbb');view.render(null);
  for(let i=0;i<stops.length;i++){assert.equal(view.stopMarkers.get(stops[i]).material.color.getHexString(),'ffe36d');assert.equal(view.stopMarkers.get(stops[i]).position.y,.265);assert.ok(stops[i].position.equals(before[i]));}
});
