import { themes, findTheme } from './config.js';
import { safeCustomization, validateCustomization } from '../public/js/color-studio.js';
export const emptyStudio = () => ({ version: 1, themes: {} });
export function normalizeStudio(value) {
  const result = emptyStudio();
  for (const { id } of themes) {
    const entry = value?.themes?.[id];
    if (!entry || typeof entry !== 'object') continue;
    result.themes[id] = { draft: safeCustomization(entry.draft), published: safeCustomization(entry.published) };
  }
  return result;
}
export function studioEntry(studio, id) { return normalizeStudio(studio).themes[id] || { draft: null, published: null }; }
export function updateStudio(studio, id, config, publish = false) {
  if (!findTheme(id)) throw new Error('Tema inválido.');
  const result = normalizeStudio(studio);
  const entry = studioEntry(result, id);
  entry.draft = validateCustomization(config);
  if (publish) entry.published = entry.draft;
  result.themes[id] = entry;
  return result;
}
