class VenueCar3D extends YUKA.Vehicle {
  constructor(slot,origin){super();this.slot=slot;this.position.set(origin.x+51,0,origin.z+18-slot*5);this.home=this.position.clone();this.maxSpeed=3;this.maxForce=7;this.boundingRadius=1.5;this.state='parked';this.color=['#f3be62','#69bcca','#cf7180','#e6e8df'][slot];this.target=this.position.clone();this.arrive=new YUKA.ArriveBehavior(this.target,1,.15);this.steering.add(this.arrive);}
  go(target){this.target.copy(target);}
}
