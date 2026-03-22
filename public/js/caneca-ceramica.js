import { addToCart } from '/js/app.js';

const artGrid = document.getElementById('artGrid');
const themeFilters = document.getElementById('themeFilters');
const filterSummary = document.getElementById('filterSummary');
const selectedMockup = document.getElementById('selectedMockup');
const selectedArtName = document.getElementById('selectedArtName');
const selectedArtDescription = document.getElementById('selectedArtDescription');
const selectedThemeEyebrow = document.getElementById('selectedThemeEyebrow');
const totalArtsLabel = document.getElementById('totalArtsLabel');
const addSelectedArtBtn = document.getElementById('addSelectedArtBtn');
const customizerFeedback = document.getElementById('customizerFeedback');

const baseProduct = {
  id: 'caneca-ceramica',
  name: 'Caneca de Cerâmica',
  price: 34.9
};

const THEMES = [
  { id: 'todos', label: 'Todas' },
  { id: 'pascoa', label: 'Páscoa' },
  { id: 'maes', label: 'Dia das Mães' },
  { id: 'namorados', label: 'Dia dos Namorados' },
  { id: 'paes', label: 'Dia dos Pais' },
  { id: 'avos', label: 'Dia dos Avós' },
  { id: 'flores', label: 'Cactus e Flores' },
  { id: 'diversos', label: 'Diversas' }
];

let arts = [];
let selectedArt = null;
let currentTheme = 'todos';

function getThemeLabel(themeId) {
  return THEMES.find((theme) => theme.id === themeId)?.label || 'Todas';
}

function getThemeCount(themeId) {
  if (themeId === 'todos') return arts.length;
  return arts.filter((art) => art.theme === themeId).length;
}

function getFilteredArts() {
  if (currentTheme === 'todos') return arts;
  return arts.filter((art) => art.theme === currentTheme);
}

function updateThemeUi(filteredCount) {
  if (filterSummary) {
    filterSummary.textContent = currentTheme === 'todos'
      ? `Mostrando todas as ${filteredCount} artes disponíveis.`
      : `Mostrando ${filteredCount} artes da coleção ${getThemeLabel(currentTheme)}.`;
  }

  if (selectedThemeEyebrow) {
    selectedThemeEyebrow.textContent = currentTheme === 'todos'
      ? 'Coleções temáticas'
      : `Coleção ${getThemeLabel(currentTheme)}`;
  }

  if (totalArtsLabel) {
    totalArtsLabel.textContent = currentTheme === 'todos'
      ? `${filteredCount} artes disponíveis`
      : `${filteredCount} artes em ${getThemeLabel(currentTheme)}`;
  }
}

function syncSelectedArt() {
  if (!selectedArt) return;

  if (selectedMockup) {
    selectedMockup.src = selectedArt.image;
    selectedMockup.alt = `${baseProduct.name} com arte ${selectedArt.name}`;
  }

  if (selectedArtName) selectedArtName.textContent = selectedArt.name;
  if (selectedArtDescription) selectedArtDescription.textContent = selectedArt.description;
}

function renderThemeFilters() {
  if (!themeFilters) return;

  themeFilters.innerHTML = THEMES
    .filter((theme) => theme.id === 'todos' || getThemeCount(theme.id) > 0)
    .map((theme) => `
      <button
        class="chip ${theme.id === currentTheme ? 'active' : ''}"
        type="button"
        data-theme="${theme.id}"
      >
        ${theme.label} (${getThemeCount(theme.id)})
      </button>
    `)
    .join('');

  themeFilters.querySelectorAll('.chip').forEach((button) => {
    button.addEventListener('click', () => {
      currentTheme = button.dataset.theme;
      const filtered = getFilteredArts();

      if (!filtered.some((art) => art.id === selectedArt?.id)) {
        selectedArt = filtered[0] || null;
        syncSelectedArt();
      }

      updateThemeUi(filtered.length);
      renderThemeFilters();
      renderArts();
    });
  });
}

function renderArts() {
  const filteredArts = getFilteredArts();
  updateThemeUi(filteredArts.length);

  if (!filteredArts.length) {
    artGrid.innerHTML = '<p class="feedback error">Nenhuma arte foi encontrada para este tema.</p>';
    return;
  }

  artGrid.innerHTML = filteredArts.map((art) => `
    <article class="art-card ${art.id === selectedArt?.id ? 'active' : ''}" data-art-id="${art.id}">
      <img src="${art.image}" alt="${art.name}">
      <div class="art-body">
        <h3>${art.name}</h3>
        <p>${art.description}</p>
      </div>
      <span class="select-pill">${art.id === selectedArt?.id ? 'Selecionada' : 'Toque para escolher'}</span>
    </article>
  `).join('');

  artGrid.querySelectorAll('.art-card').forEach((card) => {
    card.addEventListener('click', () => {
      const art = arts.find((item) => item.id === card.dataset.artId);
      if (!art) return;
      selectedArt = art;
      syncSelectedArt();
      renderArts();
    });
  });
}

async function loadArtes() {
  try {
    const response = await fetch('/data/caneca-ceramica-artes.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Falha ao carregar artes.');
    const payload = await response.json();

    if (!Array.isArray(payload) || !payload.length) {
      throw new Error('Nenhuma arte cadastrada.');
    }

    arts = payload;
    selectedArt = arts[0];
    syncSelectedArt();
    renderThemeFilters();
    renderArts();
  } catch (error) {
    console.error(error);
    if (totalArtsLabel) totalArtsLabel.textContent = 'Sem artes disponíveis';
    if (filterSummary) filterSummary.textContent = 'Não foi possível carregar as artes.';
    artGrid.innerHTML = '<p class="feedback error">Nenhuma arte foi encontrada. Verifique o arquivo public/data/caneca-ceramica-artes.json.</p>';
  }
}

addSelectedArtBtn?.addEventListener('click', () => {
  if (!selectedArt) return;

  const cartKey = `${baseProduct.id}::${selectedArt.id}`;
  addToCart({
    cartKey,
    productId: baseProduct.id,
    name: `${baseProduct.name} • ${selectedArt.name}`,
    price: baseProduct.price,
    image: selectedArt.image,
    quantity: 1,
    variation: selectedArt.name,
    variationId: selectedArt.id,
    baseName: baseProduct.name
  });

  if (customizerFeedback) {
    customizerFeedback.className = 'feedback success';
    customizerFeedback.textContent = `Perfeito! ${selectedArt.name} foi adicionada ao carrinho.`;
  }
});

window.addEventListener('load', () => {
  if (window.location.hash === '#escolha-arte') {
    const secao = document.getElementById('escolha-arte');
    if (secao) {
      setTimeout(() => {
        const stickyHeader = document.querySelector('.sub-header');
        const headerOffset = stickyHeader ? stickyHeader.offsetHeight + 6 : 6;
        const y = secao.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: y, behavior: 'auto' });
      }, 220);
    }
  }
});

loadArtes();
