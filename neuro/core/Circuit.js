// Géométrie d'un circuit ; les murs et portes sont des Boundary/Vehicle.
class Circuit {
    constructor(spec,points,amplitude=1){
        this.spec={...spec};this.points=points.map(p=>createVector(p[0],p[1]));this.amplitude=amplitude;this.inner=[];this.outer=[];this.walls=[];this.gates=[];this.length=0;
        const n=this.points.length;
        for(let i=0;i<n;i++){
            const previous=this.points[(i+n-1)%n],next=this.points[(i+1)%n],point=this.points[i],direction=p5.Vector.sub(next,previous).normalize(),normal=createVector(-direction.y,direction.x).mult(spec.width/2);
            this.inner.push(p5.Vector.add(point,normal));this.outer.push(p5.Vector.sub(point,normal));this.length+=p5.Vector.dist(point,next);
        }
        for(let i=0;i<n;i++){
            const j=(i+1)%n,a=this.inner[i],b=this.inner[j],c=this.outer[i],d=this.outer[j];
            this.walls.push(new Boundary(a.x,a.y,b.x,b.y),new Boundary(c.x,c.y,d.x,d.y));
            const gate=new Boundary(a.x,a.y,c.x,c.y,'checkpoint');gate.center=this.points[i];gate.forward=p5.Vector.sub(this.points[j],this.points[(i+n-1)%n]).normalize();this.gates.push(gate);
        }
        this.id=StudyRandom.hash(JSON.stringify({spec:this.spec,points:points.map(p=>p.map(v=>Math.round(v*1000)/1000))}));
    }
    valid(){
        if(this.points.length<16||!Geometry.ringSimple(this.inner)||!Geometry.ringSimple(this.outer))return false;
        if(this.outer.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<12||p.x>1188||p.y<12||p.y>748))return false;
        if(this.inner.some(point=>!Geometry.inside(point,this.outer)))return false;
        for(const a of this.walls.filter((_,i)=>i%2===0))for(const b of this.walls.filter((_,i)=>i%2===1))if(Geometry.intersection(a.a,a.b,b.a,b.b))return false;
        return true;
    }
    spawn(offset=0){const point=this.points[0],direction=this.gates[0].forward;return {position:point.copy().add(createVector(-direction.y,direction.x).mult(offset)),direction:direction.copy()};}
    contains(point,radius=0){return Geometry.inside(point,this.outer)&&!Geometry.inside(point,this.inner)&&this.walls.every(wall=>Geometry.pointSegmentSquared(point,wall.a,wall.b)>=radius*radius);}
    collision(a,b,radius){return this.walls.some(wall=>Geometry.segmentsSquared(a,b,wall.a,wall.b)<=radius*radius);}
    serialize(){return {version:1,spec:{...this.spec},id:this.id};}
}
