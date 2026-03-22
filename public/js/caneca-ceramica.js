
window.addEventListener('load', () => {
  if (window.location.hash === '#escolha-arte') {
    const secao = document.getElementById('escolha-arte');
    if (secao) {
      setTimeout(() => {
        const y = secao.getBoundingClientRect().top + window.pageYOffset - 8;
        window.scrollTo({ top: y, behavior: 'auto' });
      }, 200);
    }
  }
});
