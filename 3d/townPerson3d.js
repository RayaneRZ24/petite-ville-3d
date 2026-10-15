class TownPerson3D extends YUKA.Vehicle {
  constructor(position,shop,index=0){
    super();this.position.copy(position);this.shop=shop;this.isPerson=true;this.personIndex=index;this.maxSpeed=1.25;this.maxForce=8;this.collisionRadius=this.boundingRadius=.3;
    this.neighborhoodRadius=1.3;this.neighbors=[];this.steering=new TrafficSteering3D(this);
    this.target=position.clone();this.arrive=new YUKA.ArriveBehavior(this.target,.35,.04);this.arrive.weight=4;
    this.separation=new LocalSeparation3D();this.separation.weight=.08;this.steering.add(new WeightedSteering3D([this.arrive,this.separation]));
    this.phase='enter';this.waypoints=[shop.forecourt.clone(),shop.door.clone(),shop.inside.clone()];this.wait=0;this.hasBag=false;this.visible=true;this.robber=false;
  }
  prepare(dt,shopping=true){
    if(!this.visible)return;
    if(this.waypoints.length){this.target.copy(this.waypoints[0]);if(this.position.distanceTo(this.target)<.18&&this.getSpeed()<.5)this.waypoints.shift();return;}
    this.target.copy(this.position);this.wait+=dt;
    if(!shopping)return;
    if(this.phase==='enter'&&this.wait>=3){this.hasBag=true;this.phase='leave';this.wait=0;this.waypoints=[this.shop.door.clone(),this.shop.forecourt.clone(),this.shop.forecourt.clone().add(new YUKA.Vector3(2,0,.1))];}
    else if(this.phase==='leave'&&this.wait>=5){this.phase='enter';this.wait=0;this.hasBag=false;this.waypoints=[this.shop.forecourt.clone(),this.shop.door.clone(),this.shop.inside.clone().add(new YUKA.Vector3((this.personIndex%2?1:-1)*.7,0,-.1))];}
  }
}
