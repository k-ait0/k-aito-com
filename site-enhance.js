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
    if(heading&&!heading.querySelector('.section-view-all')){
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
    randomGrid.innerHTML='<div class="small-notes-empty"><strong>断片メモは、まだありません。</strong><p>短いメモが増えたら、ここに少しずつ並べます。</p></div>';
    const shuffle=document.getElementById('shuffle-button');
    if(shuffle)shuffle.hidden=true;
  }
})();
