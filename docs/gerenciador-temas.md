# Gerenciador de Temas v1.0 — Neon PostgreSQL

O painel **Aparência e Temas** mantém seleção, pré-visualização, ativação manual e restauração dos temas Artize padrão e Dia das Mães. Publicar pelo painel modifica somente o registro no banco, sem commit, agendamento ou novo deploy. As rotas continuam protegidas pelos middlewares `auth` e `adminOnly` existentes.

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
6. Abra a loja ou o painel. O primeiro acesso ao armazenamento cria a tabela e o registro inicial automaticamente. No painel, selecione Dia das Mães, pré-visualize e ative; confirme a loja em outra aba atualizada.
7. Reinicie o serviço e confirme o tema. Faça um novo deploy autorizado da mesma branch e confirme novamente. Restaure o padrão pelo painel e repita. Essas verificações no Render dependem da configuração real e ainda não foram executadas nesta entrega.

A tabela é `public.artize_theme_settings`, com uma única linha (`id=1`), `theme_id`, `updated_at`, `updated_by` e `version`. A inicialização usa transação, lock consultivo do PostgreSQL para concorrência entre instâncias, `CREATE TABLE IF NOT EXISTS` e `INSERT ... ON CONFLICT DO NOTHING`. Reiniciar ou publicar o código não sobrescreve uma escolha existente. Valores do administrador são parâmetros `$1`/`$2`, nunca concatenados ao SQL. O catálogo de IDs válidos continua em `themes/config.js`.

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

`test/neon-live.test.js`: teste opcional com banco Neon dedicado. É pulado quando `THEME_TEST_DATABASE_URL` não está definida. Configure essa variável secreta **somente para um banco de testes**, depois execute `node --test test/neon-live.test.js`. O teste cria a tabela se necessário, ativa Dia das Mães, recria clientes para verificar persistência, restaura Artize e tenta repor o tema original ao final. Metadados de versão/auditoria são atualizados. Não aponte para produção. Não utiliza automaticamente a DATABASE_URL da aplicação.

Para o navegador, instale ferramentas temporárias sem dependência de produto:

```sh
npm install --prefix work --no-save --package-lock=false playwright
node test/browser.mjs
```

Requer Chromium em `/usr/bin/chromium` e portas locais disponíveis. O teste usa fixtures próprias em `work/runtime`, sem copiar `.env`, com `DATABASE_URL` e token de pagamento vazios. Verifica servidor/login reais, permissões, prévia, publicação/restauração e reinício real com armazenamento local de desenvolvimento; responsividade em 360/390/768/1280 px; catálogo, incremento de quantidade no carrinho, cotação de frete e validações iniciais do checkout. Também simula Render sem banco e com DATABASE_URL inválida para confirmar bloqueio e isolamento das demais rotas.

Resultado desta entrega: 5 testes automatizados passaram e o teste Neon real foi pulado por ausência de credencial. O teste de navegador passou. Também passaram verificações de sintaxe e `git diff --check`. A persistência Neon foi testada com transporte simulado e recriação do cliente; a persistência após reinício real do servidor foi testada no provedor local. Reinício/deploy no Render, TLS, permissões e execução do SQL em Neon real ainda precisam ser validados pelo operador.

## Arquivos e escopo

- `themes/config.js`: catálogo de temas.
- `themes/store.js`: seleção de provedor e bloqueio de produção sem banco.
- `themes/local-store.js`: arquivo apenas em desenvolvimento.
- `themes/neon-store.js`: driver, bootstrap, persistência remota e cache.
- `routes/themes.js`: operações assíncronas protegidas, feedback e fallback público.
- `public/js/themes.js`, `public/js/admin-themes.js`, `public/css/themes.css` e páginas: aplicação visual e interface do painel.
- `test/`: testes locais, driver simulado, integração real opcional e navegador.

Somente a escolha de tema passa a ter persistência externa. Usuários, sessões e pedidos continuam no armazenamento JSON existente e ainda são vulneráveis ao filesystem efêmero do Render. A autenticação não foi migrada e sessões podem ser perdidas após reinício/deploy; faça novo login para validar o painel. Não foram alterados catálogo, preços, frete, checkout ou integrações financeiras. Nenhum pagamento real foi executado.

O plano gratuito Neon possui franquias de computação/rede e pode suspender o acesso ao esgotá-las; monitore o consumo. Cache não substitui persistência e não garante que toda carga caiba no plano gratuito. Não foi criado serviço pago, banco remoto, credencial ou deploy por esta entrega.

O repositório já contém `.env` e `node_modules` rastreados. Nenhum deles deve entrar no novo commit; `.gitignore` não remove o rastreamento preexistente.
