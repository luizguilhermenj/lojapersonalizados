import { addToCart } from '/js/app.js';
import { ART_CATEGORIES, filterArts, categoryPath } from '/js/art-categories.js';

const artGrid = document.getElementById('artGrid');
const themeFilters = document.getElementById('themeFilters');
const filterSummary = document.getElementById('filterSummary');
const selectedMockup = document.getElementById('selectedMockup');
const selectedArtName = document.getElementById('selectedArtName');
const selectedArtDescription = document.getElementById('selectedArtDescription');
const selectedThemeEyebrow = document.getElementById('selectedThemeEyebrow');
const totalArtsLabel = document.getElementById('totalArtsLabel');
const customizerFeedback = document.getElementById('customizerFeedback');

const baseProduct = {
  id: 'caneca-ceramica',
  name: 'Caneca de Cerâmica',
  price: 34.9
};

const THEMES = ART_CATEGORIES;

let arts = [];
let selectedArt = null;
let currentTheme = 'todos';
let currentSubcategory = 'todos';
const initialFilters = new URLSearchParams(location.search);
const initialCategory = THEMES.find(category => category.id === initialFilters.get('categoria'));
if (initialCategory) {
  currentTheme = initialCategory.id;
  currentSubcategory = initialCategory.subcategories?.find(category => category.id === initialFilters.get('subcategoria'))?.id || 'todos';
}
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
  return filterArts(arts, currentTheme, currentSubcategory);
}

function updateThemeUi(filteredCount) {
  if (filterSummary) {
    filterSummary.textContent = currentTheme === 'todos'
      ? `Mostrando todas as ${filteredCount} artes disponíveis.`
      : filteredCount ? `${categoryPath(currentTheme, currentSubcategory)} · ${filteredCount} artes disponíveis.`
      : `${categoryPath(currentTheme, currentSubcategory)} · Em breve`;
  }

  if (selectedThemeEyebrow) {
    selectedThemeEyebrow.textContent = currentTheme === 'todos'
      ? 'Coleções temáticas'
      : `Coleção ${categoryPath(currentTheme, currentSubcategory)}`;
  }

  if (totalArtsLabel) {
    totalArtsLabel.textContent = currentTheme === 'todos'
      ? `${filteredCount} artes disponíveis`
      : filteredCount ? `${filteredCount} artes em ${categoryPath(currentTheme, currentSubcategory)}` : 'Uma nova coleção está chegando';
  }
}

function artLabel(art) {
  const source = art.public_id?.split('/').pop() || '';
  const number = source.match(/^(\d+)(?:[_ .-]|$)/)?.[1] || (!art.asset_id && art.id.match(/-(\d+)$/)?.[1]);
  const reference = number ? number.padStart(2, '0') : String(art.asset_id || art.id).replace(/[^a-z0-9]/gi,'').slice(0,6).toUpperCase();
  return categoryPath(art.theme, art.subcategory) + ' · Arte ' + reference;
}

function syncSelectedArt() {
  selectedMockup.hidden = !selectedArt;
  const emptyPreview = document.getElementById('previewEmpty');
  emptyPreview.hidden = Boolean(selectedArt);
  document.getElementById('previewEmptyCategory').textContent = categoryPath(currentTheme, currentSubcategory);
  document.querySelectorAll('[data-add-art]').forEach(button => button.disabled = !selectedArt);
  if (!selectedArt) {
    selectedMockup?.removeAttribute('src');
    document.getElementById('mobileArtName').textContent = 'Nenhuma arte disponível';
    if(activeCard){activeCard.classList.remove('active');activeCard.setAttribute('aria-pressed','false');activeCard.querySelector('.select-pill').textContent='Escolher arte';}
    activeCard = null;
    if (selectedArtName) selectedArtName.textContent = 'Escolha outra coleção enquanto as novidades chegam';
    if (selectedArtDescription) selectedArtDescription.textContent = 'Coleção ainda indisponível nesta homologação.';
    return;
  }

  if (selectedMockup) {
    const nextImage=previews[selectedArt.id]?.preview || selectedArt.image;
    if(selectedMockup.getAttribute('src')!==nextImage)selectedMockup.src = nextImage;
    selectedMockup.width = selectedMockup.height = 800;
    selectedMockup.alt = `${baseProduct.name} com ${artLabel(selectedArt)}`;
  }

  if (selectedArtName) selectedArtName.textContent = artLabel(selectedArt);
  if (selectedArtDescription) selectedArtDescription.textContent = '';
  document.getElementById('mobileArtName').textContent = artLabel(selectedArt);
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
    .filter((theme) => theme.id === 'todos' || theme.id === 'natal' || theme.upcoming || getThemeCount(theme.id) > 0)
    .map((theme) => `
      <button
        class="chip ${theme.id === currentTheme ? 'active' : ''}"
        type="button"
        aria-pressed="${theme.id === currentTheme}" data-theme="${theme.id}"
      >
        ${theme.label}${theme.upcoming && !getThemeCount(theme.id) ? ' <span class="category-new">Novo</span>' : ` (${getThemeCount(theme.id)})`}
      </button>
    `)
    .join('');

  themeFilters.querySelectorAll('.chip').forEach((button) => {
    button.addEventListener('click', () => {
      currentTheme = button.dataset.theme;
      currentSubcategory = 'todos';
      renderSubcategoryFilters();
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

function renderSubcategoryFilters() {
  const panel = document.getElementById('subcategoryPanel');
  const filters = document.getElementById('subcategoryFilters');
  const category = THEMES.find(theme => theme.id === currentTheme);
  panel.hidden = !category?.subcategories?.length;
  if (panel.hidden) { filters.replaceChildren(); return; }
  document.getElementById('subcategoryTitle').textContent = `Explore ${category.label}`;
  filters.replaceChildren();
  for (const subcategory of [{ id:'todos', label:`Todas de ${category.label}` }, ...category.subcategories]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'chip subcategory-chip';
    button.dataset.subcategory = subcategory.id;
    const count = filterArts(arts, currentTheme, subcategory.id).length;
    button.textContent = subcategory.label + (getThemeCount(currentTheme) ? ` (${count})` : '');
    button.setAttribute('aria-pressed', String(currentSubcategory === subcategory.id));
    button.classList.toggle('active', currentSubcategory === subcategory.id);
    button.addEventListener('click', () => {
      currentSubcategory = subcategory.id; visibleCount = pageSize;
      const filtered = getFilteredArts();
      if (!filtered.some(art => art.id === selectedArt?.id)) selectedArt = filtered[0] || null;
      filters.querySelectorAll('button').forEach(chip => {
        const active = chip.dataset.subcategory === currentSubcategory;
        chip.classList.toggle('active', active); chip.setAttribute('aria-pressed', String(active));
      });
      renderArts();
    });
    filters.append(button);
  }
}

function thumbnail(image) {
  try {const url=new URL(image);if(url.hostname==='res.cloudinary.com' && url.pathname.startsWith('/etoqnuvw/image/upload/'))return image.replace('/image/upload/','/image/upload/c_limit,w_640,q_auto,f_auto/');} catch {}
  return image;
}
function createCard(art) {
  const card = document.createElement('button');
  card.type = 'button';card.className = 'art-card';card.dataset.artId = art.id;card.setAttribute('aria-pressed','false');
  const image = document.createElement('img');
  const preview = previews[art.id];
  image.src = preview?.small || thumbnail(art.image);
  if (preview) {image.srcset = `${preview.small} 200w, ${preview.medium} 400w`;image.sizes = '(min-width:1024px) 240px, (min-width:768px) 30vw, 44vw';}
  image.alt = '';image.width = image.height = 400;image.loading = 'lazy';image.decoding = 'async';
  const pill = document.createElement('span');pill.className = 'select-pill';pill.ariaHidden = 'true';pill.textContent='Escolher arte';
  card.append(image,pill);
  card.setAttribute('aria-label', `Escolher ${artLabel(art)}`);
  card.addEventListener('click', () => {selectedArt=art;syncSelectedArt();});
  cards.set(art.id,card);return card;
}
function renderArts() {
  const filtered = getFilteredArts();
  updateThemeUi(filtered.length);
  const visible = filtered.slice(0,visibleCount);
  // Reutiliza nós entre filtros; selecionar não passa por esta função.
  artGrid.replaceChildren(...visible.map(art => cards.get(art.id) || createCard(art)));
  if (!filtered.length) {
    const empty = document.createElement('div'); empty.className = 'arts-empty';
    const title = document.createElement('h3'); title.textContent = `${categoryPath(currentTheme, currentSubcategory)}: novas artes em breve`;
    const message = document.createElement('p'); message.textContent = 'Estamos preparando esta coleção. Enquanto isso, descubra as artes das outras categorias.';
    const back = document.createElement('button'); back.type = 'button'; back.className = 'ghost-btn'; back.textContent = 'Ver todas as artes';
    back.addEventListener('click', () => { currentTheme = 'todos'; currentSubcategory = 'todos'; visibleCount = pageSize; selectedArt = arts[0] || null; renderThemeFilters(); renderSubcategoryFilters(); renderArts(); });
    empty.append(title, message, back); artGrid.append(empty);
  }
  loadMore.hidden = visible.length >= filtered.length;
  loadMore.textContent = `Mostrar mais artes (${visible.length} de ${filtered.length})`;
  syncSelectedArt();
}
loadMore.addEventListener('click', () => {const firstNew=visibleCount;visibleCount += pageSize;renderArts();const art=getFilteredArts()[firstNew];if(art)cards.get(art.id)?.focus({preventScroll:true});});

async function loadArtes() {
  try {
    const [response, thumbnails] = await Promise.all([
      fetch('/api/caneca-ceramica-arts', { cache:'no-store' }),
      fetch('/data/art-previews.json').catch(() => null)
    ]);
    if (!response.ok) throw new Error('Falha ao carregar artes.');
    const payload = await response.json();

    if (!Array.isArray(payload) || !payload.length) {
      throw new Error('Nenhuma arte cadastrada.');
    }

    try {if(thumbnails?.ok)previews = await thumbnails.json();} catch { /* Originais continuam disponíveis se os derivados falharem. */ }
    arts = payload;
    selectedArt = getFilteredArts()[0] || null;
    syncSelectedArt();
    renderThemeFilters();
    renderSubcategoryFilters();
    renderArts();
  } catch (error) {
    console.error(error);
    if (totalArtsLabel) totalArtsLabel.textContent = 'Sem artes disponíveis';
    if (filterSummary) filterSummary.textContent = 'Não foi possível carregar as artes.';
    artGrid.innerHTML = '<p class="feedback error">Nenhuma arte foi encontrada. Tente novamente mais tarde.</p>';
  }
}

function addSelectedArt() {
  if (!selectedArt) return;

  const cartKey = `${baseProduct.id}::${selectedArt.id}`;
  addToCart({
    cartKey,
    productId: baseProduct.id,
    name: `${baseProduct.name} • ${artLabel(selectedArt)}`,
    price: baseProduct.price,
    image: selectedArt.image,
    quantity: 1,
    variation: artLabel(selectedArt),
    variationId: selectedArt.id,
    baseName: baseProduct.name
  });

  if (customizerFeedback) {
    customizerFeedback.className = 'feedback success';
    customizerFeedback.textContent = `Perfeito! ${artLabel(selectedArt)} foi adicionada ao carrinho.`;
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
