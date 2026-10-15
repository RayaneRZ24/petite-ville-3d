class Tree3D extends YUKA.Vehicle {
  constructor(x,z,size=1){super();this.position.set(x,0,z);this.size=size;this.maxSpeed=this.maxForce=0;}
}
