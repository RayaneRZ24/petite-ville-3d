class VenueProp3D extends YUKA.Vehicle {
  constructor(kind,x,z,width=3,depth=2){super();this.kind=kind;this.position.set(x,0,z);this.width=width;this.depth=depth;this.maxSpeed=this.maxForce=0;}
}
