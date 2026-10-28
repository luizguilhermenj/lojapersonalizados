# Color Studio — salvar e aplicar paleta

Implementação na branch `feature/color-studio-save-apply`, criada a partir de `feature/gerenciador-temas` em `54b8a879ead3355e46da128e0088fbc5f97f654a` (PR #2 já integrado pelo responsável). Destino exclusivo: `feature/gerenciador-temas`. Nenhum merge, deploy, alteração de main ou configuração do Render faz parte desta entrega.

## Fluxo do administrador

1. Selecionar um dos quatro temas, escolher uma das 12 paletas e, se desejar, ajustar HEX/glow/intensidade.
2. A seleção altera somente a prévia. O indicador mostra **Alterações não salvas**; a loja pública não muda.
3. Usar **Salvar e aplicar paleta**, ação principal disponível em todas as abas. Ela grava as cores e ativa o tema selecionado em uma única operação no banco.
4. Durante o envio, o painel anuncia o salvamento, desabilita campos/seleção de tema/envios duplicados e mostra o resultado. Em caso de erro, a edição é preservada para conferência e nova tentativa.
5. A loja utiliza as cores ao abrir ou atualizar a página. Configurações persistem por tema, inclusive após reiniciar o servidor; não há fallback para disco efêmero ou localStorage no Render.

**Ativar tema selecionado** usa a identidade sazonal e as cores já salvas daquele tema, sem publicar a edição pendente do Studio. **Salvar rascunho (sem aplicar à loja)** fica como ação secundária na aba Configurações. **Descartar alterações** volta ao último rascunho salvo. **Restaurar cores originais** muda a prévia para o original; é necessário clicar em **Salvar e aplicar paleta** para restaurar a loja também. Essas mensagens aparecem no painel.

A mesma camada visual existente aplica fundo, cabeçalho, categorias, cards, botões, textos/destaques, rodapé e glow. Quatro temas e efeitos sazonais foram preservados. Ajustes de leitura usam tokens de contraste, sem substituir o accent solicitado. Celular e movimento reduzido mantêm as simplificações já existentes do glow.

## Ativação do armazenamento

A aplicação usa o `DATABASE_URL` já existente. Na primeira inicialização do store, faz uma consulta de metadados para verificar se `public.artize_theme_settings.color_studio` tem tipo `jsonb`. **Não executa ALTER TABLE nem migração automática.** Com a estrutura compatível, habilita o botão e recupera/publica os documentos JSONB já implementados. Sem a coluna ou com tipo incompatível, mantém a loja/gerenciador legados e mostra o botão desabilitado com uma explicação. A prévia sem gravação é apenas uma contingência enquanto o banco aguarda validação, não a solução definitiva do novo fluxo.

Depois de uma migração manual aprovada, reiniciar as instâncias da aplicação para renovar a detecção de estrutura. Nenhuma variável adicional no Render é necessária. O salvamento exige administrador, valida tema/HEX/glow/intensidade, usa parâmetros SQL e altera apenas a entrada do tema selecionado. As cores e o ID ativo são atualizados no mesmo UPDATE. A leitura pública persistente consulta o banco, permitindo recuperar o estado em novas instâncias. Erros de SQL/credenciais não são enviados ao navegador.

## Inspeção real — pendente

O acesso de leitura ao Neon atual de homologação foi explicitamente autorizado pelo responsável, exclusivamente pelo segredo `ARTIZE_HOMOLOG_DATABASE_URL`. O ambiente desta tarefa ainda não possui esse segredo disponível nem hostname Neon liberado. A URL de teste remoto continua ausente; nenhum banco remoto foi acessado e nenhum recurso foi criado. A disponibilização da conexão **somente leitura** ainda precisa ser confirmada antes da inspeção. A autorização não inclui INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE ou migrações no banco real.

Vincular **neste ambiente de desenvolvimento**, como segredo, `ARTIZE_HOMOLOG_DATABASE_URL`, apontando exclusivamente à homologação e com permissões somente leitura; liberar HTTPS para o hostname correspondente. Não colar credenciais no chat nem alterar configurações do Render. Não configurar THEME_TEST_DATABASE_URL para esta inspeção.

Executar `npm run inspect:studio`. O script não carrega .env, não recorre a DATABASE_URL, não inicializa o store e envia apenas consultas de metadados/contagens em transação READ ONLY, com timeouts. SQL revisável: [scripts/inspect-color-studio.sql](../scripts/inspect-color-studio.sql). Retorna versão PostgreSQL, colunas/defaults, constraints/índices, permissões da conta leitora, contagem da linha singleton e formato agregado do JSONB. Não exporta paletas ou dados de usuário. Falhas são sanitizadas.

Antes de decidir pela migração, conferir a tabela/colunas legadas, PK/CHECK id=1, uma única linha válida, ausência de tipo conflitante e versão PostgreSQL compatível. Se a coluna já existir com tipo JSONB, avaliar o conteúdo/versão e as permissões da conta usada pela aplicação; não presumir que ADD COLUMN seja necessário. As permissões UPDATE da conta de leitura não comprovam as permissões do usuário do Render. A inspeção não autoriza migração.

## SQL proposto — NÃO EXECUTADO no Neon

Só se a inspeção comprovar a necessidade, obter autorização específica do responsável para aplicar o arquivo abaixo **ao banco atual de homologação**. Fazer antes uma exportação/backup lógico da tabela, com acesso restrito, preservando inclusive eventual color_studio; verificar a recuperação. Não criar projetos/bancos novos.

Arquivo integral: [migrations/001-color-studio.up.sql](../migrations/001-color-studio.up.sql).

```sql
-- Manual only: inspect the target schema, back up, and obtain specific authorization first.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
SELECT pg_advisory_xact_lock(713922104);
DO $$
BEGIN
  IF to_regclass('public.artize_theme_settings') IS NULL THEN
    RAISE EXCEPTION 'Expected legacy theme table is missing; inspect before migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'artize_theme_settings'
      AND column_name = 'color_studio' AND data_type <> 'jsonb'
  ) THEN
    RAISE EXCEPTION 'Existing color_studio column has incompatible type; inspect before migration';
  END IF;
END $$;
ALTER TABLE public.artize_theme_settings
  ADD COLUMN IF NOT EXISTS color_studio JSONB NOT NULL DEFAULT '{"version":1,"themes":{}}'::jsonb;
COMMIT;
```

A alteração é aditiva; mantém theme_id, audit fields, versão e as demais colunas/linhas. O default é constante. Em PostgreSQL moderno, a inclusão costuma dispensar reescrita da tabela, mas exige **ACCESS EXCLUSIVE lock**: pode aguardar/bloquear leituras e gravações. Há risco de timeout, privilégios insuficientes ou drift do esquema. Os limites de lock/statement abortam a transação em vez de esperar indefinidamente. Não reutilizar uma coluna de tipo diferente nem converter dados automaticamente. O advisory lock coordena apenas clientes que usam a mesma chave; não elimina o lock do ALTER. Sem inspeção real, não se afirma que a migração seja segura no banco atual.

## Rollback

1. Preferir reverter somente o código para o modo temporário anterior, preservando a coluna e todas as paletas. Verificar leitura pública e ativação legada. Não é necessário apagar JSONB para recuperar o frontend anterior.
2. Se for indispensável remover a coluna, obter autorização específica, exportar seu conteúdo e conferir o backup antes. A remoção elimina todas as paletas/rascunhos e também exige lock exclusivo. Executar manualmente com limites de tempo; não faz parte desta entrega:

```sql
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
SELECT pg_advisory_xact_lock(713922104);
ALTER TABLE public.artize_theme_settings DROP COLUMN IF EXISTS color_studio;
COMMIT;
```

3. Em caso de falha antes do COMMIT, usar ROLLBACK; a transação preserva o estado anterior. Após remoção confirmada, recuperar cores exige restaurar o backup aprovado. O arquivo down anterior permanece versionado para compatibilidade, mas o plano acima recomenda primeiro rollback da aplicação sem perda de cores.

## Validação e evidências

Os testes executam o SQL real em PGlite (PostgreSQL isolado). A suíte de navegador usa um diretório temporário e reinicia tanto o servidor quanto o banco; não usa a conexão real. Contas/tokens e catálogo são fixtures locais; não há pedidos ou pagamentos reais.

- `npm test`: valida contratos, endpoints/autorização, entrada inválida, falhas, parâmetros, cache, migração idempotente/rollback, preservação dos dados legados e as 12 paletas × quatro temas com nova instância do store. Também bloqueia coluna incompatível sem converter/apagar o dado existente.
- `npm run test:studio:apply`: botão em quatro abas × quatro larguras (320/390/768/1440), 12 salvamentos pelo painel em PostgreSQL, recuperação em reload, cores na home pública móvel, contraste computado, quatro temas/reinício do banco e servidor, erro/retry, carregamento, distinção de ativação, descarte e restauração.
- `npm run test:studio:browser`: HEX/glow/compare, isolamento da prévia, rascunhos, personalização pública clara/escura nos quatro temas em desktop/celular, preservação do carrossel, carrinho/frete/checkout simulado.
- `npm run test:studio:preview`: contingência sem coluna compatível; gravação bloqueada e prévia isolada preservada.
- Demais regressões e resultados de desempenho: evidências anexadas ao final da validação.

## Pendências para homologação

Disponibilizar a conexão de leitura e acesso de rede; inspecionar o esquema real; conferir permissões do usuário da aplicação; apresentar a decisão final de migração e obter autorização específica antes de qualquer alteração. Só depois validar a persistência no Neon de homologação e executar merge/deploy se autorizados separadamente. O novo PR permanece em Draft até concluir essas validações. Não há afirmação de que o botão já esteja habilitado no Render.
