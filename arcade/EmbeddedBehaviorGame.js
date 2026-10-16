// Contrôleur du seul iframe de jeu : les messages d'autres fenêtres sont rejetés.
class EmbeddedBehaviorGame {
  constructor(frame,onState=()=>{}){this.frame=frame;this.onState=onState;this.id=null;this.sequence=0;this.session=null;this.paused=false;this.ready=false;this.onClose=()=>{};this.message=event=>this.receive(event);window.addEventListener('message',this.message);}
  open(id){const url=BehaviorArcadeCatalog.url(id);this.stop();this.id=id;this.session=String(++this.sequence);this.paused=false;this.ready=false;this.frame.title=BehaviorArcadeCatalog.get(id).title;this.frame.src=url+'&session='+this.session;this.onState();}
  receive(event){if(!this.id||event.source!==this.frame.contentWindow||event.data?.id!==this.id||event.data?.session!==this.session)return false;const data=event.data;if(data.type==='behavior-arcade-ready'){this.ready=true;this.control('pause',{paused:this.paused});this.onState();return true;}if(data.type==='behavior-arcade-close'){this.onClose();return true;}if(data.type==='behavior-arcade-state'&&typeof data.paused==='boolean'){this.paused=data.paused;this.onState();return true;}return false;}
  control(action,data={}){if(!this.id)return;this.frame.contentWindow?.postMessage({type:'behavior-arcade-control',id:this.id,session:this.session,action,...data},'*');}
  setPaused(paused){this.paused=Boolean(paused);this.control('pause',{paused:this.paused});this.onState();}
  restart(){if(this.id)this.open(this.id);}
  stop(){if(this.id)this.control('dispose');this.id=null;this.session=null;this.ready=false;this.paused=false;this.frame.src='about:blank';}
  dispose(){this.stop();window.removeEventListener('message',this.message);}
}
