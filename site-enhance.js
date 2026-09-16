"use strict";

(function(){
  const shelfLabels={
    travel:{ja:"旅",en:"TRAVEL"},
    sake:{ja:"酒",en:"DRINK"},
    money:{ja:"お金・税務",en:"MONEY / TAX"},
    create:{ja:"学び・資格",en:"STUDY"},
    technology:{ja:"制作・開発",en:"CREATE"},
    business:{ja:"事業・プロジェクト",en:"PROJECT"},
    thinking:{ja:"その他",en:"ARCHIVE"}
  };

  const taxShelf=document.querySelector('.shelf[data-shelf="tax"]');
  if(taxShelf)taxShelf.remove();
  const taxOption=document.querySelector('#shelf-select option[value="tax"]');
  if(taxOption)taxOption.remove();

  Object.entries(shelfLabels).forEach(([id,label])=>{
    const shelf=document.querySelector(`.shelf[data-shelf="${id}"]`);
    if(shelf){
      const strong=shelf.querySelector('strong');
      const small=shelf.querySelector('small');
      if(strong)strong.textContent=label.ja;
      if(small)small.textContent=label.en;
      shelf.setAttribute('aria-label',`${label.ja}の棚を見る`);
    }
    const option=document.querySelector(`#shelf-select option[value="${id}"]`);
    if(option)option.textContent=label.ja;
  });

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

  async function fetchText(path){
    const response=await fetch(path,{cache:'force-cache'});
    if(!response.ok)throw new Error(path);
    return (await response.text()).trim();
  }

  async function loadHighQualityHero(){
    const hero=document.querySelector('.hero');
    if(!hero)return;
    const paths=[0,1,2,3].map(i=>`/assets/hero-tiles/v2-col-${i}.b64?v=1`);
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
      images.forEach((image,index)=>context.drawImage(image,index*300,0,300,800));
      canvas.toBlob(blob=>{
        if(!blob)return;
        const url=URL.createObjectURL(blob);
        hero.style.setProperty('background-image',`url("${url}")`,'important');
        hero.classList.add('hero-hq-ready');
        document.querySelectorAll('.project-cover').forEach(element=>{
          element.style.setProperty('background-image',`url("${url}")`,'important');
        });
      },'image/jpeg',0.9);
    }catch(error){
      console.warn('High-quality hero fallback is being used.',error);
    }
  }

  async function loadHighQualityNotebook(){
    try{
      const data=await fetchText('/assets/editorial-notebook.b64?v=1');
      const style=document.createElement('style');
      style.dataset.asset='hq-notebook';
      style.textContent=`.photo-notebook{background-image:url("data:image/jpeg;base64,${data}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}`;
      document.head.appendChild(style);
    }catch(error){
      console.warn('High-quality notebook fallback is being used.',error);
    }
  }

  loadHighQualityHero();
  loadHighQualityNotebook();
})();
