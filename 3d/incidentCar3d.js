class IncidentCar3D extends TrafficVehicle3D {
  constructor(spawn,path,speed,obstacles,circuit){super(spawn,path,speed,obstacles,circuit);this.incidentRole='getaway';this.baseSpeed=this.maxSpeed=6;}
}
