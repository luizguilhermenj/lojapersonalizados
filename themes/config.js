// IDs permanentes: novas campanhas devem ser adicionadas aqui e ao CSS.
export const DEFAULT_THEME = 'artize';
export const themes = Object.freeze([
  { id: 'artize', name: 'Artize padrão', description: 'A identidade original da Artize.', colors: ['#F28C28', '#111827', '#F4F6F8'] },
  { id: 'dia-das-maes', name: 'Dia das Mães', description: 'Rosas suaves, creme e detalhes florais para presentear com carinho.', colors: ['#F7DCE5', '#C96C8C', '#FFF8F4', '#829B82'] }
]);
export function findTheme(id) { return themes.find(theme => theme.id === id); }
