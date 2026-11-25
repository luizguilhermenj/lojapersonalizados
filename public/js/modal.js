// Diálogos visuais: foco contido, Escape e restauração do estado do documento.
export function createModal(container, initialFocus) {
  let opened=false,previous,background=[],overflow='';
  const elements=()=>[...container.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
  function close(){if(!opened)return;opened=false;container.classList.add('hidden');container.setAttribute('aria-hidden','true');document.body.style.overflow=overflow;for(const [el,inert]of background)if(el.isConnected)el.inert=inert;background=[];if(previous?.isConnected)previous.focus({preventScroll:true});}
  function open(){if(opened)return;opened=true;previous=document.activeElement;overflow=document.body.style.overflow;container.classList.remove('hidden');container.setAttribute('aria-hidden','false');background=[...document.body.children].filter(el=>el!==container&&el.tagName!=='SCRIPT').map(el=>[el,el.inert]);for(const [el]of background)el.inert=true;document.body.style.overflow='hidden';(initialFocus||elements()[0])?.focus({preventScroll:true});}
  document.addEventListener('keydown',event=>{if(!opened)return;if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key!=='Tab')return;const focusable=elements();const first=focusable[0],last=focusable.at(-1);if(!first)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
  document.addEventListener('focusin',event=>{if(opened&&!container.contains(event.target))(initialFocus||elements()[0])?.focus({preventScroll:true});});
  window.addEventListener('pagehide',close);
  return {open,close};
}
