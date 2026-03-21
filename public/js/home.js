import { api, addToCart } from '/js/app.js';

const productsGrid = document.getElementById('productsGrid');
const categoryChips = document.getElementById('categoryChips');
const globalSearch = document.getElementById('globalSearch');
const sortSelect = document.getElementById('sortSelect');
const promoTrack = document.getElementById('promoTrack');
const promoDots = document.getElementById('promoDots');
const menuToggle = document.getElementById('menuToggle');
const siteHeader = document.querySelector('.site-header');
const headerNav = document.getElementById('headerNav');
const sideMenu = document.getElementById('sideMenu');
const sideMenuBackdrop = document.getElementById('sideMenuBackdrop');
const sideClose = document.getElementById('sideClose');
const sideAccountLink = document.getElementById('sideAccountLink');

let products = [];
let currentCategory = 'Todos';
let searchText = '';
let currentSlide = 0;
let carouselTimer;

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function renderChips() {
  const categories = ['Todos', ...new Set(products.map((p) => p.category))];
  categoryChips.innerHTML = categories
    .map((category) => `<button class="chip ${category === currentCategory ? 'active' : ''}" data-category="${category}">${category}</button>`)
    .join('');

  categoryChips.querySelectorAll('.chip').forEach((button) => {
    button.onclick = () => {
      currentCategory = button.dataset.category;
      renderChips();
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

function renderProducts() {
  let list = products.filter((product) => {
    const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return (currentCategory === 'Todos' || product.category === currentCategory) && haystack.includes(searchText.toLowerCase());
  });

  list = sortProducts(list);

  productsGrid.innerHTML = list
    .map(
      (product) => `
        <article class="product-card">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-body">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-footer">
              <div>
                <div class="price">${formatBRL(product.price)}</div>
                <div class="meta">${product.category} • ${product.meta}</div>
              </div>
            </div>
            <div class="actions-row">
              <button class="primary-btn add-btn" data-id="${product.id}">Adicionar</button>
              <a class="ghost-btn" href="/pages/carrinho.html">Carrinho</a>
            </div>
          </div>
        </article>`
    )
    .join('');

  productsGrid.querySelectorAll('.add-btn').forEach((button) => {
    button.onclick = () => {
      const product = products.find((item) => item.id === button.dataset.id);
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      });
      button.textContent = 'Adicionado';
      setTimeout(() => {
        button.textContent = 'Adicionar';
      }, 1000);
    };
  });
}

function showSlide(index) {
  const slides = [...promoTrack.querySelectorAll('.promo-slide')];
  const dots = [...promoDots.querySelectorAll('button')];
  if (!slides.length) return;

  currentSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('active', slideIndex === currentSlide);
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === currentSlide);
    dot.setAttribute('aria-current', dotIndex === currentSlide ? 'true' : 'false');
  });
}

function startCarousel() {
  const slides = [...promoTrack.querySelectorAll('.promo-slide')];
  if (!slides.length) return;

  promoDots.innerHTML = slides
    .map((_, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" aria-label="Ir para banner ${index + 1}"></button>`)
    .join('');

  [...promoDots.querySelectorAll('button')].forEach((button, index) => {
    button.addEventListener('click', () => {
      showSlide(index);
      restartCarousel();
    });
  });

  showSlide(0);
  carouselTimer = window.setInterval(() => showSlide(currentSlide + 1), 4200);
}

function restartCarousel() {
  window.clearInterval(carouselTimer);
  carouselTimer = window.setInterval(() => showSlide(currentSlide + 1), 4200);
}

function closeMenu() {
  siteHeader?.classList.remove('menu-open');
  sideMenu?.classList.remove('open');
  sideMenu?.setAttribute('aria-hidden', 'true');
  sideMenuBackdrop?.setAttribute('hidden', 'hidden');
  menuToggle?.setAttribute('aria-expanded', 'false');
}

function openMenu() {
  siteHeader?.classList.add('menu-open');
  sideMenu?.classList.add('open');
  sideMenu?.setAttribute('aria-hidden', 'false');
  sideMenuBackdrop?.removeAttribute('hidden');
  menuToggle?.setAttribute('aria-expanded', 'true');
}

function setupMenu() {
  if (!menuToggle || !siteHeader || !headerNav) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = sideMenu?.classList.contains('open');
    if (isOpen) closeMenu();
    else openMenu();
  });

  [headerNav, sideMenu].forEach((container) => {
    container?.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });
  });

  sideMenuBackdrop?.addEventListener('click', closeMenu);
  sideClose?.addEventListener('click', closeMenu);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) closeMenu();
  });
}

async function init() {
  products = await api('/api/products');
  renderChips();
  renderProducts();
  startCarousel();
  setupMenu();
  if (sideAccountLink) {
    const accountLink = document.getElementById('accountLink');
    sideAccountLink.textContent = accountLink?.textContent || 'Entrar';
    sideAccountLink.href = accountLink?.getAttribute('href') || '/pages/login.html';
  }
}

globalSearch?.addEventListener('input', (event) => {
  searchText = event.target.value;
  renderProducts();
});

sortSelect?.addEventListener('change', renderProducts);

init().catch((error) => {
  productsGrid.innerHTML = `<p class="feedback error">${error.message}</p>`;
});
