# Artize Loja Modular

## Rodar localmente

```bash
npm install
cp .env.example .env
node server.js
```

## Login admin padrão
- E-mail: admin@artize.com.br
- Senha: 123456

## Observações
- O frete usa uma estimativa base saindo de Londrina/PR.
- Para produção, revise preços, produtos, imagens e token do Mercado Pago.
- O webhook do Mercado Pago já está preparado em `/api/payments/webhook`.
## Aparência e Temas

O painel administrativo permite pré-visualizar, ativar e restaurar Artize Padrão, Natal, Páscoa e Dia das Mães manualmente. Natal e Páscoa incluem efeitos leves que respeitam movimento reduzido. No Render, configure `DATABASE_URL` com Neon PostgreSQL; arquivos locais são exclusivos de desenvolvimento. Consulte [configuração, persistência e testes](docs/gerenciador-temas.md).

## Artize Visual 2.0

Design system Mobile First, home, galeria progressiva com derivados WebP, painel responsivo e Motion dos quatro temas. Consulte o [registro de implementação e testes](docs/visual-2.0.md) para os seis pacotes, comandos de validação, métricas locais e limitações. O [gerenciador de temas e Neon](docs/gerenciador-temas.md) mantém a configuração existente.

Homologação autorizada: `feature/gerenciador-temas`, serviço `artize-homologacao`. Pushes nessa branch podem acionar Auto-Deploy; esta fase não publica em `main`. Os problemas críticos de segurança e integridade da auditoria permanecem pendentes antes da abertura comercial.

Refinamento da home: [carrossel mobile integrado aos temas](docs/banner-mobile.md), com comparação440→220px, swipe e controles acessíveis. Para atualizar a marcação inicial das categorias a partir do catálogo existente, execute `node scripts/sync-shell.mjs`.
