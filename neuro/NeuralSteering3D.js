// Seul pilote des voitures apprenantes. Aucun FollowPath, Seek ou maintien sur route.
class NeuralSteering3D extends YUKA.SteeringBehavior {
  calculate(car,force){
    car.outputs=car.brain.predict(car.look(car.sensingWalls));
    const turn=(car.outputs[0]*2-1)*.16,thrust=car.outputs[1]*car.config.speed;
    const desired=LabVector2.fromAngle(car.vel.heading()+turn).setMag(car.frameCount<15?Math.max(.8,thrust):thrust);
    const steering=LabVector2.sub(desired,car.vel).limit(car.config.acceleration);
    // 9b exprime vitesse et accélération par pas ; Yuka les exprime par seconde.
    force.set(steering.x*3600,0,steering.y*3600);
    return force;
  }
}
