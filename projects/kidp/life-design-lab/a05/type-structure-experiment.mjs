/**
 * A05 D86: classification-structure thought experiment, not a scoring engine.
 * Every result withholds typeId. Combinatorial counts are mathematical only.
 * No participant data, persistence, old-version conversion or public release.
 */
import { experimentalB } from "./b-experiment.mjs";
export const TYPE_STRUCTURE_EXPERIMENT_VERSION="A05-STRUCTURE-D86-0.1-unvalidated";
export const TYPE_STRUCTURE_MODES=Object.freeze(["B1","B2","B3"]);
const BINARY_AXIS_ORDER=Object.freeze(["A","C","D"]);
const structurallyAllowed={
 B1:{bMode:"bipolar",axes:["A","B","C","D"],fields:[]},
 B2:{bMode:"independent",axes:BINARY_AXIS_ORDER,fields:["self","others"]},
 B3:{bMode:"unclassified",axes:BINARY_AXIS_ORDER,fields:[]}
};
export function structurePreview(mode,scenario){
 if(!TYPE_STRUCTURE_MODES.includes(mode))throw new TypeError("Unsupported B structure");
 if(!scenario||typeof scenario!=="object"||Array.isArray(scenario)||
   !Object.prototype.hasOwnProperty.call(scenario,"bipolar")||
   !Object.prototype.hasOwnProperty.call(scenario,"self")||
   !Object.prototype.hasOwnProperty.call(scenario,"others")||
   Object.keys(scenario).length!==3)
  throw new TypeError("Scenario requires only bipolar, self, others");
 const values=structurallyAllowed[mode];
 const b=mode==="B1"?experimentalB({mode:"bipolar",answer:scenario.bipolar}):
         mode==="B2"?experimentalB({mode:"independent",self:scenario.self,others:scenario.others}):null;
 // 2^N counts are hypothetical configurations, not validated or assigned types.
 const possibleConfigurations=2**values.axes.length;
 return Object.freeze({
  schema:TYPE_STRUCTURE_EXPERIMENT_VERSION,
  mode,
  bFormat:values.bMode,
  hypotheticalAxes:Object.freeze([...values.axes]),
  possibleConfigurations,
  separateBFields:Object.freeze([...values.fields]),
  illustrativeB:b,
  typeId:null,
  groupId:null,
  classificationStatus:"WITHHELD",
  measurementValidity:"UNVALIDATED",
  oldTypeCompatible:false,
  productionApproved:false
 });
}
