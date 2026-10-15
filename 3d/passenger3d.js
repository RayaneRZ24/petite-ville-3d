class Passenger3D extends YUKA.Vehicle {
  constructor(stop,index,color) {
    super();this.stop=stop;this.color=color;this.queueIndex=index;this.maxSpeed=this.maxForce=0;
    this.position.copy(stop.platform).add(stop.direction.clone().multiplyScalar((index-1)*.65));
    this.lookAt(this.position.clone().add(stop.direction));
  }
}
