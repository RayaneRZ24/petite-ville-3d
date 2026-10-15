class StreetBarricade3D extends YUKA.Vehicle {
  constructor(x){super();this.position.set(x,0,0);this.maxSpeed=this.maxForce=0;this.boundingRadius=4.2;this.active=false;
    this.body={owner:this,position:this.position,hx:.18,hz:4.2,direction:new YUKA.Vector3(0,0,1),active:false};}
}
