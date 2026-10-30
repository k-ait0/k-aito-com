/**
 * A05 R1 S5 offline — local-only 136-pair prototype.
 * No network, storage, login, analytics, scoring, or respondent data.
 * All manuscript copy is unapproved.
 */
"use strict";
(function(){
 const $=id=>document.getElementById(id);
 const master=JSON.parse($("offline-master-data").textContent);
 const alternates=JSON.parse($("offline-alternates-data").textContent);
 const types=JSON.parse($("offline-types-data").textContent);
 const first=$("first"),second=$("second"),variantBox=$("draft-variants");
 const byType=new Map(types.map(t=>[t.id,t]));
 const byPair=new Map(master.rows.map(r=>[r.pairId,r]));
 const byAlternative=new Map(alternates.proposals.map(r=>[r.pairId,r]));
 const axes={A:["安定","変化"],B:["自律","つながり"],C:["将来","現在"],D:["探索","深耕"]};
 let variant="v04";
 function need(ok,reason){if(!ok)throw Error(reason);}
 function labelOf(id,axis){
  const n=Number(id.slice(1))-1;
  const group=Math.floor(n/4),within=n%4;
  const positive=axis==="A"?group>=2:axis==="B"?group%2===1:axis==="C"?within>=2:within%2===1;
  return axes[axis][positive?1:0];
 }
 function labelOptions(select){
  for(const t of types){
   const option=document.createElement("option");
   option.value=t.id;
   option.textContent=t.id+"｜"+t.name;
   select.append(option);
  }
 }
 function drawCard(id,t){
  const card=$(id);
  card.dataset.group=t.group;
  card.replaceChildren();
  const code=document.createElement("span");code.className="type-id";
  code.textContent=t.id+" ／ "+t.groupName;
  const name=document.createElement("strong");name.className="type-name";name.textContent=t.name;
  const caption=document.createElement("span");caption.className="type-caption";caption.textContent="暫定の編集キャラクター";
  card.append(code,name,caption);
 }
 function drawAxes(row){
  const body=$("axis-rows");body.replaceChildren();
  for(const axis of ["A","B","C","D"]){
   const left=labelOf(first.value,axis),right=labelOf(second.value,axis);
   const shared=left===right;
   need(row.sharedAxes.includes(axis)===shared&&row.differentAxes.includes(axis)===!shared,"Axis mismatch "+row.pairId+" "+axis);
   const tr=document.createElement("tr");
   const header=document.createElement("th");header.scope="row";header.textContent=axis+"｜"+axes[axis].join("・");
   const a=document.createElement("td");a.textContent=left;
   const b=document.createElement("td");b.textContent=right;
   const status=document.createElement("td");
   const mark=document.createElement("span");mark.className="marker";mark.textContent=shared?"共通":"相違";
   status.append(mark);tr.append(header,a,b,status);body.append(tr);
  }
 }
 function render(reset){
  if(reset){variant="v04";$("option-v04").checked=true;}
  const a=byType.get(first.value),b=byType.get(second.value);
  need(a&&b,"Selected ID invalid");
  const pairId=[a.id,b.id].sort().join("-");
  const row=byPair.get(pairId),alt=byAlternative.get(pairId);
  need(row,"Pair not found "+pairId);
  drawCard("type-card-a",a);drawCard("type-card-b",b);drawAxes(row);
  $("pair-meta").textContent="組合せ "+pairId+" ／ 136組中の1組（表示順序を入れ替えても同じ組合せ）";
  $("axis-note").textContent=a.id===b.id
   ?"4軸の設定ラベルは同じですが、実際の人の希望や行動が一致することを意味しません。"
   :"設定上の共通・相違を示しています。軸の相違数に価値判断はありません。";
  variantBox.hidden=!alt;
  if(!alt)variant="v04";
  const chosen=alt&&variant==="v05"?alt:null;
  $("draft-description").textContent=chosen?chosen.candidateDescription:row.draftDescription;
  const prompts=chosen?chosen.candidatePrompts:row.draftConversationQuestions;
  const list=$("draft-prompts");list.replaceChildren();
  for(const question of prompts){const li=document.createElement("li");li.textContent=question;list.append(li);}
  $("source-status").textContent=chosen
    ?"表示中：v0.5の個別改稿候補。人手一次・独立二次レビュー未実施。"
    :"表示中：v0.4の未承認原案。人手一次・独立二次レビュー未実施。";
  $("results").hidden=false;
 }
 function validate(){
  need(master.schema==="A05-R1-S4-136PAIR-EDITORIAL-MASTER-0.4.0-unapproved"&&master.release==="NO_GO","Unsupported master");
  need(types.length===16&&byType.size===16,"Type registry invalid");
  need(master.rows.length===136&&byPair.size===136,"Pair registry invalid");
  need(alternates.proposals.length===8&&byAlternative.size===8&&alternates.publication==="NO_GO","Alternative set invalid");
  let ordered=0;const unique=new Set();
  for(const t of types)for(const u of types){
   const id=[t.id,u.id].sort().join("-"),row=byPair.get(id);
   need(row,"Missing pair "+id);
   need(row.typeIds.join("-")===id,"Unordered source ID "+id);
   need(row.firstHumanReview==="PENDING"&&row.independentSecondHumanReview==="PENDING"&&row.publicationApproved===false,"Unapproved source only "+id);
   need(["A","B","C","D"].every(ax=>row.sharedAxes.includes(ax)===(labelOf(t.id,ax)===labelOf(u.id,ax))),"Axis mismatch "+id);
   ordered++;unique.add(id);
  }
  need(ordered===256&&unique.size===136,"Selection coverage");
  for(const alt of alternates.proposals){
   need(byPair.has(alt.pairId)&&alt.approved===false&&alt.firstReviewStatus==="PENDING"&&alt.secondReviewStatus==="PENDING","Alternative approval");
  }
 }
 try{
  validate();
  labelOptions(first);labelOptions(second);
  first.value="T02";second.value="T11";
  first.addEventListener("change",()=>render(true));
  second.addEventListener("change",()=>render(true));
  $("swap").addEventListener("click",()=>{
   const v=first.value;first.value=second.value;second.value=v;
   render(false);first.focus();
  });
  for(const input of document.querySelectorAll('input[name="draft-variant"]')){
    input.addEventListener("change",()=>{variant=input.value;render(false);});
  }
  render(true);
  document.documentElement.dataset.offlineReady="true";
  $("offline-integrity").textContent="組合せの静的整合性：256通り／136組を読み込み時に検査済み。";
 }catch(error){
  console.error("A05 offline preview error:",error);
  $("results").hidden=true;$("load-error").hidden=false;
  document.documentElement.dataset.offlineReady="false";
 }
})();
