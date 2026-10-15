// Décor urbain et modèles des entités statiques. Aucun steering dans le rendu.
class CityView3D {
  constructor(view,city) {
    this.view=view;this.city=city;this.group=new THREE.Group();this.passengerViews=[];this.stopMarkers=new Map();
    view.scene.add(this.group);
    const pavement=new THREE.MeshStandardMaterial({color:'#b9bcc0',roughness:1});
    for(const [x,z] of city.districts){
      const block=new THREE.Mesh(new THREE.BoxGeometry(18,.22,12),pavement);block.position.set(x,.1,z);block.receiveShadow=true;this.group.add(block);
    }
    city.routes.forEach((route,index)=>view.createRoad(route,index*.003));
    for(const road of [{x:0,z:0,w:8.4,d:44},{x:0,z:0,w:112,d:8.4}]){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(road.w,.18,road.d),new THREE.MeshStandardMaterial({color:'#22272d'}));mesh.position.set(road.x,.12,road.z);mesh.receiveShadow=true;this.group.add(mesh);
    }
    const stripe=new THREE.MeshStandardMaterial({color:'#f6d477'});
    for(let x=-52;x<=52;x+=4){const line=new THREE.Mesh(new THREE.BoxGeometry(2,.025,.1),stripe);line.position.set(x,.235,0);this.group.add(line);}
    for(let z=-18;z<=18;z+=4){const line=new THREE.Mesh(new THREE.BoxGeometry(.1,.025,2),stripe);line.position.set(0,.235,z);this.group.add(line);}
    const laneRoutes=[city.route,city.routes[4],city.routes[5]],laneMarks=new THREE.InstancedMesh(new THREE.BoxGeometry(.1,.02,1),stripe,laneRoutes.length*32*3),matrix=new THREE.Matrix4();let mark=0;
    for(const route of laneRoutes)for(let i=0;i<route.points.length;i+=2){
      const spawn=route.spawn(i),frame=route.frameAt(spawn.point);
      for(const offset of [-2,0,2]){const p=spawn.point.clone().add(frame.normal.clone().multiplyScalar(offset)),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(spawn.direction.x,0,spawn.direction.z));matrix.compose(new THREE.Vector3(p.x,.225,p.z),rotation,new THREE.Vector3(1,1,offset===0?1.2:.7));laneMarks.setMatrixAt(mark++,matrix);}
    }
    laneMarks.instanceMatrix.needsUpdate=true;this.group.add(laneMarks);
    for(const building of city.buildings)this.addBuilding(building);
    for(const stop of city.stops)this.addStop(stop);
    for(const passenger of city.passengers)this.addPassenger(passenger);
    // Passages piétons aux intersections, marquage uniquement.
    const paint=new THREE.MeshStandardMaterial({color:'#f3f5eb'});
    for(const center of [[0,7],[0,-7],[7,0],[-7,0],[-28,7],[-28,-7],[28,7],[28,-7]])for(let i=-3;i<=3;i++){
      const vertical=center[1]!==0,mesh=new THREE.Mesh(new THREE.BoxGeometry(vertical?.5:2,.025,vertical?2:.5),paint);
      mesh.position.set(center[0]+(vertical?i:0),.24,center[1]+(vertical?0:i));this.group.add(mesh);
    }
  }
  label(text,width=3,color='#ffffff',background='#183448') {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=background;c.fillRect(0,0,512,128);c.fillStyle=color;c.font='bold 38px sans-serif';c.textAlign='center';c.fillText(text,256,79);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),side:THREE.DoubleSide}));return mesh;
  }
  addBuilding(entity) {
    if(entity.isShop){this.addShop(entity);return;}
    const group=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(entity.width,entity.height,entity.depth),new THREE.MeshStandardMaterial({color:entity.color,roughness:.85}));body.position.y=entity.height/2+.22;body.castShadow=body.receiveShadow=true;group.add(body);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(entity.width+.2,.15,entity.depth+.2),this.view.black);roof.position.y=entity.height+.3;group.add(roof);
    const glass=new THREE.MeshStandardMaterial({color:'#263f50',emissive:'#7893a2',emissiveIntensity:.15});
    for(const side of [-1,1])for(let x=-1.6;x<2;x+=1.1){const window=new THREE.Mesh(new THREE.BoxGeometry(.6,.6,.035),glass);window.position.set(x,1.55,side*(entity.depth/2+.025));group.add(window);}
    const sign=this.label(entity.label,2.8);sign.position.set(0,.75,entity.depth/2+.06);group.add(sign);
    group.position.copy(entity.position);this.group.add(group);
  }
  addShop(entity){
    const group=new THREE.Group(),wall=new THREE.MeshStandardMaterial({color:entity.color,roughness:.85}),glass=new THREE.MeshStandardMaterial({color:'#90b9c2',transparent:true,opacity:.24,side:THREE.DoubleSide});
    const box=(w,h,d,x,y,z,material=wall)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
    box(entity.width,.12,entity.depth,0,.18,0,new THREE.MeshStandardMaterial({color:'#efdfca'}));
    box(entity.width,entity.height,.15,0,entity.height/2,-entity.depth/2);
    for(const side of [-1,1]){box(.15,entity.height,entity.depth,side*entity.width/2,entity.height/2,0);box(entity.width/2-.7,1.5,.12,side*(entity.width/4+.35),.95,entity.depth/2,glass);}
    box(entity.width,.5,.15,0,1.95,entity.depth/2);box(entity.width+.25,.12,entity.depth+.2,0,entity.height+.2,0,new THREE.MeshStandardMaterial({color:'#456573',transparent:true,opacity:.35,depthWrite:false}));
    const awning=box(entity.width+.2,.14,1.1,0,2.15,entity.depth/2+.4,new THREE.MeshStandardMaterial({color:['#337f79','#b15d58','#c59445'][entity.shopId]}));
    awning.rotation.x=.12;const sign=this.label(entity.label,4.5,'#fff9e8','#244552');sign.position.set(0,2.55,entity.depth/2+.17);group.add(sign);
    box(.55,.7,.4,-1.5,.55,-.8,new THREE.MeshStandardMaterial({color:'#8d684c'}));
    for(let i=0;i<6;i++)box(.15,.13,.16,-1.7+(i%3)*.2,1+(i>=3?.2:0),-.8,new THREE.MeshStandardMaterial({color:['#dcba55','#dd7260','#70aa99'][i%3]}));
    group.position.copy(entity.position);this.group.add(group);
  }
  addStop(entity) {
    const group=new THREE.Group(),pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2,8),this.view.grey);pole.position.y=1;group.add(pole);
    const sign=this.label(entity.name,3.5,'#ffffff','#13569d');sign.position.set(0,2.1,0);group.add(sign);
    const shelter=new THREE.Mesh(new THREE.BoxGeometry(3.8,.15,1.5),new THREE.MeshStandardMaterial({color:'#207fad'}));shelter.position.set(0,1.8,-.6);group.add(shelter);
    const bench=new THREE.Mesh(new THREE.BoxGeometry(2.6,.15,.45),this.view.black);bench.position.set(0,.5,-.6);group.add(bench);
    group.position.copy(entity.platform);group.quaternion.copy(entity.rotation);this.group.add(group);
    const bay=new THREE.Mesh(new THREE.RingGeometry(.9,1.15,32),new THREE.MeshBasicMaterial({color:'#ffe36d',side:THREE.DoubleSide}));bay.rotation.x=-Math.PI/2;bay.position.set(entity.position.x,.21,entity.position.z);this.group.add(bay);
    this.stopMarkers.set(entity,bay);
  }
  addPassenger(entity) {
    const group=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.24,.5,.2),new THREE.MeshStandardMaterial({color:entity.color}));body.position.y=.6;group.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshStandardMaterial({color:'#dbaa85'}));head.position.y=.98;group.add(head);
    for(const x of [-.07,.07]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.08,.32,.1),this.view.black);leg.position.set(x,.2,0);group.add(leg);}
    group.position.copy(entity.position);this.group.add(group);this.passengerViews.push({entity,group});
  }
  render(mission) {
    for(const {entity,group} of this.passengerViews)group.visible=entity.queueIndex<entity.stop.waiting;
    for(const stop of this.city.stops)this.stopMarkers.get(stop).material.color.set(mission?.stop===stop&&['driving','boarding'].includes(mission.state)?'#55ffbb':'#ffe36d');
    const hud=document.getElementById('mission-status');
    if(hud&&mission?.bus)hud.textContent=`${mission.message} · ${mission.onboard}/${mission.capacity} à bord · ${mission.delivered} livrés · Score ${mission.score} · ${Math.round(mission.bus.getSpeed()*10)} km/h`;
  }
}
