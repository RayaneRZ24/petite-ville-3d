// Lecteur d'enregistrements locaux : aucune synthèse ni modification de hauteur.
class CityAudio3D {
  constructor({audioFactory=null,rng=Math.random}={}) {
    this.factory=audioFactory||((src)=>new Audio(src));this.rng=rng;
    this.enabled=false;this.running=false;this.volume=.35;this.tracks=null;this.hornIn=4;this.disposed=false;this.lastError='';
  }
  build(){
    this.tracks={};
    for(const [name,file,loop] of [['traffic','traffic.ogg',true],['crowd','crowd.ogg',true],['siren','siren.ogg',true],['horn','horn.mp3',false]]){
      const audio=this.factory('assets/audio/city/'+file);audio.preload='auto';audio.loop=loop;audio.volume=0;audio.playbackRate=1;
      this.tracks[name]={audio,level:0,pending:false};
    }
  }
  async enable(){
    if(this.disposed)throw new Error('Audio fermé.');
    if(!this.tracks)this.build();
    try{
      // Amorcer les quatre lecteurs pendant le geste utilisateur, à volume nul.
      await Promise.all(Object.values(this.tracks).map(v=>{v.audio.volume=0;return v.audio.play();}));
      for(const v of Object.values(this.tracks)){v.audio.pause();v.audio.currentTime=0;v.level=0;}
      this.enabled=true;this.running=true;this.lastError='';
    }catch(error){for(const v of Object.values(this.tracks))v.audio.pause();this.enabled=false;this.running=false;throw new Error('Impossible de lire les échantillons locaux : '+error.message);}
  }
  disable(){this.enabled=false;this.suspend();}
  setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.min(1,Math.max(0,value));if(this.tracks)for(const v of Object.values(this.tracks))v.audio.volume=v.level*this.volume;}
  spatial(position,camera){const dx=position.x-camera.position.x,dz=position.z-camera.position.z,dy=(position.y||0)-camera.position.y;return 1/(1+(Math.hypot(dx,dz,dy*.35)/38)**2);}
  play(voice){
    if(voice.pending||!voice.audio.paused)return;
    voice.pending=true;Promise.resolve(voice.audio.play()).catch(error=>{this.lastError=error.message;}).finally(()=>{voice.pending=false;if(!this.enabled||!this.running)voice.audio.pause();});
  }
  mix(voice,target,dt){
    voice.level+=(target-voice.level)*(1-Math.exp(-dt*5));voice.audio.volume=Math.max(0,Math.min(1,voice.level*this.volume));
    if(target>.001)this.play(voice);else if(voice.level<.001)voice.audio.pause();
  }
  update(elapsed,world,camera,active=true,visitors=[]){
    if(!this.enabled||!this.tracks||this.disposed)return;
    if(!active){this.suspend();return;}
    if(!Number.isFinite(elapsed)||elapsed<=0)return;
    this.running=true;const dt=Math.min(.1,elapsed);
    const cars=(world.traffic||[]).filter(car=>car.visible!==false).map(car=>({car,gain:this.spatial(car.position,camera)})).sort((a,b)=>b.gain-a.gain);
    this.mix(this.tracks.traffic,cars.length ? .38+cars[0].gain*.18 : .12,dt);
    const people=[...(world.people||[]),...visitors].filter(person=>person.visible!==false);
    let crowdGain=this.spatial({x:0,y:0,z:-78},camera)*.65;
    for(const person of people)crowdGain=Math.max(crowdGain,this.spatial(person.position,camera)*.55);
    this.mix(this.tracks.crowd,crowdGain,dt);
    const police=cars.find(item=>item.car.incidentRole==='police');this.mix(this.tracks.siren,police?police.gain*.55:0,dt);
    this.hornIn-=dt;
    if(this.hornIn<=0){const nearby=cars.find(item=>item.car.getSpeed()<1.5)||cars[0];if(nearby)this.horn(nearby.gain);this.hornIn=8+this.rng()*8;}
  }
  horn(gain){
    if(!this.enabled||!this.running||!this.tracks)return false;const voice=this.tracks.horn;
    if(!voice.audio.paused||voice.pending)return false;
    voice.audio.currentTime=0;voice.level=Math.max(0,Math.min(1,gain))*.6;voice.audio.volume=voice.level*this.volume;this.play(voice);return true;
  }
  suspend(){
    this.running=false;if(!this.tracks)return;
    for(const v of Object.values(this.tracks)){v.audio.pause();v.audio.volume=0;v.level=0;}
    // Ne pas reprendre un coup de klaxon interrompu au retour dans la ville.
    this.tracks.horn.audio.currentTime=0;
  }
  dispose(){if(this.disposed)return;this.disable();this.disposed=true;if(this.tracks)for(const v of Object.values(this.tracks)){v.audio.removeAttribute('src');v.audio.load();}this.tracks=null;}
}
