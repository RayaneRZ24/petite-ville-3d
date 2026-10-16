const NeuralPolicy={
  predict(network,input){for(let layer=0;layer<network.weights.length;layer+=2){const weight=network.weights[layer],bias=network.weights[layer+1].values,[rows,columns]=weight.shape;input=Array.from({length:columns},(_,j)=>{let sum=0;for(let i=0;i<rows;i++)sum+=input[i]*weight.values[i*columns+j];return Math.fround(1/(1+Math.exp(-Math.fround(Math.fround(sum)+bias[j]))));});}return input;}
};
