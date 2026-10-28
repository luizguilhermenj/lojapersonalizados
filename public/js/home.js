import { api } from '/js/app.js';
import { initHeroCarousel } from '/js/hero-carousel.js';
initHeroCarousel();

const productsGrid = document.getElementById('productsGrid');
const categoryChips = document.getElementById('categoryChips');
const globalSearch = document.getElementById('globalSearch');
const sortSelect = document.getElementById('sortSelect');

let products = [];
let currentCategory = 'Todos';
let searchText = new URLSearchParams(location.search).get('q') || '';
if (globalSearch) globalSearch.value = searchText;

const PRODUCT_ROUTES = {
  'caneca-ceramica': '/pages/caneca-ceramica.html#escolha-arte'
};

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function renderChips() {
  const categories = ['Todos', ...new Set(products.map((p) => p.category))];
  categoryChips.setAttribute('aria-busy','false');
  categoryChips.innerHTML = categories
    .map((category) => `<button type="button" class="chip ${category === currentCategory ? 'active' : ''}" aria-pressed="${category === currentCategory}" data-category="${category}">${category}</button>`)
    .join('');

  categoryChips.querySelectorAll('.chip').forEach((button) => {
    button.onclick = () => {
      currentCategory = button.dataset.category;
      categoryChips.querySelectorAll('.chip').forEach(chip=>{const active=chip.dataset.category===currentCategory;chip.classList.toggle('active',active);chip.setAttribute('aria-pressed',String(active));});
      renderProducts();
    };
  });
}

function sortProducts(list) {
  const sorted = [...list];
  const mode = sortSelect.value;

  if (mode === 'low') sorted.sort((a, b) => a.price - b.price);
  else if (mode === 'high') sorted.sort((a, b) => b.price - a.price);
  else if (mode === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => Number(b.featured) - Number(a.featured));

  return sorted;
}

function productActionMarkup(product) {
  const route = PRODUCT_ROUTES[product.slug];
  if (route) {
    return `<a class="primary-btn choose-btn" href="${route}">Quero esta</a>`;
  }
  return `<button class="ghost-btn soon-btn" type="button" data-name="${product.name}">Em breve</button>`;
}

const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function renderProducts() {
  productsGrid.setAttribute('aria-busy','false');
  let list = products.filter((product) => {
    const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return (currentCategory === 'Todos' || product.category === currentCategory) && fold(haystack).includes(fold(searchText.trim()));
  });

  list = sortProducts(list);

  document.getElementById('productResults').textContent = `${list.length} presente${list.length === 1 ? '' : 's'} no catálogo`;
  productsGrid.innerHTML = list
    .map(
      (product, index) => `
        <article class="product-card">
          <img src="${product.image}" alt="${product.name}" width="400" height="400" loading="${index < 2 ? 'eager' : 'lazy'}" fetchpriority="${index === 0 && matchMedia('(max-width:47.99rem)').matches ? 'high' : 'auto'}" decoding="async">
          <div class="product-body">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-footer">
              <div>
                <div class="price">${formatBRL(product.price)}</div>
                <div class="meta">${product.category} • ${product.meta}</div>
              </div>
            </div>
            <div class="actions-row single-action">
              ${productActionMarkup(product)}
            </div>
          </div>
        </article>`
    )
    .join('') || '<div class="empty-state"><h3>Nenhum presente encontrado</h3><p>Tente outro termo ou selecione outra categoria.</p><button class="ghost-btn" id="clearProductFilters" type="button">Limpar filtros</button></div>';
  document.getElementById('clearProductFilters')?.addEventListener('click', () => {currentCategory='Todos';searchText='';globalSearch.value='';renderChips();renderProducts();});

  productsGrid.querySelectorAll('.soon-btn').forEach((button) => {
    button.onclick = () => {
      button.textContent = 'Logo teremos';
      window.setTimeout(() => {
        button.textContent = 'Em breve';
      }, 1300);
    };
  });
}

async function init() {
  products = await api('/api/products');
  renderChips();
  renderProducts();
}

let searchTimer;
globalSearch?.addEventListener('input', (event) => {
  searchText = event.target.value;
  clearTimeout(searchTimer);searchTimer=setTimeout(renderProducts,120);
});

sortSelect?.addEventListener('change', renderProducts);

init().catch((error) => {
  productsGrid.setAttribute('aria-busy','false');
  categoryChips.setAttribute('aria-busy','false');
  document.getElementById('productResults').textContent='Não foi possível carregar o catálogo.';
  productsGrid.innerHTML = `<p class="feedback error">${error.message}</p>`;
});
