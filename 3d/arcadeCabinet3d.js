class ArcadeCabinet3D extends YUKA.Vehicle {
  constructor(mode,x,z){super();this.mode=mode;this.position.set(x,0,z);this.maxSpeed=this.maxForce=0;this.width=.95;this.depth=.9;}
}
