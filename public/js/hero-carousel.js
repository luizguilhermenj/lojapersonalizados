import { heroContent } from './hero-content.js';
import { natalBanners } from './hero-banners-natal.js';

const ROTATION_MS = 5500;
const CATALOG_ROTATION_MS = 12000;
const CATALOG_SPLITS = [.51,.50,.67,.60,.55,.55,.52,.54,.64,.50,.54,.49,.47,.47,.51];

function addCatalogPanels(slide, index) {
  const link = slide.querySelector('.catalog-page');
  const image = link.querySelector('.catalog-page-image');
  const source = image.dataset.src || image.getAttribute('src');
  const split = CATALOG_SPLITS[index] ?? .5;
  const overlap = .025;
  const panels = document.createElement('span');
  panels.className = 'catalog-panels';
  panels.setAttribute('aria-hidden', 'true');
  for (const [start, end] of [[0, split + overlap], [split - overlap, 1]]) {
    const panel = document.createElement('span');
    panel.className = 'catalog-panel';
    panel.style.setProperty('--catalog-start', start);
    panel.style.setProperty('--catalog-slice', end - start);
    const crop = document.createElement('img');
    crop.alt = '';
    crop.decoding = 'async';
    crop.draggable = false;
    crop.dataset.src = source;
    panel.append(crop);
    panels.append(panel);
  }
  link.append(panels);
}
function createBannerSlides() {
  return natalBanners.map(({ title, url, width, height }, index) => {
    const slide = document.createElement('article');
    slide.className = 'hero-slide hero-slide--banner';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Banner ${index + 1} de ${natalBanners.length}: ${title}`);

    const heading = document.createElement('h2');
    heading.className = 'sr-only';
    heading.textContent = title;

    const link = document.createElement('a');
    link.className = 'hero-banner-link';
    link.dataset.heroAction = '';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `Abrir banner em tamanho original: ${title}`);

    const image = document.createElement('img');
    image.className = 'hero-banner-image';
    image.alt = title;
    image.width = width;
    image.height = height;
    image.decoding = 'async';
    image.draggable = false;
    image.dataset.src = url;
    link.append(image);
    slide.append(heading, link);
    return slide;
  });
}

let instance;

// Inicialização idempotente: tema e catálogo compartilham a mesma instância.
export function initHeroCarousel() {
  const element = document.querySelector('[data-hero-carousel]');
  if (!element) return;
  if (instance?.element === element && !instance.destroyed) return instance;
  instance?.destroy();
  instance = createCarousel(element);
  return instance;
}

function createCarousel(element) {
  const viewport = element.querySelector('.hero-viewport');
  const track = element.querySelector('.hero-track');
  const catalogSize = Number(element.dataset.heroCatalog) || 0;
  const pagePicker = element.querySelector('[data-hero-page]');
  if (catalogSize) {
    const first = track.querySelector('.hero-slide');
    for (let page = 2; page <= catalogSize; page++) {
      const slide = first.cloneNode(true);
      slide.inert = true;
      slide.setAttribute('aria-hidden', 'true');
      slide.setAttribute('aria-label', `Página ${page} de ${catalogSize}`);
      slide.querySelector('h2').textContent = `Catálogo de Natal · página ${page}`;
      const action = slide.querySelector('[data-hero-action]');
      action.href = `/catalogo-natal-artize.pdf#page=${page}`;
      action.setAttribute('aria-label', `Abrir página ${page} do catálogo em PDF`);
      slide.querySelector('.catalog-page-image').alt = `Página ${page} do Catálogo de Natal da Artize`;
      for (const img of slide.querySelectorAll('img')) {
        img.removeAttribute('src');
        img.removeAttribute('fetchpriority');
        img.dataset.src = `/natal-artize-${String(page).padStart(2, '0')}.jpg`;
      }
      track.append(slide);
    }
  }
  const defaultSlides = [...track.querySelectorAll('.hero-slide')];
  if (catalogSize) defaultSlides.forEach(addCatalogPanels);
  const bannerSlides = catalogSize ? createBannerSlides() : [];
  const bannerNav = document.createElement('div');
  bannerNav.className = 'hero-banner-dots';
  bannerNav.setAttribute('role', 'group');
  bannerNav.setAttribute('aria-label', 'Escolher banner de Natal');
  bannerNav.hidden = true;
  const bannerDots = bannerSlides.map((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Mostrar ${slide.getAttribute('aria-label')}`);
    button.dataset.bannerIndex = String(index);
    bannerNav.append(button);
    return button;
  });
  const pdfLink = element.querySelector('.catalog-navigation a')?.cloneNode();
  if (pdfLink) {
    pdfLink.className = 'hero-catalog-link';
    pdfLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>Ver catálogo completo';
  }
  if (catalogSize) element.append(bannerNav);
  let slides = defaultSlides;
  const dots = [...element.querySelectorAll('[data-hero-index]')];
  const rotation = element.querySelector('[data-hero-rotation]');
  const status = element.querySelector('[data-hero-status]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: events.signal });
  let index = 0;
  let timer;
  let userPaused = false;
  let hovering = false;
  let focused = false;
  let inView = true;
  let pageActive = true;
  let destroyed = false;
  let gesture;
  let suppressClickUntil = 0;

  function stopTimer() {
    clearTimeout(timer);
    timer = undefined;
  }
  function syncRotation() {
    stopTimer();
    rotation.disabled = reduced.matches;
    const paused = userPaused || reduced.matches;
    rotation.setAttribute('aria-label', reduced.matches ? 'Rotação desativada por movimento reduzido' : paused ? 'Retomar rotação automática' : 'Pausar rotação automática');
    rotation.title = rotation.getAttribute('aria-label');
    element.querySelector('[data-hero-play]').hidden = !paused;
    element.querySelector('[data-hero-pause]').hidden = paused;
    if (!destroyed && !paused && !hovering && !focused && !document.hidden && pageActive && inView) {
      timer = setTimeout(() => show(index + 1), slides === defaultSlides && catalogSize ? CATALOG_ROTATION_MS : ROTATION_MS);
    }
  }
  function loadImages(slide) {
    for (const image of slide.querySelectorAll('img[data-src]')) {
      if (image.dataset.src && image.getAttribute('src') !== image.dataset.src) image.src = image.dataset.src;
    }
  }
  function show(next, manual = false) {
    stopTimer();
    const moveFocus = manual && slides.some(slide => slide.contains(document.activeElement));
    index = (next + slides.length) % slides.length;
    element.dataset.slide = String(index);
    track.style.transform = `translate3d(-${index * 100}%,0,0)`;
    const activeDots = slides === bannerSlides ? bannerDots : dots;
    slides.forEach((slide, n) => {
      slide.inert = n !== index;
      slide.setAttribute('aria-hidden', String(n !== index));
      activeDots[n]?.setAttribute('aria-current', String(n === index));
    });
    if (pagePicker && slides === defaultSlides) pagePicker.value = String(index);
    loadImages(slides[index]);
    if (slides === bannerSlides && !reduced.matches) {
      const nextImage = slides[(index + 1) % slides.length].querySelector('img');
      if (!nextImage.hasAttribute('src')) nextImage.fetchPriority = 'low';
      loadImages(slides[(index + 1) % slides.length]);
    }
    if (moveFocus) slides[index].querySelector('[data-hero-action]').focus({ preventScroll: true });
    if (manual) {
      userPaused = true;
      status.textContent = `Slide ${index + 1} de ${slides.length}: ${slides[index].querySelector('h2').textContent}`;
    }
    syncRotation();
  }
  function interact() {
    userPaused = true;
    syncRotation();
  }
  function cancelGesture() {
    if (!gesture) return;
    if (viewport.hasPointerCapture(gesture.id)) viewport.releasePointerCapture(gesture.id);
    gesture = undefined;
    element.classList.remove('is-dragging');
    track.style.transform = `translate3d(-${index * 100}%,0,0)`;
  }
  function setTheme(theme) {
    cancelGesture();
    if (catalogSize) {
      const bannersActive = theme.id === 'natal';
      const nextSlides = bannersActive ? bannerSlides : defaultSlides;
      element.dataset.heroTheme = theme.id || 'artize';
      if (slides !== nextSlides) {
        slides = nextSlides;
        track.replaceChildren(...slides);
        element.toggleAttribute('data-hero-banners', bannersActive);
        element.setAttribute('aria-label', bannersActive ? 'Banners de Natal da Artize' : 'Catálogo de Natal da Artize');
        bannerNav.hidden = !bannersActive;
        if (pdfLink) {
          if (bannersActive) element.after(pdfLink);
          else pdfLink.remove();
        }
        status.textContent = '';
        show(0);
      } else show(index);
      return;
    }
    const content = heroContent(theme);
    status.textContent = '';
    element.dataset.heroTheme = theme.id || 'artize';
    slides.forEach((slide, n) => {
      const item = content[n];
      slide.querySelector('[data-hero-eyebrow]').textContent = item.eyebrow;
      slide.querySelector('h2').textContent = item.title;
      slide.querySelector('[data-hero-description]').textContent = item.description;
      const action = slide.querySelector('[data-hero-action]');
      action.textContent = item.action;
      action.href = item.href;
      slide.setAttribute('aria-label', `${n + 1} de ${slides.length}: ${item.title}`);
      dots[n].setAttribute('aria-label', `Ir para slide ${n + 1}: ${item.title}`);
      slide.querySelector('.hero-product').dataset.src = item.image;
      const decoration = slide.querySelector('[data-hero-decoration]');
      decoration.hidden = !item.decoration;
      decoration.dataset.src = item.decoration;
      if (!item.decoration) decoration.removeAttribute('src');
      // Imagens das próximas composições só são solicitadas quando exibidas.
    });
    show(0);
  }

  dots.forEach((dot, n) => on(dot, 'click', () => show(n, true)));
  bannerDots.forEach((dot, n) => on(dot, 'click', () => show(n, true)));
  if (pagePicker) on(pagePicker, 'change', () => show(Number(pagePicker.value), true));
  on(element.querySelector('[data-hero-prev]'), 'click', () => show(index - 1, true));
  on(element.querySelector('[data-hero-next]'), 'click', () => show(index + 1, true));
  on(rotation, 'click', () => {
    userPaused = !userPaused;
    // Retomar é uma escolha explícita, inclusive com o botão ainda focado no touch.
    if (!userPaused) { focused = false; hovering = false; }
    syncRotation();
  });
  on(element, 'focusin', event => {
    focused = true;
    if (slides !== bannerSlides || event.target !== rotation) userPaused = true;
    syncRotation();
  });
  on(element, 'focusout', event => { focused = element.contains(event.relatedTarget); syncRotation(); });
  on(element, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; syncRotation(); } });
  on(element, 'pointerleave', event => { if (event.pointerType === 'mouse') { hovering = false; syncRotation(); } });
  on(element, 'keydown', event => {
    if (event.target === pagePicker || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
  });
  on(viewport, 'pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    interact();
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dragging: false };
  });
  on(viewport, 'pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      gesture.dragging = true;
      viewport.setPointerCapture(event.pointerId);
      element.classList.add('is-dragging');
    }
    if (gesture.dragging) {
      gesture.dx = Math.max(-viewport.clientWidth, Math.min(viewport.clientWidth, dx));
      track.style.transform = `translate3d(calc(-${index * 100}% + ${gesture.dx}px),0,0)`;
    }
  });
  on(viewport, 'pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const { dx, dragging } = gesture;
    if (dragging) suppressClickUntil = performance.now() + 600;
    cancelGesture();
    if (dragging && Math.abs(dx) >= Math.min(60, viewport.clientWidth * .18)) show(index + (dx < 0 ? 1 : -1), true);
  });
  on(viewport, 'pointercancel', cancelGesture);
  on(viewport, 'lostpointercapture', event => {
    // A captura implícita do touch pode migrar de um filho para o viewport.
    if (event.target === viewport) cancelGesture();
  });
  on(viewport, 'click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
    else interact();
  }, { capture: true });
  on(reduced, 'change', () => { cancelGesture(); syncRotation(); });
  on(document, 'visibilitychange', syncRotation);
  on(window, 'pagehide', () => { pageActive = false; cancelGesture(); stopTimer(); });
  on(window, 'pageshow', () => { pageActive = true; syncRotation(); });
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    syncRotation();
  }, { threshold: 0 });
  observer.observe(element);
  setTheme({ id: 'artize' });

  return {
    element, setTheme,
    get destroyed() { return destroyed; },
    destroy() {
      destroyed = true;
      cancelGesture();
      stopTimer();
      observer.disconnect();
      events.abort();
    }
  };
}
