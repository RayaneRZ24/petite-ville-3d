// Entraînement reproductible avec les vrais moteurs de la ville, sans rendu.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function loadEngine(root){
  const tf=require(path.join(root,'libraries/3d/tf.min.js')),context=vm.createContext({tf,console,Math,Date});
  const files=['libraries/3d/yuka.js','neuro/Vector2.js',...['StudyConfig','StudyRandom','Geometry','NeuralNetwork','Ray'].map(n=>'neuro/core/'+n+'.js'),'neuro/Boundary.js',...['Track','Circuit','CircuitFactory','LapRules'].map(n=>'neuro/core/'+n+'.js'),'neuro/NeuralSteering3D.js','neuro/NeuralCar3D.js',...['Genetic','ExperimentArchive','BrainBank','StudySession'].map(n=>'neuro/core/'+n+'.js')];
  for(const name of files)vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
  return vm.runInContext('({StudyConfig,CircuitFactory,StudySession,ExperimentArchive,BrainBank})',context);
}
function train(root,options={},progress=console.log){
  const engine=loadEngine(root),settings=engine.StudyConfig.validate(options.settings||{}),circuit=engine.CircuitFactory.create(options.circuit||{}),archive=new engine.ExperimentArchive();
  const session=new engine.StudySession(settings,circuit,archive),started=Date.now();session.start('training');let generation=0;
  while(session.state==='running'){
    session.step();
    if(session.generation!==generation){generation=session.generation;const last=session.history.at(-1);progress({phase:'training',generation,previous:last||null,elapsedSeconds:Math.round((Date.now()-started)/1000)});}
  }
  const training={state:session.state,generation:session.generation,completed:session.completed,population:settings.population,history:JSON.parse(JSON.stringify(session.history))},best=session.captureBest(),bank=new engine.BrainBank();
  session.dispose();const evaluation=new engine.StudySession(settings,circuit,archive);evaluation.start('evaluation',best.network);
  while(evaluation.state==='running')evaluation.step();
  const replay={state:evaluation.state,completed:evaluation.completed,population:settings.population,laps:evaluation.cars.map(car=>car.laps),ticks:evaluation.tick};
  best.trainedAll=training.state==='won'&&replay.state==='won';const pilot=bank.save(options.name||'Pilote entraîné · Ovale',best);evaluation.dispose();
  const campaign={version:1,archive:archive.export(),brains:bank.export(),trainingReport:{createdAt:new Date().toISOString(),circuit:circuit.serialize(),settings,training,replay,wallSeconds:Math.round((Date.now()-started)/1000)}};
  return {campaign,pilot,validated:best.trainedAll};
}
if(require.main===module){
  const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),family=args[0]||'oval';
  const result=train(root,{circuit:{family},name:family==='oval'?'Pilote entraîné · Ovale':'Pilote entraîné · '+family});
  const folder=path.join(__dirname,'sauvegardes');fs.mkdirSync(folder,{recursive:true});
  // Nom fixe par famille : une copie précédente est conservée avant remplacement.
  const file=path.join(folder,'entrainement-'+family+'.json');if(!/^[a-z]+$/.test(family))throw new RangeError('Famille invalide.');
  if(fs.existsSync(file))fs.copyFileSync(file,file+'.previous');fs.writeFileSync(file+'.tmp',JSON.stringify(result.campaign,null,2));fs.renameSync(file+'.tmp',file);
  if(result.validated)fs.writeFileSync(path.join(__dirname,'savedCampaignData.js'),'// Campagne réellement entraînée et rejouée avec le moteur Yuka.\nconst TrainedCampaign='+JSON.stringify(result.campaign)+';\n');
  console.log(JSON.stringify({saved:file,validated:result.validated,pilot:result.pilot.name,training:result.campaign.trainingReport.training.state,generation:result.campaign.trainingReport.training.generation,replay:result.campaign.trainingReport.replay,wallSeconds:result.campaign.trainingReport.wallSeconds}));
  if(!result.validated)process.exitCode=2;
}
module.exports={loadEngine,train};
