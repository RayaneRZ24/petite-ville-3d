class Boundary extends YUKA.Vehicle {
  constructor(x1,y1,x2,y2,type='wall'){
    super();this.position.set(x1,0,y1);this.a=createVector(x1,y1);this.b=createVector(x2,y2);this.type=type;this.maxSpeed=0;this.maxForce=0;
  }
}
