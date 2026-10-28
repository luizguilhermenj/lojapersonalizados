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

O gerenciador em **Aparência e Temas** oferece 12 paletas, cores e glow por tema e prévia isolada. No Neon/Render, o modo temporário permite experimentar o frontend sem gravar cores nem executar migrações novas. [Documentação, persistência, testes e validação na homologação](docs/color-studio.md).

```bash
npm ci
npm test
# Chromium instalado; ajuste CHROMIUM_PATH se necessário para a suíte do Studio.
npm run test:studio:browser
npm run test:studio:preview
npm run test:browser
npm run measure:studio
```

Nesta fase não criar projetos/bancos Neon nem configurar THEME_TEST_DATABASE_URL. A persistência existente dos quatro temas permanece igual; as cores experimentais ficam apenas na memória da prévia no Render. A persistência local de desenvolvimento foi preservada.

[Integração e roteiro de homologação visual](docs/color-studio-homologacao.md). O PR #2 tem como destino apenas feature/gerenciador-temas; main, produção e configurações do Render não são alteradas por esta preparação.
