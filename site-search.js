"use strict";
/* Subpage header search. Dialog behavior and cards are shared with HOME. */
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
  const searchCore=window.KAitoSearchCore;
  if(!searchCore)throw Error("KAITO shared search core did not load");
  const searchUI=window.KAitoSearchUI;
  if(!searchUI)throw Error("KAITO shared search UI did not load");
  const sources=searchCore.sources(catalogue,
    Array.isArray(window.KAitoProjects)?window.KAitoProjects:[]);
  const searchDialog=searchUI.bindDialog(dialog,{
    queryInput,
    closeButton:dialog.querySelector(".site-search-dismiss"),
    onClose:()=>collapse(false)
  });

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
    const words=searchCore.tokens(queryInput.value);
    const found=searchCore.search(sources,queryInput.value);
    const articleCount=found.filter(x=>x.type==="ARTICLE").length;
    count.textContent=found.length+" 件（記事 "+articleCount+"・プロジェクト "+(found.length-articleCount)+"）"+(words.length?"が見つかりました":"を公開中");
    searchUI.render(list,found);
  }
  form.addEventListener("submit",event=>{
    event.preventDefault();
    if(!form.classList.contains("is-open")){expand();return;}
    queryInput.value=input.value;
    collapse(false);
    render();
    searchDialog.open({focusTarget:trigger});
  });
  close.addEventListener("click",()=>collapse(true));
  queryInput.addEventListener("input",render);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&form.classList.contains("is-open")&&!dialog.open){
      event.preventDefault();collapse(true);
    }
  });
  document.addEventListener("pointerdown",event=>{
    if(form.classList.contains("is-open")&&!form.contains(event.target))collapse(false);
  });
})();
