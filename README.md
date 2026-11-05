# Artize Loja Modular

## Rodar localmente

```bash
npm install
cp .env.example .env
node server.js
```

## Acesso administrativo

Use uma conta de administrador configurada no ambiente. Credenciais devem permanecer no gerenciador de segredos, fora da documentação e do frontend.

## Observações
- O frete usa uma estimativa base saindo de Londrina/PR.
- Para produção, revise preços, produtos, imagens e token do Mercado Pago.
- O webhook do Mercado Pago já está preparado em `/api/payments/webhook`.
## Aparência e Temas

O painel administrativo permite pré-visualizar, ativar e restaurar Artize Padrão, Natal, Páscoa e Dia das Mães manualmente. Natal e Páscoa incluem efeitos leves que respeitam movimento reduzido. A ativação no Render usa a conexão `DATABASE_URL` já existente; a prévia temporária do Color Studio não exige nova configuração. Arquivos locais continuam exclusivos de desenvolvimento. Consulte [configuração, persistência e testes](docs/gerenciador-temas.md).

## Artize Visual 2.0

Design system Mobile First, home, galeria progressiva com derivados WebP, painel responsivo e Motion dos quatro temas. Consulte o [registro de implementação e testes](docs/visual-2.0.md) para os seis pacotes, comandos de validação, métricas locais e limitações. O [gerenciador de temas e Neon](docs/gerenciador-temas.md) mantém a configuração existente.

Homologação autorizada: `feature/gerenciador-temas`, serviço `artize-homologacao`. Pushes nessa branch podem acionar Auto-Deploy; esta fase não publica em `main`. Os problemas críticos de segurança e integridade da auditoria permanecem pendentes antes da abertura comercial.

Refinamento da home: [carrossel mobile integrado aos temas](docs/banner-mobile.md), com comparação440→220px, swipe e controles acessíveis. Para atualizar a marcação inicial das categorias a partir do catálogo existente, execute `node scripts/sync-shell.mjs`.

## Artize Color Studio

O gerenciador em **Aparência e Temas** oferece 12 paletas, cores e glow por tema e prévia isolada. O botão **Salvar e aplicar paleta** grava as cores por tema e aplica à loja quando a estrutura JSONB está disponível. Sem essa estrutura, a ação fica desabilitada com uma explicação; nenhuma migração é executada automaticamente. [Documentação, persistência, testes e validação na homologação](docs/color-studio.md).

```bash
npm ci
npm test
# Chromium instalado; ajuste CHROMIUM_PATH se necessário para a suíte do Studio.
npm run test:studio:browser
npm run test:studio:apply
npm run test:studio:preview
npm run test:browser
npm run measure:studio
```

Não criar projetos/bancos Neon. A inspeção real, somente leitura, aguarda uma conexão identificada de homologação; qualquer migração exige autorização específica. Não alterar configurações do Render. [Fluxo de salvar/aplicar, SQL proposto, riscos, rollback e pendências](docs/color-studio-save-apply.md).

O novo fluxo parte de feature/gerenciador-temas e tem PR exclusivamente para essa branch. Após os testes, o responsável autorizou seu merge; isso pode acionar o Auto-Deploy existente da homologação. A migração Neon continua pendente de inspeção e autorização específica. O [roteiro anterior de prévia temporária](docs/color-studio-homologacao.md) registra a fase do PR #2 já integrado pelo responsável.

## Artes de Natal — persistência autorizada no Neon

O catálogo agora usa a tabela exclusiva `public.artize_cloudinary_arts` quando
`DATABASE_URL` está configurada. O proprietário autorizou criar essa tabela na
homologação. Nenhuma tabela existente é migrada. As credenciais Cloudinary ficam
somente no backend. A primeira importação ocorre no deploy, quando o catálogo
está vazio e as credenciais estão configuradas; depois use **Sincronizar artes**.
Detalhes, validação e limites: [sincronização durável](docs/artes-neon.md).

### Histórico: implementação inicial por JSON (substituída no Render)

Requer Node.js 20+ e as variáveis de ambiente `CLOUDINARY_CLOUD_NAME=etoqnuvw`,
`CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`, com acesso de leitura à Admin API.
Configure-as no ambiente do backend; nunca envie segredos ao frontend ou ao Git.
O `.env.example` contém somente os nomes e valores públicos de referência.

No painel administrativo, **Sincronizar artes** consulta a pasta exata
`Artize/Canecas ceramicas/natal` por `resources/by_asset_folder`, sem assumir
prefixo no Public ID. A listagem percorre `next_cursor`, aceita somente imagens
e usa `secure_url` retornada pelo Cloudinary. O total de 59 imagens é referência,
não limite. Não há upload, exclusão ou edição no Cloudinary.

`GET /api/caneca-ceramica-arts` combina as 195 artes originais de
`public/data/caneca-ceramica-artes.json` com `data/cloudinary-arts.json`, criado
na primeira sincronização bem-sucedida. O JSON antigo em
`data/caneca-ceramica-arts.json` não participa dessa leitura. Não altere os IDs
existentes, inclusive `paes`. A sincronização usa `asset_id`, preserva registros
ausentes da resposta e IDs anteriores, bloqueia chamadas concorrentes no processo
e grava por arquivo temporário + rename somente após consultar todas as páginas.
Em falha, conserva o catálogo anterior. Metadados externos são escapados na galeria.

**Somente teste local:** é necessário um diretório `data/` gravável. Render Free
não garante persistência de arquivos escritos em runtime; os dados podem desaparecer
após reinício ou deploy. O bloqueio de concorrência pressupõe um único processo.
Não considerar produção pronta até definir armazenamento durável e concorrência
adequada a múltiplas instâncias. Não há acesso ou alteração no Neon nesta etapa.
A autorização posterior do proprietário permite merge e deploy de homologação, com as restrições descritas abaixo.

Consulta real de leitura durante a implementação: 59 imagens, 59 `asset_id` únicos,
incluindo `3_MOCKUPS`. Nenhum metadado real foi persistido ou versionado.

Validação: `node test/arts-sync.test.js` (fixtures isoladas, sem usar credenciais
reais ou alterar usuários/pedidos locais). Cobre paginação, duplicação, repetição,
preservação das 195 artes, falha entre páginas, concorrência e permissões HTTP.
Para conferir a conta real, sincronize com um usuário administrador e verifique a
contagem retornada e a categoria Natal; erros da API não expõem suas respostas.

### Pendência de segurança preexistente

A inspeção sem divulgação de valores encontrou `MP_ACCESS_TOKEN` não vazio no
`.env` já versionado. Trate-o como potencial segredo real. O arquivo foi retirado do versionamento atual na revisão, sem reescrever histórico. O proprietário deve avaliar revogação/rotação e remoção do histórico;
adicionar `.gitignore` não remove um arquivo já rastreado. Não copie esse valor
para issues, logs, commits ou PRs.

## Homologação após revisão do PR #5

A interface Natal está disponível para avaliação. A sincronização fica bloqueada
no Render (`RENDER=true`) e em `NODE_ENV=production`, inclusive por chamada direta
à API. O painel informa a indisponibilidade e mantém o botão desabilitado.
Nesses ambientes somente as 195 artes originais são servidas: não há promessa de
sincronização persistente. Esta entrega NÃO resolve armazenamento durável.
Render Free não permite disco persistente: https://render.com/docs/free.
A próxima etapa exige escolher armazenamento externo e validar sync → reinício →
catálogo preservado. Nenhuma alteração no Neon foi realizada ou autorizada.

Em desenvolvimento local, a sincronização por JSON permanece disponível para
testes em processo único. Arquivo corrompido ou IDs colidentes não removem as
artes originais da vitrine; a sincronização recusa sobrescrever o arquivo inválido.
Miniaturas Cloudinary usam tamanho reduzido e carregamento sob demanda; o preview
selecionado mantém a URL original.

O `.env` foi retirado do versionamento atual, sem reescrita de histórico. Isso
NÃO revoga a credencial potencialmente exposta. O proprietário deve coordenar
rotação/revogação no Mercado Pago, atualizar `MP_ACCESS_TOKEN` nas variáveis do
Render e avaliar limpeza do histórico separadamente. Checkout depende dessa
variável no ambiente; não restaurar o segredo no Git. Demais variáveis devem ser
configuradas conforme `.env.example`. Merge/deploy de homologação autorizado pelo
proprietário; produção continua dependente dessas pendências.
