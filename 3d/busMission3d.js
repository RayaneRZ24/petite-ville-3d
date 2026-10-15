// Règles de mission séparées du steering et du rendu. Temps fourni par World3D.
class BusMission3D {
  constructor(world,city) {this.world=world;this.city=city;this.state='idle';this.bus=null;this.score=100;this.delivered=0;this.onboard=0;this.capacity=12;this.visits=0;this.dwell=0;this.cooldown=0;this.message='M : démarrer une tournée · Espace : ouvrir les portes à l’arrêt';}
  start(bus) {
    if(!bus?.isBus)return false;
    if(this.bus){this.bus.service.active=false;this.bus.setWeights(this.world.weights.follow,this.world.weights.separation,this.world.weights.wander);}
    this.bus=bus;this.state='driving';this.score=100;this.delivered=this.onboard=this.visits=this.dwell=0;this.cooldown=0;
    for(const stop of this.city.stops)stop.waiting=this.city.passengers.filter(p=>p.stop===stop).length;
    const frame=this.city.route.frameAt(bus.position),count=this.city.route.points.length;
    this.stopIndex=this.city.stops.reduce((best,stop,i)=>((stop.index-frame.index+count)%count)<((this.city.stops[best].index-frame.index+count)%count)?i:best,0);
    this.previousSpeed=bus.getSpeed();this.message='Rejoins '+this.stop.name+' · Espace quand le bus est arrêté';return true;
  }
  get stop(){return this.city.stops[this.stopIndex];}
  openDoors() {
    if(this.state!=='driving')return false;
    if(this.bus.detouring){this.message='Rue fermée : déviation avant de reprendre la tournée.';return false;}
    if(this.bus.position.distanceTo(this.stop.position)>1.5||this.bus.getSpeed()>.35){this.message='Pour ouvrir : approche de l’arrêt et attends le freinage du bus.';return false;}
    this.state='boarding';this.dwell=0;this.message='Portes ouvertes · embarquement en cours…';return true;
  }
  prepare(dt) {
    if(!this.bus||!['driving','boarding'].includes(this.state))return;
    if(this.bus.detouring){this.bus.service.active=false;return;}
    const b=this.bus,distance=b.position.distanceTo(this.stop.position),frame=b.road.circuit.frameAt(b.position);
    b.service.active=this.state==='boarding'||(distance<16&&this.stop.position.clone().sub(b.position).dot(frame.direction)>-2);
    b.service.target.copy(this.stop.position);
    if(b.service.active){b.overtake.leader=null;b.overtake.weight=0;b.follow.weight=b.onPath.weight=b.wander.weight=0;b.separation.weight=0;b.maxSpeed=Math.min(b.maxSpeed,b.baseSpeed);}
    else b.setWeights(this.world.weights.follow,this.world.weights.separation,this.world.weights.wander);
    this.cooldown=Math.max(0,this.cooldown-dt);
  }
  update(dt) {
    if(!Number.isFinite(dt)||dt<=0||!this.bus||!['driving','boarding'].includes(this.state))return;
    if(this.bus.detouring){this.previousSpeed=this.bus.getSpeed();return;}
    const speed=this.bus.getSpeed(),braking=(this.previousSpeed-speed)/dt;
    if(braking>8&&this.cooldown===0){this.score=Math.max(0,this.score-2);this.cooldown=1;}
    this.previousSpeed=speed;
    if(this.state==='boarding'){
      if(this.bus.position.distanceTo(this.stop.position)>1.7||speed>.5){this.state='driving';this.dwell=0;this.message='Service interrompu : immobilise le bus à l’arrêt.';return;}
      this.dwell+=dt;if(this.dwell<3)return;
      const leaving=this.onboard;this.delivered+=leaving;this.score+=leaving*20+10;this.onboard=0;
      if(this.visits<4){this.onboard=Math.min(this.capacity,this.stop.waiting);this.stop.waiting-=this.onboard;}
      this.visits++;
      if(this.visits>=5){this.state='complete';this.bus.service.active=false;this.bus.setWeights(this.world.weights.follow,this.world.weights.separation,this.world.weights.wander);this.message=`Tournée réussie : ${this.delivered} passagers livrés ! M pour rejouer.`;}
      else{this.stopIndex=(this.stopIndex+1)%this.city.stops.length;this.state='driving';this.message='Prochain arrêt : '+this.stop.name;}
    }
  }
}
