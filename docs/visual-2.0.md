# Artize Visual 2.0 — Registro de execução

A base desta fase é o commit `a9ec895`, com os quatro temas e Neon preservados. As alterações locais anteriores ficam intactas no checkout original. O trabalho visual usa o checkout isolado `work/visual-2`, branch local `feature/artize-visual-2`.

## Segurança de publicação

Homologação confirmada pelo responsável: serviço `artize-homologacao`, URL https://artize-homologacao.onrender.com, branch `feature/gerenciador-temas`. Etapa 1 publicada por fast-forward (`a9ec895..bb57b50`), sem force ou merge. Acesso HTTP ao domínio bloqueado pelo proxy do executor (CONNECT 403); isso não é evidência de falha do Render. Não houve deploy manual ou mudança de configuração.

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

## Etapa 2 — Home

Hero editorial sem carrossel automático ou promessas de promoção; geometria de 440px compartilhada pelos quatro temas para evitar deslocamento ao aplicar a campanha. Duas colunas no mobile, imagens dimensionadas com lazy loading fora dos primeiros cards, categorias com estado acessível, busca tolerante a acentos com debounce, contagem e estado vazio com limpeza. Produtos, preços e disponibilidade preservados.

### Interrupção solicitada — teste da etapa 2

`node test/visual-home.mjs` falhou na primeira verificação de altura: `AssertionError: 442 !== 440`, linha 16. A altura interna de `.promo-track` é 440px e o contêiner acrescenta bordas de 1px, enquanto o banner sazonal tem altura externa de 440px. A geometria compartilhada ainda não atende ao critério. A etapa foi interrompida sem commit/push das alterações da home; etapas 3–6 não iniciadas. Sugestão para retomada: unificar a altura externa dos dois contêineres e repetir os testes de geometria, conteúdo e responsividade, sem relaxar a asserção.

Resultados nesta retomada: etapa 1 revalidada com 120 combinações visuais e `npm test` (5 passaram, 1 Neon real pulado), enviada como `bb57b50`. Na etapa 2, `npm test` também passou (5/1), teste específico da home falhou e a matriz geral foi cancelada. GitHub confirma a branch de homologação em `bb57b50`, main permanece `aa370571`. Nenhum status de deploy retornado pelo GitHub; HTTP da homologação inacessível pelo proxy (403 CONNECT), portanto publicação no Render não confirmada.

### Retomada e correção da etapa 2

Autorização recebida para corrigir e continuar. A altura passou a pertencer à `.promo-carousel` externa (`height:440px;box-sizing:border-box`), e a `.promo-track` usa `height:100%`. A asserção continua exigindo exatamente 440px, sem tolerância. `node test/visual-home.mjs` passou para quatro temas × seis larguras, CTA contido, duas colunas mobile, busca sem acento e catálogo com disponibilidade preservada. `npm test`: 5 passaram/1 Neon real pulado. `node test/browser.mjs`: suíte de regressão completa aprovada sem pagamento. O script `scripts/measure-frontend.mjs` permite comparar o snapshot bb57b50 e o frontend final com imagens reais, 390×844, CPU 4× e rede simulada.

## Etapa 3 — Personalização e imagens

- 195 originais e manifest comercial intactos; IDs, preço e payload de carrinho preservados.
- Derivados WebP 200/400/800px por ID, sem corte de conteúdo: 1.201.446 / 3.595.698 / 12.072.322 bytes (16.869.466 total), comparados a 149.660.340 bytes dos originais. O conjunto pequeno equivale a cerca de 0,8% do conjunto original, sem implicar download de todas as imagens em uma visita.
- `scripts/generate-art-previews.py` reproduz os derivados com Pillow 12.3.0 (ferramenta local, sem dependência nova no servidor). Adicionar uma arte exige rodar o script e versionar os derivados/manifest. Os originais continuam sendo referência do item comercial.
- Galeria inicia com 24 botões nativos, lazy loading, srcset e botão de mais artes. Seleção altera apenas o card anterior, o atual e a prévia. Filtros reutilizam os nós, mantêm foco e estado aria-pressed. Ação fixa mobile respeita área segura.
- `node test/visual-customizer.mjs`: passou, verifica todos os arquivos/195 IDs, navegação sem baixar originais, 6 larguras, foco/Enter, identidade dos nós, paginação completa, filtros e payload comercial original.
- `npm test`: 5 passaram/1 Neon real pulado. Matriz de quatro temas e seis resoluções executada antes da publicação.
