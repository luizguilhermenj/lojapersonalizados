# Gerenciador de Temas v2.0 — Campanhas sazonais e Neon PostgreSQL

O painel **Aparência e Temas** mantém seleção, pré-visualização, ativação manual e restauração dos temas Artize Padrão, Natal, Páscoa e Dia das Mães. Publicar pelo painel modifica somente o registro no banco, sem commit, agendamento ou novo deploy. As rotas continuam protegidas pelos middlewares `auth` e `adminOnly` existentes.

## Variáveis e seleção do armazenamento

| Ambiente | DATABASE_URL | Comportamento |
| --- | --- | --- |
| Desenvolvimento | ausente | Arquivo `data/appearance/active-theme.json`, ignorado pelo Git |
| Desenvolvimento | definida | Neon PostgreSQL |
| Render ou NODE_ENV=production | ausente | Ativação e restauração bloqueadas com HTTP 503 e aviso no painel |
| Render ou NODE_ENV=production | definida | Neon; falhas de configuração/conexão não habilitam arquivo local |

`DATABASE_URL` é a connection string PostgreSQL fornecida pelo Neon, incluindo o parâmetro TLS (`sslmode=require`). É um segredo: configure exclusivamente no ambiente do backend. Nunca cole em código, commits, logs, URLs do navegador ou variáveis públicas do frontend. `.env.example` contém somente a variável vazia.

`THEME_STORAGE_DIR` e `THEME_STORAGE_DURABLE` não são mais utilizados. Nem `THEME_STORAGE_DURABLE=true` autoriza arquivo local no Render. Não é necessário disco persistente no Render Free para os temas quando o Neon estiver configurado.

Recomendado: Node.js 22 LTS ou 24 LTS; o driver `@neondatabase/serverless` 1.2 requer Node >=19. Instale as dependências com `npm ci` antes de iniciar o servidor, para instalar a nova dependência a partir do lockfile. Não versione `node_modules`.

## Configurar Neon e Render

1. Crie um projeto Neon no plano Free, com banco exclusivo para a homologação da Artize. Escolha uma região próxima à região do serviço Render. Não reutilize banco de produção nos testes.
2. Na opção **Connect** do Neon, selecione o banco e o usuário e copie a connection string PostgreSQL com TLS. O driver oficial usa HTTPS para executar as consultas.
3. O usuário deve ter `CONNECT` no banco, `USAGE` e `CREATE` no schema `public` para a inicialização automática. Se a tabela já existir sob outro proprietário, precisa também de `SELECT`, `INSERT` e `UPDATE` em `public.artize_theme_settings`. Prefira um banco/usuário dedicado aos temas; a aplicação não usa o restante do banco. Depois do bootstrap, o operador pode retirar `CREATE` se não precisar recriar a tabela.
4. No serviço de **homologação** no Render, abra **Environment** e adicione `DATABASE_URL` como segredo com o valor real. Não configure `THEME_STORAGE_DURABLE`. Evite a opção de redeploy automático se ainda não houver autorização para disponibilizar a integração.
5. Quando esta alteração tiver sido revisada e a homologação estiver autorizada, instale as dependências e disponibilize o código com a variável aplicada. Configurar a integração pela primeira vez exige essa atualização do serviço; as trocas seguintes de tema não exigem deploy. Esta entrega não executou essa etapa no Render.
6. Abra a loja ou o painel. O primeiro acesso ao armazenamento cria a tabela e o registro inicial automaticamente. No painel, selecione Natal ou Páscoa, pré-visualize e ative; confirme a loja em outra aba atualizada.
7. Reinicie o serviço e confirme o tema. Faça um novo deploy autorizado da mesma branch e confirme novamente. Restaure o padrão pelo painel e repita. Essas verificações no Render dependem da configuração real e ainda não foram executadas nesta entrega.

A tabela é `public.artize_theme_settings`, com uma única linha (`id=1`), `theme_id`, `updated_at`, `updated_by` e `version`. A inicialização usa transação, lock consultivo do PostgreSQL para concorrência entre instâncias, `CREATE TABLE IF NOT EXISTS` e `INSERT ... ON CONFLICT DO NOTHING`. Reiniciar ou publicar o código não sobrescreve uma escolha existente. Valores do administrador são parâmetros `$1`/`$2`, nunca concatenados ao SQL. O catálogo de IDs válidos continua em `themes/config.js`: `artize`, `natal`, `pascoa` e `dia-das-maes`. Os IDs existentes foram preservados. Os novos temas não exigem migração da tabela nem reset do tema já publicado.

Não há importação automática do JSON antigo para o Neon: em um banco vazio, o padrão é Artize. Publique a campanha desejada pelo painel após configurar o banco.

## Falhas, cache e concorrência

- O backend espera a resposta da gravação para anunciar sucesso. Não há fallback de escrita em arquivo, memória ou Git em produção.
- Falha na criação da tabela é recuperável: um novo acesso tenta inicializar novamente. Não há `DROP`, `TRUNCATE`, `DELETE` ou rotina que substitua o registro ao reiniciar.
- A indisponibilidade do banco resulta em 503 nas operações administrativas. O painel exibe mensagem genérica, sem detalhes da conexão. Uma sessão administrativa já aberta pode tentar novamente; se o carregamento inicial falhar, recarregue o painel após resolver a conexão.
- Se ocorrer timeout após o banco possivelmente ter confirmado o commit, a API informa que não pôde confirmar a gravação. O cache é invalidado e o administrador deve recarregar o painel para consultar o estado real antes de tentar novamente. Não é possível prometer que toda falha de rede significa ausência de commit.
- Cada requisição ao Neon tem timeout de 8 segundos. O primeiro acesso pode envolver inicialização e leitura, portanto pode levar até duas operações. O servidor e as demais rotas continuam iniciando mesmo com DATABASE_URL inválida.
- Leituras públicas usam cache em memória por 15 minutos, sob demanda, sem polling ou keep-alive. Uma publicação atualiza imediatamente esse cache na instância que processou a alteração; o painel sempre consulta o banco sem cache. Em múltiplas instâncias, outras instâncias podem demorar até 15 minutos para refletir a alteração. A última atualização confirmada no banco prevalece.
- Em falha de leitura pública, usa-se o último tema conhecido pela instância e `stale: true`; em um processo novo sem acesso ao banco, usa-se temporariamente Artize padrão. Esse fallback nunca grava ou apaga o registro remoto. Ao recuperar acesso, a próxima leitura consulta o banco novamente.
- Páginas já abertas aplicam a publicação ao serem recarregadas. A prévia é autenticada e não grava nada; links dentro dela usam o tema público quando navegam para outras páginas.

## Testes automatizados

Execute na raiz do repositório:

```sh
npm test
```

`test/themes.test.js`: arquivo somente em desenvolvimento, persistência e restauração, ID inválido, JSON inválido, bloqueio no Render/produção mesmo com flags antigas, autenticação 401/403, prévia sem publicação e erro de gravação.

`test/neon-themes.test.js`: driver oficial com transporte HTTP simulado, inspeção de SQL e parâmetros serializados, bootstrap idempotente, preservação ao recriar o cliente, ativação/restauração, cache e leitura administrativa atualizada, indisponibilidade e retry, resposta perdida após commit, configuração inválida, resposta 503 sem expor credenciais e fallback público. O simulador não executa SQL em um banco PostgreSQL real.

`test/neon-live.test.js`: teste opcional com banco Neon dedicado. É pulado quando `THEME_TEST_DATABASE_URL` não está definida. Configure essa variável secreta **somente para um banco de testes**, depois execute `node --test test/neon-live.test.js`. O teste cria a tabela se necessário, ativa os quatro temas, recria clientes para verificar persistência, restaura Artize e tenta repor o tema original ao final. Metadados de versão/auditoria são atualizados. Não aponte para produção. Não utiliza automaticamente a DATABASE_URL da aplicação.

Para o navegador, instale ferramentas temporárias sem dependência de produto:

```sh
npm install --prefix work --no-save --package-lock=false playwright
node test/browser.mjs
```

Requer Chromium em `/usr/bin/chromium` e portas locais disponíveis. O teste usa fixtures próprias em `work/runtime`, sem copiar `.env`, com `DATABASE_URL` e token de pagamento vazios. Verifica servidor/login reais, permissões, prévia, publicação/restauração e reinício real com armazenamento local de desenvolvimento; responsividade dos quatro temas em 360/390/768/1280 px; catálogo, incremento de quantidade no carrinho, cotação de frete e validações iniciais do checkout. Também simula Render sem banco e com DATABASE_URL inválida para confirmar bloqueio e isolamento das demais rotas.

Resultado desta entrega: 5 testes automatizados passaram e o teste Neon real foi pulado por ausência de credencial. O teste de navegador passou. Também passaram verificações de sintaxe e `git diff --check`. A persistência Neon foi testada com transporte simulado e recriação do cliente; a persistência após reinício real do servidor foi testada no provedor local. Reinício/deploy no Render, TLS, permissões e execução do SQL em Neon real ainda precisam ser validados pelo operador.

## Campanhas e efeitos sazonais

A ordem no painel é Artize Padrão, Natal, Páscoa e Dia das Mães. O padrão restaura a identidade Artize do design system e o banner editorial estático. Os temas sazonais exibem um banner próprio, textos sem descontos/ofertas inventados, ilustração opcional e um rodapé Artize. Os links continuam apontando para o catálogo e a personalização real de canecas; produtos, preços e disponibilidade não são alterados.

A configuração de cada tema pode definir:

- `colors`: amostras da paleta no painel.
- `palette`: tokens semânticos de fundo, superfície, texto, botões e banner. O frontend aplica somente nomes de tokens permitidos e cores hexadecimais.
- `campaign`: título, descrição, chamada de ação e mensagem de rodapé. A aplicação usa `textContent`, sem HTML injetado.
- `decoration`: caminho e texto alternativo da ilustração; os desenhos atuais são decorativos e têm alt vazio.
- `effect`: tipo `snow` ou `petals`, quantidade em desktop/mobile, duração mínima/máxima e cores. Temas sem efeito não geram camada, botão ou listeners de mídia/visibilidade do efeito.

`applyTheme()` limpa a paleta e o efeito anteriores antes de aplicar o próximo tema. O painel também aplica o tema confirmado imediatamente, sem recarregar a página. Outras abas já abertas continuam seguindo a regra de atualização da página descrita acima.

O módulo `seasonal-effects.js` cria uma quantidade limitada de partículas (máximo defensivo de 40), com posição, tamanho, atraso, duração e trajetória variados. Anima somente transformações/opacidade via CSS; não há bibliotecas, intervalos ou loops JavaScript por frame. Natal utiliza 24 flocos no desktop e 6 até 600 px; Páscoa, 16 pétalas no desktop e 4 no celular. Os efeitos ficam restritos à home, personalização e iframe de prévia, sem camada em carrinho, conta, pedidos ou gestão. Há uma animação CSS por partícula. O banner editorial padrão não tem rotação automática.

A camada é fixa, recortada ao viewport do documento, `aria-hidden`, `inert` e `pointer-events: none`; partículas não recebem foco nem interceptam cliques/rolagem. Na prévia, ela pertence exclusivamente ao documento do iframe. Fechar ou mudar a prévia descarta o documento e seus efeitos. Alterar a seleção no painel não publica nem muda o tema do documento pai.

O controle **Pausar neve/pétalas** permite desligar o efeito e voltar a ligá-lo. A preferência é mantida por sessão/aba, quando sessionStorage está disponível. `prefers-reduced-motion: reduce` impede criar partículas e controle; mudanças nessa preferência são respeitadas em tempo real. A aba oculta remove o efeito e volta a renderizá-lo quando visível. A troca para um tema sem animação remove DOM e listeners de mídia/visibilidade. O módulo também limpa o efeito ao sair da página e o restaura ao retornar pelo cache de navegação.

### Validação v2.0

O teste de navegador foi ampliado para os quatro temas: prévia sem publicar, efeito confinado ao iframe, identificação/ativação no painel, aplicação imediata no painel e reinício real do servidor com dados isolados. Para cada tema verifica layout em 360, 390, 768 e 1280 px sem overflow horizontal. Para Natal/Páscoa verifica movimento real de partículas, quantidade móvel, cliques no menu através da camada, pausa/retomada, preferência de movimento reduzido inicial e dinâmica e limpeza completa ao trocar para o padrão (inclusive após mudanças posteriores de viewport/mídia). Também verifica contraste mínimo 4,5:1 no CTA das campanhas. O banner e o rodapé têm indicadores de foco próprios para navegação por teclado.

O teste do driver Neon com transporte simulado e o teste opcional Neon real agora percorrem todos os IDs. Sem `THEME_TEST_DATABASE_URL`, a integração real continua pulada; nenhuma conexão, credencial ou deploy foi criado para a v2.0. O teste local de reinício não substitui validar reinício/deploy com Neon real.

Uma execução completa de `node test/browser.mjs` passou com os quatro temas, efeitos, contraste e regressões. Depois disso foi retirado o acoplamento entre inicialização do menu e espera pela aparência; foi acrescentado um cenário de consulta do tema pendente. A primeira execução desse cenário teve uma falha de sincronização do interceptador do teste, corrigida para aguardar a resposta antes de removê-lo. A reexecução final foi interrompida pela indisponibilidade do ambiente de execução. Esse cenário e os últimos ajustes de foco ainda precisam de validação final em execução. O código foi preservado no PR pelo conector GitHub após a desconexão e passou por compilação sintática dos módulos em V8; isso não substitui reexecutar `npm test` e `node test/browser.mjs` no checkout final antes de aprovar o merge.

Para validar no Render após revisão e disponibilização autorizada: confirme `DATABASE_URL`, entre no painel e selecione cada campanha. Pré-visualize Natal/Páscoa e confira que o tema público permanece intacto até clicar em Ativar. Atualize uma aba anônima, teste menu/carrinho e confira os efeitos. Emule celular e movimento reduzido; use o botão de pausa. Restaure o padrão, confirme ausência de partículas e banner sazonal. Reinicie o serviço e, quando houver autorização, execute novo deploy de homologação para conferir preservação da seleção. Não realize pagamento real.

A validação inclui arquitetura sem loops por frame, contagem limitada, suspensão por visibilidade, testes funcionais no Chromium e ensaio local de CPU/rede simuladas documentado em [Visual 2.0](visual-2.0.md). Não foi feito benchmark de FPS em aparelhos físicos nem teste em Safari/Firefox. Ajustes futuros de densidade devem preservar esses limites e a preferência de acessibilidade.

## Arquivos e escopo

- `themes/config.js`: catálogo, paletas, textos, ilustrações e intensidades dos efeitos.
- `themes/store.js`: seleção de provedor e bloqueio de produção sem banco.
- `themes/local-store.js`: arquivo apenas em desenvolvimento.
- `themes/neon-store.js`: driver, bootstrap, persistência remota e cache.
- `routes/themes.js`: operações assíncronas protegidas, feedback e fallback público.
- `public/js/themes.js`, `public/js/admin-themes.js`, `public/css/themes.css` e páginas: aplicação visual, campanha reutilizável, rodapé e interface do painel.
- `public/js/seasonal-effects.js`: ciclo de vida compartilhado da neve e das pétalas, sem bibliotecas adicionais.
- `public/img/themes/natal.svg` e `public/img/themes/pascoa.svg`: ilustrações vetoriais decorativas locais.
- `test/`: testes locais, driver simulado, integração real opcional e navegador.

Somente a escolha de tema passa a ter persistência externa. Usuários, sessões e pedidos continuam no armazenamento JSON existente e ainda são vulneráveis ao filesystem efêmero do Render. A autenticação não foi migrada e sessões podem ser perdidas após reinício/deploy; faça novo login para validar o painel. Não foram alterados catálogo, preços, frete, checkout ou integrações financeiras. Nenhum pagamento real foi executado.

O plano gratuito Neon possui franquias de computação/rede e pode suspender o acesso ao esgotá-las; monitore o consumo. Cache não substitui persistência e não garante que toda carga caiba no plano gratuito. Não foi criado serviço pago, banco remoto, credencial ou deploy por esta entrega.

O repositório já contém `.env` e `node_modules` rastreados. Nenhum deles deve entrar no novo commit; `.gitignore` não remove o rastreamento preexistente.
