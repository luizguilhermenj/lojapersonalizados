# Persistência Neon — etapa suspensa

> Histórico do PR #2. A solicitação posterior de salvar/aplicar tem [documentação própria](color-studio-save-apply.md), com inspeção do banco pendente e migração dependente de autorização específica. As instruções de modo temporário abaixo descrevem a fase anterior.

A prioridade atual é exclusivamente o frontend. **Não criar novos projetos ou bancos Neon, não configurar `THEME_TEST_DATABASE_URL` e não executar a migração do Color Studio nesta fase.**

A ativação dos quatro temas mantém a persistência existente. No Neon/Render, paletas, cores e glow são experimentados em prévia temporária, com gravação desativada por padrão. A inicialização não adiciona a coluna `color_studio` automaticamente.

O código e os testes de persistência já implementados foram preservados para uma futura retomada do backend. O teste remoto continua inativo sem configuração explícita; sua execução não é requisito para a homologação visual e nenhuma conexão alternativa é utilizada.

Veja o [roteiro atual de homologação visual](color-studio-homologacao.md), que não exige novos recursos ou credenciais. A migração, permissões e persistência remota serão avaliadas novamente somente quando retomarmos essa etapa.
