class Shop3D extends Building3D {
  constructor(building,index) {
    super(building.position.x,building.position.z,building.width,building.depth,building.height,building.color,
      ['BIJOUTERIE ÉCLAT','MODE & CO','ÉPICERIE DU COIN'][index]);
    this.shopId=index;this.isShop=true;this.door=this.position.clone().add(new YUKA.Vector3(0,0,this.depth/2));
    this.inside=this.door.clone().add(new YUKA.Vector3(0,0,-1));
    this.forecourt=this.door.clone().add(new YUKA.Vector3(0,0,1.6));this.open=true;
  }
}
