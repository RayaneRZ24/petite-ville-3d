class ArcadeDrive extends YUKA.SteeringBehavior {
  calculate(car,force,dt){
    const speed=car.getSpeed();car.heading+=(car.input.right-car.input.left)*1.9*dt*Math.min(1,speed/55);
    const targetSpeed=car.input.brake?0:car.input.throttle?180:Math.max(0,speed-35*dt),desired=new YUKA.Vector3(Math.cos(car.heading)*targetSpeed,0,Math.sin(car.heading)*targetSpeed);
    return force.copy(desired).sub(car.velocity).divideScalar(.16);
  }
}
