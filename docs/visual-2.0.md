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

## Etapa 4 — Painel administrativo

Cabeçalho de gestão, atalhos nativos a Pedidos/Aparência, resumos em grade, estilos de pedidos compartilhados, quebra de textos longos e ações confortáveis no celular. Os quatro temas mantêm radios/ativação/restauração e ganham miniaturas decorativas quando disponíveis; prévia alterna entre largura mobile de até 430px e largura disponível. Filtros mantêm foco e aria-pressed; select de status tem rótulo por pedido. Modal de novas vendas contém foco, torna o fundo inerte, permite Escape sem confirmar leitura e restaura o estado. A confirmação explícita continua usando a rota existente. Nenhum cálculo de faturamento/status foi modificado.

`npm test`: 5 passaram/1 Neon real pulado. `node test/visual-admin.mjs`: passou com pedido sintético de texto longo, 6 resoluções, modal/teclado/inert, quatro opções e prévia mobile/desktop sem publicar. `node test/visual-shell.mjs`: 120 combinações aprovadas, sem overflow/erro JS. As deficiências de integridade financeira e segurança indicadas na auditoria continuam pendentes; esta etapa não as resolve.

## Etapa 5 — Artize Motion e temas

Mesma implementação reutilizável de efeitos, agora com uma animação CSS por partícula em vez de duas. Neve: 24 desktop/6 mobile; pétalas: 16/4 (antes 30/10 e 22/7). Apenas transform/opacity animados. Efeitos restritos à home/personalização/prévia, ausentes em carrinho, conta, pedidos e gestão. Controle tem área de 44px, respeita safe area e fica acima da ação fixa de compra. Visibilidade da página remove a camada e reduz trabalho em segundo plano; movimento reduzido elimina camada e controle. Microinterações respeitam a preferência do usuário. Ilustração floral de Dia das Mães e cores de amostra do padrão alinhadas ao design system; IDs/armazenamento/Neon intactos.

`npm test` (5 passaram/1 real pulado), `node test/browser.mjs` (regressão completa) e `node test/visual-home.mjs` (4×6/geometria/CTA) passaram. `node test/visual-motion.mjs` valida contagens, pausa por visibilidade, reduced motion, remoção/listeners, ausência em carrinho e não sobreposição da compra. Sua primeira execução encontrou corrida do teste ao ler o DOM antes do evento assíncrono de media query; o teste passou após aguardar a condição, mantendo exigência de exatamente zero partículas e contagem exata na retomada. Não se removeu asserção nem se toleraram partículas residuais. Matriz geral de 120 combinações executada antes do push.

## Etapa 6 — Refinamento e validação final

- Carrinho compacto mobile, imagens dimensionadas, controles de quantidade ≥44px com nomes acessíveis e preservação do foco. Nenhuma alteração no cálculo de quantidade/total/frete ou no fluxo de pagamento.
- Formulários e pedidos usam tokens compartilhados, feedbacks anunciam mudanças; rodapé não fica coberto pela ação fixa da personalização.
- Galeria consulta manifest comercial e derivados em paralelo. Categorias mantêm foco ao filtrar.
- Única alteração no servidor: cabeçalhos de cache de arquivos estáticos. Imagens: `public, max-age=86400`, sem immutable por não terem hash no nome. HTML/JS/CSS/JSON revalidam com `max-age=0, must-revalidate`; ETag mantido. APIs/dados financeiros não foram alterados.
- Geometria validada com resposta de tema retida: posição das categorias exatamente igual antes/depois da aplicação tardia de Páscoa, sem tolerância.

### Testes finais

`npm test`: 5 aprovados, 1 Neon real pulado. Executados e aprovados: `node test/browser.mjs`, `node test/visual-home.mjs`, `node test/visual-customizer.mjs`, `node test/visual-admin.mjs`, `node test/visual-motion.mjs`, `node test/visual-accessibility.mjs`, `node test/visual-shell.mjs`. A matriz geral cobre 4 temas × 6 resoluções × 5 páginas; o teste adicional cobre 6 páginas × 6 larguras, inclusive conta e resultado. Verificações específicas: botões principais com contraste mínimo 4,5:1, landmarks/título exposto, rótulos, alvos44px, foco, revalidação304, carrinho/quantidade, três opções de frete e erro de checkout interceptado sem criar pedido ou acessar provedor. Capturas reais revisadas em mobile390px/desktop1440px; seta decorativa convertida para SVG para independência de fonte.

A asserção inicial do teste de cache recebeu 200 porque o cliente Node, ao combinar modo padrão com cabeçalho condicional, força recarga; diagnóstico confirmou 304 com revalidação explícita. Teste usa `cache:'no-cache'`, mantendo exigência de 304. A contagem inicial de h1 incluía o banner alternativo `hidden`; a validação usa agora a árvore de acessibilidade e exige exatamente um título principal exposto. São correções do executor de teste, sem relaxar a acessibilidade do produto. As limitações anteriores de reexecução da antiga versão de temas foram superadas pela suíte completa nesta etapa.

### Arquivos principais desta fase

- Design system/shell: `public/css/{tokens,base,components}.css`, `public/js/{app,navigation,modal}.js`, `templates/store-{header,footer}.html`, `scripts/sync-shell.mjs`, sete documentos em `public/pages/`.
- Home: `public/css/home.css`, `public/js/home.js`, `public/img/visual/presente.svg`.
- Personalização: `public/css/product-customizer.css`, `public/js/caneca-ceramica.js`, `public/data/art-previews.json`, 585 derivados em `public/img/art-previews/`, `scripts/generate-art-previews.py`.
- Gestão: `public/css/admin.css`, `public/js/{admin,admin-themes}.js`.
- Temas/Motion: `themes/config.js`, `public/css/themes.css`, `public/js/themes.js`, `public/img/themes/dia-das-maes.svg`. Driver Neon e rotas protegidas sem alterações.
- Refinamento: `public/css/{auth,cart,orders}.css`, `public/js/cart.js`, `server.js` (somente cache estático).
- Testes: `test/visual-{shell,home,customizer,admin,motion,accessibility}.mjs`, helpers isolados, `test/browser.mjs` e `scripts/measure-frontend.mjs`.

### Validação na homologação

1. Conferir no Render o commit mais recente em `feature/gerenciador-temas` e o log de Auto-Deploy do serviço `artize-homologacao`. Nesta sessão a publicação HTTP permanece não verificada: o proxy bloqueou CONNECT403, sem evidência de falha do serviço.
2. Em 320/360/390/430px, percorrer home, busca/categorias, personalização por teclado/toque, mais artes, adicionar ao carrinho, quantidade e cotação de frete. Não finalizar pagamento real.
3. Como administrador, pré-visualizar cada tema sem publicar, alternar largura da prévia, ativar manualmente e conferir em aba anônima após atualizar. Restaurar padrão. Neon usa DATABASE_URL já existente; não há novas variáveis de produção nesta fase.
4. Verificar neve/pétalas somente na home/personalização, pausa/retomada, aba em segundo plano e movimento reduzido; controle não deve encobrir a compra.
5. Confirmar persistência real em reinício/deploy de homologação autorizado e falha segura com banco indisponível em ambiente de teste. Banco real não estava disponível nesta sessão.

### Pendências fora do escopo

Testes em aparelhos físicos, Safari/iOS/Firefox, rede móvel real e Web Vitals de campo/p75. Não há medição de bateria/GPU/heap em hardware móvel. As medições locais de tarefas longas e quantidade de nós indicam trabalho do frontend, sem equivaler a consumo físico. Neon real requer THEME_TEST_DATABASE_URL em banco exclusivo de testes. Cache público de temas pode propagar entre instâncias em até 15 minutos, conforme integração preservada. Usuários/pedidos/sessões continuam no armazenamento operacional preexistente.

Os bloqueadores críticos da Auditoria360° continuam antes da abertura comercial: validação/autenticidade e integridade financeira, exposição/escape de dados, validação de carrinho/frete, integridade da arte no pedido e persistência operacional. Não foram corrigidos nem ocultados nesta modernização visual. Nenhuma chamada de pagamento real, migração operacional, configuração do Render, merge ou force push foi executado.

## Resultado dos seis pacotes

| Pacote | Commit | Resultado |
|---|---|---|
| 1 — Design system | bb57b50 | Publicado em homologação por fast-forward |
| 2 — Home | 1a94ce7 | Testes aprovados e push realizado |
| 3 — Personalização | 5be0cb7 | Testes aprovados e push realizado |
| 4 — Gestão | ab37e45 | Testes aprovados e push realizado |
| 5 — Motion | 4c96038 | Testes aprovados e push realizado |
| 6 — Refinamento | commit desta etapa | Testes completos e medição final concluídos |

O [relatório de desempenho](performance/README.md) contém as36 amostras e condições reproduzíveis. Exemplo: na personalização padrão, mediana do evento de seleção208→48ms e da maior tarefa longa466→60ms; home Natal LCP1.888→888ms. Há cenários com FCP/LCP um pouco maiores, registrados sem ocultar resultados. As requisições da galeria caíram209→33 e a quantidade inicial de cards195→24. Não equivalem a Web Vitals p75 nem aprovação de desempenho em aparelhos reais.

A última revalidação de `npm test`, galeria e acessibilidade passou após o refinamento do foco ao carregar mais artes. A ausência de diferenças em driver/rotas Neon, arquivos operacionais, originais/manifest comercial, dependências, .env e node_modules foi conferida contra a base a9ec895. Publicação HTTP no Render continua não verificada nesta sessão; pushes autorizados podem disparar Auto-Deploy. PR#1 permanece para revisão, sem merge.
