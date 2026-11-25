# Integração Natal na homologação

Integra PR #5 na feature/gerenciador-temas sem substituir Color Studio, temas,
carrossel, miniaturas locais ou a galeria progressiva de 24 itens.

Conflitos resolvidos mantendo o frontend da homologação e acrescentando filtro
Natal, catálogo unificado e aviso de sincronização bloqueada no Render.
Neon: nenhum acesso remoto, migração ou mudança nos módulos de persistência.

Validação: 16 testes passaram (arts-sync, themes, color-studio,
neon-test-connection e performance-stats), além de verificações sintáticas.
O pacote Neon não estava disponível localmente e a instalação foi bloqueada
pela rede; a validação usou um interceptador temporário de importação que lança
erro se qualquer conexão Neon for solicitada. Portanto, não valida o transporte
real do Neon nem substitui a suíte PostgreSQL/PGlite ou uma validação no Render.
O teste HTTP agora inclui os módulos de temas e verifica /api/theme junto ao
catálogo de artes e às proteções de administração.

Persistência de artes continua pendente; botão bloqueado em homologação.
.env permanece fora do versionamento atual; rotação da credencial histórica
continua dependente de coordenação do proprietário.
