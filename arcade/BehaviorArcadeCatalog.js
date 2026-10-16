const BehaviorArcadeCatalog=(()=>{
  const entries=[
    {id:'pursuit',label:'POURSUITE',title:'Poursuite & réapparition',color:'#74e6bc',engine:'seek',description:'Les vaisseaux suivent la cible, gagnent de l’XP et réapparaissent à la capture.'},
    {id:'endurance',label:'DUPLICATION',title:'Fuite & duplication',color:'#ffd174',engine:'seek',description:'La cible fuit le vaisseau le plus proche et se duplique après une fuite complète.'},
    {id:'targetRespawn',label:'CIBLE MOBILE',title:'La cible réapparaît',color:'#78c9ff',engine:'seek',description:'À la capture, la cible réapparaît ailleurs et la poursuite continue.'},
    {id:'flee',label:'FUITE',title:'Les vaisseaux fuient',color:'#d5a1ff',engine:'seek',description:'La variante flee : les vaisseaux s’éloignent de la cible.'},
    {id:'missile',label:'LEURRES',title:'Missile, cibles & leurres',color:'#ff927d',engine:'seek',description:'Le missile poursuit les cibles qui accélèrent et larguent leurs leurres.'},
    {id:'snake',label:'PATH SNAKE',title:'Serpent · suivi de chemin',color:'#f5f3ea',engine:'snake',description:'Ton jeu 5.3 : suivi de chemin, séparation et wander. T ajoute un serpent.'},
    {id:'race',label:'TURBO CITY',title:'Course chrono & défi IA',color:'#ffbd62',engine:'classic',description:'La borne d’origine : course manuelle de trois tours ou défi contre le cerveau entraîné.'},
    {id:'balloons',label:'BALLON POP',title:'Tir aux ballons',color:'#ff8daf',engine:'classic',description:'La borne d’origine : trente secondes pour éclater les ballons et enchaîner les combos.'},
  ].map(Object.freeze);
  return Object.freeze({entries:Object.freeze(entries),get(id){const item=entries.find(entry=>entry.id===id);if(!item)throw new RangeError('Borne inconnue.');return item;},url(id){const item=this.get(id);return 'games/'+item.engine+'/index.html?arcade=1&scenario='+encodeURIComponent(item.id);}});
})();
