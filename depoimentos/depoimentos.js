(() => {
 const dialog=document.querySelector('#media-dialog'),content=document.querySelector('#media-content');let trigger;
 if(!dialog?.showModal)return;
 document.addEventListener('click',e=>{
 const a=e.target.closest('[data-video],[data-print]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();trigger=a;
 const video=Boolean(a.dataset.video),el=document.createElement(video?'iframe':'img');el.src=a.href;
 if(video){el.title=a.getAttribute('aria-label');el.allow='autoplay; fullscreen; picture-in-picture';el.allowFullscreen=true;}else el.alt=a.querySelector('img').alt;
 content.replaceChildren(el);dialog.classList.toggle('portrait',a.dataset.portrait==='true');dialog.showModal();document.body.style.overflow='hidden';
 });
 dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{content.replaceChildren();document.body.style.overflow='';trigger?.focus();});
})();
