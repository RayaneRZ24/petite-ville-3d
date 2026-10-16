// Une seule voiture quitte sa place à la fois ; les trajets passent par l'allée.
class VenueLife3D {
  constructor(world,view,portal){
    this.world=world;this.view=view;this.portal=portal;this.origin=portal.entity.position;this.cars=Array.from({length:4},(_,i)=>new VenueCar3D(i,this.origin));this.visitors=this.cars.map(car=>new VenueVisitor3D(car));this.time=0;this.accumulator=0;this.activeCar=null;this.models=new Map();
    const bodies=world.city.solids.bodies;for(const prop of portal.venue.props)bodies.push({owner:prop,position:prop.position.clone(),hx:prop.width/2,hz:prop.depth/2,direction:prop.getDirection(new YUKA.Vector3())});
    for(const car of this.cars){bodies.push({owner:car,position:car.position,radius:car.boundingRadius});this.carModel(car);}
    for(const person of this.visitors){bodies.push({owner:person,position:person.position,radius:.28,get active(){return person.visible;}});this.personModel(person);}
    this.sync();
  }
  point(x,z){return new YUKA.Vector3(this.origin.x+x,0,this.origin.z+z);}
  carModel(car){
    const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color:car.color,roughness:.4});
    const box=(w,h,d,x,y,z,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);group.add(m);};
    box(1.45,.55,2.8,0,.62,0,paint);box(1.2,.45,1.3,0,1.05,0,new THREE.MeshStandardMaterial({color:'#294355'}));
    const door=new THREE.Mesh(new THREE.BoxGeometry(.05,.4,.8),paint);door.position.set(-.74,.72,.25);group.add(door);group.userData.door=door;
    for(const x of [-.72,.72])for(const z of [-.85,.85]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.18,10),new THREE.MeshStandardMaterial({color:'#172027'}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.3,z);group.add(wheel);}
    this.view.scene.add(group);this.models.set(car,group);
  }
  personModel(person){const group=new THREE.Group();for(const [geometry,color,y] of [[new THREE.BoxGeometry(.3,.5,.22),person.car.color,.6],[new THREE.SphereGeometry(.16,8,6),'#d4a685',1.02]]){const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color}));mesh.position.y=y;group.add(mesh);}group.userData.legs=[];for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.11,.35,.13),new THREE.MeshStandardMaterial({color:'#263843'}));leg.position.set(side*.09,.17,0);group.add(leg);group.userData.legs.push(leg);}this.view.scene.add(group);this.models.set(person,group);}
  update(elapsed){if(!Number.isFinite(elapsed)||elapsed<=0)return;this.accumulator+=Math.min(.1,elapsed);while(this.accumulator>=1/60){this.step(1/60);this.accumulator-=1/60;}this.sync();}
  step(dt){
    this.time+=dt;
    for(const person of this.visitors){
      person.neighbors=this.visitors.filter(other=>other!==person&&other.visible&&person.position.distanceTo(other.position)<1.5);
      person.timer-=dt;
      if(person.state==='waiting'&&person.timer<=0){person.state='walking';person.walkStarted=this.time;person.visible=true;person.route=[this.point(45,18-person.car.slot*5),this.point(41,2),this.point(33,2)];person.go(person.route.shift());}
      if(person.state==='watching'&&person.timer<=0&&!this.activeCar){person.visible=true;person.state='returning';person.route=[this.point(41,-2),this.point(45,18-person.car.slot*5),person.car.home.clone().add(new YUKA.Vector3(-2,0,0))];person.go(person.route.shift());this.activeCar=person.car;}
      if(['walking','returning'].includes(person.state)){
        person.update(dt);
        if(person.position.distanceTo(person.target)<.3&&person.getSpeed()<.35){
          if(person.route.length)person.go(person.route.shift());
          else if(person.state==='walking'){person.state='watching';person.visible=false;person.timer=14+person.car.slot*3;}
          else{person.visible=false;person.state='riding';const car=person.car;car.state='departing';car.route=[this.point(62,18-car.slot*5),this.point(68,29),this.point(82,29)];car.go(car.route.shift());}
        }
      }
    }
    const car=this.activeCar;
    if(car&&['departing','arriving'].includes(car.state)){
      car.update(dt);
      if(car.position.distanceTo(car.target)<.35&&car.getSpeed()<.4){
        if(car.route.length)car.go(car.route.shift());
        else if(car.state==='departing'){car.state='away';car.away=2;this.models.get(car).visible=false;}
        else{car.state='parked';const person=this.visitors[car.slot];person.position.copy(car.home).add(new YUKA.Vector3(-2,0,0));person.velocity.set(0,0,0);person.state='waiting';person.timer=3;this.activeCar=null;}
      }
    }else if(car?.state==='away'){
      car.away-=dt;if(car.away<=0){car.position.copy(this.point(82,-17));car.velocity.set(0,0,0);car.state='arriving';car.route=[this.point(66,-17),this.point(62,18-car.slot*5),car.home.clone()];car.go(car.route.shift());this.models.get(car).visible=true;}
    }
  }
  sync(){for(const [entity,model] of this.models){model.position.copy(entity.position);model.quaternion.copy(entity.rotation);if(entity instanceof VenueVisitor3D){model.visible=entity.visible;model.userData.legs?.forEach((leg,i)=>leg.rotation.x=Math.sin(this.time*8+i*Math.PI)*Math.min(.4,entity.getSpeed()*.3));}else if(model.userData.door){const age=this.time-(this.visitors[entity.slot].walkStarted??-100);model.userData.door.rotation.y=age<2?-.8*Math.sin(Math.PI*Math.max(0,age)/2):0;}}}
}
