class CityMap3D {
  constructor() {
    this.route=new CityRoute3D();
    this.routes=[this.route,new CityRoute3D(-28,0,-22,22,'Rue des écoles'),new CityRoute3D(0,28,-22,22,'Avenue du marché'),new CityRoute3D(-28,28,-22,0,'Rue de la gare')];
    this.routes.push(new CityRoute3D(28,56,-22,22,'Boulevard du Soleil'),new CityRoute3D(-56,-28,-22,22,'Boulevard des Jardins'));
    this.routes.push(new CityRoute3D(28,56,-22,0,'Rue du cinéma'),new CityRoute3D(-56,-28,-22,0,'Rue des ateliers'));
    this.districts=[[-14,-11],[14,-11],[-14,11],[14,11],[-42,-11],[-42,11],[42,-11],[42,11]];
    this.route.city=this;
    this.buildings=[];
    const colors=['#f2eadb','#f3be9b','#9fbec0','#bac1dc'];
    for(const sx of [-1,1])for(const sz of [-1,1])for(let i=0;i<4;i++){
      this.buildings.push(new Building3D(sx*(i%2?18:10),sz*(i<2?9:15),5,3.6,2.2+(i%3)*.7,colors[i],['CAFÉ','MAIRIE','MARCHÉ','ÉCOLE'][i]));
    }
    for(const x of [-42,42])for(const z of [-11,11])for(let i=0;i<4;i++)this.buildings.push(new Building3D(x+(i%2?4:-4),z+(i<2?-3:3),5,3.6,2.2+(i%3)*.7,colors[(i+1)%4],['BIBLIOTHÈQUE','BOULANGERIE','CINÉMA','HÔTEL'][i]));
    this.trees=[];this.lamps=[];this.fairground=new Fairground3D();
    for(const [x,z] of this.districts)for(const dx of [-7,0,7])this.trees.push(new Tree3D(x+dx,z, .8+Math.abs(dx)*.025));
    for(const route of [this.route,...this.routes.slice(4)])for(let i=0;i<route.points.length;i+=8){const spawn=route.spawn(i),frame=route.frameAt(spawn.point);const p=spawn.point.clone().add(frame.normal.clone().multiplyScalar(-5));if(!this.lamps.some(lamp=>lamp.position.distanceTo(p)<.8))this.lamps.push(new StreetLamp3D(p.x,p.z,frame.normal));}
    this.stops=[['Gare Centrale',12,3],['École des Lilas',28,4],['Marché des Halles',44,5],['Parc Bellevue',60,2]].map(([name,index,waiting])=>new BusStop3D(name,index,this.route,waiting));
    this.passengers=this.stops.flatMap(stop=>Array.from({length:stop.waiting},(_,i)=>new Passenger3D(stop,i,colors[i%4])));
    this.shops=[this.buildings.find(b=>b.position.x===18&&b.position.z===-9),this.buildings.find(b=>b.position.x===10&&b.position.z===-9),this.buildings.find(b=>b.position.x===38&&b.position.z===-14)].map((building,i)=>new Shop3D(building,i));
    for(const shop of this.shops){const old=this.buildings.findIndex(b=>b.position.equals(shop.position));this.buildings[old]=shop;}
    this.solids=new CitySolids3D(this);this.network=new StreetNetwork3D(this);
  }
}
