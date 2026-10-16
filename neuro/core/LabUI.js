class RacingLab {
    constructor(){
        this.el=id=>document.getElementById(id);this.notice='';this.dirty=false;this.lastRefresh=0;
        let storage=null;try{storage=window.localStorage;}catch(error){}
        this.archive=new ExperimentArchive(storage);this.bank=new BrainBank(storage);
        this.settings=StudyConfig.validate();this.circuit=CircuitFactory.create();this.session=new StudySession(this.settings,this.circuit,this.archive);
        for(const [value,label] of Object.entries(CircuitFactory.types))this.el('track-type').add(new Option(label,value));
        this.setForm(this.settings);this.el('track-type').value='oval';
        for(const [i,name] of ['Nora','Ilyes','Lina','Oscar'].entries()){
            const row=document.createElement('div');row.className='pilot-row';
            const label=document.createElement('label');label.textContent='Pilote '+(i+1);
            const input=document.createElement('input');input.id='pilot-name-'+i;input.value=name;input.maxLength=32;input.setAttribute('aria-label',label.textContent);
            const select=document.createElement('select');select.id='pilot-brain-'+i;select.setAttribute('aria-label','Cerveau de '+name);
            row.append(label,input,select);this.el('pilot-controls').append(row);
        }
        this.el('ui').addEventListener('input',event=>{
            if(event.target.id==='hidden-count')this.layers(Array.from(this.el('layer-controls').querySelectorAll('input'),input=>+input.value));
            if(!event.target.id.startsWith('pilot-')&&!['driver-name','brain-select','import-study','mode'].includes(event.target.id)){this.dirty=true;this.el('settings-state').textContent='Réglages modifiés : le prochain lancement redémarrera la population.';}
            this.outputs();
        });
        this.bind('apply-settings',()=>this.apply());this.bind('regenerate',()=>this.apply());
        this.bind('new-seed',()=>{this.el('track-seed').value=(+this.el('track-seed').value%4294967295)+1;this.apply();});
        this.bind('start',()=>{this.apply();const mode=this.el('mode').value;this.session.start(mode,null,mode==='race'?this.pilots():[]);this.notice='';});
        this.bind('pause',()=>{this.session.paused=!this.session.paused;});
        this.bind('save-brain',()=>{const item=this.bank.save(this.el('driver-name').value,this.session.captureBest()||this.session.best);this.notice='Pilote « '+item.name+' » enregistré.';this.renderBank();});
        this.bind('load-brain',()=>{const best=this.selectedBrain();this.load(best);this.notice='Cerveau chargé. Choisis un circuit puis lance le test figé.';});
        this.bind('test-brain',()=>{const best=this.selectedBrain();const circuit=CircuitFactory.create(this.readCircuit());this.circuit=circuit;this.load(best);this.session.start('evaluation',best.network);this.notice='';});
        this.el('mode').addEventListener('change',()=>{this.el('race-options').hidden=this.el('mode').value!=='race';this.el('start').textContent=this.el('mode').value==='race'?'Lancer la course ↗':'Démarrer l’entraînement ↗';if(this.session.state==='running')this.session.paused=true;});
        this.bind('menu-toggle',()=>{const opened=this.el('ui').classList.toggle('open');this.el('menu-toggle').setAttribute('aria-expanded',opened);});
        this.bind('export-study',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,archive:this.archive.export(),brains:this.bank.export()},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='neuro-racing-experiences.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
        this.el('import-study').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>32*1024*1024)throw new Error('Fichier limité à 32 Mo.');const data=JSON.parse(await file.text());if(data.version!==1)throw new Error('Format inconnu.');const a=new ExperimentArchive(),b=new BrainBank();a.import(data.archive);b.import(data.brains);this.archive.import(a.export());this.bank.import(b.export());this.renderBank();this.notice='Expériences et pilotes importés.';}catch(error){this.notice=error.message;}finally{event.target.value='';this.refresh(true);}});
        this.el('sim-speed').addEventListener('input',()=>this.outputs());this.renderBank();this.outputs();this.refresh(true);
    }
    bind(id,action){this.el(id).addEventListener('click',()=>{try{action();}catch(error){this.notice=error.message;}this.refresh(true);});}
    layers(values=[]){const host=this.el('layer-controls');host.replaceChildren();for(let i=0;i<+this.el('hidden-count').value;i++){
        const label=document.createElement('label');label.htmlFor='neurons-'+i;label.textContent='Neurones · couche '+(i+1)+' ';
        const output=document.createElement('output');output.id='neurons-'+i+'-value';label.append(output);
        const input=document.createElement('input');input.id='neurons-'+i;input.type='range';input.min=2;input.max=64;input.step=1;input.value=values[i]??16;host.append(label,input);
    }}
    setForm(settings){const fields={rays:'ray-count',sight:'ray-length',acceleration:'max-accel',speed:'speedSlider',population:'population',mutation:'mutation',generations:'generation-budget',seed:'brain-seed'};for(const [key,id] of Object.entries(fields))this.el(id).value=settings[key];this.el('hidden-count').value=settings.hidden.length;this.layers(settings.hidden);this.outputs();}
    readSettings(){return StudyConfig.validate({rays:+this.el('ray-count').value,sight:+this.el('ray-length').value,acceleration:+this.el('max-accel').value,speed:+this.el('speedSlider').value,population:+this.el('population').value,mutation:+this.el('mutation').value,generations:+this.el('generation-budget').value,seed:+this.el('brain-seed').value,hidden:Array.from(this.el('layer-controls').querySelectorAll('input'),input=>+input.value)});}
    readCircuit(){return {family:this.el('track-type').value,seed:+this.el('track-seed').value,width:+this.el('widthSlider').value,difficulty:+this.el('diffSlider').value};}
    apply(){const settings=this.readSettings(),circuit=CircuitFactory.create(this.readCircuit());this.session.configure(settings,circuit);this.settings=settings;this.circuit=circuit;this.dirty=false;this.notice='';this.el('settings-state').textContent='Réglages appliqués.';}
    selectedBrain(){const id=this.el('brain-select').value;const best=id?this.bank.items.find(item=>item.id===id):(this.session.captureBest()||this.session.best);if(!best)throw new Error('Entraîne puis sauvegarde un pilote, ou importe un cerveau.');return JSON.parse(JSON.stringify(best));}
    load(best){this.settings=StudyConfig.validate(best.settings);this.session.configure(this.settings,this.circuit);this.session.best=JSON.parse(JSON.stringify(best));this.setForm(this.settings);this.dirty=false;}
    pilots(){return Array.from({length:4},(_,i)=>{const model=this.bank.items.find(item=>item.id===this.el('pilot-brain-'+i).value);return {id:'pilote-'+i,name:this.el('pilot-name-'+i).value.trim()||'Pilote '+(i+1),network:model?.network,color:['#61dcb0','#ffcc6c','#88aaff','#f6a1c4'][i]};});}
    outputs(){const formats={'ray-count':v=>v,'ray-length':v=>v+' px','max-accel':v=>(+v).toFixed(2),'hidden-count':v=>v,population:v=>v,mutation:v=>Math.round(v*100)+' %','generation-budget':v=>v,'sim-speed':v=>v+'×'};
        for(const [id,format] of Object.entries(formats))this.el(id+'-value').textContent=format(this.el(id).value);
        for(const [id,out] of [['widthSlider','widthVal'],['diffSlider','diffVal'],['speedSlider','speedVal']])this.el(out).textContent=this.el(id).value+(id==='widthSlider'?' px':'');
        const hidden=Array.from(this.el('layer-controls').querySelectorAll('input'),input=>{this.el(input.id+'-value').textContent=input.value;return +input.value;});const sizes=[+this.el('ray-count').value+1,...hidden,2];const parameters=sizes.slice(1).reduce((sum,size,i)=>sum+(sizes[i]+1)*size,0);this.el('architecture').textContent=sizes.join(' → ')+' · '+parameters+' paramètres';
    }
    renderBank(){for(const id of ['brain-select',...Array.from({length:4},(_,i)=>'pilot-brain-'+i)]){const select=this.el(id),chosen=select.value;select.replaceChildren(new Option(id==='brain-select'?'Champion de la session':'Cerveau aléatoire (non entraîné)',''));for(const item of this.bank.items)select.add(new Option(item.name+' · '+item.network.hidden.join('/')+' · '+(item.trainedAll?'validé':'non validé'),item.id));select.value=chosen;}
        this.el('brain-info').textContent=this.bank.items.length+' / 10 pilotes sauvegardés. Un cerveau figé conserve ses poids pendant la course.';
    }
    renderArchives(){if(this.archiveVersion===this.archive.version)return;this.archiveVersion=this.archive.version;
        for(const category of ['winning','killing','pending']){const entries=this.archive.records.filter(entry=>entry.classification===category),host=this.el(category+'-list');host.replaceChildren();if(category!=='pending')this.el(category+'-count').textContent=entries.length;else this.el('pending-summary').textContent='Essais en attente de classement · '+entries.length;
            if(!entries.length){const p=document.createElement('p');p.className='help';p.textContent='Aucun circuit pour le moment.';host.append(p);}
            for(const entry of entries){const card=document.createElement('article');card.className='archive-card';const title=document.createElement('strong');title.textContent=CircuitFactory.types[entry.circuit.spec.family]+' · #'+entry.circuit.spec.seed;const info=document.createElement('p');info.className='help';info.textContent=[entry.settings.rays+1,...entry.settings.hidden,2].join(' → ')+' · '+entry.settings.population+' voitures · '+entry.successes+' succès / '+entry.failures+' échecs';const button=document.createElement('button');button.className='secondary';button.textContent='Recharger ce contexte';button.addEventListener('click',()=>{try{const circuit=CircuitFactory.create(entry.circuit.spec);this.circuit=circuit;this.settings=StudyConfig.validate(entry.settings);this.session.configure(this.settings,circuit);this.setForm(this.settings);for(const [id,key] of [['track-type','family'],['track-seed','seed'],['widthSlider','width'],['diffSlider','difficulty']])this.el(id).value=circuit.spec[key];if(entry.brain)this.session.best={network:entry.brain,settings:entry.settings,generation:0,trainedAll:entry.successes>0};this.outputs();this.notice='Contexte rechargé. Lance le test figé pour le réévaluer.';this.refresh(true);}catch(error){this.notice=error.message;}});const preview=document.createElementNS('http://www.w3.org/2000/svg','svg');preview.setAttribute('viewBox','0 0 1200 760');preview.setAttribute('aria-hidden','true');const outline=document.createElementNS('http://www.w3.org/2000/svg','polyline'),points=CircuitFactory.create(entry.circuit.spec).points;outline.setAttribute('points',[...points,points[0]].map(p=>p.x+','+p.y).join(' '));outline.setAttribute('fill','none');outline.setAttribute('stroke',category==='killing'?'#ed989b':'#78e6be');outline.setAttribute('stroke-width','28');preview.append(outline);const content=document.createElement('div');content.append(title,info,button);card.append(preview,content);host.append(card);}
        }
    }
    refresh(force=false){if(!force&&performance.now()-this.lastRefresh<150)return;this.lastRefresh=performance.now();const s=this.session,c=s.circuit;this.el('track-title').textContent=CircuitFactory.types[c.spec.family];this.el('track-id').textContent=c.id+' / GRAINE '+c.spec.seed;
        const total=s.mode==='race'?s.cars.length:s.settings.population;this.el('generation-stat').textContent=s.mode==='race'?'COURSE':s.generation;this.el('success-stat').textContent=s.completed+' / '+total;this.el('laps-stat').textContent=Math.max(0,...s.cars.map(car=>car.laps))+' / 3';this.el('time-stat').textContent=(s.tick/60).toFixed(1)+' s';
        const entry=this.archive.records.find(entry=>entry.key===this.archive.key(c,s.settings,s.subject));this.el('attempt-stat').textContent=s.mode==='race'?'—':(entry?.failures||0)+' / 4';this.el('run-state').textContent=s.paused?'PAUSE':({ready:'PRÊT',running:s.mode==='race'?'COURSE':s.mode==='evaluation'?'TEST FIGÉ':'ENTRAÎNEMENT',won:'100 % VALIDÉ',killing:'CIRCUIT TUANT','race-complete':'ARRIVÉE'})[s.state]||s.state;
        this.el('pause').textContent=s.paused?'Reprendre':'Pause';this.el('pause').setAttribute('aria-pressed',s.paused);this.el('session-message').textContent=this.notice||s.message;this.el('storage-message').textContent=[this.archive.warning,this.bank.warning].filter(Boolean).join(' ');
        const banner=this.el('completion-banner');banner.hidden=!['won','killing','race-complete'].includes(s.state);const result=s.state==='race-complete'?RaceResult.fromCars(s.cars):null;banner.dataset.race=result?.kind||'';banner.textContent=result?result.text:s.state==='won'?'100 % DE LA POPULATION · 3 TOURS':'4 TENTATIVES ÉCHOUÉES';
        this.el('history-line').setAttribute('points',s.history.map((point,i)=>[5+i*590/Math.max(1,s.history.length-1),90-80*point.passed/point.population].join(',')).join(' '));this.el('history-caption').textContent=s.history.length?'Dernière génération : '+s.history.at(-1).passed+'/'+s.settings.population+' voitures à trois tours.':'La courbe montre la population ayant terminé trois tours.';
        const leaderboard=this.el('leaderboard');leaderboard.replaceChildren();for(const car of s.leaderboard().slice(0,6)){const li=document.createElement('li');li.textContent=car.name+' · '+car.laps+' tours'+(car.finished?' · '+(car.finishTick/60).toFixed(1)+' s':car.dead?' · hors course':' · en piste');leaderboard.append(li);}this.renderArchives();
    }
}
