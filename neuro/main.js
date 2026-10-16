let racingLab=null,neuralView=null,labVisible=true;
window.addEventListener('DOMContentLoaded',async()=>{
  try{
    await tf.setBackend('cpu');await tf.ready();racingLab=new RacingLab();neuralView=new CircuitView3D(document.getElementById('canvas-container'));window.neuroLab=racingLab;window.neuroView=neuralView;
    try{
      const saved=restoreSavedCampaign(racingLab,TrainedCampaign);
      if(saved.available){racingLab.el('brain-select').value=saved.id;racingLab.load(racingLab.bank.items.find(pilot=>pilot.id===saved.id));racingLab.notice=TrainedCampaign.trainingReport.mode==='multicircuit'?'Le pilote universel est sélectionné : huit familles validées. Choisis un circuit puis « Tester le cerveau figé ».':'Le pilote entraîné sur l’ovale est sélectionné. Clique sur « Tester le cerveau figé » pour le voir conduire.';}
      else racingLab.notice='La banque contient déjà 10 pilotes. L’entraînement livré reste disponible dans neuro/sauvegardes/.';
      racingLab.refresh(true);
    }catch(error){racingLab.notice='Sauvegarde entraînée non chargée : '+error.message;racingLab.refresh(true);}
    const close=()=>{racingLab.session.paused=true;labVisible=false;parent.postMessage({type:'neuro-lab-close'},'*');};
    for(const id of ['return-city','return-city-small'])document.getElementById(id).addEventListener('click',close);
    document.getElementById('lab-camera').addEventListener('click',()=>{neuralView.top=!neuralView.top;});
    window.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    window.addEventListener('message',event=>{if(event.source!==parent)return;if(event.data?.type==='neuro-lab-pause'){labVisible=false;racingLab.session.paused=true;}if(event.data?.type==='neuro-lab-show'){labVisible=true;neuralView.resize();}});
    window.addEventListener('resize',()=>neuralView.resize());let previousCircuit=null;
    function frame(){
      if(labVisible&&!document.hidden){
        if(neuralView.failed)racingLab.session.paused=true;
        const started=performance.now();for(let i=0;i<+racingLab.el('sim-speed').value&&performance.now()-started<12;i++)racingLab.session.step();
        neuralView.render(racingLab.session,racingLab.el('show-rays').checked,racingLab.el('show-gates').checked);racingLab.refresh();
        if(previousCircuit!==racingLab.session.circuit.id){previousCircuit=racingLab.session.circuit.id;const c=racingLab.session.circuit;parent.postMessage({type:'neuro-circuit-preview',inner:c.inner.map(p=>[p.x,p.y]),outer:c.outer.map(p=>[p.x,p.y])},'*');}
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }catch(error){document.getElementById('session-message').textContent='Laboratoire indisponible : '+error.message;console.error(error);}
});
