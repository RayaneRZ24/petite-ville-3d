// Adaptation d'hébergement uniquement ; aucun steering n'est réécrit.
class BehaviorArcadeBridge {
  constructor(){
    this.engine=document.body.dataset.arcadeEngine;this.id=new URLSearchParams(location.search).get('scenario')||(this.engine==='snake'?'snake':'pursuit');
    const allowed=this.engine==='snake'?['snake']:['pursuit','endurance','targetRespawn','flee','missile'];if(!allowed.includes(this.id))this.id=allowed[0];
    this.session=new URLSearchParams(location.search).get('session')||'';
    this.ready=false;this.userPaused=false;this.isPaused=false;this.disposed=false;this.contexts=[];
    window.addEventListener('message',event=>this.receive(event));
    document.addEventListener('visibilitychange',()=>this.applyPause());
    // Les réglages restent accessibles en pause, mais aucun clic ne doit
    // démarrer/reprendre un lecteur après sa suspension par l'hôte.
    document.addEventListener('click',event=>{
      if(!this.isPaused&&!this.disposed)return;
      if(this.audioButtons().includes(event.target?.closest?.('button'))){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    window.addEventListener('pagehide',()=>this.dispose());
    window.addEventListener('keydown',event=>{
      if(event.key!=='Escape'||document.querySelector('#controls.is-open'))return;
      event.preventDefault();event.stopImmediatePropagation();this.send('behavior-arcade-close');
    },true);
    this.wait();
  }
  send(type){if(parent!==window)parent.postMessage({type,id:this.id,session:this.session},'*');}
  wait(){
    if(this.disposed)return;
    const ready=typeof window.noLoop==='function'&&document.querySelector('canvas')&&(this.engine==='snake'?typeof newSnake==='function'&&typeof followSlider!=='undefined'&&followSlider:typeof target!=='undefined'&&target&&typeof vitesseMaxSlider!=='undefined'&&vitesseMaxSlider);
    if(!ready){requestAnimationFrame(()=>this.wait());return;}
    if(this.engine==='seek'){
      const select=document.getElementById('scenario-select');select.value=this.id;if(activeScenario!==this.id)changerScenario();select.disabled=true;select.closest('.control-group').hidden=true;
    }else{
      const button=document.createElement('button');button.id='snake-panel-toggle';button.textContent='☰ Réglages';button.type='button';button.setAttribute('aria-controls','controls');button.setAttribute('aria-expanded','false');button.addEventListener('click',()=>this.toggleSettings());document.body.append(button);document.getElementById('controls').hidden=true;
      const add=document.createElement('button');add.type='button';add.id='snake-add-button';add.textContent='+ Serpent · T';add.addEventListener('click',()=>newSnake());document.body.append(add);
    }
    this.ready=true;this.applyPause();this.send('behavior-arcade-ready');
  }
  receive(event){
    if(event.source!==parent||event.data?.type!=='behavior-arcade-control'||event.data.id!==this.id||event.data.session!==this.session)return false;
    const data=event.data;
    if(data.action==='dispose'){this.dispose();return true;}
    if(!this.ready||this.disposed)return false;
    if(data.action==='pause'&&typeof data.paused==='boolean'){this.userPaused=data.paused;this.applyPause();return true;}
    if(data.action==='settings'){this.toggleSettings();return true;}
    if(data.action==='add-snake'&&this.engine==='snake'){newSnake();return true;}
    return false;
  }
  toggleSettings(){
    if(this.engine==='seek'){document.getElementById('settings-toggle').click();return;}
    const panel=document.getElementById('controls');panel.hidden=!panel.hidden;document.getElementById('snake-panel-toggle').setAttribute('aria-expanded',String(!panel.hidden));
  }
  audioButtons(){return this.engine==='seek'?['music-toggle','missile-audio-toggle','capture-sound-toggle'].map(id=>document.getElementById(id)).filter(Boolean):[];}
  applyPause(){
    if(!this.ready||this.disposed)return;
    const paused=this.userPaused||document.hidden;if(paused===this.isPaused)return;this.isPaused=paused;
    for(const button of this.audioButtons())button.setAttribute('aria-disabled',String(paused));
    if(paused){
      noLoop();
      if(this.engine==='seek'){
        this.contexts=[hypnoticMusic?.context,missileAudio?.context].filter(context=>context?.state==='running');
        for(const context of this.contexts)context.suspend().catch(()=>{});
        captureSound?.audio.pause();
      }
    }else{
      if(this.engine==='seek')previousFrameSeconds=millis()/1000;
      for(const context of this.contexts)if(context.state!=='closed')context.resume().catch(()=>{});
      this.contexts=[];loop();
    }
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    if(typeof noLoop==='function')noLoop();
    if(this.engine==='seek'){
      if(typeof captureSound!=='undefined')captureSound?.audio.pause();
      if(typeof hypnoticMusic!=='undefined')hypnoticMusic?.dispose();
      if(typeof missileScene!=='undefined')missileScene?.dispose();
      if(typeof missileAudio!=='undefined'&&missileAudio?.context&&missileAudio.context.state!=='closed')missileAudio.context.close().catch(()=>{});
    }
  }
}
if(new URLSearchParams(location.search).get('arcade')==='1')window.behaviorArcade=new BehaviorArcadeBridge();
