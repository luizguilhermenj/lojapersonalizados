import { addToCart } from '/js/app.js';

const artGrid = document.getElementById('artGrid');
const selectedMockup = document.getElementById('selectedMockup');
const selectedArtName = document.getElementById('selectedArtName');
const selectedArtDescription = document.getElementById('selectedArtDescription');
const addSelectedArtBtn = document.getElementById('addSelectedArtBtn');
const customizerFeedback = document.getElementById('customizerFeedback');
const totalArtsLabel = document.getElementById('totalArtsLabel');
const sectionHead = document.querySelector('#escolha-arte .section-head');

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
let chipsWrap = null;
let helperInfo = null;

function ensureFilterUi() {
  if (!sectionHead || chipsWrap) return;

  helperInfo = document.createElement('p');
  helperInfo.className = 'theme-helper';
  helperInfo.textContent = 'Filtre por tema e toque em uma arte para ver a prévia acima.';

  chipsWrap = document.createElement('div');
  chipsWrap.id = 'themeChips';
  chipsWrap.className = 'theme-filters';

  sectionHead.insertAdjacentElement('afterend', helperInfo);
  helperInfo.insertAdjacentElement('afterend', chipsWrap);
}

function countForTheme(themeId) {
  if (themeId === 'todos') return arts.length;
  return arts.filter((art) => art.theme === themeId).length;
}

function getThemeLabel(themeId) {
  return THEMES.find((theme) => theme.id === themeId)?.label || 'Todas';
}

function getFilteredArts() {
  if (currentTheme === 'todos') return arts;
  return arts.filter((art) => art.theme === currentTheme);
}

function renderThemeChips() {
  if (!chipsWrap) return;

  chipsWrap.innerHTML = THEMES
    .filter((theme) => countForTheme(theme.id) > 0 || theme.id === 'todos')
    .map((theme) => `
      <button
        class="theme-chip ${theme.id === currentTheme ? 'active' : ''}"
        type="button"
        data-theme="${theme.id}"
      >
        ${theme.label} (${countForTheme(theme.id)})
      </button>
    `)
    .join('');

  chipsWrap.querySelectorAll('.theme-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      currentTheme = chip.dataset.theme;
      const filtered = getFilteredArts();

      if (!filtered.some((art) => art.id === selectedArt?.id)) {
        selectedArt = filtered[0] || null;
        syncSelectedArt();
      }

      renderThemeChips();
      renderArts();
    });
  });
}

function updateSummaryLabels(filteredCount) {
  if (totalArtsLabel) {
    totalArtsLabel.textContent = currentTheme === 'todos'
      ? `${filteredCount} artes disponíveis`
      : `${filteredCount} artes em ${getThemeLabel(currentTheme)}`;
  }

  const eyebrow = document.querySelector('.eyebrow');
  if (eyebrow) {
    eyebrow.textContent = currentTheme === 'todos'
      ? 'Coleções temáticas'
      : `Coleção ${getThemeLabel(currentTheme)}`;
  }

  const priceSupport = document.querySelector('.summary-price-row span');
  if (priceSupport) {
    priceSupport.textContent = currentTheme === 'todos'
      ? 'Caneca base + arte da coleção escolhida'
      : `Caneca base + arte da coleção ${getThemeLabel(currentTheme)}`;
  }
}

function renderArts() {
  const filteredArts = getFilteredArts();
  updateSummaryLabels(filteredArts.length);

  if (!filteredArts.length) {
    artGrid.innerHTML = '<p class="empty-state">Nenhuma arte foi encontrada. Verifique a pasta public/img/artes/caneca-ceramica.</p>';
    return;
  }

  artGrid.innerHTML = filteredArts.map((art) => `
    <article class="art-card ${art.id === selectedArt?.id ? 'active' : ''}" data-art-id="${art.id}">
      <img src="${art.image}" alt="${art.name}">
      <div>
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function syncSelectedArt() {
  if (!selectedArt) return;

  if (selectedMockup) {
    selectedMockup.src = selectedArt.image;
    selectedMockup.alt = `${baseProduct.name} com arte ${selectedArt.name}`;
  }

  if (selectedArtName) {
    selectedArtName.textContent = selectedArt.name;
  }

  if (selectedArtDescription) {
    selectedArtDescription.textContent = selectedArt.description;
  }
}

async function loadArtes() {
  try {
    const response = await fetch('/data/caneca-ceramica-artes.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Falha ao carregar artes.');
    arts = await response.json();

    if (!Array.isArray(arts) || !arts.length) {
      throw new Error('Nenhuma arte cadastrada.');
    }

    selectedArt = arts[0];
    ensureFilterUi();
    syncSelectedArt();
    renderThemeChips();
    renderArts();
  } catch (error) {
    console.error(error);
    ensureFilterUi();
    if (totalArtsLabel) {
      totalArtsLabel.textContent = 'Sem artes disponíveis';
    }
    artGrid.innerHTML = '<p class="empty-state">Nenhuma arte foi encontrada. Verifique a pasta public/img/artes/caneca-ceramica e o arquivo public/data/caneca-ceramica-artes.json.</p>';
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
        secao.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 200);
    }
  }
});

loadArtes();
