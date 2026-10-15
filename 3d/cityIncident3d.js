// Sélection d'action et transitions de scène. Aucun déplacement imposé.
class CityIncident3D {
  constructor(world){
    this.world=world;this.city=world.city;this.city.network.obstacles=world.obstacles;this.state='idle';this.elapsed=0;this.duration=30;this.cars=[];this.robbers=[];this.barricades=[];this.diverted=new Map();this.message='Commerces ouverts · H : lancer la scène';
  }
  populate(){
    if(this.world.people.length)return;
    for(const [i,shop] of this.city.shops.entries()){
      const person=new TownPerson3D(shop.forecourt.clone().add(new YUKA.Vector3(1.4,0,0)),shop,i);
      person.waypoints=[shop.forecourt.clone(),shop.door.clone(),shop.inside.clone()];this.world.people.push(person);this.world.register(person);
    }
  }
  navigate(car,target){
    if(!car.navigation){car.navigation=new StreetNavigation3D(car,this.city.network);car.navigation.traffic=this.world.traffic;}
    car.road.circuit=car.safety.circuit=this.city.network;car.navigation.go(target);
    return car.navigation;
  }
  start(){
    if(!['idle','complete'].includes(this.state))return false;
    this.shop=this.city.shops[0];this.cars=[];this.robbers=[];this.barricades=[];this.elapsed=0;
    const robberSpawns=[-1,0,1].map(side=>this.shop.forecourt.clone().add(new YUKA.Vector3(side*.85,0,1)));
    if(robberSpawns.some(point=>!TrafficContacts3D.canSpawn(point,.3,[...this.world.traffic,...this.world.people.filter(person=>person.visible)]))){this.message='Le trottoir est occupé : attends un espace libre pour les personnages.';return false;}
    // Une création refusée laisse la scène intacte : ne jamais superposer les véhicules.
    const created=[];
    try{
      const free=point=>this.city.solids.free(point,.7)&&TrafficContacts3D.canSpawn(point,.7,[...this.world.traffic,...this.world.people])
        &&this.world.obstacles.every(body=>point.distanceTo(body.position)>body.boundingRadius+1.1);
      const parking=[18,16,20,14,22].map(x=>new YUKA.Vector3(x,0,-2.1)).find(free);
      if(!parking){this.message='La rue est occupée : attends un espace libre pour lancer la scène.';return false;}
      created.push(this.world.addVehicle(parking,IncidentCar3D));
      for(let i=0;i<3;i++){
        const point=[6,10,14,2,-4,-8,-12,26,32,36].flatMap(x=>[new YUKA.Vector3(x,0,3),new YUKA.Vector3(x,0,-1.8)]).find(free);
        if(!point)throw new RangeError('Pas de place libre pour les trois voitures de police.');
        created.push(this.world.addVehicle(point,ResponseCar3D));
      }
    }catch(error){for(const car of created)this.remove(car);if(!(error instanceof RangeError))throw error;this.message=error.message;return false;}
    this.cars=created;this.getaway=created[0];
    for(const person of this.world.people.filter(person=>person.shop===this.shop&&!person.robber)){
      person.waypoints=person.position.z<this.shop.door.z?[this.shop.door.clone(),this.shop.forecourt.clone()]:[];
      person.waypoints.push(this.shop.forecourt.clone().add(new YUKA.Vector3(-2,0,0)));person.wait=0;
    }
    // Garer par Arrive, puis préparer l'intervention au premier franchissement de porte.
    this.navigate(this.getaway,this.getaway.position.clone());
    for(const car of created.slice(1))this.navigate(car,car.position.clone());
    for(let i=0;i<3;i++){
      const position=robberSpawns[i];
      const person=new Robber3D(position,this.shop,i);
      person.waypoints=[];person.entered=false;
      this.robbers.push(person);this.world.people.push(person);this.world.register(person);
    }
    this.entering=0;this.exiting=0;
    this.state='approach';this.message='Trois individus approchent de la bijouterie';return true;
  }
  deploy(){
    this.state='robbery';this.elapsed=0;this.city.network.close(7,10);
    this.barricades=[new StreetBarricade3D(4.5),new StreetBarricade3D(24)];
    for(const barrier of this.barricades)this.city.solids.bodies.push(barrier.body);
    this.cars.slice(1).forEach((car,i)=>{const target=new YUKA.Vector3(10+i*4,0,2.4);this.navigate(car,target);
      const approach=new YUKA.Vector3(target.x,0,car.position.x>target.x?-1.3:.3);
      if(Math.abs(car.position.z)<4&&car.position.x>0&&car.position.x<28)car.navigation.points=[approach,target];
      else car.navigation.points.splice(-1,1,approach,target);
    });
    this.message='Intervention : rue fermée · les véhicules font demi-tour';
  }
  divert(car){
    if(!this.diverted.has(car)){
      this.diverted.set(car,{circuit:car.road.circuit,baseSpeed:car.baseSpeed});
      // Rejoindre d'abord le carrefour du côté où l'on se trouve ; le graphe choisit ensuite une rue libre.
      const end=car.position.x<16?10:7;this.navigate(car,this.city.network.nodes[end]);
      car.detouring=true;
    }
    if(car.navigation.arrived){
      const goals=[0,2,3,5,6,8,9,11,12,14];car.detourVisit=(car.detourVisit||0)+1;
      let goal=goals[(car.agentId+car.detourVisit)%goals.length];if(goal===this.city.network.nearest(car.position))goal=goals[(goals.indexOf(goal)+1)%goals.length];
      car.navigation.go(this.city.network.nodes[goal]);
    }
  }
  prepare(dt){
    if(['approach','robbery'].includes(this.state)){
      const person=this.robbers[this.entering];
      if(person&&!person.entered){person.entered=true;person.waypoints=[this.shop.forecourt.clone(),this.shop.door.clone(),this.shop.inside.clone().add(new YUKA.Vector3((this.entering-1)*.85,0,-.15))];}
      if(person&&person.position.z<this.shop.door.z-.7&&person.waypoints.length===0)this.entering++;
    }
    for(const person of this.world.people){person.prepare(dt,!person.robber&&!(this.shop===person.shop&&['approach','robbery','boarding'].includes(this.state)));}
    if(['robbery','boarding'].includes(this.state)){
      for(const car of this.world.traffic)if(!car.incidentRole){
        const crosses=car.detouring||(car.road.circuit.points||[]).some(point=>point.x>4&&point.x<25&&Math.abs(point.z)<4)
          ||(car.position.x>4&&car.position.x<25&&Math.abs(car.position.z)<4);
        if(crosses)this.divert(car);
      }
      for(const barrier of this.barricades){
        if(barrier.active)continue;
        const free=this.world.traffic.every(car=>CitySolids3D.contact(barrier.body,car.position).gap>car.collisionRadius+car.getSpeed()**2/(2*car.maxForce)+.6);
        const parked=this.cars.slice(1).every(car=>car.navigation.arrived);
        const evacuated=this.world.traffic.every(car=>car.incidentRole||car.position.x<3||car.position.x>25||Math.abs(car.position.z)>5);
        if(free&&parked&&evacuated)barrier.active=barrier.body.active=true;
      }
    }
    if(this.state==='chase'){
      this.chaseElapsed+=dt;
      this.cars.slice(1).forEach((car,index)=>{
        if(!this.world.traffic.includes(car))return;
        car.navigation.convoyLeader=this.world.traffic.includes(this.cars[index])?this.cars[index]:null;
        car.navigation.waitForDeparture=this.chaseElapsed<2.5+index*1.5||this.getaway.position.distanceTo(this.departure)<6+index*3;
        // Poursuite anticipée composable, atténuée près des carrefours ; les contacts gardent la distance.
        if(!car.pursuit){car.pursuit=new YUKA.PursuitBehavior(this.getaway,1);car.pursuit.weight=.2;}
      });
    }
  }
  update(dt){
    if(this.state==='approach'&&this.robbers.some(person=>person.position.z<this.shop.door.z-.2))this.deploy();
    else if(this.state==='robbery'){
      this.elapsed+=dt;this.message=`Braquage · ${Math.max(0,Math.ceil(this.duration-this.elapsed))} s · 3 voitures de police`;
      if(this.elapsed+1e-8>=this.duration){
        this.state='boarding';this.elapsed=0;
        this.robbers.forEach(person=>{person.hasBag=true;person.waypoints=[];person.exiting=false;});
        this.message='Les trois individus ressortent et rejoignent leur voiture';
      }
    }else if(this.state==='boarding'){
      const leaving=this.robbers[this.exiting];
      if(leaving&&!leaving.exiting){leaving.exiting=true;leaving.waypoints=[this.shop.door.clone(),this.shop.forecourt.clone(),this.getaway.position.clone().add(new YUKA.Vector3(0,0,-1.2))];}
      for(const person of this.robbers)if(person.exiting&&person.visible&&!person.waypoints.length&&person.getSpeed()<.3){person.visible=false;this.world.manager.remove(person);}
      if(leaving&&!leaving.visible)this.exiting++;
      if(this.robbers.every(person=>!person.visible)){
        this.state='chase';this.city.network.open();for(const barrier of this.barricades)barrier.active=barrier.body.active=false;
        this.chaseElapsed=0;this.departure=this.getaway.position.clone();
        this.restoreTraffic();
        this.cars.forEach((car,index)=>{car.navigation.go(this.city.network.exit);car.baseSpeed=car.maxSpeed=car===this.getaway?7:7.3;if(index){car.navigation.waitForDeparture=true;car.navigation.convoyLeader=this.cars[index-1];}});
        this.message='Poursuite vers la sortie Est · la rue est rouverte';
      }
    }else if(this.state==='chase'){
      for(const car of this.cars)if(this.world.traffic.includes(car)&&car.position.x>107)this.remove(car);
      if(this.cars.every(car=>!this.world.traffic.includes(car))){this.state='complete';this.cleanup();this.message='Poursuite terminée · véhicules sortis de la ville · H pour rejouer';}
    }
  }
  restoreTraffic(){
    for(const [car,saved] of this.diverted){
      const route=car.isBus?saved.circuit:this.city.routes.reduce((best,route)=>route.frameAt(car.position).point.squaredDistanceTo(car.position)<best.frameAt(car.position).point.squaredDistanceTo(car.position)?route:best,saved.circuit);
      car.navigation.active=false;car.road.circuit=car.safety.circuit=route;car.detouring=false;car.baseSpeed=saved.baseSpeed;
      if(!car.isBus){const index=route.frameAt(car.position).index;car.follow.path=route.createPath(index);car.onPath.path=car.follow.path;}
    }
    this.diverted.clear();
  }
  remove(entity){this.world.manager.remove(entity);for(const key of ['traffic','agents','people']){const list=this.world[key],i=list.indexOf(entity);if(i>=0)list.splice(i,1);}}
  cleanup(){for(const person of this.robbers)this.remove(person);for(const barrier of this.barricades){const i=this.city.solids.bodies.indexOf(barrier.body);if(i>=0)this.city.solids.bodies.splice(i,1);}this.barricades=[];this.restoreTraffic();}
}
