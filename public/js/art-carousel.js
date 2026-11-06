const ORIGINAL_ROTATION_MS = 4500; // Original interval retained for easy rollback.
const ROTATION_MS = ORIGINAL_ROTATION_MS * 2 / 3;

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Visit each asset once, alternating shuffled categories. Feasibility checks
// prevent a large category being left alone at the end of the cycle.
export function mixedArts(arts, random = Math.random, previousTheme = null) {
  const groups = new Map(), seen = new Set();
  for (const art of arts) {
    if (!art?.id || !art.image || seen.has(art.id)) continue;
    seen.add(art.id);
    if (!groups.has(art.theme)) groups.set(art.theme, []);
    groups.get(art.theme).push(art);
  }
  for (const [theme, items] of groups) groups.set(theme, shuffle(items, random));
  const output = [], used = new Set();
  let remaining = seen.size;
  while (remaining) {
    const available = shuffle([...groups.keys()].filter(theme => groups.get(theme).length), random);
    let candidates = available.filter(theme => theme !== previousTheme);
    if (!candidates.length) candidates = available;
    const feasible = candidates.filter(theme => available.every(other =>
      groups.get(other).length - Number(other === theme) <= Math.ceil((remaining - 1) / 2)));
    if (feasible.length) candidates = feasible;
    let theme = candidates.find(candidate => !used.has(candidate));
    if (theme === undefined) { used.clear(); theme = candidates[0]; }
    output.push(groups.get(theme).pop());
    used.add(theme); previousTheme = theme; remaining--;
  }
  return output;
}

function photoUrl(art) {
  try {
    const url = new URL(art.image, location.origin);
    if (url.hostname === 'res.cloudinary.com' && url.pathname.startsWith('/etoqnuvw/image/upload/')) {
      return art.image.replace('/image/upload/', '/image/upload/c_limit,w_640,q_auto,f_auto/');
    }
  } catch {}
  return art.image;
}

export function createArtCarousel(element, arts) {
  let deck = mixedArts(arts), index = 0;
  if (!deck.length) return { destroy() {} };
  const image = element.querySelector('img');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const on = (target, type, handler) => target.addEventListener(type, handler, { signal: events.signal });
  let timer, hovering = false, focused = false, visible = false, destroyed = false, touch;
  function schedule() {
    clearTimeout(timer);
    if (!destroyed && deck.length > 1 && !reduced.matches && !hovering && !focused && !document.hidden && visible) {
      timer = setTimeout(() => show(index + 1), ROTATION_MS);
    }
  }
  function show(next) {
    if (next >= deck.length) { deck = mixedArts(arts, Math.random, deck.at(-1).theme); index = 0; }
    else index = (next + deck.length) % deck.length;
    const art = deck[index];
    image.src = photoUrl(art);
    image.alt = `Caneca de Cerâmica — coleção ${art.themeLabel || art.theme}`;
    element.dataset.artId = art.id; element.dataset.artTheme = art.theme;
    schedule();
  }
  for (const button of element.querySelectorAll('[data-art-prev], [data-art-next]')) button.disabled = deck.length < 2;
  on(element.querySelector('[data-art-prev]'), 'click', () => show(index - 1));
  on(element.querySelector('[data-art-next]'), 'click', () => show(index + 1));
  on(element, 'mouseenter', () => { hovering = true; schedule(); });
  on(element, 'mouseleave', () => { hovering = false; schedule(); });
  on(element, 'focusin', () => { focused = true; schedule(); });
  on(element, 'focusout', event => { focused = element.contains(event.relatedTarget); schedule(); });
  on(element, 'pointerdown', event => { if (event.pointerType !== 'mouse') touch = {x:event.clientX,y:event.clientY}; });
  on(element, 'pointercancel', () => { touch = null; });
  on(element, 'pointerup', event => {
    if (!touch) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y; touch = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
  });
  on(document, 'visibilitychange', schedule); on(reduced, 'change', schedule);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); });
  observer.observe(element); show(0);
  return { destroy() { destroyed = true; clearTimeout(timer); observer.disconnect(); events.abort(); } };
}
