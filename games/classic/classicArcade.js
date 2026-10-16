// Héberge les jeux d'origine sans modifier leur moteur ni leurs entités Yuka.
class ClassicArcade {
  constructor(){
    const params=new URLSearchParams(location.search);this.id=params.get('scenario')==='balloons'?'balloons':'race';this.token=params.get('session')||'';
    this.canvas=document.getElementById('classic-canvas');this.view=new ArcadeView(this.canvas);this.keys=new Set();this.records={};this.completed=new WeakSet();this.accumulator=0;this.disposed=false;
    try{const data=JSON.parse(localStorage.getItem('city-arcade-records')||'{}');for(const key of ['race','ghost','balloons'])if(Number.isFinite(data[key])&&data[key]>=0)this.records[key]=data[key];}catch(error){}
    for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>this.start(button.dataset.mode));
    for(const button of document.querySelectorAll('[data-control]')){button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);this.keys.add(button.dataset.control);});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>this.keys.delete(button.dataset.control));}
    this.canvas.addEventListener('pointerdown',event=>{const rect=this.canvas.getBoundingClientRect();this.game.shoot((event.clientX-rect.left)*1200/rect.width,(event.clientY-rect.top)*760/rect.height);});
    window.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();this.send('behavior-arcade-close');return;}
      if(['BUTTON','INPUT','SELECT'].includes(document.activeElement?.tagName))return;
      const control=this.control(event.key);if(control){event.preventDefault();this.keys.add(control);}
      if(event.code==='Space'&&!event.repeat){event.preventDefault();this.pause(!this.game.paused);}
    });
    window.addEventListener('keyup',event=>this.keys.delete(this.control(event.key)));
    window.addEventListener('message',event=>this.receive(event));
    window.addEventListener('blur',()=>this.pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause(true);});
    window.addEventListener('pagehide',()=>this.dispose());
    this.start(this.id);this.lastTime=performance.now();this.frameId=requestAnimationFrame(now=>this.frame(now));this.send('behavior-arcade-ready');
  }
  control(key){return ({ArrowUp:'throttle',z:'throttle',Z:'throttle',w:'throttle',W:'throttle',ArrowDown:'brake',s:'brake',S:'brake',ArrowLeft:'left',q:'left',Q:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'})[key];}
  send(type,data={}){if(parent!==window)parent.postMessage({type,id:this.id,session:this.token,...data},'*');}
  receive(event){
    if(this.disposed||event.source!==parent||event.data?.id!==this.id||event.data?.session!==this.token||event.data?.type!=='behavior-arcade-control')return false;
    const data=event.data;if(data.action==='pause'&&typeof data.paused==='boolean'){this.pause(data.paused,false);return true;}
    if(data.action==='restart'){this.start(this.game.mode);return true;}if(data.action==='dispose'){this.dispose();return true;}return false;
  }
  start(mode){
    if(this.disposed||!(this.id==='balloons'?mode==='balloons':['race','ghost'].includes(mode)))return false;
    this.keys.clear();this.game=new ArcadeSession(mode,Math.random,TrainedCampaign.brains.items[0].network);this.accumulator=0;
    document.getElementById('race-modes').hidden=this.id==='balloons';document.getElementById('classic-pad').hidden=this.id==='balloons';
    document.getElementById('classic-help').textContent=this.id==='balloons'?'Vise et clique les ballons · 30 secondes · Enchaîne les touches pour le combo · Échap : retour':'Flèches / ZQSD / WASD ou commandes tactiles · Espace : pause · Échap : retour';
    for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===mode));this.canvas.focus();this.send('behavior-arcade-state',{paused:false});this.draw();return true;
  }
  pause(value,notify=true){if(this.disposed)return;this.game.paused=Boolean(value);this.keys.clear();this.accumulator=0;this.lastTime=performance.now();if(notify)this.send('behavior-arcade-state',{paused:this.game.paused});this.draw();}
  update(elapsed){
    if(this.disposed||document.hidden||this.game.paused)return;
    if(!Number.isFinite(elapsed)||elapsed<=0)return;this.accumulator+=Math.min(.1,elapsed);
    if(this.game.player)for(const key of ['left','right','throttle','brake'])this.game.player.input[key]=Number(this.keys.has(key));
    while(this.accumulator>=1/60){this.game.step(1/60);this.accumulator-=1/60;}
    if(this.game.state==='finished'&&!this.completed.has(this.game)){
      const g=this.game,value=g.mode==='balloons'?g.score:g.player.finished?g.player.finishTime:null;this.completed.add(g);
      if(value!==null&&(this.records[g.mode]===undefined||(g.mode==='balloons'?value>this.records[g.mode]:value<this.records[g.mode]))){this.records[g.mode]=value;try{localStorage.setItem('city-arcade-records',JSON.stringify(this.records));}catch(error){}}
    }
  }
  draw(){const g=this.game;document.getElementById('classic-stats').textContent=g.mode==='balloons'?Math.max(0,Math.ceil(30-g.time))+' s · '+g.score+' points · Combo ×'+g.combo:Math.max(0,g.time-3).toFixed(1)+' s · '+g.player.laps+'/3 tours · '+Math.round(g.player.getSpeed())+' km/h'+(g.ghost?' · IA '+g.ghost.laps+'/3 tours':'');document.getElementById('classic-record').textContent=this.records[g.mode]!==undefined?'Record : '+this.records[g.mode].toFixed(g.mode==='balloons'?0:2)+(g.mode==='balloons'?' points':' s'):'À toi de créer le premier record';this.view.render(g);}
  frame(now){if(this.disposed)return;this.update((now-this.lastTime)/1000);this.lastTime=now;if(!document.hidden&&!this.game.paused)this.draw();this.frameId=requestAnimationFrame(time=>this.frame(time));}
  dispose(){if(this.disposed)return;this.disposed=true;this.keys.clear();this.game.paused=true;cancelAnimationFrame(this.frameId);}
}
if(typeof document!=='undefined'&&document.getElementById('classic-canvas'))window.classicArcade=new ClassicArcade();
