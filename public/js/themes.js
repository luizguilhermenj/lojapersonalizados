import { api } from '/js/app.js';
import { initHeroCarousel } from '/js/hero-carousel.js';
import { createSeasonalEffects } from '/js/seasonal-effects.js';

const effects = createSeasonalEffects();
const tokenNames = {
  bg: '--bg', surface: '--surface', soft: '--surface-2', text: '--text', muted: '--muted', line: '--line',
  dark: '--dark', accent: '--accent', highlight: '--accent-2', hero: '--theme-hero', heroText: '--theme-hero-text',
  heroMuted: '--theme-hero-muted', heroButton: '--theme-hero-button', heroButtonText: '--theme-hero-button-text'
};
let currentTheme;
// Efeitos ficam na experiência de descoberta, fora do carrinho e gestão.
const motionAllowed = () => Boolean(document.querySelector('.home-page,.customizer-page'));

export function applyTheme(theme) {
  effects.stop();
  currentTheme = theme;
  const root = document.documentElement;
  for (const [key, name] of Object.entries(tokenNames)) {
    root.style.removeProperty(name);
    if (/^#[0-9a-f]{6}$/i.test(theme.palette?.[key] || '')) root.style.setProperty(name, theme.palette[key]);
  }
  root.dataset.theme = theme.id;
  root.toggleAttribute('data-seasonal', Boolean(theme.campaign));
  const navLink = document.getElementById('seasonalNavLink');
  if (navLink) {
    const home = document.querySelector('[data-hero-carousel]') ? '' : '/pages/home.html';
    navLink.href = home + '#promocoes';
    navLink.textContent = theme.campaign ? 'Presentes personalizados' : 'Inspiração para presentear';
  }
  initHeroCarousel()?.setTheme(theme);
  const footerMessage=document.getElementById('campaignFooterMessage');
  if(footerMessage)footerMessage.textContent=theme.campaign?.footer||'Presentes personalizados para transformar carinho em boas lembranças.';
  effects.set(motionAllowed() ? theme.effect : undefined);
  document.dispatchEvent(new CustomEvent('artize:themechange', { detail: { themeId: theme.id } }));
}

window.addEventListener('pagehide', () => effects.stop());
window.addEventListener('pageshow', event => { if (event.persisted && currentTheme) effects.set(motionAllowed() ? currentTheme.effect : undefined); });

export const themeReady = (async () => {
  const preview = new URLSearchParams(location.search).get('themePreview');
  try {
    const data = await api(preview ? `/api/admin/themes/${encodeURIComponent(preview)}/preview` : '/api/theme');
    applyTheme(data.theme);
    if (preview) {
      const notice = document.createElement('p'); notice.className = 'theme-preview-notice';
      notice.textContent = 'Pré-visualização — nenhuma alteração publicada.'; document.body.prepend(notice);
    }
    return data.theme.id;
  } catch {
    // A aparência não impede o carregamento dos fluxos da loja.
    applyTheme({ id: 'artize' });
    if (preview) {
      const notice = document.createElement('p'); notice.className = 'theme-preview-notice';
      notice.textContent = 'Não foi possível pré-visualizar. Verifique sua sessão de administrador.'; document.body.prepend(notice);
    }
    return 'artize';
  }
})();
