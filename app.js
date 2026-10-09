"use strict";

// The published catalogue is shared with subpage search.
const {shelves,entries}=window.KAitoContent;

const byId = new Map(entries.map(entry=>[entry.id,entry]));
const esc = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const stateTag = state => `<span class="state state-${state.toLowerCase()}">${esc(state)}</span>`;
const photoAlt = {travel:"列車と海のイメージ",sake:"日本酒と料理のイメージ",house:"木の建物のイメージ",notebook:"ノートとペンのイメージ"};

function entryCard(entry, compact=false){
  const photo=entry.image || "notebook";
  const picture=entry.image || compact ? `<span class="card-photo photo photo-${photo}" role="img" aria-label="${photoAlt[photo]||"記事イメージ"}"></span>` : "";
  const content=`${compact?picture+stateTag(entry.state):stateTag(entry.state)+picture}
    <span class="card-copy"><span class="card-kind">ARTICLE</span><span class="card-date">${entry.date}</span><span class="card-title">${esc(entry.title)}</span>${compact?'':`<span class="card-summary">${esc(entry.summary)}</span>`}<span class="card-tags">${entry.tags.map(tag=>'#'+esc(tag)).join('　')}</span><span class="card-arrow" aria-hidden="true">→</span></span>`;
  if(entry.url)return `<a class="entry-card entry-card-link ${!entry.image&&!compact?'text-card':''}" data-card-type="article" href="${esc(entry.url)}" aria-label="${esc(entry.title)}を読む">${content}</a>`;
  return `<button type="button" class="entry-card ${!entry.image&&!compact?'text-card':''}" data-card-type="article" data-entry="${entry.id}" aria-label="${esc(entry.title)}を読む">${content}</button>`;
}

const publishedNotes=entries.filter(entry=>entry.url&&entry.url.startsWith("/notes/")).slice().sort((a,b)=>b.date.localeCompare(a.date));
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
    const projectIndex=Array.isArray(window.KAitoProjects)?window.KAitoProjects:[];
    const articleList=entries.filter(e=>e.url&&e.url.startsWith("/notes/")).map(e=>({
      type:"ARTICLE",url:e.url,title:e.title,summary:e.summary,state:e.state,
      text:[e.title,e.summary,e.state,...(e.tags||[]),e.searchText||""].join(" ")
    }));
    const projectList=projectIndex.map(p=>({
      type:"PROJECT",url:p.url,title:p.title,summary:p.summary,state:p.stage,
      text:[p.title,p.summary,p.stage,p.access,p.searchText||""].join(" ")
    }));
    const selected=(projectsOnly?projectList:[...articleList,...projectList])
      .map(item=>{
        const normal=normalize(item.text);
        if(!words.every(word=>normal.includes(word)))return null;
        const title=normalize(item.title),summary=normalize(item.summary);
        return {...item,score:words.reduce((n,w)=>n+(title.includes(w)?6:summary.includes(w)?3:1),0)};
      }).filter(Boolean).sort((a,b)=>b.score-a.score||a.type.localeCompare(b.type));
    const notes=selected.filter(x=>x.type==="ARTICLE").length;
    document.getElementById("results-count").textContent=`${selected.length} 件（記事 ${notes}・プロジェクト ${selected.length-notes}）`;
    document.getElementById("archive-results").innerHTML=selected.length?selected.map(item=>
      `<a class="entry-card entry-card-link text-card" data-card-type="${item.type.toLowerCase()}" href="${esc(item.url)}">
        <span class="card-copy"><span class="card-kind">${item.type}</span>
          <span class="state">${esc(item.state)}</span>
          <span class="card-title">${esc(item.title)}</span>
          <span class="card-summary">${esc(item.summary)}</span>
          <span class="card-arrow" aria-hidden="true">→</span>
        </span></a>`).join(""):`<div class="empty-state"><strong>一致する公開記事・プロジェクトはありません。</strong><p>短いキーワードでもう一度検索してください。</p></div>`;
    return;
  }
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
  const close=event.target.closest("[data-close-dialog]");if(close)close.closest("dialog").close();
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
  openArchive({query:searchTerm});
});
document.getElementById("archive-search-form").addEventListener("submit",event=>{event.preventDefault();renderArchive();});
archiveSearch.addEventListener("input",renderArchive);shelfSelect.addEventListener("change",renderArchive);stateSelect.addEventListener("change",renderArchive);
document.getElementById("reset-filters").addEventListener("click",()=>{archiveSearch.value="";shelfSelect.value="all";stateSelect.value="all";renderArchive();archiveSearch.focus();});

for(const dialog of [archiveDialog,entryDialog]){
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>{
    document.body.classList.remove("modal-open");
    const opener=dialogOpeners.get(dialog),searchForm=document.getElementById("search-form");
    if(dialog===archiveDialog)searchForm.classList.remove("is-open");
    // Restoring focus to the header search input would leave the mobile overlay expanded.
    if(opener&&opener.focus&&!searchForm.contains(opener))opener.focus();
    if(dialog===archiveDialog&&searchForm.contains(document.activeElement)){
      document.activeElement.blur();
    }
  });
}
