class NeuralLabPortal3D {
  constructor(view){
    this.view=view;this.entity=new LearningCircuit3D();this.opened=false;this.group=new THREE.Group();this.group.position.copy(this.entity.position);view.scene.add(this.group);
    this.dialog=document.getElementById('neural-dialog');this.frame=document.getElementById('neural-frame');this.track=new THREE.Group();this.track.scale.setScalar(this.entity.scale);this.track.position.set(-33,.02,-20.9);this.group.add(this.track);
    const rings=[[],[]];for(let i=0;i<160;i++){const t=i/160*Math.PI*2,dx=-430*Math.sin(t),dy=235*Math.cos(t),length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;for(let j=0;j<2;j++){const offset=j?-45:45;rings[j].push([600+430*Math.cos(t)+nx*offset,380+235*Math.sin(t)+ny*offset]);}}
    this.rebuild(rings[0],rings[1]);
    this.venue=new StadiumVenueView3D(view.scene,this.entity);
    const board=document.createElement('canvas');board.width=1024;board.height=192;const ctx=board.getContext('2d');ctx.fillStyle='#102c37';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#8affd0';ctx.font='bold 62px sans-serif';ctx.textAlign='center';ctx.fillText('NEURO RACING',512,78);ctx.fillStyle='#ffffff';ctx.font='32px sans-serif';ctx.fillText('CLIQUE POUR ENTRAÎNER TON PILOTE',512,140);
    this.sign=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(board),depthTest:false}));this.sign.scale.set(31,5.8,1);this.sign.position.set(0,7,0);this.group.add(this.sign);
    document.getElementById('open-neural-lab').addEventListener('click',()=>this.open());document.getElementById('locate-neural-circuit').addEventListener('click',()=>this.focus());document.getElementById('close-neural-lab').addEventListener('click',()=>this.close());
    this.frame.addEventListener('load',()=>{if(this.opened)this.frame.contentWindow.postMessage({type:'neuro-lab-show'},'*');});
    window.addEventListener('message',event=>{if(event.source!==this.frame.contentWindow)return;if(event.data?.type==='neuro-lab-close')this.close();if(event.data?.type==='neuro-circuit-preview')this.preview(event.data);});
    window.addEventListener('keydown',event=>{if(this.opened&&event.key==='Escape')this.close();});
  }
  rebuild(inner,outer){
    this.track.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});this.track.clear();
    const shape=new THREE.Shape(outer.map(p=>new THREE.Vector2(p[0],-p[1])));shape.holes.push(new THREE.Path([...inner].reverse().map(p=>new THREE.Vector2(p[0],-p[1]))));const road=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#26363c',roughness:1,side:THREE.DoubleSide}));road.rotation.x=-Math.PI/2;this.track.add(road);
    for(const ring of [inner,outer]){const vertices=[...ring,ring[0]].map(p=>new THREE.Vector3(p[0],2,p[1]));this.track.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color:'#93f0ce'})));}
  }
  preview(data){
    const valid=ring=>Array.isArray(ring)&&ring.length>=16&&ring.length<=600&&ring.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=1200&&p[1]>=0&&p[1]<=760);
    if(!valid(data.inner)||!valid(data.outer))return;this.rebuild(data.inner,data.outer);
  }
  pick(ray){return ray.intersectObjects([this.track,this.sign,this.venue.group],true).length>0;}
  focus(){this.view.setCameraMode('free');this.view.orbit.target={x:this.entity.position.x,y:0,z:this.entity.position.z};Object.assign(this.view.orbit,{yaw:.2,pitch:.8,distance:110});}
  open(){
    if(this.opened||this.view.attractions?.opened)return;this.view.attractions?.leaveRide();this.opened=true;this.opener=document.activeElement;this.savedFocus={orbit:{...this.view.orbit},mode:this.view.vehicleCamera.mode};this.focus();this.dialog.hidden=false;
    for(const id of ['controls','scene','settings3d-toggle','open-neural-lab','open-arcade','mission-hud'])document.getElementById(id).inert=true;
    if(!this.frame.getAttribute('src'))this.frame.src='neuro/index.html';else this.frame.contentWindow.postMessage({type:'neuro-lab-show'},'*');this.frame.focus();
  }
  close(){
    if(!this.opened)return;this.frame.contentWindow.postMessage({type:'neuro-lab-pause'},'*');this.opened=false;this.dialog.hidden=true;
    for(const id of ['controls','scene','settings3d-toggle','open-neural-lab','open-arcade','mission-hud'])document.getElementById(id).inert=false;
    Object.assign(this.view.orbit,this.savedFocus.orbit);this.view.setCameraMode(this.savedFocus.mode);this.view.lastRenderTime=performance.now();this.opener?.focus();
  }
}
