// Projection plane x/z de la simulation Yuka : API vectorielle du laboratoire 9b.
// Ce module ne déplace aucune entité et ne charge pas le moteur de rendu p5.
class LabVector2 {
  constructor(x=0,y=0){this.set(x,y);}
  set(x,y){this.x=x;this.y=y;return this;}
  copy(){return new LabVector2(this.x,this.y);}
  add(v){this.x+=v.x;this.y+=v.y;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;return this;}
  mult(n){this.x*=n;this.y*=n;return this;}
  div(n){return this.mult(1/n);}
  mag(){return Math.hypot(this.x,this.y);}
  normalize(){const length=this.mag();return length?this.div(length):this;}
  setMag(n){return this.normalize().mult(n);}
  limit(n){return this.mag()>n?this.setMag(n):this;}
  heading(){return Math.atan2(this.y,this.x);}
  dot(v){return this.x*v.x+this.y*v.y;}
  static add(a,b){return a.copy().add(b);}
  static sub(a,b){return a.copy().sub(b);}
  static dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  static fromAngle(angle){return new LabVector2(Math.cos(angle),Math.sin(angle));}
}
const p5={Vector:LabVector2};
function createVector(x=0,y=0){return new LabVector2(x,y);}
function dist(x,y,a,b){return Math.hypot(x-a,y-b);}
function lerp(a,b,t){return a+(b-a)*t;}
