import { Router } from 'express';
import { DEFAULT_THEME, themes, findTheme } from '../themes/config.js';

export function themeRoutes({ store, auth, adminOnly }) {
  const router = Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/theme', (req, res) => {
    try { res.json({ theme: findTheme(store.read()) }); }
    catch { res.json({ theme: findTheme(DEFAULT_THEME) }); }
  });
  router.use('/admin/themes', auth, adminOnly);
  router.get('/admin/themes', (req, res) => {
    try { res.json({ themes, activeThemeId: store.read(), canActivate: store.writable, warning: store.warning }); }
    catch { res.status(503).json({ error: 'Não foi possível ler o tema salvo. Verifique o armazenamento antes de publicar.' }); }
  });
  router.get('/admin/themes/:id/preview', (req, res) => {
    const theme = findTheme(req.params.id);
    if (!theme) return res.status(400).json({ error: 'Tema inválido.' });
    res.json({ theme });
  });
  router.put('/admin/themes/active', (req, res) => {
    const theme = findTheme(req.body?.themeId);
    if (!theme) return res.status(400).json({ error: 'Tema inválido.' });
    if (!store.writable) return res.status(503).json({ error: store.warning });
    try { store.save(theme.id); res.json({ theme, message: 'Tema ativado com sucesso.' }); }
    catch { res.status(503).json({ error: 'Não foi possível salvar o tema. A alteração não foi publicada.' }); }
  });
  return router;
}
