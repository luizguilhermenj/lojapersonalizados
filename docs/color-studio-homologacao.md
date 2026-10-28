# Homologação visual do Artize Color Studio

> Histórico do PR #2. A solicitação posterior de salvar/aplicar tem [documentação própria](color-studio-save-apply.md), com inspeção do banco pendente e migração dependente de autorização específica. As instruções de modo temporário abaixo descrevem a fase anterior.

Prioridade atual: frontend, identidade visual, mobile, paletas e animações. A integração do PR #2 deve usar **prévia temporária**, sem ampliar o backend.

## Resultado da verificação da migração

A migração `001-color-studio.up.sql` adiciona `color_studio JSONB` à tabela de temas. Ela é necessária para a persistência de paletas/glow no Neon, **não para renderizar a prévia**. É aditiva e foi exercitada em PostgreSQL isolado, mas não foi validada no banco real atual de homologação: esquema, permissões e condições de lock desse banco não foram inspecionados nesta sessão.

Por isso, **não aplicar a migração neste rollout**. Ela foi retirada da inicialização automática. As leituras e a ativação normal dos quatro temas continuam usando o contrato anterior de `theme_id` e o bootstrap legado, sem consultar a coluna nova. Nenhum projeto/banco Neon, segredo, grant, configuração Render ou conexão de testes foi criado/configurado.

## Como funciona nesta fase

- No Neon, o Color Studio entra em modo temporário por padrão, sem variável nova de ambiente. O servidor informa `colorStudioMode: preview` e bloqueia os endpoints de salvar/publicar cores com HTTP 409, mesmo que alguém tente chamá-los diretamente.
- As 12 paletas, HEX, glow/intensidade/opções, desktop/celular, comparação com o original, restauração e descarte funcionam no iframe da loja real.
- O iframe recebe tema e cores do painel via mensagem com verificação de origem/janela. Não consulta as rotas de tema nem o banco; somente o catálogo público continua sendo carregado normalmente. A edição fica na memória da aba, independente por tema.
- Recarregar/fechar descarta os ajustes. Não há rascunho durável, publicação de cores/glow, sincronização entre dispositivos ou link compartilhável da combinação temporária.
- O botão **Ativar tema selecionado** do gerenciador continua ativando o tema original pelo mecanismo existente. Ele não publica a paleta experimental. O painel explica essa diferença; salvar/publicar cores não aparecem no modo temporário.
- Nenhuma coluna ou configuração JSONB existente é apagada. A fase temporária utiliza a identidade original do tema selecionado; os dados de cores, se já existirem, ficam preservados para a retomada do backend.
- A loja pública mantém a aparência do tema já ativado. A personalização experimental aparece apenas na prévia da home (cabeçalho, banner, categorias, produtos, botões e rodapé). Navegação/compras ficam bloqueadas dentro dela.
- A persistência em arquivo de desenvolvimento foi preservada. O código JSONB já implementado foi mantido sob bloqueio por padrão no Neon, para retomar a validação do backend futuramente; nenhuma nova integração foi criada.

## Integração preparada

PR: [#2](https://github.com/luizguilhermenj/lojapersonalizados/pull/2), mantido em Draft, origem `feature/artize-color-studio`, destino **somente `feature/gerenciador-temas`**. A branch `main` permanece intacta.

O serviço `artize-homologacao` acompanha `feature/gerenciador-temas`, conforme confirmado anteriormente pelo responsável. Uma integração autorizada nessa branch pode disparar o Auto-Deploy já existente. Não é necessário mudar configuração do Render para ativar a prévia temporária. Esta entrega prepara/revisa o PR; não faz merge nem deploy e não comprova a saúde atual do serviço remoto.

Após a integração/disponibilização autorizada:

1. Abrir `https://artize-homologacao.onrender.com/pages/admin.html` e entrar com a conta administradora já existente.
2. Em **Aparência e Temas → Artize Color Studio**, confirmar o aviso **Prévia temporária** e a ausência das ações de salvar/publicar cores.
3. Selecionar cada um dos quatro temas e as 12 paletas. Ajustar HEX, intensidade 0–100, glow em botões/cards/bordas e comparar com o original.
4. Conferir prévia móvel/desktop, animações sazonais, foco/contraste, cabeçalho, busca, categorias, produtos e rodapé.
5. Manter uma aba anônima na home: experimentar cores não deve alterar essa aba. Recarregar o painel deve descartar os ajustes temporários.
6. Se desejar testar a ativação de tema tradicional, usar o botão acima do Studio e confirmar que apenas a identidade sazonal original mudou. Não realizar pedidos ou pagamentos reais.

Não configurar `THEME_TEST_DATABASE_URL`, não criar projetos/bancos e não executar a migração para fazer esse ensaio visual.

## Verificações locais

O teste `test/studio-preview-mode.test.js` executa SQL em PostgreSQL em memória com a tabela legada, sem `color_studio`. Confirma leituras/ativação dos quatro temas, ausência de ALTER/consultas à coluna nova e bloqueio das gravações de cores.

`npm run test:studio:preview` usa transporte Neon simulado, sem rede/banco remoto. Confirma 12 paletas × quatro temas, HEX/glow, comparação/restauração, quatro larguras, zero consultas ao banco durante a edição, zero chamadas das rotas de tema pelo iframe, perda dos ajustes ao recarregar e preservação da ativação tradicional. Também mede 72 aplicações de paleta (36 por viewport) até duas animation frames após a aplicação, em CPU emulada 4×. Essa métrica mede resposta visual do editor, não LCP nem dados de usuários reais.

Resultados atuais e evidências ficam em `docs/color-studio/preview-validation.json`, `preview-rendering.json` e `preview-lcp.json`. O relatório completo mantém as medições históricas, inclusive extremos e a variação do LCP; não se afirma aprovação universal de desempenho em dispositivos reais.

## Prontidão e limites

O código está preparado para homologação **visual** com o esquema legado, sem migração nova. O aceite dessa fase é experimentar o frontend temporariamente. Persistência remota das paletas/glow, migração no banco real e publicação durável ficam para a retomada do backend e não bloqueiam esse ensaio visual.
