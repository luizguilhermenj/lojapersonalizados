import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeonThemeStore } from '../themes/neon-store.js';

// Use SOMENTE um banco de testes dedicado. Nunca reutiliza DATABASE_URL da aplicação.
const databaseUrl = process.env.THEME_TEST_DATABASE_URL;
test('Neon real: inicialização, ativação, novo cliente, restauração e preservação no bootstrap', {
  skip: !databaseUrl ? 'THEME_TEST_DATABASE_URL não configurada; banco Neon real não testado' : false
}, async () => {
  const store = createNeonThemeStore(databaseUrl);
  const original = await store.read({ fresh: true });
  try {
    await store.save('dia-das-maes', 'integration-test');
    assert.equal(await createNeonThemeStore(databaseUrl).read(), 'dia-das-maes');
    await store.save('artize', 'integration-test');
    assert.equal(await createNeonThemeStore(databaseUrl).read(), 'artize');
  } finally { await store.save(original, 'integration-test-cleanup'); }
});
