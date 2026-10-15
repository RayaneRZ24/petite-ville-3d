// Graphe d'objectifs : les segments sont suivis par des forces, sans déplacer les agents.
class StreetNetwork3D {
  constructor(city){
    this.city=city;this.radius=4.2;this.nodes=[];this.edges=[];this.blocked=new Set();this.version=0;
    for(const x of [-56,-28,0,28,56])for(const z of [-22,0,22])this.nodes.push(new YUKA.Vector3(x,0,z));
    this.nodes.push(new YUKA.Vector3(110,0,0));
    for(let a=0;a<15;a++)for(let b=a+1;b<15;b++){
      const p=this.nodes[a],q=this.nodes[b];if((p.x===q.x&&Math.abs(p.z-q.z)===22)||(p.z===q.z&&Math.abs(p.x-q.x)===28))this.edges.push({a,b});
    }
    this.edges.push({a:13,b:15});this.exit=this.nodes[15];
  }
  key(a,b){return [Math.min(a,b),Math.max(a,b)].join(':');}
  close(a,b){this.blocked.add(this.key(a,b));this.version++;}
  open(){this.blocked.clear();this.version++;}
  nearest(point){return this.nodes.reduce((best,p,i)=>p.squaredDistanceTo(point)<this.nodes[best].squaredDistanceTo(point)?i:best,0);}
  route(start,goal){
    const distances=this.nodes.map(()=>Infinity),previous=[],pending=new Set(this.nodes.map((_,i)=>i));distances[start]=0;
    while(pending.size){const current=[...pending].sort((a,b)=>distances[a]-distances[b])[0];pending.delete(current);if(current===goal||!Number.isFinite(distances[current]))break;
      for(const edge of this.edges){if(this.blocked.has(this.key(edge.a,edge.b)))continue;const next=edge.a===current?edge.b:edge.b===current?edge.a:-1;if(next<0||!pending.has(next))continue;
        const a=this.nodes[current],b=this.nodes[next],delta=b.clone().sub(a),length=delta.squaredLength();
        const hazards=(this.obstacles||[]).filter(obstacle=>{const t=Math.max(0,Math.min(1,obstacle.position.clone().sub(a).dot(delta)/length));return a.clone().add(delta.clone().multiplyScalar(t)).distanceTo(obstacle.position)<obstacle.boundingRadius+1.4;}).length;
        const candidate=distances[current]+Math.sqrt(length)+hazards*80;if(candidate<distances[next]){distances[next]=candidate;previous[next]=current;}}
    }
    if(!Number.isFinite(distances[goal]))return [];
    const result=[goal];while(result[0]!==start)result.unshift(previous[result[0]]);return result;
  }
  frameAt(position){
    let best=null,distance=Infinity;
    for(const edge of this.edges){const a=this.nodes[edge.a],direction=this.nodes[edge.b].clone().sub(a),length=direction.length();direction.divideScalar(length);
      const along=Math.max(0,Math.min(length,position.clone().sub(a).dot(direction))),point=a.clone().add(direction.clone().multiplyScalar(along)),d=point.squaredDistanceTo(position);
      if(d<distance){distance=d;best={point,direction,normal:new YUKA.Vector3(direction.z,0,-direction.x)};}}
    return best;
  }
  alignPath(){}
}
