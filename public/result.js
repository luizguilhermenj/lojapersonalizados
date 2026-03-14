const params = new URLSearchParams(window.location.search);
const orderId = params.get('order_id');
const resultStatus = document.getElementById('result-status');
const orderBox = document.getElementById('order-box');

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

async function loadOrder() {
  if (!orderId) {
    resultStatus.textContent = 'Nenhum pedido foi informado na URL.';
    return;
  }

  try {
    const response = await fetch(`/api/orders/${orderId}`);
    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error || 'Pedido não encontrado.');
    }

    const statusLabel = params.get('status') || order.paymentStatus || order.status;
    resultStatus.textContent = `Retorno do checkout: ${statusLabel}`;

    document.getElementById('order-id').textContent = order.id;
    document.getElementById('order-product').textContent = order.productName;
    document.getElementById('order-qty').textContent = order.quantity;
    document.getElementById('order-total').textContent = formatBRL(order.total);
    document.getElementById('order-status').textContent = order.status;
    document.getElementById('order-payment-status').textContent = order.paymentStatus || '-';
    document.getElementById('order-payment-id').textContent = order.paymentId || '-';

    orderBox.classList.remove('hidden');
  } catch (error) {
    resultStatus.textContent = error.message;
  }
}

loadOrder();
