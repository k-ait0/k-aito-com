"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const tablist=document.querySelector("#result .result-tabs");
 const tabs=["resultTabType","resultTabAxes","resultTabNotes"].map($);
 if(!tablist||tabs.some(t=>!t))throw Error("D272 tab structure drift");
 // WAI-ARIA tabs: horizontal arrows, Home/End rotate active panel and focus.
 tablist.addEventListener("keydown",event=>{
  const i=tabs.indexOf(document.activeElement);
  if(i===-1)return;
  let j=null;
  if(event.key==="ArrowRight")j=(i+1)%tabs.length;
  if(event.key==="ArrowLeft")j=(i+tabs.length-1)%tabs.length;
  if(event.key==="Home")j=0;
  if(event.key==="End")j=tabs.length-1;
  if(j===null)return;
  event.preventDefault();
  tabs[j].focus();
  tabs[j].click();
 });
 // Screen-reader announcements: a change to the question is not silent.
 $("qtext").setAttribute("aria-live","polite");
 $("ynQuestion").setAttribute("role","heading");
 $("ynQuestion").setAttribute("aria-level","3");
 $("ynQuestion").setAttribute("aria-live","polite");
 $("typeName").setAttribute("role","heading");
 $("typeName").setAttribute("aria-level","2");
 // Move focus from hidden previous-screen buttons to current heading.
 let previous=document.body.dataset.screen||"intro";
 const focusScreen=()=>{
  const screen=document.body.dataset.screen;
  if(screen===previous)return;
  previous=screen;
  const target=screen==="question"?$("qtext"):
   screen==="yn"?$("ynHeading"):
   screen==="result"?$("typeName"):screen==="intro"?$("start"):null;
  if(!target)return;
  target.tabIndex=-1;
  requestAnimationFrame(()=>{
   if(document.body.dataset.screen===screen)target.focus({preventScroll:true});
  });
 };
 new MutationObserver(focusScreen).observe(document.body,
  {attributes:true,attributeFilter:["data-screen"]});
})();