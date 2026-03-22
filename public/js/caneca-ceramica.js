import { addToCart } from '/js/app.js';

const artGrid = document.getElementById('artGrid');
const selectedMockup = document.getElementById('selectedMockup');
const selectedArtName = document.getElementById('selectedArtName');
const selectedArtDescription = document.getElementById('selectedArtDescription');
const addSelectedArtBtn = document.getElementById('addSelectedArtBtn');
const customizerFeedback = document.getElementById('customizerFeedback');

const baseProduct = {
  id: 'caneca-ceramica',
  name: 'Caneca de Cerâmica',
  price: 34.9,
  baseImage: '/img/products/caneca-ceramica.svg'
};

const arts = [
  {
    id: 'amor-delicado',
    name: 'Amor delicado',
    description: 'Estilo leve e afetivo para presentes românticos e datas especiais.',
    image: '/img/artes/caneca-ceramica/caneca-arte-amor.svg'
  },
  {
    id: 'astral-colorido',
    name: 'Astral colorido',
    description: 'Uma pegada vibrante para quem quer uma caneca mais alegre e marcante.',
    image: '/img/artes/caneca-ceramica/caneca-arte-astral.svg'
  },
  {
    id: 'gamer-neon',
    name: 'Gamer neon',
    description: 'Visual moderno com brilho e clima tecnológico para presente criativo.',
    image: '/img/artes/caneca-ceramica/caneca-arte-gamer.svg'
  },
  {
    id: 'pet-fofo',
    name: 'Pet fofo',
    description: 'Inspirada em lembranças e presentes para quem ama cachorro e gato.',
    image: '/img/artes/caneca-ceramica/caneca-arte-pet.svg'
  },
  {
    id: 'floral-clean',
    name: 'Floral clean',
    description: 'Composição suave para presentes elegantes e delicados.',
    image: '/img/artes/caneca-ceramica/caneca-arte-floral.svg'
  },
  {
    id: 'frase-cafe',
    name: 'Frase do café',
    description: 'Boa para quem quer aquela caneca com personalidade logo cedo.',
    image: '/img/artes/caneca-ceramica/caneca-arte-cafe.svg'
  }
];

let selectedArt = arts[0];

function renderArts() {
  artGrid.innerHTML = arts.map((art) => `
    <article class="art-card ${art.id === selectedArt.id ? 'active' : ''}" data-art-id="${art.id}">
      <img src="${art.image}" alt="${art.name}">
      <div>
        <h3>${art.name}</h3>
        <p>${art.description}</p>
      </div>
      <span class="select-pill">${art.id === selectedArt.id ? 'Selecionada' : 'Toque para escolher'}</span>
    </article>
  `).join('');

  artGrid.querySelectorAll('.art-card').forEach((card) => {
    card.addEventListener('click', () => {
      const art = arts.find((item) => item.id === card.dataset.artId);
      if (!art) return;
      selectedArt = art;
      syncSelectedArt();
      renderArts();
    });
  });
}

function syncSelectedArt() {
  selectedMockup.src = selectedArt.image;
  selectedMockup.alt = `${baseProduct.name} com arte ${selectedArt.name}`;
  selectedArtName.textContent = selectedArt.name;
  selectedArtDescription.textContent = selectedArt.description;
}

addSelectedArtBtn?.addEventListener('click', () => {
  const cartKey = `${baseProduct.id}::${selectedArt.id}`;
  addToCart({
    cartKey,
    productId: baseProduct.id,
    name: `${baseProduct.name} • ${selectedArt.name}`,
    price: baseProduct.price,
    image: selectedArt.image,
    quantity: 1,
    variation: selectedArt.name,
    variationId: selectedArt.id,
    baseName: baseProduct.name
  });

  customizerFeedback.className = 'feedback success';
  customizerFeedback.textContent = `Perfeito! ${selectedArt.name} foi adicionada ao carrinho.`;
});

syncSelectedArt();
renderArts();
