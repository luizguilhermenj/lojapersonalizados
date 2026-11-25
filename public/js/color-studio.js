// Shared by the browser and API. Add a palette here without changing storage/UI.
const palette = (id, name, group, background, surface, text, accent, glowColor) => Object.freeze({
  id, name, group, background, surface, text, accent, glowColor,
  glowEnabled: group === 'premium', glowIntensity: group === 'premium' ? 35 : 20,
  glowButtons: true, glowCards: true, glowBorders: true
});
export const PALETTES = Object.freeze([
  palette('champagne', 'Champagne', 'soft', '#FFF6E8', '#FFFFFF', '#23493D', '#D7A84B', '#F5D5A0'),
  palette('lavanda', 'Lavanda', 'soft', '#F3EEFF', '#FFFFFF', '#4D386D', '#9D80E6', '#C9B4FF'),
  palette('rosa-blush', 'Rosa Blush', 'soft', '#FFF0F3', '#FFFFFF', '#63394B', '#D98AA7', '#FFBCD2'),
  palette('menta', 'Menta', 'soft', '#E9F7F1', '#FFFFFF', '#205746', '#56A98B', '#A4E8C8'),
  palette('azul-nevoa', 'Azul Névoa', 'soft', '#ECF4FF', '#FFFFFF', '#294768', '#719ED5', '#B2D7FF'),
  palette('pessego', 'Pêssego', 'soft', '#FFF1E8', '#FFFFFF', '#704A39', '#E8A17D', '#FFCFB0'),
  palette('midnight-emerald', 'Midnight Emerald', 'premium', '#091C1A', '#13302B', '#E6FFF5', '#47D6A1', '#1BCF94'),
  palette('royal-purple', 'Royal Purple', 'premium', '#171126', '#2A2041', '#F5EDFF', '#B68BFF', '#9D55FF'),
  palette('ocean-neon', 'Ocean Neon', 'premium', '#091B2B', '#142E42', '#E6F7FF', '#54C9F4', '#27B5F4'),
  palette('ruby-night', 'Ruby Night', 'premium', '#240F1C', '#3C1D30', '#FFEAF2', '#FF81AD', '#EF477F'),
  palette('gold-luxury', 'Gold Luxury', 'premium', '#191714', '#302A20', '#FFF5DB', '#E5BA67', '#DCA545'),
  palette('graphite', 'Graphite', 'premium', '#14191F', '#252D36', '#F0F6FA', '#70B8D8', '#499BC4')
]);
export const COLOR_FIELDS = ['background', 'surface', 'text', 'accent', 'glowColor'];
export const GLOW_FIELDS = ['glowEnabled', 'glowButtons', 'glowCards', 'glowBorders'];
export const isHex = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
export function validateCustomization(value) {
  if (value === null) return null; // null means the original theme, not another palette.
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuração visual inválida.');
  const clean = {};
  for (const key of COLOR_FIELDS) {
    if (!isHex(value[key])) throw new Error('Use cores HEX no formato #RRGGBB.');
    clean[key] = value[key].toUpperCase();
  }
  for (const key of GLOW_FIELDS) {
    if (typeof value[key] !== 'boolean') throw new Error('Opção de glow inválida.');
    clean[key] = value[key];
  }
  if (!Number.isFinite(value.glowIntensity) || value.glowIntensity < 0 || value.glowIntensity > 100) throw new Error('A intensidade deve estar entre 0 e 100%.');
  clean.glowIntensity = value.glowIntensity;
  clean.paletteId = PALETTES.some(p => p.id === value.paletteId) ? value.paletteId : null;
  return clean;
}
export function safeCustomization(value) { try { return validateCustomization(value); } catch { return null; } }
export function fromPalette(id) {
  const p = PALETTES.find(p => p.id === id);
  if (!p) throw new Error('Paleta inválida.');
  return validateCustomization({ ...p, paletteId: id });
}
export function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(v => {
    const n = parseInt(v, 16) / 255;
    return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export function readableText(background, preferred) {
  if (preferred && contrast(background, preferred) >= 4.5) return preferred;
  return contrast(background, '#141414') >= contrast(background, '#FFFFFF') ? '#141414' : '#FFFFFF';
}
export function originalCustomization(theme) {
  const p = theme.palette || {};
  return validateCustomization({ background: p.bg || '#FAF7F2', surface: p.surface || '#FFFFFF', text: p.text || '#26332D', accent: p.accent || '#B5522D', glowColor: p.highlight || '#EFBD92', glowIntensity: 35, glowEnabled: false, glowButtons: true, glowCards: true, glowBorders: true });
}
// Derived readable tokens keep the requested accent unchanged for fills/decorations.
export function customizationTokens(config) {
  const c = validateCustomization(config);
  if (!c) return {};
  const text = readableText(c.surface, c.text);
  const pageText = readableText(c.background, c.text);
  const onAccent = readableText(c.accent);
  const link = contrast(c.surface, c.accent) >= 4.5 && contrast(c.background, c.accent) >= 4.5 ? c.accent : text;
  const strength = c.glowEnabled ? c.glowIntensity / 100 : 0;
  return {
    '--store-background': c.background, '--store-surface': c.surface, '--store-text': text, '--store-page-text': pageText,
    '--store-accent': c.accent, '--store-on-accent': onAccent, '--store-link': link,
    '--store-glow-color': c.glowColor, '--store-glow-intensity': String(strength), '--store-glow-enabled': c.glowEnabled ? '1' : '0',
    '--store-glow-soft': `${c.glowColor}${Math.round(strength * 38).toString(16).padStart(2, '0')}`,
    '--store-glow-edge': `${c.glowColor}${Math.round(strength * 153).toString(16).padStart(2, '0')}`,
    '--bg': c.background, '--surface': c.surface, '--surface-2': c.surface, '--text': pageText, '--muted': pageText,
    '--line': `color-mix(in srgb, ${text} 32%, ${c.surface})`, '--dark': c.accent, '--accent': c.accent, '--accent-2': c.glowColor,
    '--theme-hero': c.surface, '--theme-hero-text': text, '--theme-hero-muted': text,
    '--theme-hero-button': c.accent, '--theme-hero-button-text': onAccent,
    '--success': readableText(c.surface, '#166534'), '--danger': readableText(c.surface, '#B42332'), '--info': readableText(c.surface, '#1D4ED8')
  };
}
