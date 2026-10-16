class ArcadeView {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');}
  polygon(points,color){const c=this.ctx;c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.z):c.moveTo(p.x,p.z));c.closePath();c.fill();}
  text(text,x,y,size=24,color='#edf5f3'){const c=this.ctx;c.fillStyle=color;c.font='bold '+size+'px sans-serif';c.textAlign='center';c.fillText(text,x,y);}
  render(game){
    const c=this.ctx;c.clearRect(0,0,1200,760);c.fillStyle='#142b36';c.fillRect(0,0,1200,760);
    if(game.mode==='balloons')this.balloons(game);else this.race(game);
    if(game.paused||game.state==='finished'){
      c.fillStyle='#07151bcc';c.fillRect(0,0,1200,760);this.text(game.paused?'PAUSE':game.message,600,335,game.message.length>50?26:36,'#8affd2');
      this.text(game.mode==='balloons'?game.score+' POINTS':game.player.laps+' / 3 TOURS',600,395,28);this.text('Rejouer ou changer de borne avec les boutons ci-dessus',600,445,19);
    }
  }
  race(game){
    const c=this.ctx,track=game.track;this.polygon(track.outer,'#374956');this.polygon(track.inner,'#36866f');
    c.strokeStyle='#b9c6b1';c.setLineDash([13,17]);c.lineWidth=2;c.beginPath();track.points.forEach((p,i)=>i?c.lineTo(p.x,p.z):c.moveTo(p.x,p.z));c.closePath();c.stroke();c.setLineDash([]);
    for(const points of [track.inner,track.outer]){c.strokeStyle='#e7e9de';c.lineWidth=3;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.z):c.moveTo(p.x,p.z));c.closePath();c.stroke();}
    const gate=track.gates[0];for(let i=0;i<12;i++){c.strokeStyle=i%2?'#f8f8ee':'#11212a';c.lineWidth=8;c.beginPath();c.moveTo(gate.a.x+(gate.b.x-gate.a.x)*i/12,gate.a.z+(gate.b.z-gate.a.z)*i/12);c.lineTo(gate.a.x+(gate.b.x-gate.a.x)*(i+1)/12,gate.a.z+(gate.b.z-gate.a.z)*(i+1)/12);c.stroke();}
    this.text(game.mode==='ghost'?'TOI CONTRE LE CERVEAU':'TURBO CITY',600,345,38,'#d4ffe5');this.text('3 TOURS · FREINE AVANT LES VIRAGES',600,385,17);this.text('ZQSD / FLÈCHES · COMMANDES TACTILES',600,420,15,'#d5efdf');
    if(game.ghost)this.car(game.ghost,'#8ba8ff',.5);this.car(game.player,game.player.dead?'#e87c8c':'#ffce71',1);
    if(game.time<3)this.text(String(Math.ceil(3-game.time)),600,525,80,'#fff1a7');
  }
  car(car,color,alpha){const c=this.ctx;c.save();c.globalAlpha=alpha;c.translate(car.position.x,car.position.z);c.rotate(car.getSpeed()>1?Math.atan2(car.velocity.z,car.velocity.x):car.heading||Math.PI/2);c.fillStyle='#111a24';for(const x of [-8,6])for(const y of [-8,5])c.fillRect(x,y,5,3);c.fillStyle=color;c.fillRect(-12,-6,24,12);c.fillStyle='#173a4b';c.fillRect(-3,-5,8,10);c.fillStyle='#fff7d5';c.fillRect(9,-5,3,3);c.fillRect(9,2,3,3);c.restore();}
  balloons(game){
    const c=this.ctx,gradient=c.createLinearGradient(0,0,0,760);gradient.addColorStop(0,'#193d61');gradient.addColorStop(1,'#b15a70');c.fillStyle=gradient;c.fillRect(0,0,1200,760);
    for(let i=0;i<12;i++){c.fillStyle=i%2?'#e8c38b':'#c85e76';c.beginPath();c.moveTo(i*100,760);c.lineTo(i*100+50,650);c.lineTo(i*100+100,760);c.fill();}
    this.text('BALLOON POP',600,80,42,'#ffe6a1');this.text('VISE · CLIQUE · ENCHAÎNE LES COMBOS',600,115,18);
    for(const b of game.balloons){c.strokeStyle='#f7e6db88';c.lineWidth=2;c.beginPath();c.moveTo(b.position.x,b.position.z+27);c.bezierCurveTo(b.position.x-10,b.position.z+42,b.position.x+10,b.position.z+50,b.position.x,b.position.z+65);c.stroke();c.fillStyle=b.color;c.beginPath();c.ellipse(b.position.x,b.position.z,27,34,0,0,Math.PI*2);c.fill();c.fillStyle='#ffffff77';c.beginPath();c.ellipse(b.position.x-8,b.position.z-11,5,10,.4,0,Math.PI*2);c.fill();}
    for(const effect of game.hitEffects){const t=(game.time-effect.at)/.4;c.strokeStyle='#fff3aa';c.lineWidth=3;c.beginPath();c.arc(effect.x,effect.z,20+t*50,0,Math.PI*2);c.stroke();this.text('POP!',effect.x,effect.z-30-t*20,22);}
  }
}
