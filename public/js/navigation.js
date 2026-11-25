// Navegação independente de catálogo, sessão e disponibilidade do banco de temas.
export function initNavigation() {
  const trigger=document.getElementById('menuToggle');
  const panel=document.getElementById('sideMenu');
  const backdrop=document.getElementById('sideMenuBackdrop');
  const dismiss=document.getElementById('sideClose');
  if(!trigger||!panel||!backdrop||!dismiss||panel.dataset.initialized) return;
  panel.dataset.initialized='true';
  let open=false;
  let oldOverflow='';
  let background=[];
  const focusable=()=>[...panel.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  function close(restoreFocus=true){
    if(!open)return;
    open=false;panel.hidden=true;panel.inert=true;panel.setAttribute('aria-hidden','true');
    backdrop.hidden=true;trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-label','Abrir menu');
    document.body.style.overflow=oldOverflow;
    for(const [el,inert] of background)if(el.isConnected)el.inert=inert;
    background=[];
    if(restoreFocus)trigger.focus({preventScroll:true});
  }
  function show(){
    open=true;oldOverflow=document.body.style.overflow;
    panel.hidden=false;panel.inert=false;panel.setAttribute('aria-hidden','false');
    backdrop.hidden=false;trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-label','Fechar menu');
    background=[...document.body.children].filter(el=>el!==panel&&el!==backdrop&&el.tagName!=='SCRIPT').map(el=>[el,el.inert]);
    for(const [el]of background)el.inert=true;
    document.body.style.overflow='hidden';dismiss.focus({preventScroll:true});
  }
  trigger.addEventListener('click',()=>open?close():show());
  dismiss.addEventListener('click',()=>close());backdrop.addEventListener('click',()=>close());
  panel.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link){close(false);const target=new URL(link.href);if(target.pathname===location.pathname&&target.hash){const section=document.getElementById(target.hash.slice(1));if(section){section.setAttribute('tabindex','-1');section.focus({preventScroll:true});}}}});
  document.addEventListener('keydown',event=>{
    if(!open)return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const elements=focusable();const first=elements[0];const last=elements.at(-1);
    if(!first)return;
    if(!panel.contains(document.activeElement)){event.preventDefault();first.focus();}
    else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  document.addEventListener('focusin',event=>{if(open&&!panel.contains(event.target))dismiss.focus();});
  matchMedia('(min-width:64rem)').addEventListener('change',()=>close());
  window.addEventListener('pagehide',()=>close(false));
}
