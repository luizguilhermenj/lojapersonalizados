export const ART_CATEGORIES = [
  { id: 'todos', label: 'Todas' },
  { id: 'natal', label: 'Natal' },
  { id: 'filmes', label: 'Filmes', upcoming: true, subcategories: [
    { id: 'acao', label: 'Ação' },
    { id: 'aventura', label: 'Aventura' },
    { id: 'filmes-premiados', label: 'Filmes premiados' },
    { id: 'herois', label: 'Heróis' },
    { id: 'infantil', label: 'Infantil' },
    { id: 'terror', label: 'Terror' }
  ] },
  { id: 'pascoa', label: 'Páscoa' },
  { id: 'maes', label: 'Dia das Mães' },
  { id: 'namorados', label: 'Dia dos Namorados' },
  { id: 'paes', label: 'Dia dos Pais' },
  { id: 'avos', label: 'Dia dos Avós' },
  { id: 'flores', label: 'Cactus e Flores' },
  { id: 'diversos', label: 'Diversas' }
];

export function filterArts(arts, category = 'todos', subcategory = 'todos') {
  return arts.filter(art => (category === 'todos' || art.theme === category) &&
    (category === 'todos' || subcategory === 'todos' || art.subcategory === subcategory));
}

export function categoryPath(category, subcategory = 'todos') {
  const parent = ART_CATEGORIES.find(item => item.id === category);
  const child = parent?.subcategories?.find(item => item.id === subcategory);
  return [parent?.label || 'Todas', child?.label].filter(Boolean).join(' · ');
}
