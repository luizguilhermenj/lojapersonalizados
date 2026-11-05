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
## Artes de Natal — sincronização local (issue #4)

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
Nenhum deploy ou merge está autorizado por esta implementação.

Consulta real de leitura durante a implementação: 59 imagens, 59 `asset_id` únicos,
incluindo `3_MOCKUPS`. Nenhum metadado real foi persistido ou versionado.

Validação: `node test/arts-sync.test.js` (fixtures isoladas, sem usar credenciais
reais ou alterar usuários/pedidos locais). Cobre paginação, duplicação, repetição,
preservação das 195 artes, falha entre páginas, concorrência e permissões HTTP.
Para conferir a conta real, sincronize com um usuário administrador e verifique a
contagem retornada e a categoria Natal; erros da API não expõem suas respostas.

### Pendência de segurança preexistente

A inspeção sem divulgação de valores encontrou `MP_ACCESS_TOKEN` não vazio no
`.env` já versionado. Trate-o como potencial segredo real. Esse arquivo não foi
alterado. O proprietário deve avaliar revogação/rotação e remoção do histórico;
adicionar `.gitignore` não remove um arquivo já rastreado. Não copie esse valor
para issues, logs, commits ou PRs.
