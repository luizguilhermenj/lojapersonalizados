# Loja de teste com Mercado Pago

Portal simples para testar compras fictícias usando **Checkout Pro** do Mercado Pago.

## O que já está pronto

- catálogo com 2 produtos fictícios
- formulário simples de comprador
- criação de preferência de pagamento
- redirecionamento para o checkout do Mercado Pago
- página de retorno do pedido
- endpoint de webhook para atualizar status do pagamento

## Requisitos

- Node.js 18+
- conta no Mercado Pago com credenciais de teste ou produção

## Como usar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
3. Preencha no `.env`:
   - `MP_ACCESS_TOKEN`
   - `BASE_URL`
   - `MP_WEBHOOK_SECRET` (opcional, mas recomendado quando configurar webhook)
4. Inicie o projeto:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000`

## Variáveis importantes

```env
PORT=3000
MP_ACCESS_TOKEN=APP_USR-...
BASE_URL=http://localhost:3000
MP_WEBHOOK_SECRET=
```

## Deploy no Render

- Crie um **Web Service** para este projeto.
- Build command: `npm install`
- Start command: `npm start`
- Configure as variáveis de ambiente do `.env`.
- Em produção, defina `BASE_URL` com a URL pública do Render.
- Configure a URL de webhook no Mercado Pago ou deixe o `notification_url` apontando para `https://seu-app.onrender.com/api/webhooks/mercadopago`.

## Observações

- Este projeto foi pensado para **teste inicial**.
- O armazenamento de pedidos é feito em arquivo JSON local. Em produção, o ideal é trocar por banco de dados.
- O fluxo usa **Checkout Pro**, então o pagamento final acontece no ambiente do Mercado Pago.
