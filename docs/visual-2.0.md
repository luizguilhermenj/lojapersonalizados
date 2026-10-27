# Artize Visual 2.0 — Registro de execução

A base desta fase é o commit `a9ec895`, com os quatro temas e Neon preservados. As alterações locais anteriores ficam intactas no checkout original. O trabalho visual usa o checkout isolado `work/visual-2`, branch local `feature/artize-visual-2`.

## Segurança de publicação

Ainda não há confirmação da branch ligada ao serviço Render de homologação. Não foi encontrada configuração de deploy no repositório, não há ferramenta Render conectada e o commit do PR #1 não tem status de deploy que identifique o serviço. O GitHub apresenta somente `main` e `feature/gerenciador-temas`.

Não presumir que uma dessas branches é homologação. Até identificar a branch/serviço, não fazer push, não mudar configurações do Render e não iniciar as etapas seguintes que dependem da publicação sequencial. A autorização permite auto-deploy por push somente no destino correto de homologação.

## Etapa 1 — Design system e estrutura compartilhada

- Tokens semânticos de tipografia, cores, espaçamento, movimento e áreas de toque.
- Componentes CSS compartilhados e layouts mobile primeiro, com foco visível e movimento reduzido.
- Cabeçalho e rodapé estáticos gerados de templates locais, sem dependência de JavaScript para exibir links e identidade da loja.
- Menu independente das APIs: dialog com foco contido, Escape, retorno de foco, fundo inerte, bloqueio de rolagem e controles de 44 px.
- Busca compartilhada entre páginas com query `q` e rótulo associado.
- Footer único para todos os temas; a campanha atualiza apenas o texto, sem criar/remover o rodapé.
- Formulários de conta com labels e autocomplete; CEP com teclado numérico e preenchimento postal.
- Dados da conta no cabeçalho criados com DOM/textContent. Nenhuma regra de autenticação, sessão ou pagamento foi reestruturada.
- Removida apenas a instrução pública da conta de demonstração. As credenciais e os problemas críticos de backend da auditoria não foram corrigidos por esta etapa.

### Testes

- `npm test`: 5 aprovados; teste Neon real pulado por ausência de `THEME_TEST_DATABASE_URL`.
- `node test/visual-shell.mjs`: quatro temas × seis viewports × cinco páginas; estrutura única, ausência de overflow, menu independente do catálogo, foco, Escape, inert, labels, autofill, busca entre páginas e movimento reduzido. Nenhum erro JavaScript.
- `node test/browser.mjs`: suíte existente passou para os quatro temas, prévia, ativação/restauração, reinício local, catálogo, carrinho, frete, guardas iniciais do checkout e bloqueio do Render sem banco. Nenhum pagamento foi executado.
- `scripts/sync-shell.mjs`: geração idempotente, verificada por hash das páginas.
- Sintaxe JavaScript e `git diff --check`.

Os testes visuais usam usuários, sessões, pedidos e escolha de tema sintéticos em memória; não usam credenciais externas. Miniaturas originais podem ser substituídas por respostas leves nessas verificações funcionais para evitar baixar 150 MB sem necessidade. A otimização e as medições de imagens pertencem à etapa 3. Não há comprovação de Web Vitals de produção nem testes em dispositivos físicos nesta etapa.

### Reprodução

Use Node 22/24 LTS, dependências instaladas pelo lockfile e Playwright disponível para o executor de testes, com Chromium em `/usr/bin/chromium`. O helper `test/helpers/visual-server.mjs` garante isolamento dos dados e token de pagamento vazio. `node scripts/sync-shell.mjs` sincroniza os templates sem exigir build durante a inicialização do serviço.

## Próximas etapas

2. Home, banners, categorias e vitrines.
3. Miniaturas e galeria de personalização progressiva.
4. Painel administrativo.
5. Artize Motion e refinamento dos temas.
6. Acessibilidade e performance finais.

Cada etapa deve ter testes, commit próprio e push ao destino de homologação confirmado antes de avançar para a seguinte. Os bloqueadores financeiros e de persistência operacional da Auditoria 360° continuam pendentes antes da abertura comercial.
