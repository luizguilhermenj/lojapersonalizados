import { api, writeCart } from '/js/app.js';
const statusEl=document.getElementById('resultStatus'); const detailsEl=document.getElementById('orderDetails');
function formatBRL(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)}
(async function(){
  const params=new URLSearchParams(location.search);
  const orderId=params.get('order_id');
  const statusParam=params.get('collection_status')||params.get('status')||'pending';
  const paymentId=params.get('payment_id')||params.get('collection_id');
  if(!orderId){statusEl.className='feedback error'; statusEl.textContent='Pedido não identificado no retorno.'; return;}
  try{
    await api(`/api/orders/${orderId}/return-update`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentStatus:statusParam,paymentId})}).catch(()=>{});
    const sync=await api(`/api/orders/${orderId}/sync-payment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId})}).catch(()=>null);
    const order = sync?.order || await api(`/api/orders/public/${orderId}`);
    const finalStatus = order.paymentStatus || statusParam;
    statusEl.className=`feedback ${finalStatus==='approved'?'success':'info'}`;
    statusEl.textContent = finalStatus==='approved' ? 'Pagamento confirmado com sucesso.' : `Checkout retornou com status: ${finalStatus}`;
    detailsEl.innerHTML=`<article class="order-card"><header><div><strong>Pedido ${order.id.slice(0,8)}</strong><div class="feedback">${order.customer.name}</div></div><div>${finalStatus==='approved' ? '<span class="status-pill status-approved">aprovado</span>' : ''}</div></header><div class="order-meta"><div><strong>Total</strong><div>${formatBRL(order.total)}</div></div><div><strong>Itens</strong><div>${order.items.map(item=>`${item.quantity}x ${item.name}`).join(', ')}</div></div><div><strong>Frete</strong><div>${order.shipping?.label||'-'}</div></div><div><strong>Pagamento</strong><div>${order.paymentId||paymentId||'-'}</div></div></div>${order.whatsappUrl?`<div class="toolbar"><a class="primary-btn" href="${order.whatsappUrl}" target="_blank" rel="noopener" id="whatsLink">Notificar vendedor ativo</a></div>`:''}</article>`;
    if(finalStatus==='approved'){
      writeCart([]);
      localStorage.setItem('artize_payment_refresh', String(Date.now()));
    }
  }catch(err){statusEl.className='feedback error'; statusEl.textContent=err.message;}
})();
