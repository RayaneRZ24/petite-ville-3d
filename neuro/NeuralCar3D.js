class NeuralCar3D extends YUKA.Vehicle {
  constructor(brain,settings,circuit,identity={},rng=Math.random){
    super();const config=StudyConfig.validate(settings),spawn=circuit.spawn(identity.startOffset??(rng()-.5)*Math.min(4,circuit.spec.width/12));
    this.config=config;this.position.set(spawn.position.x,0,spawn.position.y);this.velocity.set(spawn.direction.x*60,0,spawn.direction.y*60);
    this.maxSpeed=config.speed*60;this.maxForce=config.acceleration*3600;this.mass=1;
    this.width=10;this.height=20;this.radius=Math.hypot(10,20)/2;
    this.name=identity.name||'Agent';this.id=identity.id||this.name;this.color=identity.color||'#68cbd5';
    this.brain=brain?brain.copy():new NeuralNetwork(config.rays+1,config.hidden,2,rng);
    if(this.brain.input_nodes!==config.rays+1){this.brain.dispose();throw new RangeError('Le cerveau exige un autre nombre de rayons.');}
    this.pos=createVector();this.vel=createVector();this.syncProjection();this.previous=this.pos.copy();
    this.rays=Array.from({length:config.rays},()=>new Ray());this.sensingWalls=circuit.walls;
    this.dead=false;this.finished=false;this.reason='';this.laps=0;this.gatesPassed=0;this.checkpointIndex=1;
    this.score=0;this.fitness=0;this.frameCount=0;this.framesSinceLastCheckpoint=0;this.finishTick=null;this.inputs=[];this.outputs=[.5,.5];
    this.neuralSteering=new NeuralSteering3D();this.steering.add(this.neuralSteering);
    this.lookAt(this.position.clone().add(this.velocity));
  }
  syncProjection(){this.pos.set(this.position.x,this.position.z);this.vel.set(this.velocity.x/60,this.velocity.z/60);}
  look(walls){
    const heading=this.vel.heading(),fov=Math.PI/1.5,inputs=[];
    for(let i=0;i<this.rays.length;i++){
      const ray=this.rays[i],angle=this.rays.length===1?heading:heading-fov/2+i*fov/(this.rays.length-1);
      ray.setDir(angle);ray.setPos(this.pos.x,this.pos.y);let closest=this.config.sight;
      for(const wall of walls){const hit=ray.cast(wall);if(hit)closest=Math.min(closest,LabVector2.dist(this.pos,hit));}
      ray.end=LabVector2.add(this.pos,ray.dir.copy().mult(closest));inputs.push(1-closest/this.config.sight);
    }
    inputs.push(Math.min(1,this.vel.mag()/this.config.speed));this.inputs=inputs;return inputs;
  }
  think(walls){this.sensingWalls=walls;}
  update(){
    if(this.dead||this.finished)return;this.previous.set(this.pos.x,this.pos.y);
    super.update(1/60);this.syncProjection();this.frameCount++;this.framesSinceLastCheckpoint++;
    if(this.framesSinceLastCheckpoint>600){this.dead=true;this.reason='Aucune progression pendant 10 s';}
  }
  checkCheckpoints(circuit){LapRules.advance(this,circuit);}
  mutate(rate,rng){this.brain.mutate(rate,rng);}
  dispose(){this.brain.dispose();this.steering.clear();}
}
// Le contrôleur partagé de 9b attend ce nom de constructeur.
const Car=NeuralCar3D;
