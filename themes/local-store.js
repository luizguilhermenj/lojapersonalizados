import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DEFAULT_THEME, findTheme } from './config.js';

// Exclusivo de desenvolvimento. A seleção do provedor impede uso no Render.
export function createLocalThemeStore(directory) {
  const file = path.join(directory, 'active-theme.json');
  return {
    provider: 'local', writable: true, warning: null,
    async read() {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!findTheme(data.themeId)) throw new Error('Tema salvo inválido');
        return data.themeId;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return DEFAULT_THEME;
      }
    },
    async save(themeId) {
      if (!findTheme(themeId)) throw new Error('Tema inválido');
      fs.mkdirSync(directory, { recursive: true });
      const temporary = `${file}.${crypto.randomUUID()}.tmp`;
      try {
        fs.writeFileSync(temporary, JSON.stringify({ themeId, updatedAt: new Date().toISOString() }), { mode: 0o600 });
        fs.renameSync(temporary, file);
      } finally { fs.rmSync(temporary, { force: true }); }
    }
  };
}
