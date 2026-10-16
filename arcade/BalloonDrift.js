class BalloonDrift extends YUKA.SteeringBehavior {
  calculate(balloon,force){return force.set(Math.sin(balloon.time*1.8+balloon.phase)*18,0,-22-balloon.phase).sub(balloon.velocity).multiplyScalar(3);}
}
