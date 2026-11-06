# Artes Cloudinary no Neon de homologação

Autorização específica do proprietário: criar uma tabela exclusiva de artes no
Neon de homologação, preservando as tabelas existentes. Branch de publicação:
`feature/gerenciador-temas`. Substitui o bloqueio de sincronização da fase JSON.

## Funcionamento

- Usa a `DATABASE_URL` existente no backend. Nenhuma conexão é enviada ao cliente.
- Cria somente `public.artize_cloudinary_arts` na primeira gravação. SQL canônico:
  `ARTS_DDL` e `ARTS_UPSERT` em `lib/neon-art-store.js`.
- A ampliação para Filmes ajusta somente o CHECK da tabela exclusiva de artes,
  substituindo a restrição inicial de Natal por Natal ou Filmes com gênero válido.
  Não remove tabelas/colunas/registros e não modifica temas, usuários, pedidos ou paletas.
- Lê `Artize/Canecas ceramicas/natal` e os seis gêneros de
  `Artize/Canecas ceramicas/Filmes` via Admin API paginada por pasta.
- Usa as três variáveis `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e
  `CLOUDINARY_API_SECRET`. Também aceita `CLOUDINARY_URL` real, sem placeholders.
- A primeira importação é tentada no deploy se as credenciais estiverem presentes
  e ainda não houver Filmes salvos. Reinícios posteriores leem o catálogo salvo
  e não repetem a consulta Cloudinary. Falhas permitem nova tentativa pelo admin.
- Só grava depois de receber e validar todas as páginas. asset_id é chave estável;
  preserva IDs anteriores e registros ausentes. Não duplica nem exclui artes.
- A transação usa lock entre instâncias, upsert em lote e contagem comparando
  JSONB final com ID preservado. Inicialização e gravação têm timeout de lock.
- As 195 artes originais continuam no JSON versionado e são combinadas na leitura.
  Nenhum dado de runtime precisa ser escrito no filesystem do Render.
- Se Neon falhar, a vitrine preserva as artes originais e o último catálogo lido
  pelo processo. Um processo novo sem acesso ao Neon mostra somente as originais;
  o painel informa a falha. Isso não apaga dados do banco.
- API de sincronização e diagnóstico continuam limitadas a administradores.
  Erros externos e credenciais nunca são enviados em respostas ou logs.

## Verificação

23 testes locais passaram: paginação, falhas, autenticação, contagens, recuperação,
recriação de serviço com armazenamento compartilhado, primeira importação única,
validação, transações parametrizadas e regressão de temas/Color Studio.
O pacote Neon não está disponível no ambiente local e sua instalação é bloqueada
pela rede. Os testes usam transporte isolado e proíbem conexão externa. Não são
uma execução real do SQL PostgreSQL nem um teste real de reinício do Render.
A importação e as contagens reais devem ser verificadas após o deploy.

Primeira verificação real: o deploy `9baf6a9` importou 59 artes de Natal via
Cloudinary e a API pública retornou 254 registros com 254 IDs únicos. O preview
selecionado carregou e a galeria progressiva apresentou as 59 artes. Essa leitura
usa Neon (não há arquivo de artes sincronizadas no caminho durável). A rota
`/api/health` agora informa somente o SHA público da versão, permitindo confirmar
um segundo deploy e comparar os registros antes/depois, sem expor configuração.

## Operação e reversão

No painel, confira o total salvo no Neon e clique **Sincronizar artes** para
incluir/atualizar a coleção. A chave precisa permitir leitura da Admin API.
Não copie valores para Git, prints ou chat. Revogação da antiga credencial
Mercado Pago exposta no histórico permanece uma pendência separada.

Rollback de código preserva a tabela e os dados: não remover a tabela para
reverter a interface. Qualquer exclusão ou mudança em tabelas existentes exige
nova autorização. O fluxo de paletas/temas e suas permissões não foi alterado.
