import { Router } from 'express';
import { DEFAULT_THEME, themes, findTheme } from '../themes/config.js';

export function themeRoutes({ store, auth, adminOnly }) {
  const router = Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  let lastKnownThemeId = DEFAULT_THEME;
  router.get('/theme', async (req, res) => {
    try {
      lastKnownThemeId = await store.read();
      res.json({ theme: findTheme(lastKnownThemeId) });
    } catch { res.json({ theme: findTheme(lastKnownThemeId), stale: true }); }
  });
  router.use('/admin/themes', auth, adminOnly);
  router.get('/admin/themes', async (req, res) => {
    try {
      const activeThemeId = await store.read({ fresh: true });
      lastKnownThemeId = activeThemeId;
      res.json({ themes, activeThemeId, canActivate: store.writable, warning: store.warning, provider: store.provider });
    }
    catch { res.status(503).json({ error: 'Não foi possível ler o tema salvo. Verifique o armazenamento antes de publicar.' }); }
  });
  router.get('/admin/themes/:id/preview', (req, res) => {
    const theme = findTheme(req.params.id);
    if (!theme) return res.status(400).json({ error: 'Tema inválido.' });
    res.json({ theme });
  });
  router.put('/admin/themes/active', async (req, res) => {
    const theme = findTheme(req.body?.themeId);
    if (!theme) return res.status(400).json({ error: 'Tema inválido.' });
    if (!store.writable) return res.status(503).json({ error: store.warning });
    try {
      await store.save(theme.id, req.user?.id || null);
      lastKnownThemeId = theme.id;
      res.json({ theme, message: 'Tema ativado com sucesso.' });
    }
    catch { res.status(503).json({ error: 'Não foi possível confirmar a gravação do tema. Recarregue o painel para consultar o estado salvo antes de tentar novamente.' }); }
  });
  return router;
}
