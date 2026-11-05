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

export function formatCategoryLabel(value) {
  const text = String(value || '').trim().toLocaleLowerCase('pt-BR');
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}

export function buildCategories(arts) {
  const categories = ART_CATEGORIES.map(category => ({ ...category, label:formatCategoryLabel(category.label),
    ...(category.subcategories ? {subcategories:category.subcategories.map(child=>({...child,label:formatCategoryLabel(child.label)}))} : {}) }));
  const byId = new Map(categories.map(category=>[category.id,category]));
  for (const art of arts) {
    if (!art.theme || art.theme === 'todos') continue;
    let category = byId.get(art.theme);
    if (!category) {
      category = {id:art.theme,label:formatCategoryLabel(art.themeLabel || art.theme.replaceAll('-',' '))};
      categories.push(category); byId.set(category.id,category);
    }
    if (art.subcategory) {
      category.subcategories ||= [];
      if (!category.subcategories.some(child=>child.id===art.subcategory)) category.subcategories.push({id:art.subcategory,label:formatCategoryLabel(art.subcategoryLabel || art.subcategory.replaceAll('-',' '))});
    }
  }
  for (const category of categories) category.subcategories?.sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
  return [...categories.slice(0,ART_CATEGORIES.length), ...categories.slice(ART_CATEGORIES.length).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'))];
}

export function categoryPath(category, subcategory = 'todos', categories = ART_CATEGORIES) {
  const parent = categories.find(item => item.id === category);
  const child = parent?.subcategories?.find(item => item.id === subcategory);
  return [parent?.label || 'Todas', child?.label].filter(Boolean).join(' · ');
}
