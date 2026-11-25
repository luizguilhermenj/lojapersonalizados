import { initNavigation } from '/js/navigation.js';
const storageKeys={cart:'artize_cart_v1',session:'artize_session_v1'};
export function readCart(){try{return JSON.parse(localStorage.getItem(storageKeys.cart)||'[]')}catch{return []}}
export function writeCart(items){if (window.parent !== window && new URLSearchParams(location.search).get('studioPreview') === '1') return;localStorage.setItem(storageKeys.cart,JSON.stringify(items)); updateCartBadge();}
export function addToCart(item){
  const cart=readCart();
  const cartKey=item.cartKey||item.productId;
  const existing=cart.find(p=>(p.cartKey||p.productId)===cartKey);
  if(existing){existing.quantity+=(item.quantity||1)}else{cart.push({...item,cartKey,quantity:item.quantity||1})}
  writeCart(cart)
}
export function removeFromCart(cartKey){writeCart(readCart().filter(item=>(item.cartKey||item.productId)!==cartKey))}
export function updateCartBadge(){const badge=document.getElementById('cartCountBadge'); if(!badge) return; const qty=readCart().reduce((sum,item)=>sum+item.quantity,0); badge.textContent=qty; badge.closest('a')?.setAttribute('aria-label',`Carrinho, ${qty} ${qty===1?'item':'itens'}`)}
export function getSession(){try{return JSON.parse(localStorage.getItem(storageKeys.session)||'null')}catch{return null}}
export function getDashboardPath(){const session=getSession(); return session?.user?.role==='admin'?'/pages/admin.html':'/pages/pedidos.html'}
export function setSession(session){localStorage.setItem(storageKeys.session,JSON.stringify(session)); updateAccountLinks()}
export function clearSession(){localStorage.removeItem(storageKeys.session); updateAccountLinks()}
export function authHeaders(extra={}){const session=getSession(); return {...extra, ...(session?.token?{Authorization:`Bearer ${session.token}`}:{})}}
export async function api(url, options={}){const headers=authHeaders(options.headers||{}); const response=await fetch(url,{...options,headers}); const text=await response.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{data={raw:text}} if(!response.ok) throw new Error(data.error||data.details||'Erro na requisição'); return data}
export function updateAccountLinks(){
  const session=getSession();const dashboardPath=getDashboardPath();
  const accountLink=document.getElementById('accountLink');
  if(accountLink){accountLink.textContent=session?`Olá, ${session.user.name.split(' ')[0]}`:'Entrar na minha conta';accountLink.href=session?dashboardPath:'/pages/login.html';}
  const miniUserArea=document.getElementById('miniUserArea');
  if(miniUserArea){
    miniUserArea.replaceChildren();
    if(session){
      const name=document.createElement('span');name.textContent=session.user.name;
      const button=document.createElement('button');button.id='logoutMini';button.className='ghost-btn';button.type='button';button.textContent='Sair';
      button.onclick=()=>{clearSession();location.href='/pages/login.html';};miniUserArea.append(name,button);
    }else{const link=document.createElement('a');link.className='ghost-btn';link.href='/pages/login.html';link.textContent='Entrar ou criar conta';miniUserArea.append(link);}
  }
}
updateCartBadge(); updateAccountLinks(); initNavigation();
