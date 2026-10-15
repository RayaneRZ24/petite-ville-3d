class Robber3D extends TownPerson3D {
  constructor(position,shop,index){super(position,shop,index);this.robber=true;this.maxSpeed=1.6;this.phase='approach';this.hasBag=false;}
}
