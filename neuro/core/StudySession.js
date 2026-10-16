class StudySession {
    constructor(settings,circuit,archive=new ExperimentArchive()){
        this.settings=StudyConfig.validate(settings);this.circuit=circuit;this.archive=archive;this.cars=[];this.best=null;this.bestFitness=-Infinity;this.state='ready';this.mode='training';this.paused=false;this.generation=1;this.attemptGeneration=1;this.tick=0;this.history=[];this.message='Réglages prêts. Lance un entraînement ou teste un cerveau.';
    }
    disposeCars(){for(const car of this.cars)car.dispose();this.cars=[];}
    configure(settings,circuit=this.circuit){
        const validated=StudyConfig.validate(settings);this.disposeCars();this.settings=validated;this.circuit=circuit;this.state='ready';this.paused=false;this.bestFitness=-Infinity;this.generation=1;this.attemptGeneration=1;this.tick=0;this.history=[];this.subject=null;
        if(this.best&&(this.best.network.inputs!==validated.rays+1||JSON.stringify(this.best.network.hidden)!==JSON.stringify(validated.hidden)))this.best=null;
        this.message='Réglages appliqués. La prochaine tentative utilisera cette configuration.';
    }
    start(mode='training',networkData=null,pilots=[]){
        if(!['training','evaluation','race'].includes(mode))throw new RangeError('Mode invalide.');
        if(mode==='evaluation'&&!networkData)throw new Error('Il faut un cerveau à tester.');
        if(networkData&&(networkData.inputs!==this.settings.rays+1||JSON.stringify(networkData.hidden)!==JSON.stringify(this.settings.hidden)))throw new RangeError('Charge les réglages du cerveau avant de le tester.');
        if(mode==='race'&&(pilots.length<2||pilots.length>8))throw new RangeError('La course exige 2 à 8 pilotes.');
        for(const pilot of pilots)if(pilot.network&&pilot.network.inputs!==this.settings.rays+1)throw new RangeError(`Le cerveau de ${pilot.name} exige ${pilot.network.inputs-1} rayons.`);
        this.disposeCars();this.mode=mode;this.generation=1;this.attemptGeneration=1;this.history=[];this.tick=0;this.paused=false;
        this.rng=StudyRandom.create(this.settings.seed);this.fixedNetwork=networkData?JSON.parse(JSON.stringify(networkData)):null;
        this.subject=mode==='evaluation'?'cerveau-'+StudyRandom.hash(JSON.stringify(networkData)):'apprentissage-'+this.settings.seed;
        if(mode==='evaluation'){this.best={network:JSON.parse(JSON.stringify(networkData)),settings:this.settings,generation:0,trainedAll:false};this.bestFitness=-Infinity;}
        this.pilots=pilots.map(pilot=>({...pilot}));
        if(mode==='training'){this.best=null;this.bestFitness=-Infinity;}
        this.createPopulation();this.state='running';this.message=mode==='training'?'Évolution des poids : objectif 100 % × 3 tours.':mode==='evaluation'?'Cerveau figé : aucun apprentissage pendant le test.':'Course lancée : trois tours par pilote, sans mutation.';
    }
    createPopulation(){
        const settings=this.settings,created=[],template=this.fixedNetwork?NeuralNetwork.deserialize(this.fixedNetwork):null;
        try{
            const count=this.mode==='race'?this.pilots.length:settings.population;
            for(let i=0;i<count;i++){
                const pilot=this.mode==='race'?{...this.pilots[i],startOffset:(i/(count-1)-.5)*(this.circuit.spec.width-32)}:{name:'Agent '+(i+1),id:'agent-'+i,color:'#7acbd1'};
                const model=pilot.network?NeuralNetwork.deserialize(pilot.network):template;
                try{created.push(new Car(model,settings,this.circuit,pilot,this.rng));}finally{if(model&&model!==template)model.dispose();}
            }
        }catch(error){for(const car of created)car.dispose();throw error;}finally{template?.dispose();}
        this.cars=created;this.tick=0;
        this.maxTicks=Math.ceil(Math.max(45,this.circuit.length*3/Math.max(1,settings.speed*.28)/60+15)*60);
    }
    captureBest(){
        if(!this.cars.length)return null;
        const car=this.cars.reduce((best,car)=>Genetic.fitness(car,this.circuit)>Genetic.fitness(best,this.circuit)?car:best),fitness=Genetic.fitness(car,this.circuit);
        if(fitness>this.bestFitness){this.bestFitness=fitness;this.best={network:car.brain.serialize(),settings:{...this.settings,hidden:[...car.brain.hidden_nodes]},generation:this.generation,trainedAll:LapRules.allFinished(this.cars,this.settings.population),fitness};}
        if(this.best&&LapRules.allFinished(this.cars,this.settings.population))this.best.trainedAll=true;
        return this.best;
    }
    step(){
        if(this.state!=='running'||this.paused)return;
        this.tick++;
        for(const car of this.cars){
            if(car.dead||car.finished)continue;
            car.think(this.circuit.walls);car.update();
            if(this.circuit.collision(car.previous,car.pos,car.radius)){car.dead=true;car.reason='Collision avec une bordure';}
            if(!car.dead)car.checkCheckpoints(this.circuit);
            if(this.tick>=this.maxTicks&&!car.finished){car.dead=true;car.reason='Temps maximal de tentative atteint';}
        }
        if(this.mode==='evaluation'&&this.cars.some(car=>car.dead)){this.resolveGeneration();return;}
        if(this.cars.every(car=>car.dead||car.finished))this.resolveGeneration();
    }
    resolveGeneration(){
        const passed=this.cars.filter(car=>car.finished&&car.laps>=3&&!car.dead).length,minLaps=Math.min(...this.cars.map(car=>car.laps));
        if(this.mode==='race'){this.state='race-complete';this.message='Course terminée : classement par arrivée, puis progression.';return;}
        const success=LapRules.allFinished(this.cars,this.settings.population);this.captureBest();
        this.history.push({generation:this.generation,passed,population:this.settings.population,bestLaps:Math.max(...this.cars.map(car=>car.laps)),fitness:Math.max(...this.cars.map(car=>Genetic.fitness(car,this.circuit)))});this.history=this.history.slice(-120);
        if(success||this.mode==='evaluation'||this.attemptGeneration>=this.settings.generations){
            const entry=this.archive.record(this.circuit,this.settings,this.subject,{success,passed,minLaps,generation:this.generation,mode:this.mode,networkHash:StudyRandom.hash(JSON.stringify(this.best.network)),network:this.best.network});
            if(success){this.state='won';this.message='Entraînement validé : chaque voiture a terminé trois tours.';return;}
            if(entry.failures>3){this.state='killing';this.message='Quatrième tentative échouée : circuit classé tuant pour ce cerveau et ces réglages.';return;}
            this.attemptGeneration=0;this.message=`Tentative échouée ${entry.failures}/4 · nouvel essai avec les mêmes réglages.`;
        }
        if(this.mode==='evaluation'){this.disposeCars();this.generation++;this.createPopulation();return;}
        const children=Genetic.next(this.cars,this.settings,this.circuit,this.rng);this.disposeCars();this.cars=children;this.tick=0;this.generation++;this.attemptGeneration++;
    }
    leaderboard(){return [...this.cars].sort((a,b)=>a.finished!==b.finished?(a.finished?-1:1):a.finished?a.finishTick-b.finishTick:b.gatesPassed-a.gatesPassed||Genetic.fitness(b,this.circuit)-Genetic.fitness(a,this.circuit));}
    get leader(){return this.leaderboard()[0]||null;}
    get completed(){return this.cars.filter(car=>car.finished&&!car.dead&&car.laps>=3).length;}
    dispose(){this.disposeCars();this.state='disposed';}
}
