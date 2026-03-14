const catalog = document.getElementById('catalog');
const template = document.getElementById('product-template');

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

async function loadProducts() {
  const response = await fetch('/api/products');

  if (!response.ok) {
    throw new Error('Falha ao carregar catálogo.');
  }

  const products = await response.json();

  products.forEach((product) => {
    const node = template.content.cloneNode(true);

    node.querySelector('.product-image').src = product.image;
    node.querySelector('.product-image').alt = product.name;
    node.querySelector('.product-name').textContent = product.name;
    node.querySelector('.product-description').textContent = product.description;
    node.querySelector('.product-price').textContent = formatBRL(product.price);
    node.querySelector('input[name="productId"]').value = product.id;

    const form = node.querySelector('.buy-form');
    const feedback = node.querySelector('.feedback');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      feedback.textContent = 'Gerando checkout...';

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.quantity = Number(payload.quantity);

      try {
        const response = await fetch('/api/create-preference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const raw = await response.text();
        console.log('Resposta bruta da API:', raw);

        let data;
        try {
          data = JSON.parse(raw);
        } catch (parseError) {
          throw new Error(`Resposta inválida do servidor: ${raw}`);
        }

        if (!response.ok) {
          throw new Error(data.details || data.error || 'Falha ao iniciar checkout.');
        }

        const checkoutUrl = data.initPoint || data.sandboxInitPoint;

        if (!checkoutUrl) {
          throw new Error('A API não retornou a URL do checkout.');
        }

        feedback.textContent = 'Redirecionando para o Mercado Pago...';
        window.location.href = checkoutUrl;
      } catch (error) {
        console.error('Erro no frontend:', error);
        feedback.textContent = error.message || 'Erro ao iniciar checkout.';
      }
    });

    catalog.appendChild(node);
  });
}

loadProducts().catch((error) => {
  console.error('Erro ao carregar produtos:', error);
  catalog.innerHTML = `<p class="error">Não foi possível carregar os produtos: ${error.message}</p>`;
});