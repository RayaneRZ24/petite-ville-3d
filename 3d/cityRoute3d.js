// Un itinéraire de rues est un objectif pour FollowPath, jamais une trajectoire imposée.
class CityRoute3D extends Circuit3D {
  constructor(left = -28, right = 28, top = -22, bottom = 22, name = 'Boulevard des quatre quartiers') {
    super(); this.points = []; this.name = name; this.radius = 4.2;
    const r = 6;
    const corners = [[right-r,bottom-r,0],[left+r,bottom-r,Math.PI/2],[left+r,top+r,Math.PI],[right-r,top+r,Math.PI*1.5]];
    for (let c=0;c<4;c++) {
      const [x,z,angle]=corners[c];
      for(let i=0;i<6;i++)this.points.push(new YUKA.Vector3(x+r*Math.cos(angle+i*Math.PI/12),0,z+r*Math.sin(angle+i*Math.PI/12)));
      const end=new YUKA.Vector3(x+r*Math.cos(angle+Math.PI/2),0,z+r*Math.sin(angle+Math.PI/2));
      const [nx,nz,na]=corners[(c+1)%4],next=new YUKA.Vector3(nx+r*Math.cos(na),0,nz+r*Math.sin(na));
      for(let i=0;i<10;i++)this.points.push(end.clone().add(next.clone().sub(end).multiplyScalar(i/10)));
    }
  }
}
