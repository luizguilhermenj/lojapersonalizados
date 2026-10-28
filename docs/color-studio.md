# Artize Color Studio — relatório do PR #2

> Histórico do PR #2. A solicitação posterior de salvar/aplicar tem [documentação própria](color-studio-save-apply.md), com inspeção do banco pendente e migração dependente de autorização específica. As instruções de modo temporário abaixo descrevem a fase anterior.

Implementação na branch `feature/artize-color-studio`, baseada em `feature/gerenciador-temas` no commit `92db5fa43f5b5493410527682d06721b4ac76fb1`. Destino do PR: `feature/gerenciador-temas`, confirmada pelo responsável como a branch acompanhada pelo serviço de homologação. Nenhum merge, deploy ou acesso a banco de produção foi executado.

**Estratégia atual: frontend primeiro.** O Color Studio está preparado para homologação visual em modo temporário no Neon/Render, sem gravar cores nem executar migração nova. Não criar projetos/bancos Neon e não configurar THEME_TEST_DATABASE_URL. A persistência existente da seleção dos quatro temas foi mantida. [Roteiro atual e limitações](color-studio-homologacao.md). Os ensaios e planos de backend anteriores abaixo ficam como histórico, sem bloquear essa fase visual.

## Análise da arquitetura existente

A cópia inicial do workspace estava em `aa37057`, anterior ao gerenciador. A implementação usou a versão atual da branch de temas, recuperada pelo conector GitHub, preservando sua árvore e seu commit de origem.

- Aplicação Express com páginas HTML e módulos ES nativos, sem framework de interface.
- Quatro IDs permanentes em `themes/config.js`: `artize`, `natal`, `pascoa`, `dia-das-maes`.
- Tokens originais em `public/css/tokens.css`, com `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--line`, `--dark`, `--accent` e `--accent-2`.
- Campanhas acrescentam os tokens `--theme-hero`, `--theme-hero-text`, `--theme-hero-muted`, `--theme-hero-button` e `--theme-hero-button-text`, mantendo textos, ilustrações, carrossel e efeitos sazonais.
- Gerenciador existente: `#appearancePanel`, em `public/pages/admin.html`, controlado por `public/js/admin-themes.js`.
- Publicação original: `PUT /api/admin/themes/active`; prévia autenticada: `GET /api/admin/themes/:id/preview`; leitura pública: `GET /api/theme`.
- Persistência já selecionada por `themes/store.js`: Neon se `DATABASE_URL` estiver configurada; arquivo atômico somente em desenvolvimento; gravação bloqueada no Render sem Neon.

O Studio só libera seus controles após a leitura autenticada das configurações, e mantém as ações indisponíveis em falhas de armazenamento. O gerenciador e seus contratos anteriores foram ampliados. Nenhum tema foi substituído.

## Funcionalidades

As quatro abas oferecem paletas, seletores visuais/campos HEX, controles de glow e prévia da loja real. A seleção de tema mantém rascunhos independentes. Cores e glow são enviados imediatamente ao iframe autenticado, com verificação de origem e janela emissora. A comparação remove a camada para mostrar o tema original. A prévia oferece viewport móvel de 390 px ou desktop de 1280 px, com rolagem interna em telas pequenas.

No desenvolvimento local, salvar rascunho não muda a loja pública e publicar grava as cores/ativa o tema. No Neon/Render essas ações de cores ficam desativadas: a prévia é temporária e o gerenciador tradicional continua ativando apenas o tema original. Restaurar padrão remove a personalização apenas na edição, exigindo publicação para afetar a loja. Descartar retorna ao último rascunho salvo. Mudanças não salvas geram aviso ao sair da página. A ativação/restauração de tema já existente continua disponível no gerenciador.

A prévia bloqueia navegação de compra, formulários e escrita no carrinho. Não usa localStorage para publicar aparência. Apenas o servidor decide a configuração pública.

## Biblioteca extensível

`public/js/color-studio.js` contém o catálogo e a validação compartilhada pelo navegador e servidor. Uma nova entrada no catálogo aparece automaticamente na biblioteca. Cada paleta possui ID estável, nome, grupo, cinco cores, intensidade e opções de glow.

Suaves e Elegantes: as seis primeiras entradas. Glow Premium: as seis últimas, com glow ligado inicialmente a 35%. Nas suaves o glow começa desativado.

| Paleta | Fundo | Superfície | Texto | Destaque | Glow |
|---|---|---|---|---|---|
| Champagne | #FFF6E8 | #FFFFFF | #23493D | #D7A84B | #F5D5A0 |
| Lavanda | #F3EEFF | #FFFFFF | #4D386D | #9D80E6 | #C9B4FF |
| Rosa Blush | #FFF0F3 | #FFFFFF | #63394B | #D98AA7 | #FFBCD2 |
| Menta | #E9F7F1 | #FFFFFF | #205746 | #56A98B | #A4E8C8 |
| Azul Névoa | #ECF4FF | #FFFFFF | #294768 | #719ED5 | #B2D7FF |
| Pêssego | #FFF1E8 | #FFFFFF | #704A39 | #E8A17D | #FFCFB0 |
| Midnight Emerald | #091C1A | #13302B | #E6FFF5 | #47D6A1 | #1BCF94 |
| Royal Purple | #171126 | #2A2041 | #F5EDFF | #B68BFF | #9D55FF |
| Ocean Neon | #091B2B | #142E42 | #E6F7FF | #54C9F4 | #27B5F4 |
| Ruby Night | #240F1C | #3C1D30 | #FFEAF2 | #FF81AD | #EF477F |
| Gold Luxury | #191714 | #302A20 | #FFF5DB | #E5BA67 | #DCA545 |
| Graphite | #14191F | #252D36 | #F0F6FA | #70B8D8 | #499BC4 |
## Motor visual e acessibilidade

A camada usa `--store-background`, `--store-surface`, `--store-text`, `--store-accent`, `--store-glow-color`, `--store-glow-intensity` e `--store-glow-enabled`, além de tokens derivados para texto de página, links e texto sobre destaque. Ela adapta os tokens existentes somente quando `data-color-studio` está presente.

Configurações ausentes/inválidas resultam no tema original. A cor de destaque escolhida é preservada; texto sobre botões e superfícies é ajustado automaticamente quando a combinação solicitada não atinge contraste 4,5:1. Isso pode fazer a cor renderizada de um texto diferir do HEX solicitado; o painel explica o ajuste. Bordas de controles e foco usam cores de leitura, independentemente do glow decorativo.

Glow usa gradientes radiais e sombras CSS estáticas. Não há biblioteca visual, loops de animação ou blur em elementos móveis. Sombras e halos são reduzidos no celular e com `prefers-reduced-motion`/`prefers-reduced-data`; transições também respeitam movimento reduzido. Imagens, logotipos e composições das campanhas permanecem originais.

## Persistência existente e migração postergada

A proposta de persistência de cores utiliza a coluna adicional `color_studio JSONB` na tabela existente `public.artize_theme_settings`. **Essa coluna não é exigida nem criada automaticamente no rollout visual atual.** O formato reservado para a futura retomada do backend é:

```json
{
  "version": 1,
  "themes": {
    "natal": {
      "draft": { "background": "#091C1A", "surface": "#13302B", "text": "#E6FFF5", "accent": "#47D6A1", "glowColor": "#1BCF94", "glowEnabled": true, "glowIntensity": 35, "glowButtons": true, "glowCards": true, "glowBorders": true, "paletteId": "midnight-emerald" },
      "published": null
    }
  }
}
```

`null` significa o padrão original. Cada tema tem seus próprios valores de `draft` e `published`. A migração aditiva foi retirada da inicialização Neon. O bootstrap e as consultas legadas de seleção de tema foram preservados; a migração permanece versionada e não deve ser executada nesta fase. Os arquivos versionados são `migrations/001-color-studio.up.sql` e `migrations/001-color-studio.down.sql`. O rollback é manual e remove apenas a coluna nova; exporte seus dados antes de executá-lo. Nenhum SQL de rollback foi executado fora do banco isolado de testes.

A implementação JSONB já feita permanece reservada para a retomada do backend, bloqueada por padrão no Neon. No modo temporário, `readStudio` devolve um estado vazio sem consulta extra; a leitura pública usa apenas a seleção legada de tema, sem exigir `color_studio`. As operações de salvar/publicar cores são bloqueadas antes de acessar o banco. O iframe recebe a configuração visual diretamente do painel por mensagem de mesma origem, sem consultar as rotas de tema. A edição não afeta a loja pública.

Em desenvolvimento, as duas configurações compartilham o arquivo `active-theme.json` existente, atualizado por escrita temporária e rename atômico. Arquivos antigos, sem `colorStudio`, continuam válidos. No Render sem `DATABASE_URL`, rascunho e publicação continuam bloqueados, sem fallback para disco efêmero.

Rotas de persistência já implementadas, sempre com autenticação/papel admin e bloqueadas com HTTP 409 no modo temporário:

- `PUT /api/admin/themes/:id/color-studio/draft`
- `PUT /api/admin/themes/:id/color-studio/publish`

O corpo exige `customization` completa ou `null`. HEX deve ser `#RRGGBB`, intensidade numérica entre 0 e 100 e opções booleanas. Campos extras não são persistidos. Respostas de falha não expõem credenciais. Nenhuma credencial foi acrescentada ao frontend.

## Arquivos criados e modificados

| Área | Arquivos |
|---|---|
| Catálogo e validação | novo `public/js/color-studio.js`; novo `themes/color-studio.js` |
| Dashboard | novo `public/js/admin-color-studio.js`; modificados `public/js/admin-themes.js` e `public/pages/admin.html` |
| Aplicação visual e isolamento | modificados `public/js/themes.js` e `public/js/app.js` |
| CSS | modificados `public/css/themes.css` e `public/css/admin.css`; controles exclusivos do editor saíram do CSS público |
| API e armazenamento | modificados `routes/themes.js`, `themes/local-store.js`, `themes/neon-store.js` |
| Migrações | novos `migrations/001-color-studio.up.sql` e `migrations/001-color-studio.down.sql` |
| Testes | novos `test/color-studio.test.js`, `test/color-studio-postgres.test.js`, `test/color-studio-browser.mjs`; ajustado `test/visual-admin.mjs` para o viewport móvel de 390 px |
| Medição e evidências | novo `scripts/measure-color-studio.mjs`, este relatório e `docs/color-studio/{contrast,performance}.json` |
| Documentação geral | modificado `README.md` com instruções de execução |
| Ferramentas de desenvolvimento | modificados `package.json` e `package-lock.json`: Playwright e PGlite apenas como devDependencies e scripts reproduzíveis |

## Testes executados

Ambiente local com usuários de fixture, armazenamento em memória/temporário, token de pagamento vazio e `DATABASE_URL` desativada. Nenhum teste usou dados ou banco de produção.

| Comando | Resultado atual |
|---|---|
| `npm test` | **12 passaram, 1 pulado, 0 falhas**; skip de Neon real por ausência de `THEME_TEST_DATABASE_URL` |
| `npm run test:browser` | passou: quatro temas, login/permissões, publicação/restauração e reinício, catálogo, carrinho/frete, bloqueios de checkout/Render |
| `npm run test:studio:preview` | passou: 12 paletas × quatro temas, memória temporária, sem migração/queries durante a edição, responsividade, restauração e ativação legada |
| `npm run test:studio:browser` | passou: 12 paletas, HEX, glow 0–100, rascunhos, comparação, isolamento, responsividade, contraste; novo teste confirma 1 escrita de estilo e 0 reconstruções do carrossel por ajuste de cor |
| `node test/visual-admin.mjs` | passou: seis larguras, modal, foco/Escape/inert e prévia |
| `node test/hero-carousel.mjs` | passou: histórico recuperado, quatro temas × seis resoluções × três slides, swipe, teclado, rotação, limpeza de listeners/timers |
| `node test/home-loading.mjs` | passou: carregamento pendente em seis resoluções, placeholders/categorias e ausência de layout shift no cenário |
| `node test/visual-accessibility.mjs` | passou: seis páginas × seis larguras, labels/foco/alvos 44 px, contraste, cache 304, carrinho/frete/checkout simulado |
| `node test/visual-customizer.mjs` | passou: 195 artes/IDs, 585 derivados, teclado/filtros, seis viewports, payload do carrinho |
| `node test/visual-home.mjs` | passou: quatro temas × seis larguras, busca, estado vazio, disponibilidade e hero |
| `node test/visual-motion.mjs` | passou: neve/pétalas, movimento reduzido, limpeza de efeitos, controles sem encobrir compra |
| `node test/visual-shell.mjs` | passou: quatro temas × seis viewports × cinco páginas, navegação, rodapé, labels/autofill/foco |
| `npm run measure:studio` com opções documentadas abaixo | 120 amostras finais com movimento reduzido + 30 com glow ativo; ensaios intermediários também preservados |
| Sintaxe dos módulos e `git diff --check` | passaram |

A suíte nova de PostgreSQL executou SQL real no PGlite, isolado: inicialização, migrações up/down, parâmetros, gravação concorrente de temas diferentes, publicação, novos clientes, falhas e resposta perdida após commit. Os testes anteriores também cobrem o transporte do driver Neon oficial. A integração contra um serviço Neon real foi pulada; não existe credencial de teste configurada.

O navegador verificou contraste computado ≥4,5:1 para texto, preços, navegação, chips, campos e CTAs nos quatro temas, com Champagne/Midnight Emerald em desktop e celular. O teste unitário cobre tokens das 12 paletas. Também verificou formulários, demais páginas da loja, movimento reduzido, carrinho e frete com personalização escura. O checkout teve resposta simulada e não criou pedidos nem pagamentos.

A limitação anterior do checkout parcial foi resolvida para a suíte: o frontend histórico do commit `d43351825655658048acb69806a0b19a2478d134` foi recuperado exatamente e os arquivos estáticos originais foram restaurados, sem alterá-los no PR. Não foram enfraquecidas as verificações nem criados substitutos fictícios para as imagens. O teste histórico do carrossel foi executado e aprovado.

O teste Neon já implementado cobre driver/SQL reais, 12 paletas, quatro temas, rascunhos, publicação, novos clientes e migrações up/down/up. Permanece inativo nesta fase. Não carrega `.env`, não usa uma conexão alternativa e sanitiza erros. A unidade de segurança confirma que URLs de conexão não aparecem nos erros. [Decisão atual de adiar a etapa Neon](color-studio-neon.md).

## Desempenho observado — registro histórico

Medição local com CPU reduzida 4×, cache desativado, movimento reduzido, transporte localhost, viewports 390/1440 px e janela de observação de 1,2 s após prontidão. O baseline intercepta os módulos de tema e CSS do commit de origem. Não há rede móvel real, latência Neon ou amostra estatística de usuários.

| Modo | LCP médio | Maior CLS observado | Tempo médio de tarefas |
|---|---:|---:|---:|
| Antes do Studio | 1126 ms | 0,00079 | 1770 ms |
| Studio, visual original | 1370 ms | 0,00692 | 1939 ms |
| Studio, Midnight Emerald | 1727 ms | 0,00131 | 2507 ms |

CLS ficou abaixo de 0,1. O ensaio da primeira entrega registrou aumento no LCP médio de aproximadamente 244 ms no visual original e 600 ms no modo personalizado, além de mais tempo de tarefas. Houve grande variação entre execuções: uma amostra Natal/premium/celular chegou a 9164 ms de LCP e 8009 ms de layout, enquanto a repetição ficou em 704 ms de LCP. Esses dados não permitem atribuir todo o custo ao Studio, nem afirmar ausência de regressão de desempenho. Monitorar e investigar em dispositivos reais e com latência Neon na homologação antes de liberar amplamente. A camada CSS foi incorporada ao arquivo de temas existente para eliminar uma requisição e um waterfall de importação; apenas o módulo ES compartilhado acrescenta um recurso público. Nenhuma dependência de teste entra no frontend. Evidências completas, incluindo medianas e todas as amostras, em `docs/color-studio/performance.json` e `docs/color-studio/contrast.json`.

## Investigação e otimização — continuação do PR #2

### Causas e limites da atribuição

A medição anterior tinha apenas duas execuções por tema/largura e servia o baseline por interceptação Playwright, enquanto os demais cenários usavam HTTP normal. Isso introduzia assimetria na descoberta/entrega dos recursos; não demonstra que todo o aumento era causado pelo glow. No cenário de celular/movimento reduzido o glow visual já estava desativado.

A inspeção do código e dos traces confirmou trabalho evitável: o módulo de tema aguardava uma cadeia de módulos antes de buscar/aplicar dados; o catálogo descobria suas imagens depois do JavaScript/API; e os ajustes de cor reescreviam os tokens várias vezes, reconstruíam o conteúdo do carrossel e reiniciavam efeitos sazonais. O LCP real no celular frequentemente era a primeira imagem de produto, não o banner. O CSS público também incluía 3,4 KB de controles usados apenas pelo administrador.

Nenhuma fonte web externa foi carregada. A loja usa fontes de sistema; as imagens SVG existentes contêm texto e filtros e continuam preservadas. Não foi comprovada uma causa única em fontes ou em `text-wrap: balance`; as explorações pontuais dessas hipóteses foram mantidas como diagnóstico, sem justificar descarte de dados ou alteração da tipografia.

### Otimizações realizadas

- Tokens base e personalização são montados fora do documento e aplicados em uma única escrita de estilo. A restauração remove somente os tokens gerenciados e preserva outras propriedades inline.
- Ajustes de cor/glow preservam slide, conteúdo e partículas quando a campanha não muda. O navegador confirmou uma mutação de estilo e nenhuma reconstrução do carrossel.
- CSS exclusivo do Studio passou para `admin.css`, já carregado no painel. `themes.css` público caiu de **12.069 para 8.727 bytes**, aproximadamente 28%; nenhuma nova requisição CSS foi criada.
- Os módulos compartilhados usados na primeira tela recebem `modulepreload`, reduzindo a descoberta em cascata.
- A primeira imagem de produto tem prioridade alta somente no celular, onde pode ser o LCP. O desktop mantém prioridade automática para não favorecer uma imagem abaixo da dobra.
- O halo decorativo é limitado à região inicial (`min(700px, 100vh)`), evitando um gradiente sobre todo o catálogo. Cores, imagens, logotipos, sombras opcionais de botões/cards e preferências de movimento foram preservados.

### Método equivalente e repetível

O novo helper serve baseline, PR anterior e código otimizado pelo mesmo middleware HTTP local. Nenhum cenário usa interceptação do navegador. A API é uma fixture pública isolada, sem Neon, pedidos, sessões reais ou pagamentos. Foram mantidos CPU emulada 4×, HTTP cache desativado, viewport de 900 px de altura e observação de 1 s após prontidão. A ordem dos cinco cenários é alternada por bloco e o contexto é novo para cada amostra.

O baseline é `92db5fa43f5b5493410527682d06721b4ac76fb1`; “antes” é o PR no commit `5975a5395414a3dc05981791225f0c3d57616001`; o frontend final corresponde a `af7b830b8e1450958ff238f7131e556c82ee7eb7`. Um manifesto SHA-256 verifica os arquivos medidos. O ambiente possui quota de **2 CPUs**, além da emulação 4×; pausas por quota foram registradas por amostra. Cache do sistema/fontes e variações do host não foram eliminados.

Foram obtidas **120 amostras finais** com movimento reduzido: quatro temas × duas larguras × três repetições × cinco cenários. Há 12 observações por versão/visual/largura. Mediana usa a média dos dois valores centrais; p75 usa nearest rank. Nenhuma amostra, inclusive extrema, foi removida. São distribuições de laboratório, não p75 de usuários reais nem certificação de desempenho.

Comandos:

```bash
npm run measure:studio -- --runs=3 --trace --output=work/color-studio-v2/final/performance.json
npm run measure:studio -- --runs=3 --themes=artize,natal --widths=1440 --motion=no-preference --trace --output=work/color-studio-v2/glow-final/performance.json
```

### Comparação final do LCP (ms)

| Visual | Largura | n por versão | Mediana antes → depois | p75 antes → depois | Mínimo–máximo antes → depois |
|---|---:|---:|---:|---:|---:|
| Original | 390 px | 12 | 1.430 → 1.222 | 1.620 → 1.476 | 664–2.356 → 660–5.004 |
| Original | 1440 px | 12 | 848 → 880 | 976 → 1.192 | 604–1.292 → 676–2.788 |
| Personalizado | 390 px | 12 | 1.818 → 1.480 | 1.968 → 1.744 | 1.160–3.560 → 788–3.580 |
| Personalizado | 1440 px | 12 | 1.136 → 898 | 1.316 → 980 | 728–2.000 → 664–2.096 |

O personalizado melhorou a mediana em aproximadamente **19% no celular** e **21% no desktop**, e o p75 em **11% e 26%**, respectivamente. No original móvel, a mediana caiu de 1.430 para 1.222 ms e o p75 de 1.620 para 1.476 ms, mas o máximo aumentou para 5.004 ms e foi mantido. No original desktop a mediana aumentou 32 ms e o **p75 aumentou 216 ms**. Portanto, não é correto afirmar ausência de regressão em todos os cenários; o desktop original continua pendente de confirmação em ambiente estável.

O baseline histórico, servido agora pelo mesmo HTTP, teve mediana/p75 de 1.626/1.760 ms no celular e 886/1.116 ms no desktop. Valores absolutos deste protocolo não devem ser comparados diretamente às médias antigas, pois amostragem, ordem e instrumentação mudaram.

### Glow ativo no desktop (ms)

Ensaio adicional: Artize/Natal, movimento normal, três repetições, cinco cenários: **30 amostras**, seis por versão/visual. O `box-shadow` computado confirmou que o glow estava ativo.

| Visual | Largura | n por versão | Mediana antes → depois | p75 antes → depois | Mínimo–máximo antes → depois |
|---|---:|---:|---:|---:|---:|
| Original | 1440 px | 6 | 938 → 874 | 1.024 → 920 | 640–1.040 → 756–968 |
| Personalizado | 1440 px | 6 | 812 → 848 | 1.008 → 900 | 692–1.360 → 720–912 |

O p75 com personalização/glow ativo caiu de 1.008 para 900 ms, e o máximo de 1.360 para 912 ms; a mediana aumentou de 812 para 848 ms. Também foram preservados os resultados anteriores à limitação do halo/prioridade por viewport, que tinham piora no desktop. Eles não foram substituídos silenciosamente nem usados como comparação final de outra versão de código.

### Investigação das amostras atípicas

- A observação histórica de **9.164 ms**, com cerca de 8.009 ms acumulados de layout, permanece em `performance.json`. Não havia trace, elemento LCP, tempos de recursos ou contadores de CPU dessa execução. Sua causa exata não pode ser determinada retrospectivamente; não foi apagada nem declarada “resolvida”.
- Em uma rodada intermediária, a versão anterior teve LCP de **5.220 ms** no celular, com produto descoberto tardiamente, 1.631 ms de layout e 2.767 ms de throttling do container.
- Na mesma rodada apareceu uma amostra **sem glow** com 16.595 ms de tarefas e 16.816 ms de throttling do container, embora o LCP fosse 912 ms. Seu trace contém layouts/pinturas longos, inclusive de subdocumentos de imagem. Isso confirma que a variação extrema não exige glow e que o host contribui para os tempos; não prova, sozinho, a causa dos 9.164 ms antigos.
- Na versão final, o extremo original/celular foi **5.004 ms**. A API de produtos terminou em 2.551 ms, a grade apareceu em 4.790 ms e a imagem de produto foi solicitada em 4.797 ms; a transferência levou aproximadamente 12 ms. Houve 1.637 ms de throttling. O atraso está principalmente na descoberta/renderização/agendamento, e não no tamanho dessa transferência.
- No original/desktop final, a amostra de **2.788 ms** coincidiu com 6.085 ms de throttling na janela completa. Isso exige nova medição em host estável; não autoriza excluir a amostra nem atribuir toda a piora de p75 ao ambiente.

O maior CLS no conjunto final foi **0,00714**, abaixo de 0,1, mas as janelas curtas de laboratório não substituem métricas de campo. Latência e cold start Neon não fazem parte deste ensaio local.

### Evidências preservadas

- [Comparação final completa](color-studio/performance-controlled-final.json) e [glow ativo](color-studio/performance-glow-final.json): estatísticas e todas as observações.
- [Investigação e catálogo dos arquivos brutos](color-studio/performance-investigation.json): extremos, perfis exploratórios e SHA-256 dos dados sem compressão.
- Cinco arquivos `.raw.json.gz` preservam integralmente **305 observações** das rodadas finais, intermediárias e piloto; quatro perfis exploratórios e as 48 observações históricas também foram mantidos.
- `docs/color-studio/traces/` contém quatro traces Chrome comprimidos dos extremos discutidos. Os demais traces permanecem em `work/color-studio-v2/`. Para abrir os arquivos retidos no painel Performance do Chromium, descomprima o `.json.gz` e importe o JSON.
- [Resultado das regressões](color-studio/test-results.json). O teste matemático novo verifica que a amostra 9.164 continua no máximo e que p75/mediana são calculados sem descartá-la.

## Homologação visual — estratégia atual

A validação de persistência Neon foi adiada por decisão de escopo. Ela não é requisito para começar a experimentar o frontend. Não criar recursos novos nem configurar credenciais de testes. O modo temporário funciona com a tabela legada, sem nova coluna, e a implementação já existente de seleção/ativação de temas continua em uso.

A integração do PR #2 está preparada para `feature/gerenciador-temas`, sem merge ou deploy executado nesta sessão. O serviço de homologação acompanha essa branch, segundo confirmação anterior do responsável; um merge autorizado pode iniciar seu Auto-Deploy existente. Não se deve alterar main ou configurações do Render para este ensaio.

O [roteiro de homologação visual](color-studio-homologacao.md) descreve as ações no painel e a separação entre ativar um tema original e experimentar cores. Até retomarmos o backend, não há publicação/salvamento remoto de paletas, persistência entre sessões nem compartilhamento da combinação temporária. A prévia é da home; a navegação e as compras ficam bloqueadas dentro dela.

Os dados novos de resposta visual do editor e a nova verificação de LCP ficam em `docs/color-studio/preview-rendering.json` e `preview-lcp.json`; resultados anteriores, inclusive amostras extremas, permanecem preservados.

Na rodada atual, 72 aplicações de paleta tiveram mediana/p75/máximo de **78,95/96,30/146,50 ms** na prévia móvel e **118,85/154,20/216,50 ms** na desktop, com CPU emulada 4×. O intervalo termina duas animation frames após aplicar as cores; não é uma medição de LCP.

A verificação adicional de LCP usou três repetições, dois temas e duas larguras nos cinco cenários do mesmo protocolo local (60 amostras, seis por condição/largura). Para o código atual:

| Visual | Largura | Mediana (ms) | p75 (ms) | Máximo (ms) |
| --- | --- | --- | --- | --- |
| Original | 390 | 1612 | 2208 | 2296 |
| Original | 1440 | 906 | 1008 | 1168 |
| Personalizado | 390 | 1532 | 1920 | 2268 |
| Personalizado | 1440 | 852 | 928 | 1168 |

Esta rodada é uma verificação de laboratório com amostra pequena, não uma comparação direta com as médias históricas nem uma medida de Render/Neon. Os dados brutos e extremos estão preservados. O PR permanece em Draft, aguardando a revisão e a integração autorizada na branch de homologação.

## Limites e riscos restantes

- Nenhum deploy nem publicação de aparência foi executado no Render. A autorização e configuração do serviço precisam ser verificadas antes de disponibilizar o código.
- Persistência remota de cores e execução da migração real estão adiadas até retomarmos o backend; não bloqueiam a prévia visual temporária.
- Contraste automatizado cobre tokens e componentes amostrados; não representa certificação integral WCAG. Cores personalizadas podem exigir ajuste automático de texto.
- Administradores editando o mesmo tema simultaneamente seguem a política de última gravação; temas diferentes são preservados por atualizações JSONB específicas.
- Usuários, sessões e pedidos mantêm o armazenamento JSON anterior; não foram migrados. O risco preexistente de perda desses dados no filesystem efêmero do Render permanece.
- Houve melhora de mediana/p75 nos personalizados e no original móvel, mas o original desktop teve p75 maior e amostras extremas continuam presentes. Não está demonstrada ausência universal de regressão; confirmar em ambiente estável antes da liberação ampla.
- Pagamento real, métricas de campo, rede móvel real e acesso ao dashboard do Render não foram testados.
