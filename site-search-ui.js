"use strict";
/* Shared public search result UI. HOME keeps its shelf/state filters,
 * while HOME global results and the subpage search show one card contract.
 * All fields are written with textContent/DOM APIs; no input becomes HTML.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.KAitoSearchUI=api;
})(typeof window!=="undefined"?window:null,function(){
  function card(item,doc){
    if(!item||!["ARTICLE","PROJECT"].includes(item.type)||
      !/^\/(?:notes|projects)\/[a-z0-9/-]+\/$/.test(item.url||"")){
      throw Error("Invalid public KAITO search result");
    }
    const link=doc.createElement("a");
    link.className="site-search-result";
    link.dataset.searchType=item.type.toLowerCase();
    link.dataset.cardType=item.type.toLowerCase();
    link.href=item.url;
    const meta=doc.createElement("span");
    meta.className="site-search-result-meta";
    const kind=doc.createElement("b");
    kind.className="site-search-kind";
    kind.textContent=item.type;
    meta.append(kind,doc.createTextNode(" "+(item.metadata||item.state||"")));
    const title=doc.createElement("strong");
    title.className="site-search-result-title";
    title.textContent=item.title||"";
    const summary=doc.createElement("span");
    summary.className="site-search-result-summary";
    summary.textContent=item.summary||"";
    link.append(meta,title,summary);
    if(Array.isArray(item.tags)&&item.tags.length){
      const tags=doc.createElement("small");
      tags.className="site-search-result-tags";
      tags.textContent=item.tags.map(tag=>"#"+tag).join("  ");
      link.append(tags);
    }
    return link;
  }
  function render(target,items,{emptyText="一致する公開記事・プロジェクトはありません。別のキーワードで探してください。"}={}){
    if(!target?.ownerDocument||!Array.isArray(items))throw Error("Invalid KAITO search result container");
    if(!items.length){
      const empty=target.ownerDocument.createElement("p");
      empty.className="site-search-empty";
      empty.textContent=emptyText;
      target.replaceChildren(empty);
      return;
    }
    target.replaceChildren(...items.map(item=>card(item,target.ownerDocument)));
  }
  return Object.freeze({card,render});
});
