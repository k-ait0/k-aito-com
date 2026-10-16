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
  /* Shared native-dialog lifecycle. Feature-specific controls stay outside. */
  function bindDialog(dialog,{queryInput,closeButton,onClose}={}){
    if(!dialog||dialog.tagName!=="DIALOG"||!queryInput)throw Error("Invalid KAITO search dialog");
    let returnFocus=null;
    function open({focusTarget=null}={}){
      returnFocus=focusTarget||dialog.ownerDocument.activeElement;
      if(!dialog.open)dialog.showModal();
      dialog.ownerDocument.body.classList.add("modal-open");
      dialog.scrollTop=0;
      queryInput.focus();
    }
    function finishClose(){
      // The native "close" event is asynchronous; restore focus before the
      // next interaction, and ignore a queued event after a quick reopen.
      if(dialog.open||!returnFocus)return;
      const target=returnFocus;
      returnFocus=null;
      dialog.ownerDocument.body.classList.remove("modal-open");
      if(onClose)onClose();
      if(target.isConnected&&typeof target.focus==="function"){
        target.focus({preventScroll:true});
      }
    }
    function close(){
      if(dialog.open)dialog.close();
      finishClose();
    }
    if(closeButton)closeButton.addEventListener("click",close);
    dialog.addEventListener("click",event=>{if(event.target===dialog)close();});
    // Escape is sometimes consumed by input[type="search"] to clear its text.
    // Make the modal semantics deterministic for keyboard users.
    dialog.addEventListener("keydown",event=>{
      if(event.key!=="Escape"||event.isComposing)return;
      event.preventDefault();
      event.stopPropagation();
      close();
    });
    dialog.addEventListener("cancel",event=>{event.preventDefault();close();});
    dialog.addEventListener("close",finishClose);
    return Object.freeze({open,close});
  }
  return Object.freeze({card,render,bindDialog});
});
