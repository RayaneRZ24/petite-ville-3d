// Lecture du mouvement pour les pièces graphiques. Aucune force ni écriture Yuka.
class VehicleVisualState3D {
  constructor(entity){this.previousPosition=new THREE.Vector3(entity.position.x,entity.position.y,entity.position.z);this.previousYaw=this.yaw(entity);this.previousSpeed=entity.getSpeed();this.steer=0;this.spin=0;this.gear=0;this.braking=false;}
  yaw(entity){return Math.atan2(2*(entity.rotation.w*entity.rotation.y+entity.rotation.x*entity.rotation.z),1-2*(entity.rotation.y**2+entity.rotation.z**2));}
  update(entity,dt,servicing=false){
    if(!Number.isFinite(dt)||dt<=0)return;
    const delta=Math.min(dt,.1),position=new THREE.Vector3(entity.position.x,entity.position.y,entity.position.z),travel=position.clone().sub(this.previousPosition),yaw=this.yaw(entity);
    const distance=travel.length(),forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    this.spin=(this.spin+(travel.dot(forward)<0?-distance:distance)/(entity.isBus?.18:.11))%(Math.PI*2);
    const turn=Math.atan2(Math.sin(yaw-this.previousYaw),Math.cos(yaw-this.previousYaw));
    const desired=distance>1e-5?Math.max(-.55,Math.min(.55,Math.atan((entity.isBus?1.1:.72)*turn/distance))):this.steer;
    this.steer+=(desired-this.steer)*(1-Math.exp(-8*delta));
    const speed=entity.getSpeed();this.braking=servicing||speed<.05||(this.previousSpeed-speed)/delta>.7;
    this.gear=speed<.05?0:Math.min(5,1+Math.floor(speed/2));
    this.previousPosition.copy(position);this.previousYaw=yaw;this.previousSpeed=speed;
  }
}
