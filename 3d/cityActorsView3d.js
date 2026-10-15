// Composants visuels uniquement ; les personnes et voitures restent des Vehicle Yuka.
class CityActorsView3D {
  constructor(view){this.view=view;this.people=new Map();this.barriers=new Map();this.time=0;this.createGround();}
  createGround(){
    const group=new THREE.Group();this.view.scene.add(group);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#c9baa3';c.fillRect(0,0,256,256);
    for(let y=0;y<256;y+=16)for(let x=0;x<256;x+=32){c.fillStyle=(x/32+y/16)%3?'#c5b79f':'#d5c9b5';c.fillRect(x+(y%32?16:0),y,30,14);}
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(36,36);texture.colorSpace=THREE.SRGBColorSpace;
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(280,240),new THREE.MeshStandardMaterial({map:texture,roughness:.97}));ground.rotation.x=-Math.PI/2;ground.position.set(15,-.012,0);ground.receiveShadow=true;group.add(ground);
    const asphalt=new THREE.Mesh(new THREE.BoxGeometry(60,.16,8.4),new THREE.MeshStandardMaterial({color:'#30343c',roughness:.94}));asphalt.position.set(83,.08,0);asphalt.receiveShadow=true;group.add(asphalt);
    const stripe=new THREE.MeshStandardMaterial({color:'#fff2cd'});
    for(let x=59;x<112;x+=4){const mark=new THREE.Mesh(new THREE.BoxGeometry(2,.015,.12),stripe);mark.position.set(x,.18,0);group.add(mark);}
    const sign=this.view.cityView.label('SORTIE EST →',8,'#ffffff','#236859');sign.position.set(95,3.8,-5);group.add(sign);
    for(const x of [92,98]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,4,8),this.view.grey);post.position.set(x,2,-5);group.add(post);}
    const pebbleMat=new THREE.MeshStandardMaterial({color:'#d6c7b0',roughness:1});
    for(const [x,z] of this.view.world.city.districts){
      const plaza=new THREE.Mesh(new THREE.BoxGeometry(19,.12,13),pebbleMat);plaza.position.set(x,.02,z);plaza.receiveShadow=true;group.add(plaza);
      for(const side of [-1,1]){const border=new THREE.Mesh(new THREE.BoxGeometry(18,.18,.18),this.view.grey);border.position.set(x,.14,z+side*6.5);group.add(border);}
    }
  }
  person(entity){
    const group=new THREE.Group(),dark=new THREE.MeshStandardMaterial({color:'#17212d',roughness:.9}),cloth=new THREE.MeshStandardMaterial({color:entity.robber?'#252c35':['#bf6a46','#4d8f9a','#b59a49'][entity.personIndex%3]}),skin=new THREE.MeshStandardMaterial({color:'#dab18d'});
    const box=(w,h,d,x,y,z,material=cloth,parent=group)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
    box(.27,.38,.19,0,.66,0);const head=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),entity.robber?dark:skin);head.position.y=.99;head.castShadow=true;group.add(head);
    if(entity.robber){box(.16,.04,.02,0,1.01,.12,skin);box(.20,.23,.035,0,.7,.12,dark);for(const x of [-.06,.06])box(.045,.09,.025,x,.7,.15,this.view.grey);}
    const legs=[];for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.08,.47,0);group.add(pivot);box(.09,.32,.11,0,-.15,0,dark,pivot);box(.11,.09,.18,0,-.34,.035,dark,pivot);legs.push(pivot);box(.08,.32,.10,side*.18,.67,.025,cloth);}
    const bag=box(.19,.24,.15,.15,.46,.10,new THREE.MeshStandardMaterial({color:entity.robber?'#6b6852':'#d6ae65'}));
    if(entity.robber){box(.055,.045,.23,-.16,.61,.14,dark);box(.05,.08,.05,-.16,.56,.13,dark);}
    this.view.scene.add(group);this.people.set(entity,{group,legs,bag});
  }
  policeCar(entity){
    this.view.addVehicle(entity);const root=this.view.views.get(entity),model=root.userData.model;model.paint.color.set('#f5f6f4');root.userData.baseColor='#f5f6f4';
    const blue=new THREE.MeshStandardMaterial({color:'#285cfa',emissive:'#285cfa',emissiveIntensity:1}),red=new THREE.MeshStandardMaterial({color:'#f22e43',emissive:'#f22e43',emissiveIntensity:1});
    for(const [side,material] of [[-1,blue],[1,red]]){const light=new THREE.Mesh(new THREE.BoxGeometry(.18,.07,.09),material);light.position.set(side*.13,.28,0);root.add(light);}
    root.userData.beacons=[blue,red];
    const label=this.view.cityView.label('POLICE',.48,'#ffffff','#16385c');label.position.set(.325,0,0);label.rotation.y=Math.PI/2;root.add(label);
  }
  sync(dt){
    this.time+=Math.max(0,Math.min(.1,dt||0));const world=this.view.world;
    for(const person of world.people){if(!this.people.has(person))this.person(person);const item=this.people.get(person);item.group.visible=person.visible;item.group.position.copy(person.position);item.group.quaternion.copy(person.rotation);item.bag.visible=person.hasBag;item.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(this.time*9+i*Math.PI)*Math.min(.5,person.getSpeed()*.4));}
    for(const [person,item] of this.people)if(!world.people.includes(person)){this.dispose(item.group);this.people.delete(person);}
    for(const car of world.incident.cars){if(!world.traffic.includes(car))continue;if(!this.view.views.has(car)){if(car.incidentRole==='police')this.policeCar(car);else{this.view.addVehicle(car);const root=this.view.views.get(car);root.userData.baseColor='#252a35';}}const root=this.view.views.get(car);root.userData.beacons?.forEach((material,i)=>material.emissiveIntensity=(Math.floor(this.time*6)+i)%2?2:.08);}
    for(const [entity,mesh] of this.view.views)if(entity.incidentRole&&!world.traffic.includes(entity)){if(this.view.vehicleCamera.selected===entity){this.view.vehicleCamera.select(null);this.view.setCameraMode('free');}this.dispose(mesh);this.view.views.delete(entity);const debug=this.view.avoidanceViews.get(entity);if(debug){this.dispose(debug);this.view.avoidanceViews.delete(entity);}}
    for(const barrier of world.incident.barricades){if(!this.barriers.has(barrier)){const group=new THREE.Group();for(let i=0;i<14;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.22,.42,.6),new THREE.MeshStandardMaterial({color:i%2?'#f3f5f1':'#e95041'}));bar.position.set(0,.8,-3.9+i*.6);bar.castShadow=true;group.add(bar);}for(const z of [-3,0,3]){const foot=new THREE.Mesh(new THREE.BoxGeometry(.5,.8,.12),this.view.grey);foot.position.set(0,.4,z);group.add(foot);}group.position.copy(barrier.position);this.view.scene.add(group);this.barriers.set(barrier,group);}this.barriers.get(barrier).visible=barrier.active;}
    for(const [barrier,group] of this.barriers)if(!world.incident.barricades.includes(barrier)){this.dispose(group);this.barriers.delete(barrier);}
    const status=document.getElementById('incident-status');if(status)status.textContent=world.incident.message;
    const button=document.getElementById('start-incident');if(button)button.disabled=!['idle','complete'].includes(world.incident.state);
  }
  dispose(group){
    group.parent?.remove(group);const shared=new Set([this.view.white,this.view.black,this.view.grey]),materials=new Set(),textures=new Set();
    group.traverse(object=>{object.geometry?.dispose();for(const material of [object.material].flat().filter(Boolean))if(!shared.has(material))materials.add(material);});
    for(const material of materials){if(material.map)textures.add(material.map);material.dispose();}for(const texture of textures)texture.dispose();
  }
}
