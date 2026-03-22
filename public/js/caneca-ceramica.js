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
  price: 34.9,
};

const THEMES = [
  { id: 'todos', label: 'Todas' },
  { id: 'pascoa', label: 'Páscoa' },
  { id: 'maes', label: 'Dia das Mães' },
  { id: 'namorados', label: 'Dia dos Namorados' },
  { id: 'paes', label: 'Dia dos Pais' },
  { id: 'avos', label: 'Dia dos Avós' },
  { id: 'flores', label: 'Cactus e Flores' },
  { id: 'diversos', label: 'Diversas' },
];

let arts = [];
let currentTheme = 'todos';
let selectedArt = null;

function normalizeArts(rawArts) {
  return (Array.isArray(rawArts) ? rawArts : []).filter((art) => art && art.id && art.image).map((art) => ({
    id: String(art.id),
    name: art.name || 'Arte sem nome',
    description: art.description || 'Arte para caneca de cerâmica.',
    theme: art.theme || 'diversos',
    themeLabel: art.themeLabel || themeLabel(art.theme || 'diversos'),
    image: art.image,
  }));
}

function themeLabel(themeId) {
  return THEMES.find((theme) => theme.id === themeId)?.label || 'Diversas';
}

function countForTheme(themeId) {
  return themeId === 'todos' ? arts.length : arts.filter((art) => art.theme === themeId).length;
}

function getFilteredArts() {
  return currentTheme === 'todos' ? arts : arts.filter((art) => art.theme === currentTheme);
}

function updateSummary(filteredArts) {
  if (totalArtsLabel) {
    totalArtsLabel.textContent = currentTheme === 'todos'
      ? `${filteredArts.length} artes disponíveis`
      : `${filteredArts.length} artes em ${themeLabel(currentTheme)}`;
  }

  if (selectedThemeEyebrow) {
    selectedThemeEyebrow.textContent = currentTheme === 'todos'
      ? 'Coleções temáticas'
      : `Coleção ${themeLabel(currentTheme)}`;
  }

  if (filterSummary) {
    filterSummary.textContent = currentTheme === 'todos'
      ? 'Mostrando todas as artes disponíveis.'
      : `Mostrando somente a coleção ${themeLabel(currentTheme)}.`;
  }
}

function syncSelectedPreview() {
  if (!selectedArt) return;
  if (selectedMockup) {
    selectedMockup.src = selectedArt.image;
    selectedMockup.alt = `${baseProduct.name} com ${selectedArt.name}`;
  }
  if (selectedArtName) selectedArtName.textContent = selectedArt.name;
  if (selectedArtDescription) selectedArtDescription.textContent = selectedArt.description;
}

function renderThemeFilters() {
  if (!themeFilters) return;
  themeFilters.innerHTML = THEMES
    .filter((theme) => theme.id === 'todos' || countForTheme(theme.id) > 0)
    .map((theme) => `
      <button
        type="button"
        class="chip ${theme.id === currentTheme ? 'active' : ''}"
        data-theme="${theme.id}"
      >
        ${theme.label} (${countForTheme(theme.id)})
      </button>
    `)
    .join('');

  themeFilters.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      currentTheme = button.dataset.theme;
      const filtered = getFilteredArts();
      if (!filtered.some((art) => art.id === selectedArt?.id)) {
        selectedArt = filtered[0] || null;
        syncSelectedPreview();
      }
      renderThemeFilters();
      renderArtGrid();
    });
  });
}

function renderArtGrid() {
  const filteredArts = getFilteredArts();
  updateSummary(filteredArts);

  if (!filteredArts.length) {
    artGrid.innerHTML = '<p class="empty-state">Nenhuma arte foi encontrada. Verifique o arquivo data/caneca-ceramica-artes.json e as imagens em img/artes/caneca-ceramica.</p>';
    return;
  }

  artGrid.innerHTML = filteredArts.map((art) => `
    <article class="art-card ${selectedArt?.id === art.id ? 'active' : ''}" data-art-id="${art.id}">
      <img src="${art.image}" alt="${art.name}" loading="lazy">
      <div class="art-card-copy">
        <h3>${art.name}</h3>
        <p>${art.description}</p>
      </div>
      <span class="select-pill">${selectedArt?.id === art.id ? 'Selecionada' : 'Toque para escolher'}</span>
    </article>
  `).join('');

  artGrid.querySelectorAll('[data-art-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const art = arts.find((item) => item.id === card.dataset.artId);
      if (!art) return;
      selectedArt = art;
      syncSelectedPreview();
      renderArtGrid();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function loadArts() {
  try {
    const response = await fetch('/data/caneca-ceramica-artes.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Falha ao carregar as artes.');
    arts = normalizeArts(await response.json());
    if (!arts.length) throw new Error('Nenhuma arte cadastrada.');

    selectedArt = arts[0];
    syncSelectedPreview();
    renderThemeFilters();
    renderArtGrid();
    ensureAnchorPosition();
  } catch (error) {
    console.error(error);
    if (totalArtsLabel) totalArtsLabel.textContent = 'Sem artes disponíveis';
    if (filterSummary) filterSummary.textContent = 'Não foi possível carregar as artes agora.';
    if (artGrid) {
      artGrid.innerHTML = '<p class="empty-state">Não foi possível carregar as artes. Verifique o arquivo <strong>data/caneca-ceramica-artes.json</strong>.</p>';
    }
  }
}

function ensureAnchorPosition() {
  if (window.location.hash !== '#escolha-arte') return;
  const section = document.getElementById('escolha-arte');
  const header = document.querySelector('.sub-header');
  if (!section) return;

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      const headerOffset = header ? header.offsetHeight + 8 : 8;
      const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'auto' });
    }, 120);
  });
}

addSelectedArtBtn?.addEventListener('click', () => {
  if (!selectedArt) return;

  addToCart({
    cartKey: `${baseProduct.id}::${selectedArt.id}`,
    productId: baseProduct.id,
    name: `${baseProduct.name} • ${selectedArt.name}`,
    baseName: baseProduct.name,
    variation: selectedArt.name,
    variationId: selectedArt.id,
    price: baseProduct.price,
    image: selectedArt.image,
    quantity: 1,
  });

  if (customizerFeedback) {
    customizerFeedback.className = 'feedback success';
    customizerFeedback.textContent = `${selectedArt.name} foi adicionada ao carrinho.`;
  }
});

window.addEventListener('load', ensureAnchorPosition);
window.addEventListener('resize', () => {
  if (window.location.hash === '#escolha-arte') ensureAnchorPosition();
});

loadArts();
