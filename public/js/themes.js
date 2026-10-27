import { api } from '/js/app.js';

export const themeReady = (async () => {
  const preview = new URLSearchParams(location.search).get('themePreview');
  try {
    const data = await api(preview ? `/api/admin/themes/${encodeURIComponent(preview)}/preview` : '/api/theme');
    document.documentElement.dataset.theme = data.theme.id;
    if (preview) {
      const notice = document.createElement('p');
      notice.className = 'theme-preview-notice';
      notice.textContent = 'Pré-visualização — este tema ainda não foi publicado.';
      document.body.prepend(notice);
    }
    return data.theme.id;
  } catch {
    // Falhas na aparência nunca bloqueiam catálogo, carrinho ou checkout.
    if (preview) {
      const notice = document.createElement('p');
      notice.className = 'theme-preview-notice';
      notice.textContent = 'Não foi possível pré-visualizar. Verifique sua sessão de administrador.';
      document.body.prepend(notice);
    }
    return 'artize';
  }
})();
