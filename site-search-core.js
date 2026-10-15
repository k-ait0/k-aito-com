"use strict";
/* One ranking and source contract for KAITO HOME and subpage global searches.
 * Pure search functionality: usable in browser and Node regression tests.
 * The HOME category/state-only shelf filter intentionally stays independent.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.KAitoSearchCore=api;
})(typeof window!=="undefined"?window:null,function(){
  const normalize=value=>String(value??"").normalize("NFKC").toLocaleLowerCase("ja").trim();
  const tokens=query=>normalize(query).split(/\s+/).filter(Boolean);
  const safePublished=url=>/^\/notes\/[a-z0-9-]+\/$/.test(url||"");
  const safeProject=url=>/^\/projects\/(?:[a-z0-9-]+\/)+$/.test(url||"");
  function sources(catalogue,projects){
    if(!Array.isArray(catalogue?.entries)||!Array.isArray(catalogue?.shelves))
      throw Error("Missing KAITO published catalogue");
    if(!Array.isArray(projects))throw Error("Missing public project index");
    const shelfNames=new Map(catalogue.shelves.map(s=>[s.id,s.name]));
    const seen=new Set();
    const output=[];
    for(const e of catalogue.entries){
      if(!safePublished(e.url))continue; // exclude non-public drafts and internal notes
      if(seen.has(e.url))throw Error("Duplicate searchable URL "+e.url);
      seen.add(e.url);
      const shelf=shelfNames.get(e.shelf)||"";
      const tags=Array.isArray(e.tags)?e.tags:[];
      output.push({
        type:"ARTICLE",url:e.url,title:e.title,summary:e.summary||"",state:e.state||"",
        metadata:[e.state,e.date,shelf].filter(Boolean).join(" / "),
        tags,
        searchText:[e.title,e.summary,e.state,e.date,shelf,...tags,e.searchText||""].join(" ")
      });
    }
    for(const p of projects){
      if(!safeProject(p.url))continue; // only public project detail pages
      if(seen.has(p.url))throw Error("Duplicate searchable URL "+p.url);
      seen.add(p.url);
      output.push({
        type:"PROJECT",url:p.url,title:p.title,summary:p.summary||"",state:p.stage||"",
        metadata:[p.stage,p.access].filter(Boolean).join(" / "),
        tags:[],
        searchText:[p.title,p.summary,p.stage,p.access,p.searchText||""].join(" ")
      });
    }
    return output;
  }
  function search(items,query,{projectsOnly=false}={}){
    const words=tokens(query);
    return items.filter(item=>!projectsOnly||item.type==="PROJECT")
      .map(item=>{
        const haystack=normalize(item.searchText);
        if(!words.every(word=>haystack.includes(word)))return null;
        const title=normalize(item.title),summary=normalize(item.summary);
        const relevance=words.reduce((score,word)=>
          score+(title.includes(word)?6:summary.includes(word)?3:1),0);
        return {...item,relevance};
      }).filter(Boolean).sort((a,b)=>
        b.relevance-a.relevance||a.type.localeCompare(b.type)||a.url.localeCompare(b.url));
  }
  return Object.freeze({normalize,tokens,sources,search});
});
