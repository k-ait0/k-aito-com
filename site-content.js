"use strict";
/* Published catalogue -> ARCHIVE timeline and SHELVES recent notes.
   Existing HTML remains as a usable no-JavaScript fallback. */
(function(){
  const catalogue=window.KAitoContent;
  if(!catalogue)return;
  const notes=catalogue.entries.filter(note=>note.url&&note.url.startsWith("/notes/"))
    .slice().sort((a,b)=>b.date.localeCompare(a.date));
  const noteCount=n=>n+" NOTE"+(n===1?"":"S");
  const monthNames=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  function noteCard(note){
    const link=document.createElement("a");
    link.className="note-link";
    link.href=note.url;
    const meta=document.createElement("div");
    meta.className="note-meta";
    const state=document.createElement("span");
    state.textContent=note.state;
    const date=document.createElement("time");
    date.dateTime=note.date.replaceAll(".","-");
    date.textContent=note.date;
    meta.append(state,date);
    const title=document.createElement("h3");
    title.textContent=note.title;
    const summary=document.createElement("p");
    summary.textContent=note.summary;
    const tags=document.createElement("small");
    tags.textContent=note.tags.map(tag=>"#"+tag).join(" ");
    link.append(meta,title,summary,tags);
    return link;
  }

  const recent=document.querySelector("[data-catalogue-recent]");
  if(recent){
    recent.replaceChildren(...notes.slice(0,6).map(noteCard));
    const count=document.querySelector("[data-catalogue-count]");
    if(count)count.textContent=noteCount(notes.length);
    const routeShelves={
      "/travel/":"travel","/drink/":"sake","/money/":"money",
      "/study/":"create","/works/":"technology","/business/":"business"
    };
    for(const tile of document.querySelectorAll(".storage-shelf")){
      const label=tile.querySelector("small");
      if(!label)continue;
      const pathname=new URL(tile.href,window.location.origin).pathname;
      if(pathname==="/archive/"){
        label.textContent=noteCount(notes.length)+" / TIME INDEX";
      }else if(routeShelves[pathname]){
        const total=notes.filter(note=>note.shelf===routeShelves[pathname]).length;
        label.textContent=total?noteCount(total):"準備中";
      }
    }
  }


  /* Topic shelves are derived from the same published catalogue.
     Existing sections remain in the HTML as a no-JavaScript fallback. */
  const shelfByPath={
    "/travel/":"travel","/drink/":"sake","/money/":"money",
    "/study/":"create","/works/":"technology","/business/":"business",
    "/projects/":"business"
  };
  const currentShelf=shelfByPath[window.location.pathname];
  const shelfNotes=currentShelf?notes.filter(note=>note.shelf===currentShelf):[];
  if(currentShelf&&window.location.pathname==="/works/"){
    // Keep the three existing development-stage headings meaningful.
    const buckets={
      released:shelfNotes.filter(note=>["DONE","ARCHIVE"].includes(note.state)),
      making:shelfNotes.filter(note=>!["DONE","ARCHIVE","MEMO","THINK","RESEARCH"].includes(note.state)),
      concepts:shelfNotes.filter(note=>["MEMO","THINK","RESEARCH"].includes(note.state))
    };
    for(const [id,groupNotes] of Object.entries(buckets)){
      const group=document.getElementById(id);
      const list=group&&group.querySelector(".shelf-group-content");
      const label=group&&group.querySelector(".shelf-group-heading small");
      if(!list)continue;
      if(label)label.textContent=noteCount(groupNotes.length);
      if(groupNotes.length){
        const grid=document.createElement("div");
        grid.className="notes-grid";
        grid.append(...groupNotes.map(noteCard));
        list.replaceChildren(grid);
      }else{
        const empty=document.createElement("p");
        empty.className="shelf-empty";
        empty.textContent="公開済みの記録は準備中です。";
        list.replaceChildren(empty);
      }
    }
  }else if(shelfNotes.length){
    const isProjects=window.location.pathname==="/projects/";
    const insertionPoint=isProjects
      ?document.querySelector(".project-flow-section")
      :document.querySelector(".shelf-page .shelf-group");
    if(insertionPoint){
      const section=document.createElement("section");
      section.className=isProjects?"portfolio-section project-published":"shelf-group shelf-published";
      section.id="published-notes";
      const heading=document.createElement("div");
      heading.className=isProjects?"portfolio-section-head":"shelf-group-heading";
      const headingCopy=document.createElement("div");
      if(isProjects){
        const eyebrow=document.createElement("p");
        eyebrow.className="eyebrow";
        eyebrow.textContent="PUBLISHED NOTES";
        headingCopy.append(eyebrow);
      }
      const title=document.createElement("h2");
      title.textContent=isProjects?"事業・プロジェクトの公開記録":"公開した記録";
      const explanation=document.createElement("p");
      explanation.textContent="このテーマで公開した記事を、新しい順にまとめています。";
      headingCopy.append(title,explanation);
      const label=document.createElement("small");
      label.textContent=noteCount(shelfNotes.length);
      heading.append(headingCopy,label);
      const grid=document.createElement("div");
      grid.className=isProjects?"notes-grid project-published-grid":"shelf-group-content notes-grid";
      grid.append(...shelfNotes.map(noteCard));
      section.append(heading,grid);
      insertionPoint.parentElement.insertBefore(section,insertionPoint);
    }
  }

  const timeline=document.querySelector("[data-catalogue-timeline]");
  if(!timeline)return;
  if(!notes.length){
    timeline.replaceChildren();
    const empty=document.createElement("p");
    empty.className="shelf-empty";
    empty.textContent="公開済みの記事はまだありません。";
    timeline.append(empty);
    return;
  }
  const latestMonth=notes[0].date.slice(0,7).replace(".","-");
  timeline.id="archive-"+latestMonth;
  timeline.replaceChildren();
  const monthAnchors=new Set([latestMonth]);
  let previousYear="",previousDate="";
  let daySection=null,dayGrid=null,dayTotal=0;
  for(const note of notes){
    const year=note.date.slice(0,4);
    const month=note.date.slice(0,7).replace(".","-");
    if(year!==previousYear){
      const heading=document.createElement("h2");
      heading.className="archive-year";
      heading.textContent=year;
      timeline.append(heading);
      previousYear=year;
    }
    if(note.date!==previousDate){
      daySection=document.createElement("section");
      daySection.className="archive-period";
      if(!monthAnchors.has(month)){
        daySection.id="archive-"+month;
        monthAnchors.add(month);
      }
      const header=document.createElement("header");
      const time=document.createElement("time");
      time.dateTime=note.date.replaceAll(".","-");
      time.textContent=note.date;
      const label=document.createElement("span");
      label.textContent=noteCount(1);
      header.append(time,label);
      dayGrid=document.createElement("div");
      dayGrid.className="notes-grid";
      daySection.append(header,dayGrid);
      timeline.append(daySection);
      previousDate=note.date;
      dayTotal=0;
    }
    dayGrid.append(noteCard(note));
    dayTotal++;
    daySection.querySelector("header span").textContent=noteCount(dayTotal);
  }
  const tools=document.querySelector(".archive-tools");
  if(!tools)return;
  const yearLabel=tools.querySelector("div:first-child > strong");
  if(yearLabel)yearLabel.textContent=notes[0].date.slice(0,4);
  const monthLink=tools.querySelector("div:first-child > a");
  const monthName=monthNames[Number(notes[0].date.slice(5,7))-1]||"LATEST";
  if(monthLink){
    monthLink.href="#archive-"+latestMonth;
    const badge=document.createElement("span");
    const thisMonth=notes.filter(note=>note.date.slice(0,7).replace(".","-")===latestMonth).length;
    badge.textContent=noteCount(thisMonth);
    monthLink.replaceChildren(document.createTextNode(monthName+" "),badge);
  }
  const stats=tools.querySelectorAll(".archive-stats span b");
  if(stats.length>=3){
    stats[0].textContent=String(notes.length);
    stats[1].textContent=String(new Set(notes.map(note=>note.state)).size);
    stats[2].textContent=monthName;
  }
})();
