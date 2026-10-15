// Empreintes du décor, séparées des meshes et des forces de locomotion.
class CitySolids3D {
  constructor(city) {
    this.bodies=[];
    const box=(owner,position,hx,hz,direction=new YUKA.Vector3(0,0,1),extra={})=>
      this.bodies.push({owner,position:position.clone(),hx,hz,direction:direction.clone(),...extra});
    for(const building of city.buildings){
      box(building,building.position,building.width/2+.1,building.depth/2+.1,undefined,{vehiclesOnly:!!building.isShop});
      if(building.isShop){
        for(const side of [-1,1]){
          box(building,building.position.clone().add(new YUKA.Vector3(side*(building.width/4+.35),0,building.depth/2)),building.width/4-.35,.1,undefined,{peopleOnly:true});
          box(building,building.position.clone().add(new YUKA.Vector3(side*building.width/2,0,0)),.1,building.depth/2,undefined,{peopleOnly:true});
        }
        box(building,building.position.clone().add(new YUKA.Vector3(0,0,-building.depth/2)),building.width/2,.1,undefined,{peopleOnly:true});
      }
    }
    for(const tree of city.trees)this.bodies.push({owner:tree,position:tree.position.clone(),radius:.18*tree.size});
    for(const lamp of city.lamps)this.bodies.push({owner:lamp,position:lamp.position.clone(),radius:.1});
    for(const stop of city.stops)box(stop,stop.platform.clone().add(stop.direction.clone().multiplyScalar(-.6)),1.9,.75,stop.direction);
    for(const person of city.passengers)this.bodies.push({owner:person,position:person.position.clone(),radius:.23,get active(){return person.queueIndex<person.stop.waiting;}});
  }
  static applies(body,vehicle){return body.active!==false&&!(body.vehiclesOnly&&vehicle.isPerson)&&!(body.peopleOnly&&!vehicle.isPerson);}
  static contact(body,point){
    const delta=point.clone().sub(body.position);delta.y=0;
    if(body.radius!==undefined){const length=delta.length();return {gap:length-body.radius,normal:length>1e-8?delta.divideScalar(length):new YUKA.Vector3(1,0,0)};}
    const forward=body.direction,side=new YUKA.Vector3(forward.z,0,-forward.x),x=delta.dot(side),z=delta.dot(forward);
    const dx=x-Math.max(-body.hx,Math.min(body.hx,x)),dz=z-Math.max(-body.hz,Math.min(body.hz,z)),distance=Math.hypot(dx,dz);
    if(distance>1e-8)return {gap:distance,normal:side.multiplyScalar(dx/distance).add(forward.clone().multiplyScalar(dz/distance))};
    const gx=body.hx-Math.abs(x),gz=body.hz-Math.abs(z);
    return gx<gz?{gap:-gx,normal:side.multiplyScalar(x<0?-1:1)}:{gap:-gz,normal:forward.clone().multiplyScalar(z<0?-1:1)};
  }
  free(position,radius,vehicle={}){return this.bodies.every(body=>!CitySolids3D.applies(body,vehicle)||CitySolids3D.contact(body,position).gap>=radius+.15);}
}
