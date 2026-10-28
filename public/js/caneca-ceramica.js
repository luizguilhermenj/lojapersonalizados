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
let previews = {};
const cards = new Map();
let activeCard;
const pageSize = 24;
let visibleCount = pageSize;
const loadMore = document.getElementById('loadMoreArts');

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
    const nextImage=previews[selectedArt.id]?.preview || selectedArt.image;
    if(selectedMockup.getAttribute('src')!==nextImage)selectedMockup.src = nextImage;
    selectedMockup.width = selectedMockup.height = 800;
    selectedMockup.alt = `${baseProduct.name} com arte ${selectedArt.name}`;
  }

  if (selectedArtName) selectedArtName.textContent = selectedArt.name;
  if (selectedArtDescription) selectedArtDescription.textContent = selectedArt.description;
  document.getElementById('mobileArtName').textContent = selectedArt.name;
  document.querySelectorAll('[data-add-art]').forEach(button => button.disabled = false);
  for (const card of new Set([activeCard,cards.get(selectedArt.id)])) {
    if(!card)continue;
    const active = card.dataset.artId === selectedArt.id;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
    card.querySelector('.select-pill').textContent = active ? 'Selecionada' : 'Escolher arte';
  }
  activeCard=cards.get(selectedArt.id);
}

function renderThemeFilters() {
  if (!themeFilters) return;

  themeFilters.innerHTML = THEMES
    .filter((theme) => theme.id === 'todos' || getThemeCount(theme.id) > 0)
    .map((theme) => `
      <button
        class="chip ${theme.id === currentTheme ? 'active' : ''}"
        type="button"
        aria-pressed="${theme.id === currentTheme}" data-theme="${theme.id}"
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
      themeFilters.querySelectorAll('[data-theme]').forEach(chip => {const active=chip.dataset.theme===currentTheme;chip.classList.toggle('active',active);chip.setAttribute('aria-pressed',String(active));});
      visibleCount = pageSize;
      renderArts();
    });
  });
}

function createCard(art) {
  const card = document.createElement('button');
  card.type = 'button';card.className = 'art-card';card.dataset.artId = art.id;card.setAttribute('aria-pressed','false');
  const image = document.createElement('img');
  const preview = previews[art.id];
  image.src = preview?.small || art.image;
  if (preview) {image.srcset = `${preview.small} 200w, ${preview.medium} 400w`;image.sizes = '(min-width:1024px) 240px, (min-width:768px) 30vw, 44vw';}
  image.alt = '';image.width = image.height = 400;image.loading = 'lazy';image.decoding = 'async';
  const body = document.createElement('span');body.className = 'art-body';
  const title = document.createElement('strong');title.textContent = art.name;
  const description = document.createElement('span');description.className='art-description';description.textContent=art.description;
  body.append(title,description);
  const pill = document.createElement('span');pill.className = 'select-pill';pill.ariaHidden = 'true';pill.textContent='Escolher arte';
  card.append(image,body,pill);
  card.setAttribute('aria-label', `Escolher arte ${art.name}`);
  card.addEventListener('click', () => {selectedArt=art;syncSelectedArt();});
  cards.set(art.id,card);return card;
}
function renderArts() {
  const filtered = getFilteredArts();
  updateThemeUi(filtered.length);
  const visible = filtered.slice(0,visibleCount);
  // Reutiliza nós entre filtros; selecionar não passa por esta função.
  artGrid.replaceChildren(...visible.map(art => cards.get(art.id) || createCard(art)));
  loadMore.hidden = visible.length >= filtered.length;
  loadMore.textContent = `Mostrar mais artes (${visible.length} de ${filtered.length})`;
  syncSelectedArt();
}
loadMore.addEventListener('click', () => {visibleCount += pageSize;renderArts();});

async function loadArtes() {
  try {
    const response = await fetch('/data/caneca-ceramica-artes.json');
    if (!response.ok) throw new Error('Falha ao carregar artes.');
    const payload = await response.json();

    if (!Array.isArray(payload) || !payload.length) {
      throw new Error('Nenhuma arte cadastrada.');
    }

    try {const thumbnails = await fetch('/data/art-previews.json');if(thumbnails.ok)previews = await thumbnails.json();} catch { /* Originais continuam disponíveis se os derivados falharem. */ }
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

function addSelectedArt() {
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
}
document.querySelectorAll('[data-add-art]').forEach(button => button.addEventListener('click',addSelectedArt));

window.addEventListener('load', () => {
  if (window.location.hash === '#escolha-arte') {
    const secao = document.getElementById('escolha-arte');
    if (secao) {
      setTimeout(() => {
        const stickyHeader = document.querySelector('.site-header');
        const headerOffset = stickyHeader ? stickyHeader.offsetHeight + 6 : 6;
        const y = secao.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: y, behavior: 'auto' });
      }, 220);
    }
  }
});

loadArtes();
