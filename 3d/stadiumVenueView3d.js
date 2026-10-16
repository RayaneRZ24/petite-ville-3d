// Un modèle de stade réutilisé dans la ville et dans le laboratoire.
class StadiumVenueView3D {
  constructor(scene,entity,options={}){
    this.entity=entity;this.group=new THREE.Group();this.group.position.copy(entity.position);scene.add(this.group);this.props=[];
    const colors={concrete:'#abbec3',dark:'#183842',mint:'#79eac1',seat:'#159994',gold:'#ffcd68',white:'#edf3ec'};
    this.materials=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.8})]));
    const box=(w,h,d,x,y,z,material=this.materials.concrete,angle=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.rotation.y=angle;m.castShadow=m.receiveShadow=true;this.group.add(m);return m;};this.box=box;
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.15,80),this.materials.concrete);floor.scale.set(39,1,28);floor.position.y=-.12;this.group.add(floor);
    for(let i=0;i<24;i++){
      if(i%6===0)continue;const a=i*Math.PI/12,x=Math.cos(a)*35.8,z=Math.sin(a)*24.3,angle=-Math.atan2(-35.8*Math.sin(a),24.3*Math.cos(a));
      const prop=new VenueProp3D('grandstand',entity.position.x+x,entity.position.z+z,7,5);prop.lookAt(prop.position.clone().add(new YUKA.Vector3(Math.sin(angle),0,Math.cos(angle))));this.props.push(prop);
      for(let tier=0;tier<4;tier++){const offset=tier*.9;box(6.8,.8,1.3,x+Math.cos(a)*offset,.4+tier*.7,z+Math.sin(a)*offset,this.materials.concrete,angle);box(6.4,.12,.85,x+Math.cos(a)*offset,.87+tier*.7,z+Math.sin(a)*offset,this.materials.seat,angle);}
      if(i%2){const roof=box(7.5,.14,5.6,x+Math.cos(a)*1.2,5,z+Math.sin(a)*1.2,this.materials.dark,angle);for(const side of [-1,1])box(.13,5,.13,x+side*2.5,2.5,z+Math.sin(a)*3,this.materials.dark);}
    }
    const spectators=new THREE.InstancedMesh(new THREE.SphereGeometry(.19,6,5),new THREE.MeshStandardMaterial({color:'#ffffff'}),180);const marker=new THREE.Object3D(),color=new THREE.Color();let n=0;
    for(let i=0;i<24;i++){if(i%6===0)continue;const a=i*Math.PI/12;for(let row=0;row<3;row++)for(let seat=0;seat<3;seat++){const t=a+(seat-1)*.045;marker.position.set(Math.cos(t)*(35.8+row*.9),1.35+row*.7,Math.sin(t)*(24.3+row*.9));marker.scale.set(1,1.5,1);marker.updateMatrix();spectators.setMatrixAt(n,marker.matrix);color.set(['#ffcf6f','#e9f3ee','#65bcd4','#e68d9e'][(i+row+seat)%4]);spectators.setColorAt(n++,color);}}
    spectators.count=n;spectators.instanceMatrix.needsUpdate=true;this.group.add(spectators);
    for(const [x,z,label] of [[38,0,'PORTE EST'],[-38,0,'PORTE OUEST'],[0,27,'PORTE FÊTE FORAINE']]){
      const angle=x?Math.PI/2:0;box(5,.7,.5,x,3.5,z,this.materials.dark,angle);for(const side of [-1,1])box(.25,3.5,.3,x+(x?0:side*2.4),1.7,z+(x?side*2.4:0),this.materials.dark);const sign=this.sign(label,5,x+(x?.3:0),3.6,z+(x?0:.3));sign.rotation.y=angle;
    }
    for(const [i,x] of [-12,-5,5,12].entries()){
      box(4,2.1,2.6,x,1.05,31,this.materials.dark);const roof=box(4.5,.22,3.2,x,2.2,31,i%2?this.materials.mint:this.materials.gold);this.sign(['PIZZA','CAFÉ','BURGERS','GLACES'][i],3.6,x,1.5,32.35);this.props.push(new VenueProp3D('food',entity.position.x+x,entity.position.z+31,4,2.6));
    }
    for(const x of [-40,40])for(const z of [-24,24]){box(.22,10,.22,x,5,z,this.materials.dark);box(3,.6,.8,x,10,z,this.materials.white);}
    box(13,4,.7,0,6,-27,this.materials.dark);this.sign('NEURO ARENA · 3 TOURS',12,0,6,-26.6);
    if(options.parking!==false){
      box(22,.12,32,54,0,4,this.materials.dark);
      for(let i=0;i<5;i++){box(7,.02,.1,51,.08,18-i*5,this.materials.white);this.sign('P',1,58,.12,16-i*5,-Math.PI/2);}
      for(const x of [43,65])box(.14,.05,31,x,.12,4,this.materials.white);
      const path=box(4,.04,34,41,.02,10,this.materials.concrete);this.sign('PARKING VISITEURS',10,54,3,22);
    }
  }
  sign(text,width,x,y,z,rotation=0){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#14353e';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#fff3c9';ctx.font='bold 65px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,88);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.x=rotation;this.group.add(mesh);return mesh;
  }
}
