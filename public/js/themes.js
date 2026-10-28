import { safeCustomization, customizationTokens } from '/js/color-studio.js';
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
let appliedTokens = [];
function writeThemeTokens(theme) {
  const config = safeCustomization(theme.customization);
  const tokens = {};
  for (const [key, name] of Object.entries(tokenNames)) {
    if (/^#[0-9a-f]{6}$/i.test(theme.palette?.[key] || '')) tokens[name] = theme.palette[key];
  }
  Object.assign(tokens, customizationTokens(config));
  const root = document.documentElement;
  // Assemble off-document: one style mutation, without intermediate default colors.
  const style = document.createElement('span').style;
  style.cssText = root.style.cssText;
  for (const key of appliedTokens) if (!(key in tokens)) style.removeProperty(key);
  for (const [key, value] of Object.entries(tokens)) style.setProperty(key, value);
  if (config) style.colorScheme = parseInt(config.background.slice(1, 3), 16) < 128 ? 'dark' : 'light';
  else style.removeProperty('color-scheme');
  if (root.style.cssText !== style.cssText) root.style.cssText = style.cssText;
  appliedTokens = Object.keys(tokens);
  root.toggleAttribute('data-color-studio', Boolean(config));
  for (const [attr, key] of [['data-glow-buttons','glowButtons'],['data-glow-cards','glowCards'],['data-glow-borders','glowBorders']]) root.toggleAttribute(attr, Boolean(config?.glowEnabled && config.glowIntensity > 0 && config[key]));
}
export function applyCustomization(value) {
  writeThemeTokens({ ...(currentTheme || { id: 'artize' }), customization: value });
}

// Efeitos ficam na experiência de descoberta, fora do carrinho e gestão.
const motionAllowed = () => Boolean(document.querySelector('.home-page,.customizer-page'));

export function applyTheme(theme) {
  const previous = currentTheme;
  // Live color changes do not rebuild campaign copy, reset the slide or particles.
  const sameCampaign = previous && previous.id === theme.id &&
    previous.campaign === theme.campaign && previous.effect === theme.effect &&
    previous.decoration === theme.decoration;
  currentTheme = theme;
  writeThemeTokens(theme);
  const root = document.documentElement;
  if (sameCampaign) {
    document.dispatchEvent(new CustomEvent('artize:themechange', { detail: { themeId: theme.id } }));
    return;
  }
  effects.stop();
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

const studioPreview = new URLSearchParams(location.search).get('studioPreview') === '1';
const temporaryPreview = studioPreview && window.parent !== window && new URLSearchParams(location.search).get('temporaryPreview') === '1';
const previewId = new URLSearchParams(location.search).get('themePreview');
let resolveTemporaryPreview;
window.addEventListener('message', async event => {
  if (!studioPreview || window.parent === window || event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'artize:studio-preview') return;
  if (temporaryPreview) {
    if (event.data.themeId !== previewId || event.data.theme?.id !== previewId) return;
    const base = currentTheme?.id === previewId ? currentTheme : event.data.theme;
    applyTheme({ ...base, customization: safeCustomization(event.data.customization) });
    resolveTemporaryPreview?.(previewId); resolveTemporaryPreview = undefined;
    return;
  }
  await themeReady;
  if (event.data.themeId !== currentTheme?.id) return;
  applyTheme({ ...currentTheme, customization: safeCustomization(event.data.customization) });
});

export const themeReady = (async () => {
  const preview = previewId;
  if (temporaryPreview) {
    const notice = document.createElement('p'); notice.className = 'theme-preview-notice';
    notice.textContent = 'Prévia temporária — cores e glow não são gravados.'; document.body.prepend(notice);
    return new Promise(resolve => {
      resolveTemporaryPreview = resolve;
      window.parent.postMessage({ type: 'artize:studio-ready', themeId: preview }, location.origin);
    });
  }
  try {
    const data = await api(preview ? `/api/admin/themes/${encodeURIComponent(preview)}/preview` : '/api/theme');
    applyTheme(data.theme);
    if (preview) {
      const notice = document.createElement('p'); notice.className = 'theme-preview-notice';
      notice.textContent = 'Pré-visualização — nenhuma alteração publicada.'; document.body.prepend(notice);
    }
    if (studioPreview && window.parent !== window) window.parent.postMessage({ type: 'artize:studio-ready', themeId: data.theme.id }, location.origin);
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

if (studioPreview && window.parent !== window) {
  document.addEventListener('click', event => {
    if (event.target.closest('a,button.single-action,[data-add-cart],.add-cart-btn')) {
      const link = event.target.closest('a');
      if (link && !link.getAttribute('href')?.startsWith('#')) event.preventDefault();
    }
  }, true);
  document.addEventListener('submit', event => event.preventDefault(), true);
}
