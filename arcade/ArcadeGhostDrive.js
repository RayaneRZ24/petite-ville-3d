class ArcadeGhostDrive extends YUKA.SteeringBehavior {
  calculate(car,force){const out=NeuralPolicy.predict(car.network,car.track.rays(car)),heading=Math.atan2(car.velocity.z,car.velocity.x)+(out[0]*2-1)*.16,speed=out[1]*3;return force.set(Math.cos(heading)*speed*60,0,Math.sin(heading)*speed*60).sub(car.velocity).multiplyScalar(60);}
}
