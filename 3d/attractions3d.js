class Attractions3D {
  constructor(view,portal){
    this.view=view;this.portal=portal;this.opened=false;this.ride=false;this.cabin=0;
    this.panel=document.getElementById('arcade-panel');this.frame=document.getElementById('behavior-arcade-frame');this.loading=document.getElementById('arcade-loading');
    this.embedded=new EmbeddedBehaviorGame(this.frame,()=>this.refresh());this.embedded.onClose=()=>this.close();
    this.cabinets=BehaviorArcadeCatalog.entries.map((entry,i)=>new ArcadeCabinet3D(entry.id,-9.1+i*2.6,-30.5));this.cabinetRoots=[];
    for(const entity of this.cabinets)this.addCabinet(entity);
    this.menu=document.getElementById('behavior-arcade-menu');
    for(const entry of BehaviorArcadeCatalog.entries){const button=document.createElement('button');button.type='button';button.textContent=entry.title;button.dataset.game=entry.id;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>this.start(entry.id));this.menu.append(button);}
    document.getElementById('locate-arcades').addEventListener('click',()=>this.focus());
    document.getElementById('open-arcade').addEventListener('click',()=>this.open('pursuit'));
    document.getElementById('close-arcade').addEventListener('click',()=>this.close());
    document.getElementById('arcade-restart').addEventListener('click',()=>{this.loadElapsed=0;if(BehaviorArcadeCatalog.get(this.embedded.id).engine==='classic')this.embedded.control('restart');else this.embedded.restart();});
    document.getElementById('arcade-pause').addEventListener('click',()=>this.embedded.setPaused(!this.embedded.paused));
    document.getElementById('arcade-settings').addEventListener('click',()=>{this.embedded.control('settings');this.frame.focus();});
    document.getElementById('arcade-action').addEventListener('click',()=>{this.embedded.control('add-snake');this.frame.focus();});
    window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(this.opened){event.preventDefault();event.stopImmediatePropagation();this.close();}else if(this.ride){event.preventDefault();event.stopImmediatePropagation();this.leaveRide();}});
    document.getElementById('ride-wheel').addEventListener('click',()=>this.enterRide());document.getElementById('exit-wheel').addEventListener('click',()=>this.leaveRide());
  }
  addCabinet(entity){
    const entry=BehaviorArcadeCatalog.get(entity.mode),root=new THREE.Group(),dark=new THREE.MeshStandardMaterial({color:'#173847'}),accent=new THREE.MeshStandardMaterial({color:entry.color,emissive:entry.color,emissiveIntensity:.28});
    for(const [w,h,d,x,y,z,mat] of [[.9,1.2,.85,0,.6,0,dark],[.95,.7,.35,0,1.45,-.22,dark],[.9,.12,.7,0,1,.16,accent]]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);root.add(mesh);}
    const screen=this.view.cityView.label(entry.label,.83,entry.color,'#143243');screen.position.set(0,1.48,.01);root.add(screen);
    const sign=this.view.cityView.label('JOUER',.65);sign.position.set(0,1.85,.12);root.add(sign);root.position.copy(entity.position);root.userData.arcadeId=entry.id;this.view.scene.add(root);this.cabinetRoots.push(root);
    this.view.world.city.solids.bodies.push({owner:entity,position:entity.position.clone(),hx:.5,hz:.5,direction:new YUKA.Vector3(0,0,1)});
  }
  pick(ray){
    const hits=ray.intersectObjects(this.cabinetRoots,true);if(hits.length){let item=hits[0].object;while(item&&!this.cabinetRoots.includes(item))item=item.parent;const index=this.cabinetRoots.indexOf(item);if(index>=0){this.open(this.cabinets[index].mode);return true;}}
    if(this.view.cityLife?.wheel&&ray.intersectObject(this.view.cityLife.wheel,true).length){this.enterRide();return true;}return false;
  }
  focus(){this.leaveRide();this.view.setCameraMode('free');Object.assign(this.view.orbit,{target:{x:0,y:0,z:-32},distance:27,yaw:0,pitch:.8});document.getElementById('controls').hidden=true;const toggle=document.getElementById('settings3d-toggle');toggle.setAttribute('aria-expanded','false');toggle.focus();}
  start(id){BehaviorArcadeCatalog.get(id);this.loadElapsed=0;this.embedded.open(id);this.frame.focus();}
  open(id='pursuit'){
    if(this.portal.opened)return;BehaviorArcadeCatalog.get(id);if(!this.opened)this.opener=document.activeElement;this.leaveRide();this.opened=true;this.panel.hidden=false;
    for(const name of ['scene','controls','settings3d-toggle','open-neural-lab','open-arcade','mission-hud'])document.getElementById(name).inert=true;
    this.start(id);
  }
  refresh(){
    const id=this.embedded.id;if(!id)return;const entry=BehaviorArcadeCatalog.get(id),ready=this.embedded.ready;
    document.getElementById('arcade-title').textContent=entry.title;document.getElementById('arcade-description').textContent=entry.description;
    for(const button of this.menu.querySelectorAll('[data-game]'))button.setAttribute('aria-pressed',String(button.dataset.game===id));
    document.getElementById('arcade-action').hidden=entry.engine!=='snake';
    document.getElementById('arcade-settings').hidden=entry.engine==='classic';
    for(const name of ['arcade-action','arcade-settings','arcade-pause'])document.getElementById(name).disabled=!ready;
    const pause=document.getElementById('arcade-pause');pause.textContent=this.embedded.paused?'Reprendre':'Pause';pause.setAttribute('aria-pressed',String(this.embedded.paused));
    this.loading.hidden=ready;this.loading.textContent='Chargement de ton jeu…';this.frame.setAttribute('aria-busy',String(!ready));
  }
  update(elapsed){if(!this.opened||this.embedded.ready||document.hidden)return;this.loadElapsed+=Math.min(.1,Math.max(0,elapsed||0));if(this.loadElapsed>12)this.loading.textContent='Le jeu met plus de temps à charger. Tu peux utiliser « Recommencer » ou revenir à la ville.';}
  close(){
    if(!this.opened)return;this.embedded.stop();this.opened=false;this.panel.hidden=true;
    for(const name of ['scene','controls','settings3d-toggle','open-neural-lab','open-arcade','mission-hud'])document.getElementById(name).inert=false;
    this.opener?.focus();this.view.lastRenderTime=performance.now();
  }
  enterRide(){if(this.opened||this.portal.opened||this.ride)return;this.savedRide={mode:this.view.vehicleCamera.mode,orbit:{...this.view.orbit}};this.view.setCameraMode('free');this.ride=true;document.getElementById('exit-wheel').hidden=false;}
  leaveRide(){if(!this.ride)return;this.ride=false;Object.assign(this.view.orbit,this.savedRide.orbit);this.view.setCameraMode(this.savedRide.mode);document.getElementById('exit-wheel').hidden=true;}
  updateCamera(dt){if(!this.ride){this.ridePosition=null;return;}const cabin=this.view.cityLife.cabins[this.cabin],point=new THREE.Vector3();cabin.getWorldPosition(point);point.add(new THREE.Vector3(0,.5,1));this.ridePosition??=this.view.camera.position.clone();this.ridePosition.lerp(point,1-Math.exp(-8*Math.max(.016,Math.min(.1,dt))));this.view.camera.position.copy(this.ridePosition);this.view.camera.lookAt(0,4,0);}
}
