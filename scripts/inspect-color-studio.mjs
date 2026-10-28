// Run only after binding a confirmed HOMOLOGATION read-only URL as an environment secret.
// No dotenv, no fallback to DATABASE_URL, no schema/data writes, no credential/error dumps.
import fs from 'node:fs';
import { neon } from '@neondatabase/serverless';
const url = process.env.ARTIZE_HOMOLOG_DATABASE_URL;
if (!url) {
  console.error('Inspeção pendente: disponibilize ARTIZE_HOMOLOG_DATABASE_URL como segredo de leitura da homologação.');
  process.exitCode = 1;
} else {
  try {
    const sql = neon(url);
    const statements = fs.readFileSync(new URL('./inspect-color-studio.sql', import.meta.url), 'utf8')
      .replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(s => s && !/^(BEGIN|COMMIT)/i.test(s));
    const results = await sql.transaction(statements.map(s => sql.query(s)), {
      readOnly: true, isolationLevel: 'RepeatableRead', fetchOptions: { signal: AbortSignal.timeout(15000) }
    });
    console.log(JSON.stringify({ scope: 'homologation read-only inspection; no application initialization', results }, null, 2));
  } catch {
    console.error('Inspeção não concluída. Confira conexão de leitura, HTTPS permitido e existência da tabela. Nenhuma migração foi executada; detalhes sensíveis foram omitidos.');
    process.exitCode = 1;
  }
}
