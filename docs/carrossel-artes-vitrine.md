# Fotos reais na vitrine de Caneca de Cerâmica

Substitui somente a ilustração do card Caneca de Cerâmica, preservando preço,
botão de compra, temas e carrossel principal da home. Usa a API unificada de artes:
as 195 originais mais as 59 de Natal salvas no Neon. Não altera o banco.

Embaralha cada categoria e alterna categorias sorteadas, percorrendo todas as
imagens uma vez antes de refazer o sorteio. Evita categorias consecutivas quando
a distribuição permite (incluindo as 254 atuais) e a repetição na virada de ciclo.
Categorias menores participam até esgotar suas imagens; a sequência continua com
as restantes. Novas artes entram na próxima carga do catálogo da página.

Uma foto é exibida por vez. Cloudinary usa tamanho reduzido e ajuste automático
de formato/qualidade; fotos completas usam object-fit contain. A lista de URLs
não cria centenas de elementos img nem baixa todo o catálogo antecipadamente.

Rotação de 4,5 segundos, anterior/próxima, pausa e gesto horizontal no celular.
Autoplay pausa ao passar o mouse, focar controles, ocultar a aba ou sair da tela;
movimento reduzido desativa autoplay mantendo as setas. Instância e eventos são
removidos ao filtrar/ordenar produtos. Falha na API mantém uma foto real local.

Validação: 3 testes passaram, cobrindo 100 sementes com 254 imagens, categorias,
IDs únicos, primeira rodada completa, virada de ciclo e entradas vazias/duplicadas.
Verificações sintáticas e git diff --check passaram. Conferir no deploy os
controles, a rotação e o retorno do card após busca/filtro.
