class VenueVisitor3D extends YUKA.Vehicle {
  constructor(car){super();this.car=car;this.position.copy(car.position).add(new YUKA.Vector3(-2,0,0));this.maxSpeed=1.4;this.maxForce=5;this.boundingRadius=.28;this.target=this.position.clone();this.arrive=new YUKA.ArriveBehavior(this.target,.5,.12);this.separation=new YUKA.SeparationBehavior();this.separation.weight=2;this.steering.add(this.separation);this.steering.add(this.arrive);this.state='waiting';this.visible=false;this.timer=car.slot*6;}
  go(target){this.target.copy(target);}
}
