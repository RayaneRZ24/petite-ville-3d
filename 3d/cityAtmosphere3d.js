// Ciel et nuages : éléments de décor, sans effet sur les agents.
class CityAtmosphere3D {
  constructor(scene){
    this.time=0;this.clouds=[];this.group=new THREE.Group();scene.add(this.group);
    const geometry=new THREE.SphereGeometry(240,32,16),position=geometry.attributes.position,colors=[];
    const horizon=new THREE.Color('#edf6fa'),zenith=new THREE.Color('#70b7ed');
    for(let i=0;i<position.count;i++){const t=Math.max(0,Math.min(1,position.getY(i)/240));const c=horizon.clone().lerp(zenith,t);colors.push(c.r,c.g,c.b);}
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const sky=this.sky=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false}));sky.renderOrder=-10;this.group.add(sky);
    const sun=new THREE.Mesh(new THREE.SphereGeometry(7,24,16),new THREE.MeshBasicMaterial({color:'#fff3b3'}));sun.position.set(-65,85,-100);this.group.add(sun);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(9,24,16),new THREE.MeshBasicMaterial({color:'#ffe294',transparent:true,opacity:.13,depthWrite:false}));halo.position.copy(sun.position);this.group.add(halo);
    const cloudMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,transparent:true,opacity:.92});
    const puff=new THREE.SphereGeometry(1,12,8);
    for(let i=0;i<10;i++){
      const group=new THREE.Group();
      for(let j=0;j<5;j++){const mesh=new THREE.Mesh(puff,cloudMaterial);mesh.scale.set(3+j%2,1.4+j%3*.4,2.3);mesh.position.set((j-2)*2.6,Math.sin(j)*.6,Math.cos(j)*1.3);group.add(mesh);}
      group.position.set(-105+i*23,22+(i%3)*7,-85+(i%4)*48);this.clouds.push({group,startX:group.position.x,speed:.25+(i%3)*.08});this.group.add(group);
    }
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    this.time+=Math.min(dt,.1);
    for(const cloud of this.clouds)cloud.group.position.x=((cloud.startX+130+this.time*cloud.speed)%260)-130;
  }
}
