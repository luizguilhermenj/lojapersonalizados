import { addToCart } from '/js/app.js';

const artGrid = document.getElementById('artGrid');
const selectedMockup = document.getElementById('selectedMockup');
const selectedArtName = document.getElementById('selectedArtName');
const selectedArtDescription = document.getElementById('selectedArtDescription');
const selectedThemeEyebrow = document.getElementById('selectedThemeEyebrow');
const addSelectedArtBtn = document.getElementById('addSelectedArtBtn');
const customizerFeedback = document.getElementById('customizerFeedback');
const totalArtsLabel = document.getElementById('totalArtsLabel');
const themeFilters = document.getElementById('themeFilters');
const filterSummary = document.getElementById('filterSummary');

const baseProduct = {
  id: 'caneca-ceramica',
  name: 'Caneca de Cerâmica',
  price: 34.9
};

const themeOrder = [
  { slug: 'todas', label: 'Todas' },
  { slug: 'pascoa', label: 'Páscoa' },
  { slug: 'maes', label: 'Dia das Mães' },
  { slug: 'namorados', label: 'Dia dos Namorados' },
  { slug: 'pais', label: 'Dia dos Pais' },
  { slug: 'avos', label: 'Dia dos Avós' },
  { slug: 'cactus-flores', label: 'Cactus e Flores' },
  { slug: 'diversas', label: 'Diversas' }
];

let arts = [];
let selectedTheme = 'todas';
let selectedArt = null;

function formatPrice(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getFilteredArts() {
  if (selectedTheme === 'todas') return arts;
  return arts.filter((art) => art.theme === selectedTheme);
}

function ensureSelectedArt() {
  const visibleArts = getFilteredArts();
  if (!visibleArts.length) {
    selectedArt = null;
    return;
  }

  const stillVisible = selectedArt && visibleArts.some((art) => art.id === selectedArt.id);
  if (!stillVisible) selectedArt = visibleArts[0];
}

function updateHero() {
  if (!selectedArt) return;
  selectedMockup.src = selectedArt.image;
  selectedMockup.alt = `${baseProduct.name} com ${selectedArt.name}`;
  selectedArtName.textContent = selectedArt.name;
  selectedArtDescription.textContent = selectedArt.description;
  selectedThemeEyebrow.textContent = selectedArt.themeLabel;
  const visibleCount = getFilteredArts().length;
  totalArtsLabel.textContent = selectedTheme === 'todas'
    ? `${arts.length} artes disponíveis`
    : `${visibleCount} artes em ${selectedArt.themeLabel}`;
  filterSummary.textContent = selectedTheme === 'todas'
    ? `Mostrando todas as ${arts.length} artes disponíveis.`
    : `Mostrando ${visibleCount} artes do tema ${selectedArt.themeLabel}.`;
}

function renderThemeFilters() {
  const counts = arts.reduce((acc, art) => {
    acc[art.theme] = (acc[art.theme] || 0) + 1;
    return acc;
  }, {});

  themeFilters.innerHTML = '';
  themeOrder.forEach((theme) => {
    if (theme.slug !== 'todas' && !counts[theme.slug]) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chip ${selectedTheme === theme.slug ? 'active' : ''}`;
    const count = theme.slug === 'todas' ? arts.length : counts[theme.slug];
    button.textContent = `${theme.label} (${count})`;
    button.addEventListener('click', () => {
      selectedTheme = theme.slug;
      renderThemeFilters();
      renderArtGrid();
    });
    themeFilters.appendChild(button);
  });
}

function renderArtGrid() {
  ensureSelectedArt();
  updateHero();

  const visibleArts = getFilteredArts();
  artGrid.innerHTML = '';

  visibleArts.forEach((art) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `art-card ${selectedArt?.id === art.id ? 'active' : ''}`;
    card.innerHTML = `
      <img src="${art.image}" alt="${art.name}" loading="lazy" />
      <div class="art-card-copy">
        <h3>${art.name}</h3>
        <p>${art.themeLabel}</p>
      </div>
      <span class="select-pill">Selecionar</span>
    `;
    card.addEventListener('click', () => {
      selectedArt = art;
      customizerFeedback.textContent = '';
      updateHero();
      renderArtGrid();
      selectedMockup.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    artGrid.appendChild(card);
  });
}

addSelectedArtBtn.addEventListener('click', () => {
  if (!selectedArt) return;

  addToCart({
    productId: baseProduct.id,
    cartKey: `${baseProduct.id}-${selectedArt.id}`,
    name: `${baseProduct.name} • ${selectedArt.name}`,
    unitPrice: baseProduct.price,
    image: selectedArt.image,
    quantity: 1,
    artId: selectedArt.id,
    artName: selectedArt.name,
    artTheme: selectedArt.theme,
    artThemeLabel: selectedArt.themeLabel,
    variationLabel: `Arte escolhida: ${selectedArt.name}`
  });

  customizerFeedback.textContent = `${selectedArt.name} adicionada ao carrinho por ${formatPrice(baseProduct.price)}.`;
});

async function init() {
  const response = await fetch('/api/caneca-ceramica-arts');
  if (!response.ok) throw new Error('Falha ao carregar as artes da caneca.');
  arts = await response.json();
  selectedArt = arts[0] || null;
  renderThemeFilters();
  renderArtGrid();

  if (!arts.length) {
    filterSummary.textContent = 'Nenhuma arte foi encontrada. Verifique a pasta public/img/artes/caneca.';
  }
}

init().catch(() => {
  filterSummary.textContent = 'Não foi possível carregar as artes agora.';
});
