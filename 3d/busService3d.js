// Priorité Arrive : le bus freine vers l'arrêt sans écrire position ou vitesse.
class BusService3D extends YUKA.SteeringBehavior {
  constructor() {super();this.active=false;this.target=new YUKA.Vector3();this.arrive=new YUKA.ArriveBehavior(this.target,1.2,.15);this.weight=3;}
  calculate(vehicle,force) {
    this.arrive.calculate(vehicle,force);
    force.multiplyScalar(5);
    if(force.length()>vehicle.maxForce)force.normalize().multiplyScalar(vehicle.maxForce);
    return force;
  }
}
