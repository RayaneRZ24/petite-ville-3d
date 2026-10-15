// Trois vues arrière basse résolution, uniquement pour l'habitacle observé.
class VehicleMirrors3D {
  constructor(view){this.view=view;this.elapsed=Infinity;this.subject=null;this.targets=[];this.camera=new THREE.PerspectiveCamera(65,1.6,.02,250);}
  update(dt){
    const view=this.view,entity=view.vehicleCamera.subject,root=view.views.get(entity),model=root?.userData.model;
    if(view.vehicleCamera.mode!=='first'||!model){this.elapsed=Infinity;return;}
    this.elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
    if(this.subject!==entity){const old=view.views.get(this.subject)?.userData.model;for(const mirror of old?.mirrors||[]){mirror.surface.material.map=null;mirror.surface.material.color.set('#a9cadb');mirror.surface.material.needsUpdate=true;}this.subject=entity;this.elapsed=Infinity;for(const target of this.targets)target.dispose();this.targets=model.mirrors.map(()=>new THREE.WebGLRenderTarget(128,80));model.mirrors.forEach((mirror,i)=>{mirror.surface.material.map=this.targets[i].texture;mirror.surface.material.color.set('#ffffff');mirror.surface.material.needsUpdate=true;});}
    if(this.elapsed<1/12)return;this.elapsed=0;
    const renderer=view.renderer,previous=renderer.getRenderTarget(),visible=root.visible,shadow=renderer.shadowMap.autoUpdate;
    const viewport=renderer.getViewport?.(new THREE.Vector4()),scissor=renderer.getScissor?.(new THREE.Vector4()),scissorTest=renderer.getScissorTest?.();
    const sky=view.atmosphere?.sky,skyPosition=sky?.position.clone(),surfaces=model.mirrors.map(m=>m.surface.visible);for(const mirror of model.mirrors)mirror.surface.visible=false;renderer.shadowMap.autoUpdate=false;
    try{
      root.updateMatrixWorld(true);
      model.mirrors.forEach((mirror,i)=>{
        const pos=mirror.local.clone().applyMatrix4(root.matrixWorld),direction=new THREE.Vector3(mirror.side*.18,0,-1).applyQuaternion(root.quaternion);
        this.camera.position.copy(pos);this.camera.lookAt(pos.clone().add(direction.multiplyScalar(30)));this.camera.updateMatrixWorld(true);if(sky)sky.position.copy(pos);
        renderer.setRenderTarget(this.targets[i]);renderer.render(view.scene,this.camera);
      });
    }finally{renderer.setRenderTarget(previous);if(viewport)renderer.setViewport(viewport);if(scissor)renderer.setScissor(scissor);if(scissorTest!==undefined)renderer.setScissorTest(scissorTest);root.visible=visible;model.mirrors.forEach((m,i)=>{m.surface.visible=surfaces[i];});renderer.shadowMap.autoUpdate=shadow;if(sky)sky.position.copy(skyPosition);}
  }
}
