# Gerenciador de Temas v1.0

Disponível em **Painel administrativo → Aparência e Temas**. A publicação é exclusivamente manual, sem datas ou agendamento. Somente sessões com `role: admin` podem listar opções, pré-visualizar ou publicar pela API.

## Testar localmente

1. Instale as dependências existentes com `npm ci` e execute `npm start`.
2. Entre com uma conta administrativa existente e abra `/pages/admin.html`.
3. Selecione Dia das Mães e clique em Pré-visualizar. A página inicial aparece em um iframe; visitantes continuam vendo o tema publicado. A prévia é da página inicial; links dentro dela usam o tema público ao navegar.
4. Clique em Ativar tema selecionado e abra/recarregue a loja em outra aba.
5. Reinicie o servidor e confirme a seleção. Clique em Restaurar tema padrão e repita.
6. Visite catálogo, personalização de canecas, carrinho e pedidos em celular e desktop.

Páginas já abertas aplicam uma nova publicação ao serem recarregadas. Se a aparência falhar, o frontend mantém o padrão e continua carregando o catálogo.

## Persistência e Render

O projeto atual armazena produtos, usuários, sessões e pedidos em JSON no diretório `data`. Não foi encontrada configuração de banco ou volume persistente. Esses fluxos não foram alterados nesta entrega.

Em desenvolvimento, a aparência é salva em `data/appearance/active-theme.json` (ignorado pelo Git). A escrita usa arquivo temporário e renomeação no mesmo diretório. Em produção (`NODE_ENV=production` ou `RENDER`), a publicação fica **bloqueada por padrão**, com explicação no painel. O tema público permanece padrão até configurar armazenamento durável.

Antes de habilitar em produção, o operador deve verificar um disco persistente já disponível e montar um diretório exclusivo para temas, fora de `public`. Defina:

```text
THEME_STORAGE_DIR=/caminho/absoluto/do/disco/appearance
THEME_STORAGE_DURABLE=true
```

A flag declara que o operador verificou a durabilidade; o código não consegue provar que um diretório pertence a um volume persistente. Não a habilite para um caminho efêmero. Nenhum disco, serviço pago, variável de produção ou deploy foi criado por esta entrega. Se não houver disco disponível, será necessário escolher uma solução persistente antes de liberar a publicação no Render.

Esta implementação suporta uma instância com disco persistente. Múltiplas instâncias exigem armazenamento compartilhado e controle de concorrência. Arquivo inválido causa erro administrativo; a API pública usa o tema padrão. Falhas de escrita retornam 503 e não anunciam sucesso.

## Organização

- `themes/config.js`: catálogo e IDs permanentes dos temas.
- `themes/store.js`: armazenamento e política de durabilidade.
- `routes/themes.js`: API pública e rotas protegidas com os middlewares existentes.
- `public/js/themes.js`: aplicação do tema e prévia autenticada, sem gravação.
- `public/js/admin-themes.js`: seleção, feedback, prévia e ativação no painel.
- `public/css/themes.css`: estilos limitados pelo atributo `data-theme`; o padrão mantém os estilos originais.
- `public/pages/home.html`: seção Dia das Mães ligada à personalização real de canecas. Durante a campanha ela substitui visualmente o carrossel sazonal; nenhum preço, produto ou arte foi criado.

Para adicionar campanhas, cadastre um ID em `themes/config.js` e seus estilos em `themes.css`. Não associe datas automaticamente. Nunca aceite CSS, HTML ou caminhos arbitrários enviados pelo administrador.

## Verificação executada

- `node --test test/themes.test.js`: 2 testes passaram; validação de IDs, persistência, retorno ao padrão, bloqueio em produção sem disco, arquivo inválido, permissões, preview sem publicação e falha de escrita.
- `node test/browser.mjs`: servidor real com dados isolados em `work/runtime`, login admin/cliente, respostas 401/403, seleção/prévia/publicação via interface, reinício real do processo, restauração e novo reinício, catálogo inalterado, carrinho em localStorage, incremento de quantidade pela interface, cotação de frete pela interface e API, checkout sem sessão e carrinho vazio. Chromium em 360, 390, 768 e 1280 px sem overflow horizontal na home e com painel de temas dentro da largura disponível; nenhum erro JavaScript.
- `node --check server.js` e `git diff --check`.

Para repetir o teste de navegador sem adicionar dependências ao produto: `npm install --prefix work --no-save --package-lock=false playwright`; depois `node test/browser.mjs`. Requer Chromium em `/usr/bin/chromium`, portas locais disponíveis e execução a partir da raiz do repositório. Os usuários e sessões do teste são sintéticos; `.env` não é copiado e o token de pagamento é vazio. `work/runtime` é descartável e sobrescrito pelo teste.

## Limites da validação

Sem acesso ao painel Render, não foi possível verificar disco, ambiente ou persistência real em produção. Não foram realizados pagamentos, chamada de criação de preferência ao Mercado Pago, webhook real, compra completa nem despacho real. A cotação testada é a estimativa local já existente. Responsividade foi validada no Chromium, sem aparelho físico ou outros navegadores. Dados e rotas financeiras existentes não foram modificados.

O repositório já contém `.env` e `node_modules` rastreados. O novo `.gitignore` evita novas inclusões, mas não remove arquivos já versionados; nenhum deles foi incluído nos commits desta funcionalidade.
