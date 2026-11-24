import { readFileSync } from 'node:fs';
import { formatCategoryLabel } from '../public/js/art-categories.js';
import { listFolderArts } from './cloudinary-arts.js';

let index;
const folders = new Map([
  ['squeeze-aluminio', '743-mosquetao'],
  ['squeeze-termico', '1575-termico'],
  ['squeeze-termico-bambu', '727-termico-bambu']
]);
const cache = new Map();

export function squeezeArts(product) {
  const folder = folders.get(product);
  if (!folder) return null;
  const cached = cache.get(product);
  if (cached?.expires > Date.now()) return cached.result;
  index ??= JSON.parse(readFileSync(new URL('../data/squeeze-arts-index.json', import.meta.url)));
  const result = listFolderArts({folder: 'Artize/Squeeze/' + folder}).then(assets => {
    const byName = new Map(assets.map(art => [art.name.replace(/\.png$/i, ''), art]));
    return index[product].flatMap(entry => {
      const art = byName.get(entry.displayName);
      if (!art) return [];
      return [{id: entry.displayName, image: art.image, name: entry.name,
        theme: entry.theme, themeLabel: formatCategoryLabel(entry.theme.replaceAll('-', ' ')),
        number: entry.number}];
    });
  }).catch(error => { cache.delete(product); throw error; });
  cache.set(product, {result, expires: Date.now() + 15 * 60_000});
  return result;
}
