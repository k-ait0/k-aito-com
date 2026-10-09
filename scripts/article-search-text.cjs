"use strict";
/* Extract only published article prose from a KAITO /notes/ HTML file.
   This is consumed at build time; article HTML remains the primary text source.
   No external package or network call is required. */
const decodeText = value => value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|hellip|mdash|ndash|rarr);/gi, (entity, key) => {
  const val=key.toLowerCase();
  if(val.startsWith("#x"))return String.fromCodePoint(parseInt(val.slice(2),16));
  if(val.startsWith("#"))return String.fromCodePoint(parseInt(val.slice(1),10));
  return {amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",hellip:"…",mdash:"—",ndash:"–",rarr:"→"}[val]||entity;
});
function articleText(html, label="article"){
  const match=/<div\b[^>]*class="[^"]*\barticle-copy\b[^"]*\bessay-body\b[^"]*"[^>]*>/i.exec(html);
  if(!match)throw new Error("Missing KAITO article-copy essay-body: "+label);
  const begin=match.index+match[0].length;
  const divTag=/<\/?div\b[^>]*>/gi;
  divTag.lastIndex=begin;
  let depth=1,end=-1,found;
  while((found=divTag.exec(html))){
    depth+=/^<\/div/i.test(found[0])?-1:1;
    if(depth===0){end=found.index;break;}
  }
  if(end<0)throw new Error("Unclosed article-copy: "+label);
  const block=html.slice(begin,end)
    .replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<(script|style|noscript|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi," ")
    .replace(/<[^>]+>/g," ");
  const result=decodeText(block).replace(/\s+/gu," ").trim();
  if(result.length<40)throw new Error("Article text too short: "+label+" ("+result.length+")");
  return result;
}
const beginMarker="/* BEGIN GENERATED ARTICLE SEARCH TEXT — DO NOT EDIT */";
const endMarker="/* END GENERATED ARTICLE SEARCH TEXT */";
function renderIndex(entries){
  const rows=entries.map(item=>"  "+JSON.stringify(item.id)+": "+JSON.stringify(item.text)).join(",\n");
  return beginMarker+"\n"+
    "const generatedArticleSearch = {\n"+rows+"\n};\n"+
    "for(const entry of entries){\n"+
    "  if(Object.prototype.hasOwnProperty.call(generatedArticleSearch,entry.id)){\n"+
    "    entry.searchText=generatedArticleSearch[entry.id];\n"+
    "  }\n"+
    "}\n"+endMarker;
}
function injectIndex(source,entries){
  const output=renderIndex(entries);
  const first=source.indexOf(beginMarker),last=source.indexOf(endMarker);
  if((first<0)!==(last<0))throw new Error("Incomplete generated index markers");
  if(first>=0){
    if(last<=first)throw new Error("Reversed generated index markers");
    return source.slice(0,first)+output+source.slice(last+endMarker.length);
  }
  const exportAnchor="window.KAitoContent=Object.freeze({shelves,entries});";
  if(!source.includes(exportAnchor))throw new Error("Content export anchor missing");
  return source.replace(exportAnchor,output+"\n\n"+exportAnchor);
}
module.exports={articleText,injectIndex,beginMarker,endMarker};
