import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DEFAULT_THEME, findTheme } from './config.js';

export function createThemeStore({ env = process.env, localDir }) {
  const production = env.NODE_ENV === 'production' || Boolean(env.RENDER);
  const configured = Boolean(env.THEME_STORAGE_DIR && path.isAbsolute(env.THEME_STORAGE_DIR));
  // A confirmação é operacional: o diretório deve estar em um volume persistente real.
  const writable = !production || (configured && env.THEME_STORAGE_DURABLE === 'true');
  const directory = configured ? env.THEME_STORAGE_DIR : localDir;
  const file = path.join(directory, 'active-theme.json');
  const warning = writable ? null : 'Ativação indisponível: configure THEME_STORAGE_DIR em um disco persistente e THEME_STORAGE_DURABLE=true.';
  function read() {
    if (!writable) return DEFAULT_THEME;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!findTheme(data.themeId)) throw new Error('Tema salvo inválido');
      return data.themeId;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return DEFAULT_THEME;
    }
  }
  function save(themeId) {
    if (!findTheme(themeId)) throw new Error('Tema inválido');
    if (!writable) throw new Error(warning);
    fs.mkdirSync(directory, { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify({ themeId, updatedAt: new Date().toISOString() }), { mode: 0o600 });
      fs.renameSync(temporary, file);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
  }
  return { read, save, writable, warning };
}
