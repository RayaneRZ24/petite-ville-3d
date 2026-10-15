class StreetLamp3D extends YUKA.Vehicle {
  constructor(x,z,direction){super();this.position.set(x,0,z);this.maxSpeed=this.maxForce=0;this.lookAt(this.position.clone().add(direction));}
}
