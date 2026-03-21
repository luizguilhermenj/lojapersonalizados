import { api, getSession } from '/js/app.js';
const adminOrders=document.getElementById('adminOrders');
const adminSummary=document.getElementById('adminSummary');
const feedback=document.getElementById('adminFeedback');
const statusFilters=document.getElementById('statusFilters');
const refreshBtn=document.getElementById('refreshAdminBtn');
const modal=document.getElementById('newSaleModal');
const modalText=document.getElementById('newSaleText');
const modalList=document.getElementById('newSaleList');
const ackBtn=document.getElementById('ackNewSaleBtn');
const statuses=['todos','aguardando_processamento','em_producao','enviado','entregue','cancelado'];
let currentFilter='todos';

function formatBRL(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
function formatStatus(status){return String(status||'').replaceAll('_',' ')}
function formatDate(date){return new Date(date).toLocaleString('pt-BR')}
function pill(status){return `<span class="status-pill status-${status}">${formatStatus(status)}</span>`}

function buildFilters(){
  statusFilters.innerHTML=statuses.map(status=>`<button type="button" class="chip ${status===currentFilter?'active':''}" data-status="${status}">${status==='todos'?'Todos':formatStatus(status)}</button>`).join('');
  statusFilters.querySelectorAll('[data-status]').forEach(btn=>btn.onclick=()=>{currentFilter=btn.dataset.status; buildFilters(); render();});
}

async function checkNewSales(){
  try{
    const info=await api('/api/admin/notifications/new-sales');
    if(!info.hasNewSales) return;
    modalText.textContent=info.count===1?'Entrou 1 novo pedido desde a última vez que você visualizou o painel.':'Entraram '+info.count+' novos pedidos desde a última vez que você visualizou o painel.';
    modalList.innerHTML=info.orders.map(order=>`<div class="modal-order"><strong>Pedido ${order.id.slice(0,8)}</strong><span>${order.customerName}</span><small>${formatBRL(order.total)} • ${formatDate(order.createdAt)}</small></div>`).join('');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
  }catch(err){console.error(err)}
}

async function acknowledgeNewSales(){
  await api('/api/admin/notifications/new-sales/ack',{method:'POST'});
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
}

async function render(){
  const session=getSession();
  if(!session){location.href='/pages/login.html'; return;}
  if(session.user?.role!=='admin'){location.href='/pages/pedidos.html'; return;}
  try{
    const query=currentFilter==='todos'?'':`?status=${encodeURIComponent(currentFilter)}`;
    const data=await api(`/api/admin/orders${query}`);
    const allData=currentFilter==='todos'?data.orders:(await api('/api/admin/orders')).orders;
    const approvedOrders=allData.filter(o=>o.paymentStatus==='approved'||o.paymentStatus==='accredited'||o.orderStatus!=='aguardando_pagamento');
    adminSummary.innerHTML=`
      <div class="tile"><strong>${allData.length}</strong><span>Pedidos totais</span></div>
      <div class="tile"><strong>${approvedOrders.length}</strong><span>Vendas registradas</span></div>
      <div class="tile"><strong>${allData.filter(o=>o.orderStatus==='em_producao').length}</strong><span>Em produção</span></div>
      <div class="tile"><strong>${formatBRL(approvedOrders.reduce((s,o)=>s+(o.total||0),0))}</strong><span>Faturamento bruto</span></div>`;

    if(!data.orders.length){
      adminOrders.innerHTML='<article class="empty-state"><strong>Nenhum pedido neste filtro.</strong><span>Troque o status acima ou aguarde novas vendas.</span></article>';
      return;
    }

    adminOrders.innerHTML=data.orders.map(order=>`<article class="order-card">      <header>        <div>          <strong>Pedido ${order.id.slice(0,8)}</strong>          <div class="feedback">${order.customer.name} • ${order.customer.email}</div>        </div>        <div class="order-pill-group">${pill(order.orderStatus)} ${pill(order.paymentStatus||'pending')}</div>      </header>      <div class="order-meta">        <div><strong>Total</strong><div>${formatBRL(order.total)}</div></div>        <div><strong>Itens</strong><div>${order.items.map(item=>`${item.quantity}x ${item.name}`).join(', ')}</div></div>        <div><strong>Entrega</strong><div>${order.shipping?.label||'-'}</div></div>        <div><strong>Criado em</strong><div>${formatDate(order.createdAt)}</div></div>        <div><strong>Última atualização</strong><div>${formatDate(order.updatedAt||order.createdAt)}</div></div>      </div>      <div class="admin-order-actions">        <select class="admin-select" data-id="${order.id}">${statuses.filter(s=>s!=='todos').map(s=>`<option value="${s}" ${order.orderStatus===s?'selected':''}>${formatStatus(s)}</option>`).join('')}</select>        <button class="primary-btn save-status" data-id="${order.id}">Salvar status</button>        ${order.whatsappUrl?`<a class="ghost-btn" href="${order.whatsappUrl}" target="_blank" rel="noopener">Notificar vendedor ativo</a>`:''}      </div>    </article>`).join('');

    adminOrders.querySelectorAll('.save-status').forEach(btn=>btn.onclick=async()=>{
      const id=btn.dataset.id;
      const select=adminOrders.querySelector(`select[data-id="${id}"]`);
      btn.disabled=true;
      btn.textContent='Salvando...';
      try{
        await api(`/api/admin/orders/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderStatus:select.value})});
        feedback.className='feedback success';
        feedback.textContent='Status atualizado e salvo com sucesso.';
        await render();
      }catch(err){
        feedback.className='feedback error';
        feedback.textContent=err.message;
        btn.disabled=false;
        btn.textContent='Salvar status';
      }
    });
  }catch(err){
    feedback.className='feedback error';
    feedback.textContent=err.message;
  }
}

refreshBtn?.addEventListener('click', render);
ackBtn?.addEventListener('click', async()=>{try{await acknowledgeNewSales();}catch(err){feedback.className='feedback error'; feedback.textContent=err.message;}});
buildFilters();
await render();
await checkNewSales();
