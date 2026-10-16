class BrainBank {
    constructor(storage=null){this.storage=storage;this.items=[];this.warning='';this.version=0;
        try{const data=JSON.parse(storage?.getItem('neuro-racing-pilots-v1')||'null');if(data)this.import(data);}catch(error){this.warning='Banque locale ignorée : fichier invalide.';this.items=[];}
    }
    save(name,best){
        if(!best?.network)throw new Error('Aucun cerveau disponible. Lance un entraînement.');
        const settings=StudyConfig.validate(best.settings),network=NeuralNetwork.deserialize(best.network);network.dispose();
        if(best.network.inputs!==settings.rays+1||JSON.stringify(best.network.hidden)!==JSON.stringify(settings.hidden))throw new RangeError('Réglages incompatibles avec le cerveau.');
        const id=StudyRandom.hash(JSON.stringify(best.network)),item={id,name:String(name||'Pilote').trim().slice(0,32)||'Pilote',network:best.network,settings,trainedAll:!!best.trainedAll,generation:best.generation||0};
        this.items=[JSON.parse(JSON.stringify(item)),...this.items.filter(other=>other.id!==id)].slice(0,10);this.version++;this.persist();return item;
    }
    import(data){
        if(!data||data.version!==1||!Array.isArray(data.items)||data.items.length>10)throw new RangeError('Banque de cerveaux invalide.');
        const items=data.items.map(item=>{
            const settings=StudyConfig.validate(item.settings),network=NeuralNetwork.deserialize(item.network);network.dispose();
            if(item.network.inputs!==settings.rays+1||JSON.stringify(item.network.hidden)!==JSON.stringify(settings.hidden)||item.id!==StudyRandom.hash(JSON.stringify(item.network)))throw new RangeError('Signature de cerveau invalide.');
            return {...item,settings,name:String(item.name||'Pilote').slice(0,32)};
        });this.items=JSON.parse(JSON.stringify(items));this.version++;this.persist();
    }
    persist(){try{this.storage?.setItem('neuro-racing-pilots-v1',JSON.stringify(this.export()));}catch(error){this.warning='Banque en mémoire seulement : exporte les cerveaux pour les conserver.';}}
    export(){return {version:1,items:JSON.parse(JSON.stringify(this.items))};}
}
