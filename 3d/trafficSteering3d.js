// Mémorise une force planifiée pour la locomotion Yuka, sans la recalculer après
// le déplacement d'un autre véhicule dans EntityManager.update().
class TrafficSteering3D extends YUKA.SteeringManager {
  constructor(vehicle){super(vehicle);this.planned=new YUKA.Vector3();this.ready=false;}
  plan(dt){this.ready=false;return super.calculate(dt,new YUKA.Vector3());}
  commit(force){this.planned.copy(force);this.ready=true;}
  calculate(dt,result){
    if(!this.ready)return super.calculate(dt,result);
    this.ready=false;this._steeringForce.copy(this.planned);return result.copy(this.planned);
  }
}
