// Entité statique : site d'entraînement à côté des quartiers existants.
class LearningCircuit3D extends YUKA.Vehicle {
  constructor(){super();this.position.set(0,0,-78);this.maxSpeed=0;this.maxForce=0;this.scale=.055;this.boundingRadius=35;}
  contains(x,z){return Math.abs(x-this.position.x)<=35&&Math.abs(z-this.position.z)<=24;}
}
