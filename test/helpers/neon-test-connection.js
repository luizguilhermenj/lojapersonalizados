// Validates test opt-in without exposing either connection in errors/assertions.
export function validateTestConnection(value, applicationUrl) {
  const databaseUrl = value?.trim();
  if (!databaseUrl) throw new Error('THEME_TEST_DATABASE_URL ausente; nenhuma conexão alternativa será usada.');
  if (databaseUrl === applicationUrl?.trim()) throw new Error('A conexão Neon de testes deve ser exclusiva e diferente da conexão da aplicação.');
  let parsed;
  try { parsed = new URL(databaseUrl); } catch { throw new Error('THEME_TEST_DATABASE_URL tem formato inválido.'); }
  if (!['postgres:','postgresql:'].includes(parsed.protocol) || !parsed.hostname.endsWith('.neon.tech')) throw new Error('Use um endpoint PostgreSQL Neon exclusivo de homologação.');
  if (!['require','verify-full'].includes(parsed.searchParams.get('sslmode'))) throw new Error('A conexão Neon de testes deve exigir TLS.');
  return databaseUrl;
}
