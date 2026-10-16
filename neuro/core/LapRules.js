const LapRules={
    targetLaps:3,
    advance(car,circuit){
        if(car.dead||car.finished)return;
        const count=circuit.gates.length;
        for(let checked=0;checked<4;checked++){
            const gate=circuit.gates[car.checkpointIndex],before=p5.Vector.sub(car.previous,gate.center).dot(gate.forward),after=p5.Vector.sub(car.pos,gate.center).dot(gate.forward);
            if(!(before<0&&after>=0&&car.vel.dot(gate.forward)>0&&Geometry.intersection(car.previous,car.pos,gate.a,gate.b)))break;
            car.gatesPassed++;car.checkpointIndex=(car.checkpointIndex+1)%count;car.framesSinceLastCheckpoint=0;car.score=car.gatesPassed*50;
            car.laps=Math.floor(car.gatesPassed/count);
            if(car.laps>=this.targetLaps){car.finished=true;car.finishTick=car.frameCount;break;}
        }
    },
    allFinished(cars,total){return cars.length===total&&total>0&&cars.every(car=>car.finished&&car.laps>=this.targetLaps&&!car.dead);}
};
