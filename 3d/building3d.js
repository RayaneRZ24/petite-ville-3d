class Building3D extends YUKA.Vehicle {
  constructor(x,z,width,depth,height,color,label) {
    super();this.position.set(x,0,z);this.maxSpeed=this.maxForce=0;
    Object.assign(this,{width,depth,height,color,label});
  }
}
