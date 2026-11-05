/**
 * A05 D85: B-axis experimental response representations only.
 * No established psychometrics; never classify T01–T16, store answers or infer
 * a bipolar score from two independent ratings (or the reverse).
 */
export const B_EXPERIMENT_VERSION = "A05-B-EXP-0.1.0-unvalidated";
export const B_EXPERIMENT_MODES = Object.freeze(["bipolar","independent"]);
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const sevenOrNull=value=>value===null||(Number.isInteger(value)&&value>=1&&value<=7);
function exactKeys(config,required){
 return Object.keys(config).length===required.length &&
   required.every(k=>own(config,k));
}
export function validateExperimentalB(config){
 if(!config||typeof config!=="object"||Array.isArray(config))
  throw new TypeError("B experiment config must be an object");
 if(config.mode==="bipolar"){
  if(!exactKeys(config,["mode","answer"])||!sevenOrNull(config.answer))
   throw new TypeError("B bipolar answer must be integer 1..7 or explicit null");
 }else if(config.mode==="independent"){
  if(!exactKeys(config,["mode","self","others"])||
     !sevenOrNull(config.self)||!sevenOrNull(config.others))
   throw new TypeError("B independent ratings must each be integer 1..7 or explicit null");
 }else throw new TypeError("Unsupported B experiment mode");
 return true;
}
export function experimentalB(config){
 validateExperimentalB(config);
 if(config.mode==="bipolar"){
  return Object.freeze({
   schema:B_EXPERIMENT_VERSION,mode:"bipolar",
   answer:config.answer,
   responseStatus:config.answer===null?"unanswered":"answered",
   relativePosition:config.answer===null?null:config.answer-4
  });
 }
 const ratings=Object.freeze({self:config.self,others:config.others});
 return Object.freeze({
  schema:B_EXPERIMENT_VERSION,mode:"independent",ratings,
  responseStatus:config.self===null&&config.others===null?"unanswered":
                 config.self===null||config.others===null?"partial":"answered"
 });
}
export function isLegacyBCompatible(_result){return false;}
