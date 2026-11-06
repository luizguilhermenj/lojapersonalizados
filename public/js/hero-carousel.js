import { heroContent } from './hero-content.js';

const ROTATION_MS = 5500;
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
  const slides = [...element.querySelectorAll('.hero-slide')];
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
      timer = setTimeout(() => show(index + 1), ROTATION_MS);
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
    slides.forEach((slide, n) => {
      slide.inert = n !== index;
      slide.setAttribute('aria-hidden', String(n !== index));
      dots[n].setAttribute('aria-current', String(n === index));
    });
    loadImages(slides[index]);
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
  on(element.querySelector('[data-hero-prev]'), 'click', () => show(index - 1, true));
  on(element.querySelector('[data-hero-next]'), 'click', () => show(index + 1, true));
  on(rotation, 'click', () => {
    userPaused = !userPaused;
    // Retomar é uma escolha explícita, inclusive com o botão ainda focado no touch.
    if (!userPaused) { focused = false; hovering = false; }
    syncRotation();
  });
  on(element, 'focusin', () => { focused = true; userPaused = true; syncRotation(); });
  on(element, 'focusout', event => { focused = element.contains(event.relatedTarget); syncRotation(); });
  on(element, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; syncRotation(); } });
  on(element, 'pointerleave', event => { if (event.pointerType === 'mouse') { hovering = false; syncRotation(); } });
  on(element, 'keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
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
