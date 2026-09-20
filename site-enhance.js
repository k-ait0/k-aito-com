"use strict";

(function(){
  const shelfRoutes={
    travel:'/travel/',
    sake:'/drink/',
    money:'/money/',
    create:'/study/',
    technology:'/works/',
    business:'/projects/',
    thinking:'/archive/'
  };

  const shelfIcons={
    travel:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="14" rx="2"/><path d="M8 7h8M8 12h8M8 20l2-3m6 3-2-3"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/></svg>',
    sake:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l-1.2 14H8.2L7 4Z"/><path d="M8 9h8M9 18v2m6-2v2"/></svg>',
    money:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9 8.5 12 12l3-3.5M9.5 12h5M12 12v4"/></svg>',
    create:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15Z"/><path d="M8 7h7M8 11h7M8 15h4"/></svg>',
    technology:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M8 20h8M12 16v4M8.5 9l-2 2 2 2m7-4 2 2-2 2"/></svg>',
    business:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-7M12 13c-3.8 0-6-2-6-5 3.8 0 6 2 6 5Zm0 0c3.8 0 6-2 6-5-3.8 0-6 2-6 5Z"/><path d="M8 20h8"/></svg>',
    thinking:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14v12H5zM8 4h8v3M9 11h6M9 15h4"/></svg>'
  };

  for(const shelf of document.querySelectorAll('.shelf[data-shelf]')){
    const symbol=shelf.querySelector('.shelf-symbol');
    const icon=shelfIcons[shelf.dataset.shelf];
    if(symbol&&icon){
      symbol.innerHTML=icon;
      symbol.classList.add('shelf-icon');
    }
  }

  document.addEventListener('click',event=>{
    const shelf=event.target.closest('.shelf[data-shelf]');
    if(!shelf)return;
    const route=shelfRoutes[shelf.dataset.shelf];
    if(!route)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href=route;
  },true);

  const shelvesSection=document.querySelector('.shelves-section');
  if(shelvesSection){
    const heading=shelvesSection.querySelector('.section-heading');
    if(heading&&!heading.querySelector('.section-view-all')&&!heading.querySelector('a[href="/storage/"]')){
      const link=document.createElement('a');
      link.className='text-link small-link section-view-all';
      link.href='/storage/';
      link.innerHTML='VIEW ALL <span>→</span>';
      heading.appendChild(link);
    }
  }

  const recentSection=document.querySelector('.recent-section');
  if(recentSection){
    const tail=recentSection.querySelector('.section-tail');
    const heading=recentSection.querySelector('.section-heading');
    if(tail&&heading){
      const link=document.createElement('a');
      link.className='text-link small-link section-view-all';
      link.href='/archive/';
      link.innerHTML='VIEW ALL <span>→</span>';
      heading.appendChild(link);
      tail.hidden=true;
    }
  }

  const projects=document.getElementById('projects-grid');
  if(projects&&projects.querySelector('.empty-state')){
    projects.innerHTML=`<a class="project-feature-link" href="/projects/digital-storage/" aria-label="K. Aito / DIGITAL STORAGE プロジェクトを見る"><span class="project-feature-kicker">PROJECT</span><span class="project-feature-copy"><strong>K. Aito / DIGITAL STORAGE</strong><span>考えたもの、拾ったもの、作りかけのものを置いておく場所。</span><em>PROJECT NOTE <b aria-hidden="true">→</b></em></span></a>`;
  }

  const viewAll=document.querySelector('.projects-section [data-project-archive]');
  if(viewAll){
    const link=document.createElement('a');
    link.className='text-link small-link section-view-all';
    link.href='/projects/';
    link.innerHTML='VIEW ALL <span>→</span>';
    viewAll.replaceWith(link);
  }

  const randomGrid=document.getElementById('random-grid');
  if(randomGrid&&randomGrid.querySelectorAll('.entry-card').length<2){
    randomGrid.innerHTML='<div class="small-notes-empty"><strong>物置の記録を、時間からたどる。</strong><p>公開したノートはアーカイブにまとめています。<a href="/archive/">記録を見る →</a></p></div>';
    const shuffle=document.getElementById('shuffle-button');
    if(shuffle)shuffle.hidden=true;
  }
})();
