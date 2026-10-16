// Élitisme et sélection par tournoi repris de l'exemple du professeur.
const Genetic={
    fitness(car,circuit){
        const gate=circuit.gates[car.checkpointIndex],distance=p5.Vector.dist(car.pos,gate.center),proximity=Math.max(0,1-distance/80);
        return car.gatesPassed*100+proximity*25+(car.finished?300+Math.max(0,100-car.frameCount/100):0);
    },
    tournament(population,rng){let best=null;for(let i=0;i<5;i++){const candidate=population[Math.floor(rng()*population.length)];if(!best||candidate.fitness>best.fitness)best=candidate;}return best;},
    next(population,settings,circuit,rng){
        if(!population.length)throw new RangeError('Population vide.');
        for(const car of population)car.fitness=this.fitness(car,circuit);
        const sorted=[...population].sort((a,b)=>b.fitness-a.fitness),winners=sorted.filter(car=>car.finished),children=[];
        // Après les premières réussites, préserver davantage de copies et réduire les mutations.
        const elite=Math.max(1,Math.ceil(settings.population*(winners.length?.7:.15))),rate=winners.length?settings.mutation*.1:settings.mutation;
        try{
            for(let i=0;i<settings.population;i++){
                const parent=i<elite?(winners.length?winners[i%winners.length]:sorted[i%Math.max(1,Math.ceil(sorted.length*.15))]):this.tournament(population,rng);
                const child=new Car(parent.brain,settings,circuit,{id:'agent-'+i,name:'Agent '+(i+1)},rng);if(i>=elite)child.mutate(rate,rng);children.push(child);
            }
        }catch(error){for(const child of children)child.dispose();throw error;}
        return children;
    }
};
