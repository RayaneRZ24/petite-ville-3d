class CircuitView3D {
  constructor(host){
    this.host=host;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#bfdcec');
    this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));host.append(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(43,1,.1,500);this.yaw=.18;this.pitch=.45;this.distance=65;this.top=false;
    this.scene.add(new THREE.HemisphereLight('#ffffff','#597457',2));const sun=new THREE.DirectionalLight('#fff7dc',2);sun.position.set(25,60,30);this.scene.add(sun);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshStandardMaterial({color:'#769b7a',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.04;this.scene.add(floor);
    this.stadium=new StadiumVenueView3D(this.scene,new VenueProp3D('stadium',0,0),{parking:false});
    this.root=new THREE.Group();this.root.scale.setScalar(.055);this.root.position.set(-33,0,-20.9);this.scene.add(this.root);
    this.track=new THREE.Group();this.root.add(this.track);
    this.body=new THREE.InstancedMesh(new THREE.BoxGeometry(10,5,20),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.35,metalness:.25}),80);
    this.windows=new THREE.InstancedMesh(new THREE.BoxGeometry(8,3.5,9),new THREE.MeshStandardMaterial({color:'#223b50',roughness:.15,metalness:.4}),80);
    this.wheels=new THREE.InstancedMesh(new THREE.CylinderGeometry(2.7,2.7,2.5,10),new THREE.MeshStandardMaterial({color:'#15202b'}),320);
    for(const mesh of [this.body,this.windows,this.wheels]){mesh.count=0;mesh.frustumCulled=false;this.root.add(mesh);}
    this.marker=new THREE.Object3D();this.rays=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#ffca62'}));this.root.add(this.rays);this.labels=[];
    let drag=null;this.renderer.domElement.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);});
    this.renderer.domElement.addEventListener('pointermove',event=>{if(!drag)return;this.top=false;this.yaw-=(event.clientX-drag.x)*.006;this.pitch=Math.max(.15,Math.min(1.35,this.pitch+(event.clientY-drag.y)*.005));drag={x:event.clientX,y:event.clientY};});
    for(const type of ['pointerup','pointercancel'])this.renderer.domElement.addEventListener(type,()=>{drag=null;});
    this.renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();this.distance=Math.max(45,Math.min(190,this.distance*Math.exp(event.deltaY*.001)));},{passive:false});
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.failed=true;document.getElementById('session-message').textContent='Contexte graphique perdu. Exporte les cerveaux puis recharge le laboratoire.';});
    this.resize();
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  rebuild(circuit){
    this.track.traverse(object=>{object.geometry?.dispose();if(object.material)object.material.dispose();});this.track.clear();
    const shape=new THREE.Shape(circuit.outer.map(p=>new THREE.Vector2(p.x,-p.y)));shape.holes.push(new THREE.Path([...circuit.inner].reverse().map(p=>new THREE.Vector2(p.x,-p.y))));
    const road=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#253541',roughness:.9,side:THREE.DoubleSide}));road.rotation.x=-Math.PI/2;this.track.add(road);
    for(const ring of [circuit.inner,circuit.outer]){
      const points=[];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];points.push(new THREE.Vector3(a.x,1,a.y),new THREE.Vector3(b.x,1,b.y));}
      this.track.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#f5ead3'})));
    }
    const dashes=[];for(let i=0;i<circuit.points.length;i+=2){const a=circuit.points[i],b=circuit.points[(i+1)%circuit.points.length];dashes.push(new THREE.Vector3(a.x,.5,a.y),new THREE.Vector3(b.x,.5,b.y));}
    this.track.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dashes),new THREE.LineBasicMaterial({color:'#a9bfbd'})));
    const gate=circuit.gates[0];for(let i=0;i<12;i++){const p=LabVector2.add(gate.a,LabVector2.sub(gate.b,gate.a).mult((i+.5)/12));const mesh=new THREE.Mesh(new THREE.BoxGeometry(circuit.spec.width/12,1,7),new THREE.MeshStandardMaterial({color:i%2?'#17232b':'#ffffff'}));mesh.position.set(p.x,.6,p.y);mesh.rotation.y=-gate.forward.heading()+Math.PI/2;this.track.add(mesh);}
    this.circuitId=circuit.id;
  }
  matrix(position,rotation,offset){this.marker.position.set(position.x,position.y,position.z);this.marker.quaternion.copy(rotation);if(offset)this.marker.position.add(new THREE.Vector3(...offset).applyQuaternion(this.marker.quaternion));this.marker.scale.set(1,1,1);this.marker.updateMatrix();return this.marker.matrix;}
  syncLabels(cars,race){
    const signature=race?cars.map(car=>car.name).join('\0'):'';if(signature===this.labelSignature)return;
    for(const label of this.labels){this.root.remove(label);label.material.map.dispose();label.material.dispose();}this.labels=[];this.labelSignature=signature;
    if(!race)return;for(const car of cars){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=48;const ctx=canvas.getContext('2d');ctx.fillStyle='#102331dd';ctx.fillRect(0,0,256,48);ctx.font='25px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.fillText(car.name.slice(0,20),128,32);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));sprite.scale.set(65,12,1);this.root.add(sprite);this.labels.push(sprite);}
  }
  render(session,showRays,showGates){
    if(this.failed)return;if(this.circuitId!==session.circuit.id)this.rebuild(session.circuit);
    const cars=session.cars;this.syncLabels(cars,session.mode==='race');this.body.count=this.windows.count=cars.length;this.wheels.count=cars.length*4;
    const color=new THREE.Color(),wheelRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
    for(let i=0;i<cars.length;i++){
      const car=cars[i];this.body.setMatrixAt(i,this.matrix(car.position,car.rotation,[0,5,0]));this.windows.setMatrixAt(i,this.matrix(car.position,car.rotation,[0,8.8,1]));
      color.set(car.dead?'#c85060':car.finished?'#6dffb5':car.color);this.body.setColorAt(i,color);
      for(let j=0;j<4;j++){this.matrix(car.position,car.rotation,[(j%2?1:-1)*5.2,2.7,(j<2?1:-1)*6]);this.marker.quaternion.multiply(wheelRotation);this.marker.updateMatrix();this.wheels.setMatrixAt(i*4+j,this.marker.matrix);}
      this.labels[i]?.position.set(car.pos.x,23,car.pos.y);
    }
    for(const mesh of [this.body,this.windows,this.wheels])mesh.instanceMatrix.needsUpdate=true;if(this.body.instanceColor)this.body.instanceColor.needsUpdate=true;
    const points=[],leader=session.leader;if(showRays&&leader&&!leader.dead&&!leader.finished)for(const ray of leader.rays)if(ray.end)points.push(new THREE.Vector3(leader.pos.x,9,leader.pos.y),new THREE.Vector3(ray.end.x,9,ray.end.y));
    if(showGates)for(const gate of session.circuit.gates)points.push(new THREE.Vector3(gate.a.x,2,gate.a.y),new THREE.Vector3(gate.b.x,2,gate.b.y));
    this.rays.geometry.dispose();this.rays.geometry=new THREE.BufferGeometry().setFromPoints(points);
    const distance=this.distance*Math.max(1,1.3/this.camera.aspect),pitch=this.top ? .015 : this.pitch;
    this.camera.position.set(Math.sin(this.yaw)*Math.sin(pitch)*distance,Math.cos(pitch)*distance,Math.cos(this.yaw)*Math.sin(pitch)*distance);this.camera.lookAt(0,0,0);
    this.renderer.render(this.scene,this.camera);
  }
}
