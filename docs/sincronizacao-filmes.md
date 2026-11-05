# Sincronização de Filmes e gêneros

Pastas confirmadas pelo proprietário no Cloudinary:

- Artize/Canecas ceramicas/natal
- Artize/Canecas ceramicas/Filmes/AÇÃO
- Artize/Canecas ceramicas/Filmes/AVENTURA
- Artize/Canecas ceramicas/Filmes/FILMES PREMIADOS
- Artize/Canecas ceramicas/Filmes/HERÓIS
- Artize/Canecas ceramicas/Filmes/INFANTIL
- Artize/Canecas ceramicas/Filmes/TERROR

O backend consulta cada pasta exata (incluindo maiúsculas e acentos), percorre
todos os next_cursor, deduplica por asset_id e grava somente ao concluir todas.
Falha de qualquer pasta/página não permite importação parcial. Pasta vazia é
válida; registros ausentes são preservados. Mesmo asset_id em duas pastas gera
erro controlado para evitar atribuir uma categoria arbitrária.

Filmes usa theme=filmes e subcategory=acao, aventura, filmes-premiados, herois,
infantil ou terror. As contagens por gênero são exibidas nos filtros. O botão
Sincronizar artes passa a atualizar Natal e os seis gêneros numa só operação.
Novas pastas fora desse mapa ainda precisam ser cadastradas no código.

## Ajuste restrito no Neon

O recurso inicial criou uma tabela exclusiva com CHECK de Natal. Para atender
à ampliação de categorias autorizada nesta tarefa, a inicialização adiciona
artize_cloudinary_arts_metadata_check e só então remove a antiga restrição
artize_cloudinary_arts_art_check. As operações ocorrem sob lock, em uma transação
e são idempotentes. Se a nova regra não validar, a transação reverte integralmente.
Não remove tabelas, colunas ou dados. Não altera nenhuma outra tabela, conexão
ou estrutura de temas/Color Studio/pedidos/usuários. SQL: lib/neon-art-store.js.

A primeira importação de Filmes é tentada no deploy quando não existem Filmes
salvos e as credenciais estão configuradas. Se já houver ao menos uma arte de
Filmes persistida, reinícios posteriores só leem Neon; atualizações manuais são
feitas pelo botão administrativo. As 195 originais e as artes de Natal permanecem.

## Validação

31 testes locais passaram com acesso externo ao Neon bloqueado, usando fixtures.
Incluem as sete fontes, paginação independente, Unicode/case, falhas entre gêneros,
colisões, bootstrap sobre Natal existente, persistência, filtros e regressão dos
temas/Color Studio. O SQL da restrição requer confirmação no deploy real.
Credenciais não são exibidas, gravadas no Git nem retornadas ao navegador.
