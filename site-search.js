"use strict";
/* Shared header search for subpages. HOME uses its existing search dialog. */
(function(){
  if(!document.body.classList.contains("subpage"))return;
  const catalogue=window.KAitoContent;
  const header=document.querySelector(".site-header .header-inner");
  if(!catalogue||!header)return;

  header.insertAdjacentHTML("beforeend",
    '<form id="site-wide-search" class="site-wide-search header-search" role="search">' +
      '<label class="sr-only" for="global-search-input">記事・プロジェクトを検索</label>' +
      '<input id="global-search-input" type="search" placeholder="記事・プロジェクトを検索…" autocomplete="off">' +
      '<button type="submit" aria-label="検索欄を開く" aria-expanded="false" aria-controls="global-search-input">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>' +
      '</button>' +
      '<button type="button" class="mobile-search-close" aria-label="検索欄を閉じる">×</button>' +
    '</form>');

  document.body.insertAdjacentHTML("beforeend",
    '<dialog id="site-wide-search-dialog" class="site-search-dialog" aria-labelledby="site-search-title">' +
      '<div class="site-search-panel">' +
        '<div class="site-search-heading"><div><p class="eyebrow">THE COLLECTION</p>' +
          '<h2 id="site-search-title">物置の中を探す</h2></div>' +
          '<button type="button" class="site-search-dismiss" aria-label="検索結果を閉じる">×</button></div>' +
        '<label for="site-search-query" class="sr-only">キーワード</label>' +
        '<input id="site-search-query" type="search" placeholder="記事・プロジェクト・制作物を探す" autocomplete="off">' +
        '<p class="site-search-count" role="status" aria-live="polite"></p>' +
        '<div class="site-search-results"></div>' +
      '</div>' +
    '</dialog>');

  const form=document.getElementById("site-wide-search");
  const input=document.getElementById("global-search-input");
  const trigger=form.querySelector('button[type="submit"]');
  const close=form.querySelector(".mobile-search-close");
  const dialog=document.getElementById("site-wide-search-dialog");
  const queryInput=document.getElementById("site-search-query");
  const list=dialog.querySelector(".site-search-results");
  const count=dialog.querySelector(".site-search-count");
  const normalize=value=>String(value||"").normalize("NFKC").toLocaleLowerCase("ja").trim();
  const shelfName=id=>(catalogue.shelves.find(item=>item.id===id)||{}).name||"";
  const published=catalogue.entries.filter(entry=>entry.url&&entry.url.startsWith("/notes/"));
  const projects=Array.isArray(window.KAitoProjects)?window.KAitoProjects:[];

  function expand(){
    form.classList.add("is-open");
    trigger.setAttribute("aria-expanded","true");
    trigger.setAttribute("aria-label","記事とプロジェクトを検索する");
    input.focus();
  }
  function collapse(refocus){
    form.classList.remove("is-open");
    trigger.setAttribute("aria-expanded","false");
    trigger.setAttribute("aria-label","検索欄を開く");
    input.blur();
    if(refocus)trigger.focus({preventScroll:true});
  }
  // Search both public article prose and published project pages; never index noindex betas.
  function render(){
    const words=normalize(queryInput.value).split(/\s+/).filter(Boolean);
    const sources=[
      ...published.map(entry=>({
        type:"ARTICLE",title:entry.title,url:entry.url,summary:entry.summary,
        metadata:[entry.state,entry.date,shelfName(entry.shelf)].filter(Boolean).join(" / "),
        tags:entry.tags||[],
        searchText:[entry.title,entry.summary,entry.state,shelfName(entry.shelf),
          ...(entry.tags||[]),entry.searchText||""].join(" ")
      })),
      ...projects.map(p=>({
        type:"PROJECT",title:p.title,url:p.url,summary:p.summary,
        metadata:[p.stage,p.access].filter(Boolean).join(" / "),
        tags:[],
        searchText:[p.title,p.summary,p.stage,p.access,p.searchText||""].join(" ")
      }))
    ];
    const found=sources.map(item=>{
      const haystack=normalize(item.searchText);
      if(!words.every(word=>haystack.includes(word)))return null;
      const title=normalize(item.title),description=normalize(item.summary);
      const relevance=words.reduce((n,w)=>n+(title.includes(w)?6:description.includes(w)?3:1),0);
      return {...item,relevance};
    }).filter(Boolean).sort((a,b)=>b.relevance-a.relevance||a.type.localeCompare(b.type));
    list.replaceChildren();
    const articleCount=found.filter(x=>x.type==="ARTICLE").length;
    count.textContent=found.length+" 件（記事 "+articleCount+"・プロジェクト "+(found.length-articleCount)+"）"+(words.length?"が見つかりました":"を公開中");
    if(!found.length){
      const empty=document.createElement("p");
      empty.className="site-search-empty";
      empty.textContent="一致する公開記事・プロジェクトはありません。別のキーワードで探してください。";
      list.append(empty);return;
    }
    for(const entry of found){
      const card=document.createElement("a");
      card.className="site-search-result";
      card.dataset.searchType=entry.type.toLowerCase();
      card.href=entry.url;
      const meta=document.createElement("span");
      meta.className="site-search-result-meta";
      const kind=document.createElement("b");
      kind.className="site-search-kind";
      kind.textContent=entry.type;
      meta.append(kind,document.createTextNode(" "+entry.metadata));
      const title=document.createElement("strong");
      title.textContent=entry.title;
      const summary=document.createElement("span");
      summary.className="site-search-result-summary";
      summary.textContent=entry.summary;
      card.append(meta,title,summary);
      if(entry.tags.length){
        const tags=document.createElement("small");
        tags.textContent=entry.tags.map(tag=>"#"+tag).join("  ");
        card.append(tags);
      }
      list.append(card);
    }
  }
  form.addEventListener("submit",event=>{
    event.preventDefault();
    if(!form.classList.contains("is-open")){expand();return;}
    queryInput.value=input.value;
    collapse(false);
    render();
    if(!dialog.open)dialog.showModal();
    queryInput.focus();
  });
  close.addEventListener("click",()=>collapse(true));
  queryInput.addEventListener("input",render);
  dialog.querySelector(".site-search-dismiss").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>trigger.focus({preventScroll:true}));
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&form.classList.contains("is-open")&&!dialog.open){
      event.preventDefault();collapse(true);
    }
  });
  document.addEventListener("pointerdown",event=>{
    if(form.classList.contains("is-open")&&!form.contains(event.target))collapse(false);
  });
})();
