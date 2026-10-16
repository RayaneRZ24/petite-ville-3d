class BalloonTarget extends YUKA.Vehicle {
  constructor(rng,index){super();this.position.set(140+rng()*920,0,180+rng()*470);this.radius=27;this.phase=index;this.time=0;this.maxSpeed=40;this.maxForce=100;this.color=['#ff7c97','#71e9c2','#ffcc71','#87b7ff'][index%4];this.steering.add(new BalloonDrift());}
  step(dt){this.time+=dt;super.update(dt);}
}
