// Rendu des arbres, lampadaires et manèges statiques ; seules les pièces visuelles s'animent.
class CityLifeView3D {
  constructor(view,city){
    this.time=0;this.view=view;this.city=city;this.group=new THREE.Group();this.foliage=[];this.cabins=[];view.scene.add(this.group);
    this.brown=new THREE.MeshStandardMaterial({color:'#77533d',roughness:1});
    this.green=new THREE.MeshStandardMaterial({color:'#398253',roughness:1});
    this.metal=new THREE.MeshStandardMaterial({color:'#385567',metalness:.5,roughness:.45});
    this.gold=new THREE.MeshStandardMaterial({color:'#fff0a7',emissive:'#ffcf66',emissiveIntensity:.7});
    for(const tree of city.trees)this.addTree(tree);
    for(const lamp of city.lamps)this.addLamp(lamp);
    this.addFairground(city.fairground);
  }
  addTree(entity){
    const group=new THREE.Group(),trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,1.6,8),this.brown);trunk.position.y=.8;group.add(trunk);
    const crown=new THREE.Group();crown.position.y=1.7;
    for(const [x,y,z,s] of [[0,.7,0,1],[.55,.3,.1,.75],[-.5,.2,-.1,.8]]){const leaf=new THREE.Mesh(new THREE.SphereGeometry(s,10,8),this.green);leaf.position.set(x,y,z);leaf.castShadow=true;crown.add(leaf);}
    group.add(crown);group.scale.setScalar(entity.size);group.position.copy(entity.position);this.group.add(group);this.foliage.push(crown);
  }
  addLamp(entity){
    const group=new THREE.Group(),pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,3.5,8),this.metal);pole.position.y=1.75;group.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,1),this.metal);arm.position.set(0,3.5,.45);group.add(arm);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.35,.09,.55),this.gold);lamp.position.set(0,3.45,.85);group.add(lamp);
    group.position.copy(entity.position);group.quaternion.copy(entity.rotation);this.group.add(group);
  }
  addFairground(entity){
    const park=new THREE.Group();park.position.copy(entity.position);this.group.add(park);
    const floor=new THREE.Mesh(new THREE.BoxGeometry(24,.2,14),new THREE.MeshStandardMaterial({color:'#dcbfa1',roughness:1}));floor.position.y=.1;floor.receiveShadow=true;park.add(floor);
    const sign=this.view.cityView.label('FÊTE FORAINE',7,'#fff7bc','#c94069');sign.position.set(0,2,7);park.add(sign);
    this.wheel=new THREE.Group();this.wheel.position.set(-5,6,0);park.add(this.wheel);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(4,.13,8,48),new THREE.MeshStandardMaterial({color:'#f9f0d9',metalness:.3}));this.wheel.add(rim);
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6,spoke=new THREE.Mesh(new THREE.BoxGeometry(.055,8,.06),this.gold);spoke.rotation.z=angle;this.wheel.add(spoke);
      const cabin=new THREE.Group(),box=new THREE.Mesh(new THREE.BoxGeometry(.9,.65,.7),new THREE.MeshStandardMaterial({color:['#eb608b','#5bbfe0','#ffcb56'][i%3]}));box.position.y=-.4;cabin.add(box);
      cabin.position.set(Math.sin(angle)*4,Math.cos(angle)*4,0);this.wheel.add(cabin);this.cabins.push(cabin);
    }
    for(const x of [-7,-3]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.18,6,.25),this.metal);leg.position.set(x,3,.4);leg.rotation.z=x===-7?-.3:.3;park.add(leg);}
    this.carousel=new THREE.Group();this.carousel.position.set(5,0,0);park.add(this.carousel);
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(3,3,.2,32),new THREE.MeshStandardMaterial({color:'#6bb9bf'}));deck.position.y=.35;this.carousel.add(deck);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(3.3,1.4,12),new THREE.MeshStandardMaterial({color:'#dd4f7b'}));roof.position.y=3.1;this.carousel.add(roof);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.6,6),this.gold);pole.position.set(Math.sin(a)*2,1.6,Math.cos(a)*2);this.carousel.add(pole);const seat=new THREE.Mesh(new THREE.BoxGeometry(.55,.35,.8),new THREE.MeshStandardMaterial({color:i%2?'#ffd969':'#f4eee0'}));seat.position.set(pole.position.x,1,pole.position.z);this.carousel.add(seat);}
    for(const x of [-8,0,8]){const stall=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.3,1.8),new THREE.MeshStandardMaterial({color:x===0?'#e99d58':'#83b7d7'}));stall.position.set(x,.85,-5);park.add(stall);const roof=new THREE.Mesh(new THREE.ConeGeometry(2,1,4),new THREE.MeshStandardMaterial({color:'#d34c6e'}));roof.rotation.y=Math.PI/4;roof.position.set(x,2,-5);park.add(roof);}
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;this.time+=Math.min(dt,.1);
    this.wheel.rotation.z=this.time*.15;for(const cabin of this.cabins)cabin.rotation.z=-this.wheel.rotation.z;
    this.carousel.rotation.y=this.time*.3;
    this.foliage.forEach((crown,i)=>{crown.rotation.z=Math.sin(this.time*.7+i)*.015;});
  }
}
