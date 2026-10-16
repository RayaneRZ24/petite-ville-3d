// Ajouter les entraînements livrés au projet sans remplacer les sauvegardes du joueur.
function restoreSavedCampaign(lab,campaign){
  const checkedBank=new BrainBank(),checkedArchive=new ExperimentArchive();checkedBank.import(campaign.brains);checkedArchive.import(campaign.archive);
  const report=campaign.trainingReport;
  if(!report||report.training.state!=='won'||report.replay.state!=='won'||report.replay.completed!==report.settings.population||report.replay.laps.length!==report.settings.population||report.replay.laps.some(laps=>laps<3))throw new Error('La campagne fournie ne contient pas une réussite collective validée.');
  if(report.mode==='multicircuit'){
    const circuits=report.circuits;
    if(!Array.isArray(circuits)||circuits.length!==8||new Set(circuits.map(c=>c.circuit?.spec?.family)).size!==8||circuits.some(c=>!c.success||c.state!=='won'||c.generation!==1||c.completed!==report.settings.population||c.laps.length!==report.settings.population||c.laps.some(laps=>laps<3)))throw new Error('Le pilote multi-circuits doit réussir les huit pistes dès le premier essai.');
  }
  const ids=new Set(lab.bank.items.map(item=>item.id)),keys=new Set(lab.archive.records.map(record=>record.key));
  const models=[...lab.bank.items,...checkedBank.items.filter(item=>!ids.has(item.id))].slice(0,10);
  const records=[...lab.archive.records,...checkedArchive.records.filter(record=>!keys.has(record.key))].slice(0,40);
  if(models.length>lab.bank.items.length)lab.bank.import({version:1,items:models});
  if(records.length>lab.archive.records.length)lab.archive.import({version:1,records});
  const pilot=checkedBank.items[0],available=lab.bank.items.some(item=>item.id===pilot.id);lab.renderBank();
  return {id:pilot.id,available};
}
