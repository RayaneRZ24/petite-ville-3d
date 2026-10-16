const RaceResult={
  fromCars(cars){
    const finishers=cars.filter(car=>car.finished&&!car.dead&&car.laps>=3&&Number.isFinite(car.finishTick)).sort((a,b)=>a.finishTick-b.finishTick);
    if(!finishers.length)return {kind:'empty',text:'Aucun pilote n’a terminé les trois tours.',podium:[]};
    const time=finishers[0].finishTick,tied=finishers.filter(car=>car.finishTick===time),names=tied.map(car=>String(car.name||'Pilote'));
    return {kind:'winner',text:(names.length>1?'Égalité : '+names.join(' et '):'🏆 '+names[0]+' remporte la course !')+'\n'+(time/60).toFixed(2)+' s · 3 tours\n'+finishers.slice(0,3).map((car,i)=>(i+1)+'. '+car.name+' · '+(car.finishTick/60).toFixed(2)+' s').join('\n'),podium:finishers.slice(0,3)};
  }
};
