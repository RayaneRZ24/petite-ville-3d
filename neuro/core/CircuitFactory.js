const CircuitFactory={
    types:{oval:'Ovale école',stadium:'Stadium',grandprix:'Grand Prix',chicane:'Chicanes',clover:'Trèfle',coast:'Route côtière',polygon:'Virages carrés',random:'Boucle aléatoire'},
    create(options={}){
        const spec={family:'oval',seed:42,width:90,difficulty:12,...options};
        if(!this.types[spec.family]||!Number.isInteger(spec.seed)||spec.seed<1||spec.seed>4294967295||!Number.isFinite(spec.width)||spec.width<45||spec.width>130||!Number.isInteger(spec.difficulty)||spec.difficulty<1||spec.difficulty>50)throw new RangeError('Paramètres du circuit invalides.');
        for(let trial=0;trial<9;trial++){
            const amplitude=.72**trial,raw=this.shape(spec,amplitude),points=resamplePoints(raw,26),circuit=new Circuit(spec,points,amplitude);
            if(circuit.valid())return circuit;
        }
        throw new RangeError('Ce circuit ne permet pas une piste valide. Réduis la largeur ou change la graine.');
    },
    shape(spec,amplitude){
        const rng=StudyRandom.create(spec.seed),phases=Array.from({length:5},()=>rng()*Math.PI*2),complexity=spec.difficulty/50,raw=[];
        for(let i=0;i<160;i++){
            const t=i/160*Math.PI*2,c=Math.cos(t),s=Math.sin(t);let x,y,r=1;
            if(spec.family==='stadium'){
                const angle=(i%80)/80*Math.PI-Math.PI/2;
                x=(i<80?270:-270)+(i<80?Math.cos(angle):-Math.cos(angle))*185;
                y=(i<80?Math.sin(angle):-Math.sin(angle))*185;
            }else{
                if(spec.family==='chicane')r+=amplitude*(.06+.10*complexity)*Math.sin(3*t+phases[0]);
                if(spec.family==='clover')r+=amplitude*(.06+.12*complexity)*Math.cos(3*t);
                if(spec.family==='coast')r+=amplitude*(.08*Math.sin(2*t+phases[0])+(.02+.06*complexity)*Math.sin(5*t+phases[1]));
                if(spec.family==='random')for(let j=0;j<3;j++)r+=amplitude*(.035+.035*complexity)*Math.sin((j+2)*t+phases[j]);
                const power=spec.family==='grandprix'?2/(2.8+complexity):spec.family==='polygon'?2/(3.6+1.2*amplitude):1;
                x=430*r*Math.sign(c)*Math.abs(c)**power;y=235*r*Math.sign(s)*Math.abs(s)**power;
            }
            raw.push([600+x,380+y]);
        }
        return raw;
    }
};
