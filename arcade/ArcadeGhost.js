class ArcadeGhost extends YUKA.Vehicle {
  constructor(track,network){super();this.track=track;this.network=network;this.position.set(1030,0,380);this.velocity.set(0,0,60);this.previous=this.position.clone();this.maxSpeed=180;this.maxForce=1440;this.laps=0;this.passed=0;this.nextGate=1;this.finished=false;this.dead=false;this.steering.add(new ArcadeGhostDrive());}
  step(dt){if(this.dead||this.finished)return;this.previous.copy(this.position);super.update(dt);}
}
