class BusStop3D extends YUKA.Vehicle {
  constructor(name,index,route,waiting) {
    super();this.maxSpeed=this.maxForce=0;this.name=name;this.index=index;this.waiting=waiting;
    const spawn=route.spawn(index),frame=route.frameAt(spawn.point);
    this.position.copy(spawn.point).add(frame.normal.clone().multiplyScalar(-2));
    this.platform=spawn.point.clone().add(frame.normal.clone().multiplyScalar(-5.8));
    this.direction=spawn.direction;this.lookAt(this.position.clone().add(this.direction));
  }
}
