"use strict";

const shelves = [
  {id:"travel", name:"旅", en:"Travel", symbol:"旅"},
  {id:"sake", name:"酒・食", en:"Sake & Food", symbol:"酒"},
  {id:"money", name:"お金", en:"Money", symbol:"¥"},
  {id:"tax", name:"税・会計", en:"Tax & Accounting", symbol:"税"},
  {id:"business", name:"商売", en:"Business", symbol:"商"},
  {id:"create", name:"つくる", en:"Create", symbol:"＋"},
  {id:"technology", name:"テクノロジー", en:"Technology", symbol:"⌘"},
  {id:"thinking", name:"考えごと", en:"Thinking", symbol:"?"}
];

const entries = [
  {id:"site-launch-trouble",title:"サイトを公開しようとしたら、早速つまずいた。",state:"MAKING",shelf:"technology",date:"2026.09.11",image:"notebook",tags:["Web","XServer","GitHub"],summary:"独自ドメイン公開で止まった原因は、.htaccessだった。",body:[
    ["p","K. Aitoの「デジタル物置」を作ることにした。旅行や酒の記録、勉強のメモ、制作物、思いついた事業のアイデア。あちこちに散らばっているものを、少しずつ置いていく場所だ。"],
    ["p","ドメインを取得して、GitHubに仮のトップページを用意。XServer Staticの初期URLで表示できたので、あとは独自ドメインに切り替えるだけ。そう思っていた。"],
    ["h3","「設定ファイルの取得に失敗しました。」"],
    ["p","URL変更の画面で止まった。ネームサーバーの設定は合っていそう。時間を置いても、ブラウザを変えても同じだった。このメッセージだけでは、どのファイルが足りないのか分からない。"],
    ["p","そこでサポートに問い合わせた。今回案内されたのは、サーバーの .htaccess が存在しないということだった。"],
    ["h3","今回確認したのは3つ"],
    ["p","サポートの案内では、.htaccess が存在すること、中身が空でないこと、パーミッションが644であることが確認点だった。中身はコメントだけでもよいとのこと。"],
    ["p","今回はGitHubに .htaccess を作り、「# XServer Static configuration」というコメントを入れた。"],
    ["p","反映後にURL変更をやり直すと、今度は進められた。なお、GitHub上でのファイル作成だけでサーバー上の権限まで保証されるわけではない。同じ状況なら、必要に応じてサーバー側の644も確認したい。"],
    ["p","これは今回の環境で解決した記録で、同じエラーが必ず同じ原因とは限らない。また、すでに .htaccess がある場合は、設定を消してこのコメントだけに置き換えないこと。まず中身を確認する。"],
    ["h3","次の自分のために残す"],
    ["p","表示できたら終わりにせず、手順も残しておくことにした。仮URLでの表示確認、独自ドメインへの切り替え、設定ファイルの確認。次に似た作業をするとき、また同じところで迷わないように。"],
    ["p","最初に置くものが、公開でつまずいた記録になるとは思っていなかった。でも、途中のメモも残す場所にしたかったので、ちょうどいいのかもしれない。"]
  ]}
];

const byId = new Map(entries.map(entry=>[entry.id,entry]));
const esc = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stateTag = state => `<span class="state state-${state.toLowerCase()}">${esc(state)}</span>`;
const photoAlt = {travel:"列車と海のイメージ",sake:"日本酒と料理のイメージ",house:"木の建物のイメージ",notebook:"ノートとペンのイメージ"};

function entryCard(entry, compact=false){
  const photo=entry.image || "notebook";
  const picture=entry.image || compact ? `<span class="card-photo photo photo-${photo}" role="img" aria-label="${photoAlt[photo]}"></span>` : "";
  return `<button type="button" class="entry-card ${!entry.image&&!compact?'text-card':''}" data-entry="${entry.id}" aria-label="${esc(entry.title)}を読む">
    ${compact?picture+stateTag(entry.state):stateTag(entry.state)+picture}
    <span class="card-copy">${!entry.image&&!compact?`<span class="card-date">${entry.date}</span>`:''}<span class="card-title">${esc(entry.title)}</span>${compact?'':`<span class="card-summary">${esc(entry.summary)}</span>`}<span class="card-tags">${entry.tags.map(tag=>'#'+esc(tag)).join('　')}</span><span class="card-arrow" aria-hidden="true">→</span></span>
  </button>`;
}

document.getElementById("recent-grid").innerHTML=entries.slice(0,5).map(entry=>entryCard(entry)).join("");
document.getElementById("shelves-grid").innerHTML=shelves.map(shelf=>`<button type="button" class="shelf" data-shelf="${shelf.id}" aria-label="${shelf.name}の棚を見る"><span class="shelf-symbol" aria-hidden="true">${shelf.symbol}</span><strong>${shelf.name}</strong><small>${shelf.en}</small><span class="shelf-arrow" aria-hidden="true">→</span></button>`).join("");
document.getElementById("shelf-select").insertAdjacentHTML("beforeend",shelves.map(shelf=>`<option value="${shelf.id}">${shelf.name}</option>`).join(""));
const projectEntries=entries.filter(entry=>entry.project);
document.getElementById("projects-grid").innerHTML=projectEntries.length?projectEntries.map(entry=>`<button type="button" class="project-card" data-entry="${entry.id}" aria-label="${esc(entry.projectTitle||entry.title)}の詳細を読む"><span class="project-title">${esc(entry.projectTitle||entry.title)}</span><span class="project-image photo photo-${entry.image}" role="img" aria-label="${photoAlt[entry.image]}"><span class="project-status"><small>ON GOING</small><span>${entry.progress}</span></span></span><span class="project-tags">${entry.tags.map(tag=>`<span>#${esc(tag)}</span>`).join('')}</span><span class="project-description">${esc(entry.projectDescription)}</span><span class="project-end"><span>PROJECT NOTE</span><span aria-hidden="true">→</span></span></button>`).join(""):`<div class="empty-state"><strong>公開中のプロジェクトノートはまだありません。</strong><p>準備が整ったものから追加します。</p></div>`;

let lastRandom=[];
function renderRandom(first=false){
  let selected;
  if(first){ selected=entries.slice(0,Math.min(4,entries.length)); }
  else{
    const fresh=entries.filter(entry=>!lastRandom.includes(entry.id));
    const pool=fresh.length?fresh:[...entries];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    selected=pool.slice(0,Math.min(4,pool.length));
  }
  lastRandom=selected.map(entry=>entry.id);
  document.getElementById("random-grid").innerHTML=selected.map(entry=>entryCard(entry,true)).join("");
}
renderRandom(true);
document.getElementById("shuffle-button").addEventListener("click",()=>renderRandom());

const archiveDialog=document.getElementById("archive-dialog");
const entryDialog=document.getElementById("entry-dialog");
const archiveSearch=document.getElementById("archive-search");
const shelfSelect=document.getElementById("shelf-select");
const stateSelect=document.getElementById("state-select");
let projectsOnly=false;
const dialogOpeners=new WeakMap();

function openDialog(dialog){
  dialogOpeners.set(dialog,document.activeElement);
  if(!dialog.open)dialog.showModal();
  document.body.classList.add("modal-open");
  dialog.scrollTop=0;
}
function openArchive({query="",shelf="all",projects=false}={}){
  archiveSearch.value=query;shelfSelect.value=shelf;stateSelect.value="all";projectsOnly=projects;
  document.getElementById("archive-title").textContent=projects?"進行中のプロジェクト":"物置の中を探す";
  renderArchive();openDialog(archiveDialog);
  if(query)archiveSearch.focus();
}
const normalize = value=>value.normalize('NFKC').toLocaleLowerCase('ja').trim();
function matchingEntries(){
  const query=normalize(archiveSearch.value);
  const words=query.split(/\s+/).filter(Boolean);
  return entries.filter(entry=>{
    if(projectsOnly&&!entry.project)return false;
    if(shelfSelect.value!=="all"&&entry.shelf!==shelfSelect.value)return false;
    if(stateSelect.value!=="all"&&entry.state!==stateSelect.value)return false;
    const shelf=shelves.find(s=>s.id===entry.shelf);
    const haystack=normalize([entry.title,entry.projectTitle||'',entry.summary,...entry.tags,shelf.name,shelf.en,entry.state,...entry.body.map(part=>typeof part[1]==='string'?part[1]:Array.isArray(part[1])?part[1].join(' '):part[1].text)].join(' '));
    return words.every(word=>haystack.includes(word));
  });
}
function renderArchive(){
  const found=matchingEntries();
  document.getElementById("results-count").textContent=`${found.length} 件の置いたもの`;
  document.getElementById("archive-results").innerHTML=found.length?found.map(entry=>entryCard(entry)).join(''):`<div class="empty-state"><strong>この条件のものは、まだありません。</strong><p>別のことばで探すか、棚や状態の条件を変えてみてください。</p></div>`;
}
function openEntry(id){
  const entry=byId.get(id);if(!entry)return;
  const shelf=shelves.find(item=>item.id===entry.shelf);
  const body=entry.body.map(([type,content])=>{
    if(type==='p'||type==='h3')return `<${type}>${esc(content)}</${type}>`;
    if(type==='ul')return `<ul>${content.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
    if(type==='link')return `<p><a href="${esc(content.url)}" target="_blank" rel="noopener noreferrer">${esc(content.text)} ↗</a></p>`;
    return '';
  }).join('');
  document.getElementById("entry-content").innerHTML=`<div class="entry-meta">${stateTag(entry.state)}<time datetime="${entry.date.replaceAll('.','-')}">${entry.date}</time><span>${esc(shelf.name)}</span></div><h2 id="entry-title" class="entry-title">${esc(entry.title)}</h2><p class="entry-lead">${esc(entry.summary)}</p>${entry.image?`<div class="entry-photo photo photo-${entry.image}" role="img" aria-label="${photoAlt[entry.image]}"></div>`:''}<div class="entry-body">${body}</div><div class="entry-tags">${entry.tags.map(tag=>`<span>#${esc(tag)}</span>`).join('')}</div>`;
  openDialog(entryDialog);
}
document.addEventListener("click",event=>{
  const entry=event.target.closest("[data-entry]");if(entry){openEntry(entry.dataset.entry);return;}
  const shelf=event.target.closest("[data-shelf]");if(shelf){openArchive({shelf:shelf.dataset.shelf});return;}
  if(event.target.closest("[data-open-archive]")){openArchive();return;}
  if(event.target.closest("[data-project-archive]")){openArchive({projects:true});return;}
  const close=event.target.closest("[data-close-dialog]");if(close)close.closest("dialog").close();
});
document.getElementById("search-form").addEventListener("submit",event=>{
  event.preventDefault();
  const input=document.getElementById("site-search");
  if(window.matchMedia('(max-width: 700px)').matches&&!input.value&&document.activeElement!==input){input.focus();return;}
  openArchive({query:input.value});
});
document.getElementById("archive-search-form").addEventListener("submit",event=>{event.preventDefault();renderArchive();});
archiveSearch.addEventListener("input",renderArchive);shelfSelect.addEventListener("change",renderArchive);stateSelect.addEventListener("change",renderArchive);
document.getElementById("reset-filters").addEventListener("click",()=>{archiveSearch.value="";shelfSelect.value="all";stateSelect.value="all";renderArchive();archiveSearch.focus();});

for(const dialog of [archiveDialog,entryDialog]){
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>{document.body.classList.remove("modal-open");const opener=dialogOpeners.get(dialog);if(opener&&opener.focus)opener.focus();});
}
