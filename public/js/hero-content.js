// Conteúdo editorial: nenhuma disponibilidade, preço ou produto comercial é criado aqui.
const collections = {
  artize: [
    ['Canecas • Artize', 'Carinho em cada caneca.', 'Escolha uma arte e transforme uma lembrança em um presente pessoal.'],
    ['Camisetas • Em breve', 'Seu estilo, do seu jeito.', 'Inspirações para vestir boas histórias. Disponibilidade em breve.'],
    ['Feito para presentear', 'Presentes com significado.', 'Encontre uma arte que combine com quem você quer surpreender.']
  ],
  natal: [
    ['Natal • Canecas', 'Seu Natal, mais pessoal.', 'Uma arte, uma lembrança e todo o carinho de presentear no Natal.'],
    ['Camisetas • Em breve', 'Inspiração para o Natal.', 'Ideias para vestir o espírito natalino. Disponibilidade em breve.'],
    ['Coleção de Natal', 'Histórias para presentear.', 'Explore artes para transformar seu carinho em uma lembrança especial.']
  ],
  pascoa: [
    ['Páscoa • Canecas', 'Uma Páscoa com carinho.', 'Escolha uma arte delicada e dê um toque seu a esse presente.'],
    ['Camisetas • Em breve', 'Ideias leves para vestir.', 'Cores suaves e inspirações de Páscoa. Disponibilidade em breve.'],
    ['Coleção de Páscoa', 'Afeto em cada detalhe.', 'Pequenos gestos e artes que celebram boas lembranças.']
  ],
  'dia-das-maes': [
    ['Dia das Mães • Canecas', 'Carinho para quem cuida.', 'Uma caneca personalizada para guardar histórias e demonstrar afeto.'],
    ['Camisetas • Em breve', 'Inspiração cheia de afeto.', 'Ideias para homenagear quem faz parte da sua história. Em breve.'],
    ['Presentes para mães', 'Um presente com história.', 'Explore as artes e escolha um detalhe que tenha significado para ela.']
  ]
};
export function heroContent(theme) {
  const copy = collections[theme.id] || collections.artize;
  return copy.map(([eyebrow, title, description], index) => ({
    eyebrow, title, description,
    action: index === 1 ? 'Ver catálogo' : index === 0 ? 'Escolher arte' : 'Explorar artes',
    href: index === 1 ? '#produtos' : '/pages/caneca-ceramica.html#escolha-arte',
    image: index === 2 && theme.decoration?.src ? theme.decoration.src : ['/img/visual/hero-caneca.svg','/img/visual/hero-camiseta.svg','/img/visual/hero-presentes.svg'][index],
    decoration: index === 2 ? '' : theme.decoration?.src || ''
  }));
}
