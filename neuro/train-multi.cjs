// Neuroévolution sur plusieurs pistes ; le pilotage reste exclusivement neuronal.
const fs=require('node:fs'),path=require('node:path'),{loadEngine}=require('./train.cjs');
function random(seed){let state=seed>>>0;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}
function compile(network){
  const layers=[];for(let i=0;i<network.weights.length;i+=2){const [rows,columns]=network.weights[i].shape,w=network.weights[i].values,b=network.weights[i+1].values;
    layers.push(Array.from({length:columns},(_,column)=>({bias:b[column],terms:Array.from({length:rows},(_,row)=>[row,w[row*columns+column]]).filter(term=>term[1]!==0)})));}
  return input=>{for(const layer of layers)input=layer.map(unit=>{let sum=0;for(const [i,w] of unit.terms)sum+=input[i]*w;return Math.fround(1/(1+Math.exp(-Math.fround(Math.fround(sum)+unit.bias))));});return input;};
}
function encoded(NN,p){
  const model=new NN(8,[8],2,()=>.5),data=model.serialize();model.dispose();
  // Symétrie gauche/droite : prior structurel du réseau, pas de suivi de tracé.
  const gain=p[3],turn=[p[0],p[1],p[2],0,-p[2],-p[1],-p[0],0];
  data.weights[0].values=Array.from({length:64},(_,i)=>i%9===0?gain:0);data.weights[1].values=Array(8).fill(-gain/2);
  data.weights[2].values=Array.from({length:16},(_,i)=>i%2?0:turn[i/2]);data.weights[3].values=[0,p[4]];
  const rounded=NN.deserialize(data);const result=rounded.serialize();rounded.dispose();return result;
}
function nearby(walls,point,radius){return walls.filter(w=>Math.max(w.a.x,w.b.x)>=point.x-radius&&Math.min(w.a.x,w.b.x)<=point.x+radius&&Math.max(w.a.y,w.b.y)>=point.y-radius&&Math.min(w.a.y,w.b.y)<=point.y+radius);}
function scoreCandidate(network,context,circuits,generation){
  const template=context.NN.deserialize(network),forward=compile(network),results=[];
  try{for(const circuit of circuits){
    const car=new context.Car(template,context.settings,circuit,{},()=>.2+.15*(generation%5));car.brain.predict=forward;
    for(let tick=0;tick<10000&&!car.dead&&car.laps<1;tick++){
      car.think(nearby(circuit.walls,car.pos,context.settings.sight));car.update();
      if(circuit.collision(car.previous,car.pos,car.radius))car.dead=true;
      if(!car.dead)car.checkCheckpoints(circuit);
    }
    results.push({circuit:circuit.id,progress:Math.min(1,car.gatesPassed/circuit.gates.length),ticks:car.frameCount});car.dispose();
  }}finally{template.dispose();}
  const worst=Math.min(...results.map(r=>r.progress)),average=results.reduce((a,r)=>a+r.progress,0)/results.length,time=results.reduce((a,r)=>a+r.ticks,0)/results.length;
  return {fitness:1000*worst+100*average+(worst===1?10000/Math.max(1,time):0),passed:results.filter(r=>r.progress===1).length,results};
}
function validate(network,settings,circuit,engine,tf){
  const session=new engine.StudySession(settings,circuit);session.start('evaluation',network);const model=session.cars[0].brain.model;
  while(session.state==='running'&&session.generation===1){
    const alive=session.cars.filter(car=>!car.dead&&!car.finished),originals=alive.map(car=>car.look),inputs=alive.map(car=>car.look(circuit.walls));
    const outputs=tf.tidy(()=>model.predict(tf.tensor2d(inputs)).arraySync());
    alive.forEach((car,i)=>{car.brain.predict=()=>outputs[i];car.look=()=>inputs[i];});
    session.step();alive.forEach((car,i)=>{car.look=originals[i];});
  }
  const result={circuit:circuit.serialize(),state:session.state,generation:session.generation,completed:session.completed,population:settings.population,laps:session.cars.map(car=>car.laps),ticks:session.tick,success:session.state==='won'&&session.generation===1&&session.completed===settings.population};
  session.dispose();return result;
}
function train(root,options={}){
  const engine=loadEngine(root),tf=require(path.join(root,'libraries/3d/tf.min.js')),settings=engine.StudyConfig.validate({hidden:[8],speed:3,population:24}),rng=random(20261016),seedSession=new engine.StudySession({...settings,population:2},engine.CircuitFactory.create());seedSession.start();
  const context={settings,Car:seedSession.cars[0].constructor,NN:seedSession.cars[0].brain.constructor};seedSession.dispose();
  const families=Object.keys(engine.CircuitFactory.types),base=families.map(family=>engine.CircuitFactory.create({family}));
  const variants=families.map(family=>engine.CircuitFactory.create({family,seed:73,width:75,difficulty:40}));const courses=[...base,...variants];
  let population=Array.from({length:12},()=>[rng()*8-4,rng()*8-4,rng()*8-4,1+rng()*4,.2+rng()]),champion=null,validation=null;const history=[],started=Date.now();
  for(let generation=1;generation<=20;generation++){
    const evaluated=population.map((genes,index)=>{const network=encoded(context.NN,genes),score=scoreCandidate(network,context,courses,generation);console.log(JSON.stringify({phase:'selection',generation,candidate:index+1,passed:score.passed,total:courses.length,seconds:Math.round((Date.now()-started)/1000)}));return {genes,network,...score};}).sort((a,b)=>b.fitness-a.fitness);
    champion=evaluated[0];history.push({generation,fitness:champion.fitness,passed:champion.passed,total:courses.length,genes:champion.genes});
    if(generation>=3&&champion.passed===courses.length){
      validation=[];for(const circuit of base){const result=validate(champion.network,settings,circuit,engine,tf);validation.push(result);console.log(JSON.stringify({phase:'validation',family:circuit.spec.family,...result}));}
      if(validation.every(result=>result.success)){
        const archive=new engine.ExperimentArchive(),bank=new engine.BrainBank(),pilot=bank.save('Pilote universel · 8 circuits',{network:champion.network,settings,generation,trainedAll:true});
        for(let i=0;i<base.length;i++)archive.record(base[i],settings,'cerveau-'+pilot.id,{success:true,passed:24,minLaps:3,generation:1,mode:'evaluation',networkHash:pilot.id,network:champion.network});
        const campaign={version:1,archive:archive.export(),brains:bank.export(),trainingReport:{mode:'multicircuit',createdAt:new Date().toISOString(),settings,circuit:base[0].serialize(),training:{state:'won',completed:24,population:24,generation,history},replay:validation[0],circuits:validation,trainingCircuits:courses.map(c=>c.serialize()),algorithm:'sélection génétique sur 16 pistes, réseau dense à symétrie gauche/droite',wallSeconds:Math.round((Date.now()-started)/1000)}};
        const folder=path.join(root,'neuro/sauvegardes');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'entrainement-multicircuits.json'),JSON.stringify(campaign,null,2));fs.writeFileSync(path.join(root,'neuro/savedCampaignData.js'),'// Un seul cerveau, validé sur huit familles.\nconst TrainedCampaign='+JSON.stringify(campaign)+';\n');return campaign;
      }
    }
    population=evaluated.slice(0,3).map(item=>[...item.genes]);while(population.length<12){const parent=evaluated[Math.floor(rng()*4)].genes;population.push(parent.map((value,i)=>Math.max(i===3?.5:i===4?-.5:-8,Math.min(i===3?6:i===4?1.5:8,value+(rng()*2-1)*(i===4?.15:.7)))));}
  }
  throw new Error('Aucun cerveau validé sur toutes les pistes : les sauvegardes précédentes sont conservées.');
}
if(require.main===module){const root=path.resolve(__dirname,'..');const result=train(root);console.log(JSON.stringify({saved:true,generation:result.trainingReport.training.generation,circuits:result.trainingReport.circuits.length,wallSeconds:result.trainingReport.wallSeconds}));}
module.exports={random,compile,encoded,nearby,scoreCandidate,validate,train};
