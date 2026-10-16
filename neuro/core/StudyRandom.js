const StudyRandom = {
    create(seed) {
        let state=seed>>>0;
        const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
        rng.gaussian=()=>Math.sqrt(-2*Math.log(Math.max(1e-12,rng())))*Math.cos(2*Math.PI*rng());
        return rng;
    },
    hash(text) {let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
};
