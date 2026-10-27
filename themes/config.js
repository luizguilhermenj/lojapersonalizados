// IDs permanentes. Campanhas são manuais; nenhum dado depende do calendário.
export const DEFAULT_THEME = 'artize';
export const themes = Object.freeze([
  { id: 'artize', name: 'Artize Padrão', description: 'A identidade original da Artize.', colors: ['#F28C28', '#111827', '#F4F6F8'] },
  {
    id: 'natal', name: 'Natal', description: 'Vinho, verde pinheiro e dourado. Histórias que se tornam presentes.',
    colors: ['#8B1E2D', '#174B3A', '#D5AD60', '#FFF8EB', '#F2F6FA'],
    palette: { bg: '#FFF8EB', surface: '#FFFFFF', soft: '#F2F6FA', text: '#243D33', muted: '#56665E', line: '#E2D7BD', dark: '#174B3A', accent: '#8B1E2D', highlight: '#D5AD60', hero: '#174B3A', heroText: '#FFF8EB', heroMuted: '#E2E9E2', heroButton: '#D5AD60', heroButtonText: '#243D33' },
    campaign: { eyebrow: 'Artize • Natal', title: 'Presentes que guardam histórias.', description: 'Neste Natal, transforme carinho em um presente personalizado. Escolha uma arte do nosso catálogo e crie uma lembrança com a sua história.', actionLabel: 'Criar meu presente', footer: 'Neste Natal, presenteie com a sua história.' },
    decoration: { src: '/img/themes/natal.svg', alt: '' },
    effect: { type: 'snow', count: 30, mobileCount: 10, minDuration: 16, maxDuration: 30, colors: ['#FFFFFF', '#F2F6FA'] }
  },
  {
    id: 'pascoa', name: 'Páscoa', description: 'Lilás, menta e detalhes delicados para celebrar o carinho.',
    colors: ['#DCCAF3', '#F8D7DF', '#B7D8BE', '#FFF6E9', '#765443'],
    palette: { bg: '#FFF6E9', surface: '#FFFFFF', soft: '#F8EEF7', text: '#513B31', muted: '#715F55', line: '#E4D5CB', dark: '#765443', accent: '#765443', highlight: '#DCCAF3', hero: '#F1E7F7', heroText: '#513B31', heroMuted: '#71564C', heroButton: '#765443', heroButtonText: '#FFFFFF' },
    campaign: { eyebrow: 'Artize • Páscoa', title: 'Pequenos gestos. Lindas lembranças.', description: 'Celebre a Páscoa com um presente que tem significado. Personalize uma caneca com uma arte do nosso catálogo e dê um toque seu a esse carinho.', actionLabel: 'Personalizar com carinho', footer: 'Uma Páscoa de afeto, detalhes e boas lembranças.' },
    decoration: { src: '/img/themes/pascoa.svg', alt: '' },
    effect: { type: 'petals', count: 22, mobileCount: 7, minDuration: 20, maxDuration: 34, colors: ['#DCCAF3', '#F8D7DF', '#B7D8BE'] }
  },
  {
    id: 'dia-das-maes', name: 'Dia das Mães', description: 'Rosas suaves, creme e detalhes florais para presentear com carinho.',
    colors: ['#F7DCE5', '#C96C8C', '#FFF8F4', '#829B82'],
    palette: { bg: '#FFF8F4', surface: '#FFFFFF', soft: '#FFF4F7', text: '#49333D', muted: '#71616A', line: '#E9CCD6', dark: '#693347', accent: '#934561', highlight: '#C96C8C', hero: '#F7DCE5', heroText: '#49333D', heroMuted: '#63505A', heroButton: '#934561', heroButtonText: '#FFFFFF' },
    campaign: { eyebrow: 'Artize • Dia das Mães', title: 'Carinho que vira presente.', description: 'Transforme suas lembranças em um presente personalizado para sua mãe. Explore nosso catálogo e escolha uma arte com a sua história.', actionLabel: 'Personalizar uma caneca', footer: 'Carinho em cada detalhe. Um presente com a sua história.' }
  }
]);
export function findTheme(id) { return themes.find(theme => theme.id === id); }
