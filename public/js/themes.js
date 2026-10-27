import { api } from '/js/app.js';
import { createSeasonalEffects } from '/js/seasonal-effects.js';

const effects = createSeasonalEffects();
const tokenNames = {
  bg: '--bg', surface: '--surface', soft: '--surface-2', text: '--text', muted: '--muted', line: '--line',
  dark: '--dark', accent: '--accent', highlight: '--accent-2', hero: '--theme-hero', heroText: '--theme-hero-text',
  heroMuted: '--theme-hero-muted', heroButton: '--theme-hero-button', heroButtonText: '--theme-hero-button-text'
};
let currentTheme;

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
    navLink.href = theme.campaign ? '#seasonalCampaign' : '#promocoes';
    navLink.textContent = theme.campaign ? 'Presentes personalizados' : 'Promoções';
  }
  const campaign = document.getElementById('seasonalCampaign');
  if (campaign) {
    campaign.hidden = !theme.campaign;
    campaign.classList.toggle('has-illustration', Boolean(theme.decoration));
    if (theme.campaign) {
      for (const [id, key] of [['campaignEyebrow', 'eyebrow'], ['campaignTitle', 'title'], ['campaignDescription', 'description'], ['campaignAction', 'actionLabel']]) {
        document.getElementById(id).textContent = theme.campaign[key];
      }
      const art = document.getElementById('campaignArt');
      art.hidden = !theme.decoration;
      if (theme.decoration) { art.src = theme.decoration.src; art.alt = theme.decoration.alt; }
      else art.removeAttribute('src');
    }
    document.querySelector('.promo-carousel').hidden = Boolean(theme.campaign);
  }
  document.getElementById('seasonalFooter')?.remove();
  if (theme.campaign) {
    const footer = document.createElement('footer'); footer.id = 'seasonalFooter'; footer.className = 'seasonal-footer';
    const inner = document.createElement('div'); inner.className = 'container';
    const brand = document.createElement('a'); brand.href = '/pages/home.html'; brand.textContent = 'Artize';
    const text = document.createElement('p'); text.textContent = theme.campaign.footer;
    inner.append(brand, text); footer.append(inner); document.body.append(footer);
  }
  effects.set(theme.effect);
  document.dispatchEvent(new CustomEvent('artize:themechange', { detail: { themeId: theme.id } }));
}

window.addEventListener('pagehide', () => effects.stop());
window.addEventListener('pageshow', event => { if (event.persisted && currentTheme) effects.set(currentTheme.effect); });

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
