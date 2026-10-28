import { Router } from 'express';
import { DEFAULT_THEME, themes, findTheme } from '../themes/config.js';
import { emptyStudio, studioEntry } from '../themes/color-studio.js';
import { PALETTES, validateCustomization } from '../public/js/color-studio.js';

export function themeRoutes({ store, auth, adminOnly }) {
  const router = Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  let lastKnownThemeId = DEFAULT_THEME;
  let lastKnownPublicTheme = findTheme(DEFAULT_THEME);
  router.get('/theme', async (req, res) => {
    try {
      const state = store.readPublished ? await store.readPublished() : { themeId: await store.read(), customization: null };
      lastKnownThemeId = state.themeId;
      lastKnownPublicTheme = { ...findTheme(state.themeId), customization: state.customization };
      res.json({ theme: lastKnownPublicTheme });
    } catch { res.json({ theme: lastKnownPublicTheme, stale: true }); }
  });
  router.use('/admin/themes', auth, adminOnly);
  router.get('/admin/themes', async (req, res) => {
    try {
      const activeThemeId = await store.read({ fresh: true });
      lastKnownThemeId = activeThemeId;
      const colorStudio = store.readStudio ? await store.readStudio() : emptyStudio();
      res.json({ themes, colorStudio, palettes: PALETTES, activeThemeId, canActivate: store.writable, warning: store.warning, provider: store.provider });
    }
    catch { res.status(503).json({ error: 'Não foi possível ler o tema salvo. Verifique o armazenamento antes de publicar.' }); }
  });
  router.get('/admin/themes/:id/preview', async (req, res) => {
    const theme = findTheme(req.params.id);
    if (!theme) return res.status(400).json({ error: 'Tema inválido.' });
    try {
      const studio = store.readStudio ? await store.readStudio() : emptyStudio();
      res.json({ theme: { ...theme, customization: studioEntry(studio, theme.id).published } });
    } catch { res.status(503).json({ error: 'Não foi possível carregar a prévia salva.' }); }
  });
  router.put('/admin/themes/active', async (req, res) => {
    const theme = findTheme(req.body?.themeId);
    if (!theme) return res.status(400).json({ error: 'Tema inválido.' });
    if (!store.writable) return res.status(503).json({ error: store.warning });
    try {
      await store.save(theme.id, req.user?.id || null);
      lastKnownThemeId = theme.id;
      lastKnownPublicTheme = { ...theme, customization: store.readStudio ? studioEntry(await store.readStudio(), theme.id).published : null };
      res.json({ theme, message: 'Tema ativado com sucesso.' });
    }
    catch { res.status(503).json({ error: 'Não foi possível confirmar a gravação do tema. Recarregue o painel para consultar o estado salvo antes de tentar novamente.' }); }
  });
  for (const action of ['draft', 'publish']) {
    router.put(`/admin/themes/:id/color-studio/${action}`, async (req, res) => {
      const theme = findTheme(req.params.id);
      if (!theme) return res.status(400).json({ error: 'Tema inválido.' });
      let config;
      try { config = validateCustomization(req.body?.customization); }
      catch (error) { return res.status(400).json({ error: error.message }); }
      const method = action === 'publish' ? 'publishStudio' : 'saveStudio';
      if (!store.writable || !store[method]) return res.status(503).json({ error: store.warning || 'Armazenamento visual indisponível.' });
      try {
        await store[method](theme.id, config, req.user?.id || null);
        if (action === 'publish') {
          lastKnownThemeId = theme.id;
          lastKnownPublicTheme = { ...theme, customization: config };
        }
        res.json({ themeId: theme.id, customization: config, message: action === 'publish' ? 'Visual publicado com sucesso.' : 'Rascunho salvo. A loja pública permanece igual.' });
      } catch { res.status(503).json({ error: 'Não foi possível confirmar a gravação. Recarregue o painel para conferir o estado salvo antes de tentar novamente.' }); }
    });
  }
  return router;
}
