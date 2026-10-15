// Modèles détaillés des entités existantes, distincts de leur pilotage.
class VehicleModel3D {
  constructor(entity){
    this.entity=entity;this.root=new THREE.Group();this.wheels=[];this.mirrors=[];this.brakeLights=[];this.state=new VehicleVisualState3D(entity);
    this.paint=new THREE.MeshStandardMaterial({color:entity.isBus?'#f6f3e7':'#a8bdcd',metalness:.3,roughness:.35});
    this.dark=new THREE.MeshStandardMaterial({color:'#17212b',roughness:.7});this.seatMaterial=new THREE.MeshStandardMaterial({color:'#385361',roughness:.9});
    this.glass=new THREE.MeshStandardMaterial({color:'#aed7e8',transparent:true,opacity:.12,roughness:.1,depthWrite:false,side:THREE.DoubleSide});
    if(entity.isBus)this.bus();else this.car();
    this.root.userData.height=entity.isBus?.79:.41;this.root.userData.body={material:this.paint};this.root.userData.baseColor=entity.isBus?'#f6f3e7':'#a8bdcd';this.root.userData.model=this;
  }
  box(w,h,d,x,y,z,material=this.dark,parent=this.root){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  panel(w,h,x,y,z,material){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);m.rotation.y=Math.PI;this.root.add(m);return m;}
  wheel(side,z,r,y){
    const pivot=new THREE.Group();pivot.position.set(side*(this.entity.isBus?.55:.29),y,z);this.root.add(pivot);
    const rotor=new THREE.Group();pivot.add(rotor);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(r,r,this.entity.isBus?.11:.085,20),new THREE.MeshStandardMaterial({color:'#101318',roughness:.95}));tire.rotation.z=Math.PI/2;rotor.add(tire);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.65,r*.65,this.entity.isBus?.115:.09,12),new THREE.MeshStandardMaterial({color:'#bdc8ce',metalness:.8,roughness:.25}));hub.rotation.z=Math.PI/2;rotor.add(hub);
    for(let i=0;i<5;i++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.094,r*.12,r*1.1),this.dark);spoke.rotation.x=i*Math.PI/5;rotor.add(spoke);}
    this.wheels.push({pivot,rotor,front:z>0});
  }
  seat(x,y,z,bus=false){const w=bus?.25:.22;this.box(w,.055,.22,x,y,z,this.seatMaterial);this.box(w,.25,.05,x,y+.12,z-.10,this.seatMaterial);this.box(w*.75,.07,.05,x,y+.29,z-.10,this.seatMaterial);}
  lights(width,z,y){
    for(const side of [-1,1]){
      this.box(.08,.035,.015,side*width,y,z,new THREE.MeshStandardMaterial({color:'#fff0be',emissive:'#fff0be',emissiveIntensity:.8}));
      const mat=new THREE.MeshStandardMaterial({color:'#c42d35',emissive:'#ff2734',emissiveIntensity:.15});this.brakeLights.push(mat);this.box(.08,.04,.015,side*width,y,-z,mat);
    }
  }
  mirror(x,y,z,w,h){
    this.box(w+.018,h+.016,.025,x,y,z,this.dark);
    const surface=this.panel(w,h,x,y,z-.014,new THREE.MeshBasicMaterial({color:'#a9cadb'}));this.mirrors.push({surface,local:new THREE.Vector3(x,y,z),side:Math.sign(x)});
  }
  dashboard(width,y,z,driverX){
    this.box(width,.085,.14,0,y,z,this.dark);
    const dial=new THREE.Group();dial.position.set(driverX,y+.058,z-.073);dial.rotation.set(.35,Math.PI,0);this.root.add(dial);
    const face=new THREE.Mesh(new THREE.CircleGeometry(.054,32),new THREE.MeshBasicMaterial({color:'#07141d',side:THREE.DoubleSide}));dial.add(face);
    const marks=new THREE.MeshBasicMaterial({color:'#e6f2ec'});
    for(let i=0;i<=10;i++){const a=(i/10*1.5-.75)*Math.PI;const tick=new THREE.Mesh(new THREE.BoxGeometry(.003,.012,.001),marks);tick.position.set(Math.sin(a)*.043,Math.cos(a)*.043,.002);tick.rotation.z=-a;dial.add(tick);}
    this.needle=new THREE.Group();dial.add(this.needle);const pointer=new THREE.Mesh(new THREE.BoxGeometry(.003,.041,.002),new THREE.MeshBasicMaterial({color:'#ff664e'}));pointer.position.set(0,.016,.004);this.needle.add(pointer);
    const steeringHolder=new THREE.Group();steeringHolder.position.set(driverX,y+.08,z-.15);steeringHolder.rotation.x=.3;this.root.add(steeringHolder);
    this.steeringWheel=new THREE.Group();steeringHolder.add(this.steeringWheel);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.09,.012,8,32),this.dark);this.steeringWheel.add(rim);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.018,12),this.dark);hub.rotation.x=Math.PI/2;this.steeringWheel.add(hub);
    for(let i=0;i<3;i++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.011,.077,.01),this.dark);spoke.position.set(Math.sin(i*Math.PI*2/3)*.034,Math.cos(i*Math.PI*2/3)*.034,0);spoke.rotation.z=-i*Math.PI*2/3;this.steeringWheel.add(spoke);}
    this.box(.09,.03,.11,0,y-.08,z-.12,this.dark);this.gearLever=new THREE.Group();this.gearLever.position.set(0,y-.04,z-.12);this.root.add(this.gearLever);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.065,8),this.dark);shaft.position.y=.025;this.gearLever.add(shaft);const knob=new THREE.Mesh(new THREE.SphereGeometry(.019,10,8),this.dark);knob.position.y=.06;this.gearLever.add(knob);
    for(const x of [driverX-.045,driverX+.045])this.box(.035,.008,.07,x,-.09,z-.12,this.dark);
    this.screenCanvas=document.createElement('canvas');this.screenCanvas.width=256;this.screenCanvas.height=128;this.screenTexture=new THREE.CanvasTexture(this.screenCanvas);
    this.panel(.13,.065,-driverX,y+.065,z-.075,new THREE.MeshBasicMaterial({map:this.screenTexture,side:THREE.DoubleSide}));this.screenValue='';
  }
  car(){
    this.box(.62,.15,1.08,0,-.015,0,this.paint);this.box(.60,.11,.30,0,.11,.39,this.paint);this.box(.6,.07,.27,0,.12,-.405,this.paint);
    this.box(.64,.045,.68,0,.54,-.05,this.paint);
    this.box(.60,.012,.64,0,.510,-.05,new THREE.MeshStandardMaterial({color:'#a8adb0',roughness:1}));
    for(const side of [-1,1]){
      this.box(.025,.39,.025,side*.3,.34,.26,this.paint);this.box(.025,.38,.025,side*.3,.34,-.37,this.paint);
      this.box(.025,.11,.65,side*.30,.11,-.05,this.paint);this.box(.013,.25,.57,side*.303,.35,-.05,this.glass);
      this.mirror(side*.32,.30,.19,.074,.045);
      for(const z of [-.36,.36])this.wheel(side,z,.11,-.09);
    }
    this.box(.58,.32,.012,0,.36,.267,this.glass);this.box(.58,.3,.012,0,.36,-.38,this.glass);
    this.seat(.17,.055,-.17);this.seat(-.17,.055,-.17);this.box(.50,.09,.20,0,.08,-.40,this.seatMaterial);
    this.dashboard(.58,.205,.225,.17);this.mirror(0,.475,.19,.12,.047);this.lights(.24,.548,.08);
    this.box(.14,.006,.006,.09,.2,.278,this.dark);this.box(.14,.006,.006,-.12,.2,.278,this.dark);
  }
  bus(){
    this.box(1.04,.22,1.8,0,-.27,0,this.paint);this.box(.96,.065,1.74,0,-.09,0,this.dark);this.box(1.04,.07,1.8,0,.49,0,this.paint);
    this.box(1.0,.015,1.74,0,.44,0,new THREE.MeshStandardMaterial({color:'#d8d7cb',roughness:1}));
    for(const z of [-.5,0,.5])this.box(.08,.008,.2,0,.426,z,new THREE.MeshBasicMaterial({color:'#fff1c4'}));
    for(const side of [-1,1]){
      this.box(.035,.22,1.75,side*.5,.015,0,this.paint);
      for(const z of [-.82,-.40,0,.40,.82])this.box(.025,.4,.025,side*.5,.28,z,this.paint);
      for(const z of [-.61,-.21,.21,.61])this.box(.014,.3,.37,side*.512,.31,z,this.glass);
      for(const z of [-.55,.55])this.wheel(side,z,.18,-.4);
      this.mirror(side*.62,.32,.65,.10,.10);
    }
    this.box(.95,.35,.015,0,.285,.90,this.glass);this.box(.96,.045,.025,0,.095,.9,this.paint);
    this.box(.035,.4,.035,0,.28,.9,this.paint);this.box(1.03,.50,.03,0,.22,-.90,this.paint);
    this.seat(.28,.025,.35,true);for(const z of [-.25,-.60])for(const x of [-.3,.3])this.seat(x,0,z,true);
    this.dashboard(.90,.15,.79,.28);this.mirror(-.08,.43,.68,.15,.065);this.lights(.38,.911,-.15);
    this.root.userData.doors=[];
    for(const z of [.38,.64]){const door=this.box(.035,.49,.24,-.515,.16,z,this.glass);door.userData.closedZ=z;this.root.userData.doors.push(door);}
    const label=this.box(.72,.085,.02,0,.415,.91,new THREE.MeshStandardMaterial({color:'#113345',emissive:'#4d8f88',emissiveIntensity:.25}));label.name='Afficheur BUS';
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#113345';c.fillRect(0,0,256,64);c.fillStyle='#fff3ba';c.font='bold 36px sans-serif';c.textAlign='center';c.fillText(`BUS ${String(this.entity.routeNumber||1).padStart(2,'0')}`,128,46);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(.70,.08),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas)}));sign.position.set(0,.415,.922);this.root.add(sign);
  }
  update(dt,servicing){
    this.state.update(this.entity,dt,servicing);
    this.steeringWheel.rotation.z=-this.state.steer*4;this.needle.rotation.z=-(Math.min(120,this.entity.getSpeed()*10)/120*1.5-.75)*Math.PI;
    this.gearLever.rotation.x=this.state.gear%2?.16:-.12;
    for(const wheel of this.wheels){wheel.pivot.rotation.y=wheel.front?this.state.steer:0;wheel.rotor.rotation.x=this.state.spin;}
    for(const light of this.brakeLights)light.emissiveIntensity=this.state.braking?1.5:.15;
    const value=`${Math.round(this.entity.getSpeed()*10)}|${this.state.gear}`;
    if(value!==this.screenValue){this.screenValue=value;const c=this.screenCanvas.getContext('2d');c.fillStyle='#051c27';c.fillRect(0,0,256,128);c.fillStyle='#94f6dd';c.font='bold 45px sans-serif';c.fillText(`${Math.round(this.entity.getSpeed()*10)} km/h`,10,52);c.font='26px sans-serif';c.fillText(`AUTO · ${this.state.gear||'N'}`,12,103);this.screenTexture.needsUpdate=true;}
  }
}
