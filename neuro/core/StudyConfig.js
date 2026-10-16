const StudyConfig = {
    defaults: Object.freeze({ rays: 7, sight: 180, acceleration: .4, speed: 5, hidden: [8], population: 24, mutation: .12, generations: 30, seed: 42 }),
    validate(value = {}) {
        const result = {...this.defaults,...value,hidden:[...(value.hidden || this.defaults.hidden)]};
        for (const [key,min,max,integer] of [['rays',1,19,true],['sight',40,600,false],['acceleration',.05,1.5,false],['speed',2,12,false],['population',2,80,true],['mutation',0,.5,false],['generations',1,300,true],['seed',1,4294967295,true]]) {
            if (!Number.isFinite(result[key]) || result[key]<min || result[key]>max || (integer&&!Number.isInteger(result[key]))) throw new RangeError(`Réglage invalide : ${key}`);
        }
        if(result.hidden.length>5||result.hidden.some(n=>!Number.isInteger(n)||n<2||n>64))throw new RangeError('De 0 à 5 couches, avec 2 à 64 neurones chacune.');
        return result;
    },
    signature(value) { const c=this.validate(value); return JSON.stringify([c.rays,c.sight,c.acceleration,c.speed,c.hidden,c.population,c.mutation,c.generations,c.seed]); }
};
