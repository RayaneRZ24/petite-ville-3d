// Contraintes réciproques entre volumes englobants. Ne modifie jamais position
// ou vitesse : seule la force finale est transmise à la locomotion héritée.
class TrafficContacts3D {
  static radius(vehicle){return vehicle.collisionRadius || (vehicle.isBus?1.16:.7);}
  static canSpawn(position,radius,traffic){
    return traffic.every(other=>{
      const margin=radius+this.radius(other)+.2;
      const duration=other.getSpeed()*other.mass/Math.max(1,other.maxForce);
      const movement=other.velocity.clone().multiplyScalar(duration*.5+.2);
      const relative=position.clone().sub(other.position),length=movement.squaredLength();
      const t=length?Math.max(0,Math.min(1,relative.dot(movement)/length)):0;
      return relative.sub(movement.multiplyScalar(t)).length()>=margin;
    });
  }
  velocity(vehicle,force,dt){
    const v=vehicle.velocity.clone().add(force.clone().multiplyScalar(dt/vehicle.mass));
    if(v.length()>vehicle.maxSpeed)v.normalize().multiplyScalar(vehicle.maxSpeed);return v;
  }
  constrain(vehicle,velocity,dt){
    const force=velocity.clone().sub(vehicle.velocity).multiplyScalar(vehicle.mass/dt);
    if(force.length()>vehicle.maxForce)force.normalize().multiplyScalar(vehicle.maxForce);
    return {force,velocity:this.velocity(vehicle,force,dt)};
  }
  staticConstraints(vehicle,dt){
    const constraints=[],radius=TrafficContacts3D.radius(vehicle),braking=vehicle.maxForce/vehicle.mass;
    const add=(normal,gap,horizon=.8)=>{gap=Math.max(0,gap);constraints.push({normal,closing:Math.min(gap/dt,gap/horizon,Math.sqrt(2*braking*gap)*.55)});};
    if(vehicle.road){
      const route=vehicle.road.circuit,frame=route.frameAt(vehicle.position),offset=vehicle.position.clone().sub(frame.point).dot(frame.normal);
      const width=Math.max(route.radius-radius-.15,Math.abs(offset)+.01);
      add(frame.normal.clone().multiplyScalar(-1),width-offset);add(frame.normal.clone(),width+offset);
    }
    for(const obstacle of vehicle.safety?.obstacles||[]){
      const relative=vehicle.position.clone().sub(obstacle.position);relative.y=0;const distance=relative.length();
      if(distance>radius+obstacle.boundingRadius+vehicle.maxSpeed*2+3)continue;
      if(distance>1e-8)add(relative.divideScalar(distance),distance-radius-obstacle.boundingRadius-.12);
    }
    for(const body of vehicle.solidBodies||[]){
      if(!CitySolids3D.applies(body,vehicle))continue;
      // Éliminer le décor lointain avant de calculer le point le plus proche.
      const extent=body.radius??Math.hypot(body.hx,body.hz);
      if(vehicle.position.squaredDistanceTo(body.position)>(extent+radius+vehicle.maxSpeed*1.5+1)**2)continue;
      const contact=CitySolids3D.contact(body,vehicle.position);
      add(contact.normal,contact.gap-radius-.06,.55);
    }
    return constraints;
  }
  prepare(traffic,dt,mission=null){
    if(!Number.isFinite(dt)||dt<=0)return;
    const plans=traffic.map(vehicle=>{
      const force=vehicle.steering.plan(dt);
      const held=mission?.bus===vehicle&&vehicle.service.active&&vehicle.getSpeed()<.35&&vehicle.position.distanceTo(vehicle.service.target)<1.5;
      return {vehicle,force,velocity:this.velocity(vehicle,force,dt),held,constraints:this.staticConstraints(vehicle,dt)};
    });
    const pairs=[];
    for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++){
      const a=plans[i],b=plans[j],relative=a.vehicle.position.clone().sub(b.vehicle.position);relative.y=0;
      const distance=relative.length(),radius=TrafficContacts3D.radius(a.vehicle)+TrafficContacts3D.radius(b.vehicle)+.12;
      if(distance>radius+Math.max(a.vehicle.maxSpeed,b.vehicle.maxSpeed)*2+3)continue;
      const normal=distance>1e-8?relative.divideScalar(distance):new YUKA.Vector3(i<j?-1:1,0,0);
      const gap=Math.max(0,distance-radius);
      const braking=a.vehicle.maxForce/a.vehicle.mass+b.vehicle.maxForce/b.vehicle.mass;
      const closing=Math.min(gap/dt,gap/.8,Math.sqrt(2*braking*gap)*.55);
      pairs.push({a,b,normal,closing});
    }
    // Projection bornée des vitesses souhaitées dans les demi-plans de contact.
    for(let iteration=0;iteration<24;iteration++){
      let violation=0;
      for(const {a,b,normal,closing} of pairs){
        const relative=a.velocity.clone().sub(b.velocity).dot(normal),missing=-closing-relative;
        if(missing<=1e-8)continue;violation=Math.max(violation,missing);
        const wa=a.held?0:1,wb=b.held?0:1,total=wa+wb;if(!total)continue;
        if(wa){const result=this.constrain(a.vehicle,a.velocity.clone().add(normal.clone().multiplyScalar(missing*wa/total)),dt);a.force=result.force;a.velocity=result.velocity;}
        if(wb){const result=this.constrain(b.vehicle,b.velocity.clone().sub(normal.clone().multiplyScalar(missing*wb/total)),dt);b.force=result.force;b.velocity=result.velocity;}
      }
      for(const plan of plans)for(const {normal,closing} of plan.constraints){
        const missing=-closing-plan.velocity.dot(normal);if(missing<=1e-8)continue;violation=Math.max(violation,missing);
        const result=this.constrain(plan.vehicle,plan.velocity.clone().add(normal.clone().multiplyScalar(missing)),dt);plan.force=result.force;plan.velocity=result.velocity;
      }
      if(violation<1e-7)break;
    }
    for(const plan of plans)plan.vehicle.steering.commit(plan.force);
  }
}
