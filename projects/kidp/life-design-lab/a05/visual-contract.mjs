/** A05 v15: display-only data contract. It must not infer motifs from legacy T01-T16. */
export const A05_VISUAL_VERSION = 'v15.0-preview';
export const RGBY = Object.freeze({ R:'#FF3B5C', G:'#39FF88', B:'#29B6FF', Y:'#FFE84A' });
const entries = [
 ['polaris','北極星','安定×自律','SA-11'],
 ['sacred-peak','霊峰','安定×自律','SA-10'],
 ['harbor','港','安定×自律','SA-01'],
 ['moon','月','安定×自律','SA-00'],
 ['world-tree','世界樹','安定×つながり','SC-11'],
 ['ocean','大海','安定×つながり','SC-10'],
 ['rainbow','虹','安定×つながり','SC-01'],
 ['constellation','星座','安定×つながり','SC-00'],
 ['pegasus','ペガサス','変化×自律','CA-11'],
 ['phoenix','フェニックス','変化×自律','CA-10'],
 ['nine-tailed-fox','九尾狐','変化×自律','CA-01'],
 ['cat-sith','ケット・シー','変化×自律','CA-00'],
 ['twin-dragons','双龍','変化×つながり','CC-11'],
 ['crow-tengu','鴉天狗','変化×つながり','CC-10'],
 ['whale-pod','鯨の群れ','変化×つながり','CC-01'],
 ['carbuncle','カーバンクル','変化×つながり','CC-00']
];
export const MOTIFS = Object.freeze(entries.map(([id,name,group,slot]) => Object.freeze({id,name,group,slot})));
const motifMap = new Map(MOTIFS.map(m => [m.id,m]));
/** Require explicit display inputs: score->motif and C/D->RGBY are still unresolved. */
export function resolveVisualDisplay({motif,accent,eAxis=null,motion=false}={}) {
 const m=motifMap.get(motif);
 if(!m) throw new TypeError('Missing or unknown motif');
 if(!Object.prototype.hasOwnProperty.call(RGBY,accent)) throw new TypeError('RGBY accent required');
 if(eAxis !== null && eAxis !== 'money' && eAxis !== 'time') throw new TypeError('Invalid E-axis');
 if(typeof motion !== 'boolean') throw new TypeError('Invalid motion');
 return Object.freeze({...m,accent,hex:RGBY[accent],eAxis,motion,assetStatus:'unapproved-concept'});
}
