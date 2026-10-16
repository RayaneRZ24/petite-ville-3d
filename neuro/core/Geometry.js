const Geometry = {
    cross(a,b){return a.x*b.y-a.y*b.x;},
    pointSegmentSquared(p,a,b){const x=b.x-a.x,y=b.y-a.y,l=x*x+y*y,t=l?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/l)):0;return (p.x-a.x-x*t)**2+(p.y-a.y-y*t)**2;},
    intersection(a,b,c,d){
        const r={x:b.x-a.x,y:b.y-a.y},s={x:d.x-c.x,y:d.y-c.y},q={x:c.x-a.x,y:c.y-a.y},den=this.cross(r,s);
        if(Math.abs(den)<1e-9)return null;
        const t=this.cross(q,s)/den,u=this.cross(q,r)/den;
        return t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9?{t,u}:null;
    },
    segmentsSquared(a,b,c,d){if(this.intersection(a,b,c,d))return 0;return Math.min(this.pointSegmentSquared(a,c,d),this.pointSegmentSquared(b,c,d),this.pointSegmentSquared(c,a,b),this.pointSegmentSquared(d,a,b));},
    inside(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;},
    ringSimple(points){for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){if(j===i+1||(i===0&&j===points.length-1))continue;if(this.intersection(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))return false;}return true;}
};
