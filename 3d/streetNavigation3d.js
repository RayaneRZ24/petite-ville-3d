class StreetNavigation3D extends YUKA.SteeringBehavior {
  constructor(vehicle,network){super();this.vehicle=vehicle;this.network=network;this.points=[];this.target=new YUKA.Vector3();this.arrive=new YUKA.ArriveBehavior(this.target,.35,.08);this.active=false;this.arrived=false;this.reversing=false;}
  go(target){
    if(this.vehicle.position.distanceTo(target)<.3){this.points=[target.clone()];this.active=true;this.arrived=false;return true;}
    const start=this.network.nearest(this.vehicle.position),end=this.network.nearest(target),indices=this.network.route(start,end);
    if(!indices.length){this.points=[];this.arrived=false;this.active=true;this.target.copy(this.vehicle.position);return false;}
    this.points=indices.map(i=>this.network.nodes[i].clone());this.previous=this.vehicle.position.clone();
    if(this.vehicle.position.distanceTo(this.points[0])<2)this.points.shift();
    this.points.push(target.clone());this.active=true;this.arrived=false;return true;
  }
  calculate(vehicle,force){
    if(this.waitForDeparture){force.copy(vehicle.velocity).multiplyScalar(-5);if(force.length()>vehicle.maxForce)force.normalize().multiplyScalar(vehicle.maxForce);return force;}
    while(this.points.length>1&&vehicle.position.distanceTo(this.points[0])<1.65)this.previous=this.points.shift();
    this.target.copy(this.points[0]||vehicle.position);this.arrived=this.points.length<=1&&vehicle.position.distanceTo(this.target)<.25&&vehicle.getSpeed()<.3;
    if(this.points.length>1){
      const origin=this.previous||vehicle.position,direction=this.target.clone().sub(origin),length=direction.length();direction.divideScalar(Math.max(length,1e-8));
      const normal=new YUKA.Vector3(direction.z,0,-direction.x);
      const blockers=[...(this.traffic||[]).filter(other=>other!==vehicle),...(this.network.obstacles||[])].filter(other=>{
        const ahead=other.position.clone().sub(vehicle.position).dot(direction);return ahead>-.5&&ahead<8;});
      const score=lane=>blockers.reduce((sum,other)=>{
        const offset=other.position.clone().sub(origin).dot(normal),gap=Math.abs(offset-lane)-(other.collisionRadius||other.boundingRadius)-vehicle.collisionRadius-.22;
        return sum+Math.max(0,-gap)*20;
      },Math.abs(lane-1.2)*.08+Math.abs(lane-(this.lane??1.2))*.03);
      this.lane=[1.2,0,-1.2,-2.5,2.5].sort((a,b)=>score(a)-score(b))[0];
      const along=Math.max(0,vehicle.position.clone().sub(origin).dot(direction));
      this.target.copy(origin).add(direction.multiplyScalar(Math.min(length,along+5))).add(normal.multiplyScalar(this.lane));
    }
    const delta=this.target.clone().sub(vehicle.position);this.reversing=vehicle.velocity.dot(delta)<-.1;
    this.arrive.deceleration=this.points.length>1?.12:.4;this.arrive.calculate(vehicle,force);force.multiplyScalar(4);
    const leader=this.convoyLeader,distance=leader?vehicle.position.distanceTo(leader.position):Infinity;
    if(leader&&distance<8){const speed=Math.min(vehicle.maxSpeed,Math.max(0,leader.getSpeed()+(distance-4)*1.2));force.copy(this.target.clone().sub(vehicle.position).normalize().multiplyScalar(speed).sub(vehicle.velocity)).multiplyScalar(4);}
    if(vehicle.pursuit&&vehicle.position.x>60&&distance>5){const pursuit=new YUKA.Vector3();vehicle.pursuit.calculate(vehicle,pursuit);force.add(pursuit.multiplyScalar(.2));}
    if(force.length()>vehicle.maxForce)force.normalize().multiplyScalar(vehicle.maxForce);return force;
  }
}
