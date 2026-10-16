class ExperimentArchive {
    constructor(storage=null){this.storage=storage;this.records=[];this.warning='';this.version=0;this.load();}
    key(circuit,settings,subject){return circuit.id+':'+StudyConfig.signature(settings)+':'+subject;}
    record(circuit,settings,subject,result){
        const config=StudyConfig.validate(settings);
        if(!Number.isInteger(result.passed)||result.passed<0||result.passed>config.population||!Number.isFinite(result.minLaps)||result.minLaps<0||typeof result.success!=='boolean'||(result.success&&(result.passed!==config.population||result.minLaps<3)))throw new RangeError('Un succès exige trois tours pour toute la population.');
        const key=this.key(circuit,config,subject);let entry=this.records.find(entry=>entry.key===key);
        if(!entry){entry={key,circuit:circuit.serialize(),settings:config,subject,failures:0,successes:0,history:[]};this.records.unshift(entry);}
        result.success?entry.successes++:entry.failures++;
        const {network,...summary}=result;if(network)entry.brain=JSON.parse(JSON.stringify(network));
        entry.history.push({...summary,at:new Date().toISOString()});entry.history=entry.history.slice(-12);
        entry.classification=entry.successes>0?'winning':entry.failures>3?'killing':'pending';
        this.records=this.records.slice(0,40);this.version++;this.persist();return entry;
    }
    persist(){try{this.storage?.setItem('neuro-racing-experiments-v1',JSON.stringify({version:1,records:this.records}));}catch(error){this.warning='Stockage local plein ou indisponible : exporte tes résultats pour les garder.';}}
    load(){
        try{const saved=JSON.parse(this.storage?.getItem('neuro-racing-experiments-v1')||'null');if(saved)this.import(saved);}
        catch(error){this.warning='Historique local ignoré : format invalide.';this.records=[];}
    }
    import(data){
        if(!data||data.version!==1||!Array.isArray(data.records)||data.records.length>40)throw new RangeError('Historique invalide.');
        const records=data.records.map(entry=>{
            const settings=StudyConfig.validate(entry.settings),circuit=CircuitFactory.create(entry.circuit?.spec);
            if(circuit.id!==entry.circuit.id||!Number.isInteger(entry.failures)||entry.failures<0||!Number.isInteger(entry.successes)||entry.successes<0||typeof entry.subject!=='string'||entry.subject.length>180||entry.key!==this.key(circuit,settings,entry.subject)||!Array.isArray(entry.history)||entry.history.length>12)throw new RangeError('Résultat de circuit invalide.');
            if(entry.history.some(result=>!Number.isInteger(result.passed)||result.passed<0||result.passed>settings.population||!Number.isFinite(result.minLaps)||result.minLaps<0||typeof result.success!=='boolean'||(result.success&&(result.passed!==settings.population||result.minLaps<3))))throw new RangeError('Historique de tours invalide.');
            if(entry.brain){const brain=NeuralNetwork.deserialize(entry.brain);brain.dispose();if(entry.brain.inputs!==settings.rays+1||JSON.stringify(entry.brain.hidden)!==JSON.stringify(settings.hidden))throw new RangeError('Architecture du résultat incompatible.');}
            return {...entry,settings,classification:entry.successes>0?'winning':entry.failures>3?'killing':'pending'};
        });
        this.records=JSON.parse(JSON.stringify(records));this.version++;this.persist();
    }
    export(){return {version:1,records:JSON.parse(JSON.stringify(this.records))};}
}
