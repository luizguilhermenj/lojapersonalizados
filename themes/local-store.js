import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DEFAULT_THEME, findTheme } from './config.js';
import { emptyStudio, normalizeStudio, updateStudio, studioEntry } from './color-studio.js';

// Exclusivo de desenvolvimento. A seleção do provedor impede uso no Render.
export function createLocalThemeStore(directory) {
  const file = path.join(directory, 'active-theme.json');
  function readRecord() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { themeId: DEFAULT_THEME, colorStudio: emptyStudio() }; throw error; }
  }
  function writeRecord(data) {
    fs.mkdirSync(directory, { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }), { mode: 0o600 });
      fs.renameSync(temporary, file);
    } finally { fs.rmSync(temporary, { force: true }); }
  }
  return {
    provider: 'local', writable: true, studioWritable: true, warning: null,
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
      writeRecord({ ...readRecord(), themeId });
    },
    async readStudio() { return normalizeStudio(readRecord().colorStudio); },
    async readPublished() {
      const record = readRecord();
      if (!findTheme(record.themeId)) throw new Error('Tema salvo inválido');
      return { themeId: record.themeId, customization: studioEntry(record.colorStudio, record.themeId).published };
    },
    async saveStudio(themeId, config) {
      const record = readRecord();
      writeRecord({ ...record, colorStudio: updateStudio(record.colorStudio, themeId, config) });
    },
    async publishStudio(themeId, config) {
      const record = readRecord();
      writeRecord({ ...record, themeId, colorStudio: updateStudio(record.colorStudio, themeId, config, true) });
    }
  };
}
