import { DEFAULT_THEME } from './config.js';
import { createLocalThemeStore } from './local-store.js';
import { createNeonThemeStore } from './neon-store.js';

export function createThemeStore({ env = process.env, localDir, neonOptions } = {}) {
  const databaseUrl = String(env.DATABASE_URL || '').trim();
  if (databaseUrl) return createNeonThemeStore(databaseUrl, neonOptions);
  const production = env.NODE_ENV === 'production' || Boolean(env.RENDER);
  if (!production) return createLocalThemeStore(localDir);
  const warning = 'Ativação indisponível: configure DATABASE_URL com um banco Neon PostgreSQL persistente.';
  // THEME_STORAGE_DIR e THEME_STORAGE_DURABLE não liberam arquivos em produção.
  return {
    provider: 'unavailable', writable: false, warning,
    async read() { return DEFAULT_THEME; },
    async save() { throw new Error(warning); }
  };
}
