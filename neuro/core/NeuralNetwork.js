// Réseau dense sigmoid / copie / mutation du professeur, avec architecture variable.
class NeuralNetwork {
    constructor(inputs,hidden=[16,16],outputs=2,rng=Math.random,model=null) {
        this.input_nodes=inputs;this.hidden_nodes=typeof hidden==='number'?[hidden]:[...hidden];this.output_nodes=outputs;this.disposed=false;
        if(!Number.isInteger(inputs)||inputs<2||inputs>20||outputs!==2||this.hidden_nodes.length>5||this.hidden_nodes.some(n=>!Number.isInteger(n)||n<2||n>64))throw new RangeError('Architecture neuronale invalide.');
        this.model=model||this.createModel();
        if(!model)tf.tidy(()=>{
            const weights=this.model.getWeights().map(weight=>{
                const shape=weight.shape,limit=shape.length===2?Math.sqrt(6/(shape[0]+shape[1])):.1;
                return tf.tensor(Array.from({length:weight.size},()=> (rng()*2-1)*limit),shape);
            });this.model.setWeights(weights);
        });
    }
    createModel(){
        const model=tf.sequential(),sizes=[...this.hidden_nodes,this.output_nodes];
        sizes.forEach((units,i)=>model.add(tf.layers.dense({units,...(i===0?{inputShape:[this.input_nodes]}:{}),activation:'sigmoid',kernelInitializer:'zeros',biasInitializer:'zeros'})));
        return model;
    }
    predict(inputs){
        if(this.disposed||inputs.length!==this.input_nodes||inputs.some(n=>!Number.isFinite(n)))throw new RangeError('Entrées incompatibles avec le cerveau.');
        return tf.tidy(()=>Array.from(this.model.predict(tf.tensor2d([inputs])).dataSync()));
    }
    copy(){
        if(this.disposed)throw new Error('Cerveau libéré.');
        return tf.tidy(()=>{const model=this.createModel();model.setWeights(this.model.getWeights().map(weight=>weight.clone()));return new NeuralNetwork(this.input_nodes,this.hidden_nodes,this.output_nodes,Math.random,model);});
    }
    mutate(rate,rng=Math.random,strength=.15){
        if(!Number.isFinite(rate)||rate<0||rate>1)throw new RangeError('Taux de mutation invalide.');
        tf.tidy(()=>{
            const weights=this.model.getWeights().map(weight=>{
                const values=Array.from(weight.dataSync(),value=>rng()<rate?Math.max(-8,Math.min(8,value+(rng.gaussian?rng.gaussian():Math.sqrt(-2*Math.log(Math.max(1e-12,rng())))*Math.cos(2*Math.PI*rng()))*strength)):value);
                return tf.tensor(values,weight.shape);
            });this.model.setWeights(weights);
        });
    }
    serialize(){
        if(this.disposed)throw new Error('Cerveau libéré.');
        return tf.tidy(()=>({version:1,inputs:this.input_nodes,hidden:[...this.hidden_nodes],outputs:this.output_nodes,weights:this.model.getWeights().map(weight=>({shape:[...weight.shape],values:Array.from(weight.dataSync())}))}));
    }
    static deserialize(data){
        if(!data||data.version!==1||!Array.isArray(data.weights))throw new RangeError('Fichier de cerveau invalide.');
        const network=new NeuralNetwork(data.inputs,data.hidden,data.outputs,()=>.5);
        try{
            const shapes=network.model.getWeights().map(weight=>[...weight.shape]);
            if(data.weights.length!==shapes.length||data.weights.some((w,i)=>JSON.stringify(w.shape)!==JSON.stringify(shapes[i])||!Array.isArray(w.values)||w.values.length!==shapes[i].reduce((a,b)=>a*b,1)||w.values.some(n=>!Number.isFinite(n)||Math.abs(n)>100)))throw new RangeError('Poids de cerveau incompatibles.');
            tf.tidy(()=>network.model.setWeights(data.weights.map(w=>tf.tensor(w.values,w.shape))));return network;
        }catch(error){network.dispose();throw error;}
    }
    dispose(){if(!this.disposed){this.model.dispose();this.disposed=true;}}
}
