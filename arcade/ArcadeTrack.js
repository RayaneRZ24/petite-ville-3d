// Géométrie et portes ; elles mesurent la progression sans piloter les voitures.
class ArcadeTrack {
  constructor(){
    this.points=[];this.inner=[];this.outer=[];this.walls=[];this.gates=[];
    for(let i=0;i<96;i++){const a=i/96*Math.PI*2,x=600+430*Math.cos(a),z=380+235*Math.sin(a),dx=-430*Math.sin(a),dz=235*Math.cos(a),length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;this.points.push({x,z});this.inner.push({x:x+nx*45,z:z+nz*45});this.outer.push({x:x-nx*45,z:z-nz*45});}
    for(let i=0;i<96;i++){const j=(i+1)%96;this.walls.push([this.inner[i],this.inner[j]],[this.outer[i],this.outer[j]]);if(i%4===0){const a=i/96*Math.PI*2;this.gates.push({center:this.points[i],a:this.inner[i],b:this.outer[i],forward:{x:-430*Math.sin(a),z:235*Math.cos(a)}});}}
  }
  static intersection(a,b,c,d){const dx=b.x-a.x,dz=b.z-a.z,ex=d.x-c.x,ez=d.z-c.z,den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)return null;const qx=c.x-a.x,qz=c.z-a.z,t=(qx*ez-qz*ex)/den,u=(qx*dz-qz*dx)/den;return t>=0&&t<=1&&u>=0&&u<=1?t:null;}
  static inside(p,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
  contains(p){return ArcadeTrack.inside(p,this.outer)&&!ArcadeTrack.inside(p,this.inner);}
  collision(a,b,radius=10){for(const [c,d] of this.walls){if(ArcadeTrack.intersection(a,b,c,d)!==null)return true;const dx=d.x-c.x,dz=d.z-c.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((b.x-c.x)*dx+(b.z-c.z)*dz)/l)):0;if(Math.hypot(b.x-c.x-t*dx,b.z-c.z-t*dz)<radius)return true;}return !this.contains(b);}
  rays(car){const heading=Math.atan2(car.velocity.z,car.velocity.x),inputs=[];for(let i=0;i<7;i++){const angle=heading-Math.PI/3+i*Math.PI/9,end={x:car.position.x+Math.cos(angle)*180,z:car.position.z+Math.sin(angle)*180};let fraction=1;for(const [a,b] of this.walls){const hit=ArcadeTrack.intersection(car.position,end,a,b);if(hit!==null)fraction=Math.min(fraction,hit);}inputs.push(1-fraction);}inputs.push(Math.min(1,car.getSpeed()/180));return inputs;}
  advance(car){const gate=this.gates[car.nextGate],before=(car.previous.x-gate.center.x)*gate.forward.x+(car.previous.z-gate.center.z)*gate.forward.z,after=(car.position.x-gate.center.x)*gate.forward.x+(car.position.z-gate.center.z)*gate.forward.z;
    if(before<0&&after>=0&&car.velocity.x*gate.forward.x+car.velocity.z*gate.forward.z>0&&ArcadeTrack.intersection(car.previous,car.position,gate.a,gate.b)!==null){car.passed++;car.nextGate=(car.nextGate+1)%this.gates.length;car.laps=Math.floor(car.passed/this.gates.length);}
  }
}
