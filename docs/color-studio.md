# Artize Color Studio — entrega e validação

Implementação na branch `feature/artize-color-studio`, baseada em `feature/gerenciador-temas` no commit `92db5fa43f5b5493410527682d06721b4ac76fb1`. Destino do PR: `feature/gerenciador-temas`, confirmada pelo responsável como a branch acompanhada pelo serviço de homologação. Nenhum merge, deploy ou acesso a banco de produção foi executado.

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

Salvar rascunho não muda a loja pública. Publicar grava as cores e ativa o tema escolhido. Restaurar padrão remove a personalização apenas na edição, exigindo publicação para afetar a loja. Descartar retorna ao último rascunho salvo. Mudanças não salvas geram aviso ao sair da página. A ativação/restauração de tema já existente continua disponível no gerenciador.

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

## Persistência e migração

A tabela existente `public.artize_theme_settings` recebe a coluna adicional `color_studio JSONB`, com este formato:

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

`null` significa o padrão original. Cada tema tem seus próprios valores de `draft` e `published`. A inicialização Neon aplica a migração aditiva e idempotente sob o lock consultivo já existente. Os arquivos versionados são `migrations/001-color-studio.up.sql` e `migrations/001-color-studio.down.sql`. O rollback é manual e remove apenas a coluna nova; exporte seus dados antes de executá-lo. Nenhum SQL de rollback foi executado fora do banco isolado de testes.

Salvar atualiza apenas o caminho JSONB daquele tema; publicar atualiza tema ativo, rascunho e configuração publicada em uma única instrução SQL parametrizada. Auditoria usa `updated_by`, `updated_at` e `version` existentes. A API pública lê tema e cores na mesma consulta, sem o cache anterior de 15 minutos, para refletir publicações entre instâncias. Em falhas, mantém o último visual público conhecido pelo processo. Na primeira leitura após reinício, sem banco disponível, usa Artize Padrão.

Em desenvolvimento, as duas configurações compartilham o arquivo `active-theme.json` existente, atualizado por escrita temporária e rename atômico. Arquivos antigos, sem `colorStudio`, continuam válidos. No Render sem `DATABASE_URL`, rascunho e publicação continuam bloqueados, sem fallback para disco efêmero.

Rotas novas, sempre com autenticação e papel admin:

- `PUT /api/admin/themes/:id/color-studio/draft`
- `PUT /api/admin/themes/:id/color-studio/publish`

O corpo exige `customization` completa ou `null`. HEX deve ser `#RRGGBB`, intensidade numérica entre 0 e 100 e opções booleanas. Campos extras não são persistidos. Respostas de falha não expõem credenciais. Nenhuma credencial foi acrescentada ao frontend.

## Arquivos criados e modificados

| Área | Arquivos |
|---|---|
| Catálogo e validação | novo `public/js/color-studio.js`; novo `themes/color-studio.js` |
| Dashboard | novo `public/js/admin-color-studio.js`; modificados `public/js/admin-themes.js` e `public/pages/admin.html` |
| Aplicação visual e isolamento | modificados `public/js/themes.js` e `public/js/app.js` |
| CSS | modificado `public/css/themes.css` (motor e controles incorporados para evitar waterfall de CSS) |
| API e armazenamento | modificados `routes/themes.js`, `themes/local-store.js`, `themes/neon-store.js` |
| Migrações | novos `migrations/001-color-studio.up.sql` e `migrations/001-color-studio.down.sql` |
| Testes | novos `test/color-studio.test.js`, `test/color-studio-postgres.test.js`, `test/color-studio-browser.mjs`; ajustado `test/visual-admin.mjs` para o viewport móvel de 390 px |
| Medição e evidências | novo `scripts/measure-color-studio.mjs`, este relatório e `docs/color-studio/{contrast,performance}.json` |
| Documentação geral | modificado `README.md` com instruções de execução |
| Ferramentas de desenvolvimento | modificados `package.json` e `package-lock.json`: Playwright e PGlite apenas como devDependencies e scripts reproduzíveis |

## Testes executados

Ambiente local com usuários de fixture, armazenamento em memória/temporário, token de pagamento vazio e `DATABASE_URL` desativada. Nenhum teste usou dados ou banco de produção.

| Comando | Resultado |
|---|---|
| `npm test` | 9 passaram; 1 pulado por ausência de `THEME_TEST_DATABASE_URL` |
| `npm run test:studio:browser` | passou, Chromium real; 12 paletas; 4 abas × 4 larguras; HEX; glow 0–100 e opções; salvar/recarregar/descartar/publicar; comparação; restauração; isolamento e navegação bloqueada na prévia |
| `npm run test:browser` | passou; suíte anterior completa do gerenciador; 4 temas, efeitos sazonais, reinício real do servidor, catálogo/carrinho/frete e bloqueios de checkout/Render |
| `node test/visual-admin.mjs` | passou; 6 larguras, pedidos longos, filtros, modal, foco, Escape/inert e prévia isolada |
| `npm run measure:studio` | 48 amostras: 4 temas × 3 modos × 2 larguras × 2 execuções |
| `node --check` nos módulos alterados e `git diff --check` | passaram |

A suíte nova de PostgreSQL executou SQL real no PGlite, isolado: inicialização, migrações up/down, parâmetros, gravação concorrente de temas diferentes, publicação, novos clientes, falhas e resposta perdida após commit. Os testes anteriores também cobrem o transporte do driver Neon oficial. A integração contra um serviço Neon real foi pulada; não existe credencial de teste configurada.

O navegador verificou contraste computado ≥4,5:1 para texto, preços, navegação, chips, campos e CTAs nos quatro temas, com Champagne/Midnight Emerald em desktop e celular. O teste unitário cobre tokens das 12 paletas. Também verificou formulários, demais páginas da loja, movimento reduzido, carrinho e frete com personalização escura. O checkout teve resposta simulada e não criou pedidos nem pagamentos.

`test/hero-carousel.mjs` foi tentado, mas não chegou às verificações: seu `git archive d433518` depende de um commit histórico ausente no clone parcial. As tentativas de buscar esse histórico pelo Git terminaram com objeto blob ausente. A suíte anterior `test/browser.mjs` e a nova prévia cobriram o funcionamento do carrossel e suas campanhas; isso não equivale à execução dessa comparação histórica específica.

## Desempenho observado

Medição local com CPU reduzida 4×, cache desativado, movimento reduzido, transporte localhost, viewports 390/1440 px e janela de observação de 1,2 s após prontidão. O baseline intercepta os módulos de tema e CSS do commit de origem. Não há rede móvel real, latência Neon ou amostra estatística de usuários.

| Modo | LCP médio | Maior CLS observado | Tempo médio de tarefas |
|---|---:|---:|---:|
| Antes do Studio | 1126 ms | 0,00079 | 1770 ms |
| Studio, visual original | 1370 ms | 0,00692 | 1939 ms |
| Studio, Midnight Emerald | 1727 ms | 0,00131 | 2507 ms |

CLS ficou abaixo de 0,1. O ensaio final registrou aumento no LCP médio de aproximadamente 244 ms no visual original e 600 ms no modo personalizado, além de mais tempo de tarefas. Houve grande variação entre execuções: uma amostra Natal/premium/celular chegou a 9164 ms de LCP e 8009 ms de layout, enquanto a repetição ficou em 704 ms de LCP. Esses dados não permitem atribuir todo o custo ao Studio, nem afirmar ausência de regressão de desempenho. Monitorar e investigar em dispositivos reais e com latência Neon na homologação antes de liberar amplamente. A camada CSS foi incorporada ao arquivo de temas existente para eliminar uma requisição e um waterfall de importação; apenas o módulo ES compartilhado acrescenta um recurso público. Nenhuma dependência de teste entra no frontend. Evidências completas, incluindo medianas e todas as amostras, em `docs/color-studio/performance.json` e `docs/color-studio/contrast.json`.

## Validação na homologação

1. Revisar o PR direcionado a `feature/gerenciador-temas`. Esta entrega não faz merge. Se o Render estiver com deploy automático ligado para essa branch, um futuro merge poderá iniciar o deploy; revise essa configuração antes do merge. Criar o PR não modifica a branch acompanhada.
2. Antes de disponibilizar, confirmar no serviço **artize-homologacao** que `DATABASE_URL` aponta para banco exclusivo de homologação. As credenciais e a configuração atual do Render não estão acessíveis nesta sessão, e não foram alteradas.
3. Depois de um deploy de homologação autorizado, entrar em `/pages/admin.html` como administrador. A migração aditiva é aplicada pela inicialização existente no primeiro acesso ao armazenamento. O usuário do banco precisa da permissão de adicionar a coluna.
4. Em Aparência e Temas, selecionar cada um dos quatro temas. Escolher uma paleta e ajustar cores/glow. Abrir a prévia em celular/desktop e comparar com o original.
5. Manter uma aba anônima em `https://artize-homologacao.onrender.com/pages/home.html`. Salvar rascunho e confirmar que essa aba continua igual. Publicar explicitamente no painel; atualizar a aba e conferir o resultado.
6. Trocar de tema e voltar, verificando suas configurações independentes. Restaurar padrão, conferir na prévia e publicar. Repetir após reinício/deploy autorizado da homologação para validar durabilidade Neon.
7. Testar cabeçalho, pesquisa, menu, carrossel, categorias, produtos, carrinho, frete, login, formulários e modal em desktop/celular. Não realizar pagamento real.

## Limites e riscos restantes

- Nenhum deploy nem publicação de aparência foi executado no Render. A autorização e configuração do serviço precisam ser verificadas antes de disponibilizar o código.
- Neon real, permissões de migração e persistência após reinício do Render ainda precisam de validação com banco exclusivo de homologação.
- Contraste automatizado cobre tokens e componentes amostrados; não representa certificação integral WCAG. Cores personalizadas podem exigir ajuste automático de texto.
- Administradores editando o mesmo tema simultaneamente seguem a política de última gravação; temas diferentes são preservados por atualizações JSONB específicas.
- Usuários, sessões e pedidos mantêm o armazenamento JSON anterior; não foram migrados. O risco preexistente de perda desses dados no filesystem efêmero do Render permanece.
- A medição local mostrou variação e aumento de LCP/tempo de tarefas; ainda não é possível garantir ausência de regressão de desempenho. Validar e investigar na homologação antes da liberação ampla.
- Pagamento real, métricas de campo, rede móvel real e acesso ao dashboard do Render não foram testados.
