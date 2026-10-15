import test from 'node:test';import assert from 'node:assert/strict';import {cityFixture} from './cityFixture.mjs';

test('solides : façades, troncs, abribus et boutiques ont des volumes, porte accessible uniquement à pied',()=>{
 const {YUKA,CityMap3D,CitySolids3D}=cityFixture(),city=new CityMap3D();assert.equal(city.shops.length,3);
 for(const owner of [...city.buildings,...city.trees,...city.stops])assert.ok(city.solids.bodies.some(body=>body.owner===owner));
 const shop=city.shops[0];assert.equal(city.solids.free(shop.position,.7),false);
 assert.equal(city.solids.free(shop.door,.23,{isPerson:true}),true);
 assert.equal(city.solids.free(shop.position.clone().add(new YUKA.Vector3(2.5,0,0)),.23,{isPerson:true}),false);
 const body={position:new YUKA.Vector3(),hx:2,hz:1,direction:new YUKA.Vector3(1,0,0)};
 const contact=CitySolids3D.contact(body,new YUKA.Vector3(2,0,0));assert.equal(contact.gap,1);assert.equal(contact.normal.x,1);
 assert.ok(CitySolids3D.contact(body,new YUKA.Vector3()).gap<0);
});

test('solides : forces bornées et freinage contre une façade, un tronc ou un abribus, sans téléportation',()=>{
 const {YUKA,CityMap3D,TrafficContacts3D,TrafficSteering3D,CitySolids3D}=cityFixture(),city=new CityMap3D();
 for(const body of [city.solids.bodies.find(b=>b.owner===city.buildings[0]),city.solids.bodies.find(b=>b.owner===city.trees[0]),city.solids.bodies.find(b=>b.owner===city.stops[0])]){
  const car=new YUKA.Vehicle();car.collisionRadius=.7;car.boundingRadius=.7;car.maxForce=15;car.maxSpeed=8;car.steering=new TrafficSteering3D(car);car.solidBodies=[body];
  const target=body.position.clone(),direction=body.direction||new YUKA.Vector3(0,0,1),extent=body.hz??body.radius;
  car.position.copy(target).add(direction.clone().multiplyScalar(extent+7));car.velocity.copy(direction).multiplyScalar(-6);car.steering.add(new YUKA.SeekBehavior(target));
  const contacts=new TrafficContacts3D();for(let i=0;i<360;i++){const before=car.position.clone();contacts.prepare([car],1/60);assert.ok(car.position.equals(before));assert.ok(car.steering.planned.length()<=car.maxForce+1e-8);car.update(1/60);assert.ok(CitySolids3D.contact(body,car.position).gap>=car.collisionRadius-.001);}
 }
});

test('déviation : graphe connecté, rue fermée évitée, demi-tour par force et reprise du bus',()=>{
 const {CityMap3D,World3D,YUKA}=cityFixture(),city=new CityMap3D(),world=new World3D(()=>.2,city.route),network=city.network;
 network.close(7,10);const path=network.route(7,10);assert.ok(path.length>2);for(let i=1;i<path.length;i++)assert.notEqual(network.key(path[i-1],path[i]),'7:10');
 const bus=world.addBus();world.mission.start(bus);world.incident.state='robbery';world.incident.shop=city.shops[0];world.incident.divert(bus);world.mission.prepare(.1);assert.equal(bus.service.active,false);assert.equal(bus.detouring,true);
 const before=bus.position.clone(),velocity=bus.velocity.clone(),force=new YUKA.Vector3();bus.navigation.calculate(bus,force);assert.ok(force.length()<=bus.maxForce+1e-8);assert.ok(bus.position.equals(before)&&bus.velocity.equals(velocity));
 world.incident.restoreTraffic();assert.equal(bus.road.circuit,city.route);assert.equal(bus.navigation.active,false);assert.equal(bus.detouring,false);
});

test('intervention refusée si le trottoir est occupé, temps invalide et absence de créations partielles',()=>{
 const {CityMap3D,World3D,TownPerson3D,YUKA}=cityFixture(),world=new World3D(()=>.2,new CityMap3D().route),shop=world.city.shops[0];
 const person=new TownPerson3D(shop.forecourt.clone().add(new YUKA.Vector3(0,0,1)),shop);world.people.push(person);world.register(person);
 assert.equal(world.incident.start(),false);assert.equal(world.traffic.length,0);assert.equal(world.people.length,1);assert.equal(world.incident.state,'idle');
 world.update(NaN);world.update(-1);assert.equal(world.incident.elapsed,0);
});

test('commerces : clients achètent, entrent et ressortent sans traverser les murs ni se superposer',()=>{
 const {CityMap3D,World3D,CitySolids3D,rng}=cityFixture(),world=new World3D(rng,new CityMap3D().route);world.incident.populate();const seen=new Set();
 for(let i=0;i<2400;i++){world.update(1/60);for(const person of world.people){seen.add(person.personIndex+':'+person.hasBag);for(const body of person.solidBodies)if(CitySolids3D.applies(body,person))assert.ok(CitySolids3D.contact(body,person.position).gap>=person.collisionRadius-.001,`mur ${person.personIndex}`);}}
 for(let i=0;i<3;i++){assert.ok(seen.has(i+':true'));assert.ok(seen.has(i+':false'));}
});

test('braquage : trois individus, intervention, durée de 30 s, barrages, sortie et nettoyage réels',()=>{
 const {CityMap3D,World3D,rng,CitySolids3D}=cityFixture(),world=new World3D(rng,new CityMap3D().route);world.incident.populate();
 const event=world.incident;assert.equal(event.start(),true);assert.equal(event.start(),false);assert.equal(event.robbers.length,3);assert.equal(event.cars.filter(car=>car.incidentRole==='police').length,3);
 const states=new Set(),start={};let minDistance=Infinity,allInside=false,closed=false;
 for(let i=0;i<15000&&event.state!=='complete';i++){
  world.update(1/60);states.add(event.state);start[event.state]??=i/60;
  allInside ||= event.robbers.every(person=>person.position.z<event.shop.door.z-.5);
  closed ||= event.barricades.length===2&&event.barricades.every(barrier=>barrier.active);
  if(event.state==='robbery')assert.equal(event.robbers.filter(person=>person.visible).length,3);
  const actors=[...world.traffic,...world.people.filter(p=>p.visible)];
  for(let a=0;a<actors.length;a++)for(let b=a+1;b<actors.length;b++){const gap=actors[a].position.distanceTo(actors[b].position)-actors[a].collisionRadius-actors[b].collisionRadius;minDistance=Math.min(minDistance,gap);assert.ok(gap>=-.005,`contact ${actors[a].agentId}/${actors[b].agentId} ${gap}`);}
  for(const actor of actors)for(const body of actor.solidBodies)if(CitySolids3D.applies(body,actor))assert.ok(CitySolids3D.contact(body,actor.position).gap>=actor.collisionRadius-.01,`décor ${actor.agentId}`);
 }
 assert.equal(event.state,'complete',JSON.stringify({state:event.state,elapsed:event.elapsed,cars:event.cars.map(c=>[c.agentId,c.position,c.getSpeed(),c.navigation.points]),people:event.robbers.map(p=>[p.position,p.waypoints])}));
 assert.ok(start.boarding-start.robbery>=30-1/60);for(const state of ['robbery','boarding','chase','complete'])assert.ok(states.has(state));
 assert.ok(allInside,'les trois individus entrent réellement');assert.ok(closed,'les deux barrages se ferment après stationnement');
 assert.equal(world.traffic.length,0);assert.equal(world.people.length,3);assert.equal(event.barricades.length,0);assert.equal(world.city.network.blocked.size,0);assert.equal(world.agents.length,3);
});

test('intervention : trafic complet, bus et anciens barrages, déviation sans traversée du décor',()=>{
 const {CityMap3D,World3D,rng,CitySolids3D,YUKA}=cityFixture(),world=new World3D(rng,new CityMap3D().route);
 for(const index of [4,15,26,37,48,59]){const spawn=world.circuit.spawn(index),frame=world.circuit.frameAt(spawn.point);world.addObstacle(spawn.point.add(frame.normal.multiplyScalar(1.6)));}
 for(let i=0;i<15;i++)world.addVehicle();const bus=world.addBus();world.incident.populate();world.mission.start(bus);
 const event=world.incident;assert.equal(event.start(),true);const normal=[...world.traffic.filter(c=>!c.incidentRole)],before=normal.map(c=>c.position.clone());let closed=false,diverted=false;
 for(let i=0;i<12000&&event.state!=='complete';i++){
  world.update(1/60);closed ||= event.barricades.some(b=>b.active);diverted ||= normal.some(c=>c.detouring);
  const actors=[...world.traffic,...world.people.filter(p=>p.visible)];
  for(let a=0;a<actors.length;a++)for(let b=a+1;b<actors.length;b++)assert.ok(actors[a].position.distanceTo(actors[b].position)>=actors[a].collisionRadius+actors[b].collisionRadius-.01,'collision de deux entités');
  for(const actor of actors)for(const body of actor.solidBodies)if(CitySolids3D.applies(body,actor))assert.ok(CitySolids3D.contact(body,actor.position).gap>=actor.collisionRadius-.01,`décor traversé ${actor.agentId}`);
 }
 assert.equal(event.state,'complete',JSON.stringify({state:event.state,cars:event.cars.map(c=>[c.position,c.getSpeed(),c.navigation.points]),robbers:event.robbers.map(p=>[p.position,p.waypoints])}));
 assert.ok(diverted);assert.ok(closed);assert.equal(world.traffic.length,16);assert.ok(normal.some((car,i)=>car.position.distanceTo(before[i])>10));assert.ok(normal.every(car=>!car.detouring));
 assert.equal(event.start(),true,'scène rejouable sans anciens barrages ni acteurs fantômes');
});
