"use strict";

// The published catalogue is shared with subpage search.
const {shelves,entries}=window.KAitoContent;

const byId = new Map(entries.map(entry=>[entry.id,entry]));
const esc = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stateTag = state => `<span class="state state-${state.toLowerCase()}">${esc(state)}</span>`;
const photoAlt = {travel:"列車と海のイメージ",sake:"日本酒と料理のイメージ",house:"木の建物のイメージ",notebook:"ノートとペンのイメージ"};

function entryCard(entry, compact=false){
  const asset=entry.thumbnail;
  const picture=asset ? `<img class="card-photo note-thumbnail" src="${esc(asset.src)}" alt="${esc(asset.alt)}" width="640" height="360" loading="lazy" decoding="async">` : "";
  const content=`${compact?picture+stateTag(entry.state):stateTag(entry.state)+picture}
    <span class="card-copy"><span class="card-kind">ARTICLE</span><span class="card-date">${entry.date}</span><span class="card-title">${esc(entry.title)}</span>${compact?'':`<span class="card-summary">${esc(entry.summary)}</span>`}<span class="card-tags">${entry.tags.map(tag=>'#'+esc(tag)).join('　')}</span><span class="card-arrow" aria-hidden="true">→</span></span>`;
  if(entry.url)return `<a class="entry-card entry-card-link ${!entry.thumbnail&&!compact?'text-card':''}" data-card-type="article" href="${esc(entry.url)}" aria-label="${esc(entry.title)}を読む">${content}</a>`;
  return `<button type="button" class="entry-card ${!entry.thumbnail&&!compact?'text-card':''}" data-card-type="article" data-entry="${entry.id}" aria-label="${esc(entry.title)}を読む">${content}</button>`;
}

const publishedNotes=window.KAitoContent.publishedNotes || entries.filter(entry=>entry.url&&entry.url.startsWith("/notes/")).slice().sort((a,b)=>b.date.localeCompare(a.date));
// The latest article has its own feature above the shelves. Avoid a duplicate card below.
document.getElementById("recent-grid").innerHTML=publishedNotes.slice(1,4).map(entry=>entryCard(entry)).join("");
document.getElementById("shelves-grid").innerHTML=shelves.map(shelf=>{
  const count=entries.filter(entry=>entry.shelf===shelf.id).length;
  return `<button type="button" class="shelf" data-shelf="${shelf.id}" aria-label="${shelf.name}の棚を見る"><span class="shelf-symbol" aria-hidden="true">${shelf.symbol}</span><strong>${shelf.name}</strong><small>${shelf.en}</small><span class="shelf-description">${esc(shelf.description)}</span><span class="shelf-count">${count?`記事 ${count}`:'準備中'}</span><span class="shelf-arrow" aria-hidden="true">→</span></button>`;
}).join("");
document.getElementById("shelf-select").insertAdjacentHTML("beforeend",shelves.map(shelf=>`<option value="${shelf.id}">${shelf.name}</option>`).join(""));
const projectEntries=entries.filter(entry=>entry.project);
const projectsGrid=document.getElementById("projects-grid");
if(projectsGrid)projectsGrid.innerHTML=projectEntries.length?projectEntries.map(entry=>`<button type="button" class="project-card" data-entry="${entry.id}" aria-label="${esc(entry.projectTitle||entry.title)}の詳細を読む"><span class="project-title">${esc(entry.projectTitle||entry.title)}</span><span class="project-image photo photo-${entry.image}" role="img" aria-label="${photoAlt[entry.image]}"><span class="project-status"><small>ON GOING</small><span>${entry.progress}</span></span></span><span class="project-tags">${entry.tags.map(tag=>`<span>#${esc(tag)}</span>`).join('')}</span><span class="project-description">${esc(entry.projectDescription)}</span><span class="project-end"><span>PROJECT NOTE</span><span aria-hidden="true">→</span></span></button>`).join(""):`<div class="empty-state"><strong>公開中のプロジェクトノートはまだありません。</strong><p>準備が整ったものから追加します。</p></div>`;

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
function openArchive({query="",shelf="all",projects=false,returnFocus=null}={}){
  archiveSearch.value=query;shelfSelect.value=shelf;stateSelect.value="all";projectsOnly=projects;
  document.getElementById("archive-title").textContent=projects?"進行中のプロジェクト":"物置の中を探す";
  renderArchive();archiveModal.open({focusTarget:returnFocus});
}
const searchCore=window.KAitoSearchCore;
if(!searchCore)throw Error("KAITO shared search core did not load");
const normalize=searchCore.normalize;
const searchUI=window.KAitoSearchUI;
if(!searchUI)throw Error("KAITO shared search UI did not load");
const archiveModal=searchUI.bindDialog(archiveDialog,{
  queryInput:archiveSearch,
  closeButton:archiveDialog.querySelector("[data-close-dialog]"),
  onClose:()=>document.getElementById("search-form").classList.remove("is-open")
});
const searchSources=searchCore.sources(window.KAitoContent,
  Array.isArray(window.KAitoProjects)?window.KAitoProjects:[]);
function matchingEntries(){
  const query=normalize(archiveSearch.value);
  const words=query.split(/\s+/).filter(Boolean);
  return entries.filter(entry=>{
    if(projectsOnly&&!entry.project)return false;
    if(shelfSelect.value!=="all"&&entry.shelf!==shelfSelect.value)return false;
    if(stateSelect.value!=="all"&&entry.state!==stateSelect.value)return false;
    const shelf=shelves.find(s=>s.id===entry.shelf);
    const body=Array.isArray(entry.body)?entry.body:[];
    const haystack=normalize([entry.title,entry.projectTitle||'',entry.summary,...entry.tags,shelf.name,shelf.en,entry.state,entry.searchText||'',...body.map(part=>typeof part?.[1]==='string'?part[1]:Array.isArray(part?.[1])?part[1].join(' '):part?.[1]?.text||'')].join(' '));
    return words.every(word=>haystack.includes(word));
  });
}
function renderArchive(){
  const query=normalize(archiveSearch.value);
  const words=query.split(/\s+/).filter(Boolean);
  const allFilters=shelfSelect.value==="all"&&stateSelect.value==="all";
  if((words.length&&allFilters)||projectsOnly){
    const selected=searchCore.search(searchSources,query,{projectsOnly});
    const notes=selected.filter(x=>x.type==="ARTICLE").length;
    document.getElementById("results-count").textContent=`${selected.length} 件（記事 ${notes}・プロジェクト ${selected.length-notes}）`;
    const grid=document.getElementById("archive-results");
    grid.classList.add("is-global-search");
    searchUI.render(grid,selected,{
      emptyText:"一致する公開記事・プロジェクトはありません。短いキーワードでもう一度検索してください。"
    });
    return;
  }
  document.getElementById("archive-results").classList.remove("is-global-search");
  const found=matchingEntries();
  document.getElementById("results-count").textContent=`${found.length} 件の公開記事`;
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
  const close=event.target.closest("[data-close-dialog]");
  if(close&&close.closest("dialog")===entryDialog)entryDialog.close();
});
document.getElementById("search-form").addEventListener("submit",event=>{
  event.preventDefault();
  const input=document.getElementById("site-search");
  if(window.matchMedia('(max-width: 700px)').matches&&!input.value&&document.activeElement!==input){input.focus();return;}
  const searchTerm=input.value;
  document.getElementById("search-form").classList.remove("is-open");
  // Avoid leaving mobile header search expanded after the dialog closes.
  if(document.activeElement&&document.getElementById("search-form").contains(document.activeElement)){
    document.activeElement.blur();
  }
  openArchive({query:searchTerm,returnFocus:document.querySelector('#search-form button[type="submit"]')});
});
document.getElementById("archive-search-form").addEventListener("submit",event=>{event.preventDefault();renderArchive();});
archiveSearch.addEventListener("input",renderArchive);shelfSelect.addEventListener("change",renderArchive);stateSelect.addEventListener("change",renderArchive);
document.getElementById("reset-filters").addEventListener("click",()=>{archiveSearch.value="";shelfSelect.value="all";stateSelect.value="all";renderArchive();archiveSearch.focus();});

for(const dialog of [entryDialog]){
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>{
    document.body.classList.remove("modal-open");
    const opener=dialogOpeners.get(dialog);
    if(opener&&opener.isConnected&&opener.focus)opener.focus({preventScroll:true});
  });
}
