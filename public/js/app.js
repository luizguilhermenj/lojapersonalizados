const storageKeys={cart:'artize_cart_v1',session:'artize_session_v1'};
export function readCart(){try{return JSON.parse(localStorage.getItem(storageKeys.cart)||'[]')}catch{return []}}
export function writeCart(items){localStorage.setItem(storageKeys.cart,JSON.stringify(items)); updateCartBadge();}
export function addToCart(item){const cart=readCart(); const existing=cart.find(p=>p.productId===item.productId); if(existing){existing.quantity+=item.quantity||1}else{cart.push({...item,quantity:item.quantity||1})} writeCart(cart)}
export function removeFromCart(productId){writeCart(readCart().filter(item=>item.productId!==productId))}
export function updateCartBadge(){const badge=document.getElementById('cartCountBadge'); if(!badge) return; const qty=readCart().reduce((sum,item)=>sum+item.quantity,0); badge.textContent=qty}
export function getSession(){try{return JSON.parse(localStorage.getItem(storageKeys.session)||'null')}catch{return null}}
export function setSession(session){localStorage.setItem(storageKeys.session,JSON.stringify(session)); updateAccountLinks()}
export function clearSession(){localStorage.removeItem(storageKeys.session); updateAccountLinks()}
export function authHeaders(extra={}){const session=getSession(); return {...extra, ...(session?.token?{Authorization:`Bearer ${session.token}`}:{})}}
export async function api(url, options={}){const headers=authHeaders(options.headers||{}); const response=await fetch(url,{...options,headers}); const text=await response.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{data={raw:text}} if(!response.ok) throw new Error(data.error||data.details||'Erro na requisição'); return data}
export function updateAccountLinks(){const session=getSession(); const accountLink=document.getElementById('accountLink'); if(accountLink){accountLink.textContent=session?`Olá, ${session.user.name.split(' ')[0]}`:'Entrar'; accountLink.href=session?'/pages/pedidos.html':'/pages/login.html'} const miniUserArea=document.getElementById('miniUserArea'); if(miniUserArea){miniUserArea.innerHTML=session?`<span>${session.user.name}</span> <button id="logoutMini" class="ghost-btn" type="button">Sair</button>`:`<a class="ghost-btn" href="/pages/login.html">Entrar</a>`; const btn=document.getElementById('logoutMini'); if(btn) btn.onclick=()=>{clearSession(); location.href='/pages/login.html'}; }}
updateCartBadge(); updateAccountLinks();
