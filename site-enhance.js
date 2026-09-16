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
})();
