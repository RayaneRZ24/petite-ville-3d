class ArcadeSession {
  constructor(mode='race',rng=Math.random,network=null){this.mode=mode;this.rng=rng;this.time=0;this.state='running';this.paused=false;this.score=0;this.combo=0;this.shots=0;this.lastHit=-Infinity;this.message='';this.track=new ArcadeTrack();this.player=mode==='balloons'?null:new ArcadeRacer();this.ghost=mode==='ghost'&&network?new ArcadeGhost(this.track,network):null;this.balloons=mode==='balloons'?Array.from({length:8},(_,i)=>new BalloonTarget(rng,i)):[];this.hitEffects=[];}
  shoot(x,z){if(this.mode!=='balloons'||this.state!=='running'||this.paused)return false;this.shots++;const index=this.balloons.findIndex(b=>Math.hypot(b.position.x-x,b.position.z-z)<=b.radius);
    if(index<0){this.combo=0;return false;}const target=this.balloons[index];this.combo=this.time-this.lastHit<1.2?Math.min(5,this.combo+1):1;this.lastHit=this.time;this.score+=10*this.combo;this.hitEffects.push({x:target.position.x,z:target.position.z,at:this.time});this.balloons[index]=new BalloonTarget(this.rng,index);return true;
  }
  step(dt){
    if(this.paused||this.state!=='running'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,1/60);this.time+=dt;
    if(this.mode==='balloons'){
      for(let i=0;i<this.balloons.length;i++){this.balloons[i].step(dt);if(this.balloons[i].position.z<80)this.balloons[i]=new BalloonTarget(this.rng,i);}
      this.hitEffects=this.hitEffects.filter(e=>this.time-e.at<.4);if(this.time>=30){this.state='finished';this.message='Temps écoulé · '+this.score+' points !';}return;
    }
    if(this.time<3)return;
    for(const car of [this.player,this.ghost].filter(Boolean)){
      if(car.finished||car.dead)continue;car.step(dt);
      if(this.track.collision(car.previous,car.position)){car.dead=true;continue;}this.track.advance(car);if(car.laps>=3){car.finished=true;car.finishTime=this.time-3;}
    }
    this.score=this.player.passed*100;
    if(this.player.finished){this.state='finished';this.message=this.ghost&&this.ghost.finished&&this.ghost.finishTime<this.player.finishTime?'Le pilote neuronal gagne !':'🏆 Tu remportes la course !';}
    else if(this.player.dead){this.state='finished';this.message='Sortie de piste ! Réessaie en freinant avant les virages.';}
    else if(this.time>=123){this.state='finished';this.message='Temps écoulé. '+this.player.laps+' / 3 tours.';}
  }
}
