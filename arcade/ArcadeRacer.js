class ArcadeRacer extends YUKA.Vehicle {
  constructor(){super();this.position.set(1030,0,380);this.previous=this.position.clone();this.heading=Math.PI/2;this.maxSpeed=180;this.maxForce=400;this.input={left:0,right:0,throttle:0,brake:0};this.laps=0;this.passed=0;this.nextGate=1;this.finished=false;this.dead=false;this.steering.add(new ArcadeDrive());}
  step(dt){if(this.dead||this.finished)return;this.previous.copy(this.position);super.update(dt);}
}
