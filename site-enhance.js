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

  const projects=document.getElementById('projects-grid');
  if(projects && projects.querySelector('.empty-state')){
    projects.innerHTML=`<a class="project-feature-link" href="/projects/digital-storage/" aria-label="K. Aito / DIGITAL STORAGE プロジェクトを見る">
      <span class="project-feature-kicker">PROJECT</span>
      <span class="project-feature-copy">
        <strong>K. Aito / DIGITAL STORAGE</strong>
        <span>考えたもの、拾ったもの、作りかけのものを置いておく場所。</span>
        <em>PROJECT NOTE <b aria-hidden="true">→</b></em>
      </span>
    </a>`;
  }

  const viewAll=document.querySelector('.projects-section [data-project-archive]');
  if(viewAll){
    const link=document.createElement('a');
    link.className='text-link small-link';
    link.href='/projects/';
    link.innerHTML='VIEW ALL <span>→</span>';
    viewAll.replaceWith(link);
  }

  const randomGrid=document.getElementById('random-grid');
  if(randomGrid && randomGrid.querySelectorAll('.entry-card').length<2){
    randomGrid.innerHTML='<div class="small-notes-empty"><strong>断片メモは、まだありません。</strong><p>短いメモが増えたら、ここに少しずつ並べます。</p></div>';
    const shuffle=document.getElementById('shuffle-button');
    if(shuffle)shuffle.hidden=true;
  }

  async function fetchText(path){
    const response=await fetch(path,{cache:'force-cache'});
    if(!response.ok)throw new Error(path);
    return (await response.text()).trim();
  }

  async function loadHighQualityHero(){
    const visualTargets=[...document.querySelectorAll('.hero,.project-cover')];
    const feature=document.querySelector('.project-feature-link');
    if(!visualTargets.length&&!feature)return;
    const paths=[0,1,2,3].map(i=>`/assets/hero-tiles/v2-col-${i}.b64?v=2`);
    try{
      const encoded=await Promise.all(paths.map(fetchText));
      const images=await Promise.all(encoded.map(data=>new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>resolve(image);
        image.onerror=reject;
        image.src=`data:image/jpeg;base64,${data}`;
      })));
      const canvas=document.createElement('canvas');
      canvas.width=1200;
      canvas.height=800;
      const context=canvas.getContext('2d');
      if(!context)throw new Error('canvas unsupported');
      context.fillStyle='#203226';
      context.fillRect(0,0,1200,800);
      images.forEach((image,index)=>context.drawImage(image,index*300,0,300,800));
      const url=canvas.toDataURL('image/jpeg',0.90);
      visualTargets.forEach(element=>{
        element.style.setProperty('background-image',`url("${url}")`,'important');
        element.style.setProperty('background-size','cover','important');
        element.style.setProperty('background-position','center 52%','important');
        element.style.setProperty('background-repeat','no-repeat','important');
        element.style.setProperty('background-color','#203226','important');
      });
      document.querySelectorAll('.hero').forEach(element=>element.classList.add('hero-hq-ready'));
      if(feature){
        feature.style.setProperty('background-image',`linear-gradient(180deg,rgba(16,41,32,.08),rgba(16,41,32,.88)),url("${url}")`,'important');
        feature.style.setProperty('background-size','cover','important');
        feature.style.setProperty('background-position','center','important');
        feature.style.setProperty('background-repeat','no-repeat','important');
      }
    }catch(error){
      console.warn('High-quality hero fallback is being used.',error);
    }
  }

  async function loadHighQualityNotebook(){
    const targets=[...document.querySelectorAll('.photo-notebook')];
    if(!targets.length)return;
    try{
      const data=await fetchText('/assets/editorial-notebook.b64?v=2');
      const image=`url("data:image/jpeg;base64,${data}")`;
      targets.forEach(element=>{
        element.style.setProperty('background-image',image,'important');
        element.style.setProperty('background-size','cover','important');
        element.style.setProperty('background-position','center','important');
        element.style.setProperty('background-repeat','no-repeat','important');
      });
    }catch(error){
      console.warn('High-quality notebook fallback is being used.',error);
    }
  }

  loadHighQualityHero();
  loadHighQualityNotebook();
})();
