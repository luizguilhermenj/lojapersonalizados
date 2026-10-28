# Home — Carrossel compacto Mobile First

Refinamento sobre `d433518`, na branch `feature/gerenciador-temas`. Um único componente substitui os dois banners alternados (padrão/sazonal), mantendo as quatro identidades e a prévia administrativa. Nenhuma alteração em APIs, persistência Neon, catálogo comercial, checkout, pagamentos ou dados operacionais.

## Antes e depois

| Resolução | Banner anterior | Carrossel novo | Redução |
|---|---:|---:|---:|
| 320×568 | 440px | 220px | 50% |
| 360×800 | 440px | 220px | 50% |
| 390×844 | 440px | 220px | 50% |
| 430×932 | 440px | 220px | 50% |
| 768×1024 | 440px | 320px | 27,3% |
| 1440×900 | 440px | 380px | 13,6% |

Dimensões externas reservadas por CSS, incluindo bordas e controles. Textos/CTA e indicadores cabem nas dimensões testadas; controles têm44×44px. Os passos de compra e espaçamentos de apoio foram compactados no mobile, sem remover busca, categorias, ordenação ou produtos.

Em390px, o primeiro card passou de1123,19px para819,16px na posição absoluta do documento:304,03px mais cedo. Em320px, de1244,06px para871,95px (372,11px mais cedo). Isso não significa que todos os produtos caibam na primeira tela de qualquer aparelho.

[Antes — 390×844](banner-mobile/antes-390.png) · [Depois — 390×844](banner-mobile/depois-390.png). A [matriz de geometria](banner-mobile/geometry.json) contém os24 cenários (4temas×6resoluções), com alturas e posição do primeiro produto antes/depois.

## Comportamento e conteúdo

- Três composições: canecas personalizadas, camisetas identificadas permanentemente como **Em breve**, presentes/coleções. Camisetas apontam somente ao catálogo, nunca a compra inexistente. Sem preços, descontos ou produtos inventados.
- Paletas do gerenciador, textos curtos por tema, formas e elementos decorativos próprios de Artize Padrão/Natal/Páscoa/Dia das Mães. Datas não ativam tema automaticamente.
- Swipe horizontal por Pointer Events; rolagem vertical e pinch-zoom preservados. Deslizar sobre um CTA não o aciona acidentalmente.
- Transição de400ms em transform. Indicadores, anterior/próximo, teclado, status anunciado somente nas mudanças manuais; slides inativos ficam inert/aria-hidden. Há um h1 permanente para a home, e títulos h2 por slide.
- Rotação de5500ms, com no máximo um timeout pendente. Interação/foco pausam até retomada explícita. Hover de mouse, aba oculta, página fora de vista e pagehide suspendem a rotação. Retomar funciona mesmo com o botão ainda focado no touch. prefers-reduced-motion elimina transição e rotação, mantendo navegação manual.
- Tema atualiza texto/decoração nos mesmos três nós; não recria carrossel, listeners ou timers simultâneos. AbortController/IntersectionObserver têm limpeza explícita. Pagehide/pageshow preservam o comportamento no cache de navegação.
- Primeiro SVG com prioridade alta no HTML; imagens das demais composições têm dimensões reservadas e só recebem src quando exibidas. Hierarquia visual mantém a primeira composição maior. Não há biblioteca nova ou loop JS por frame.

### Recursos visuais e direitos

Três SVGs vetoriais originais criados para este ajuste em `public/img/visual/hero-{caneca,camiseta,presentes}.svg`, totalizando1743bytes. São ilustrações, sem fotos, fontes ou serviços externos. Reutilizam-se as ilustrações sazonais locais já existentes no projeto.

## Arquivos

- `public/pages/home.html`: componente estático, três composições e controles.
- `public/css/hero-carousel.css`: dimensões, layout, transições e variantes por tema.
- `public/js/hero-carousel.js`: instância idempotente, gestos, acessibilidade e ciclo de vida.
- `public/js/hero-content.js`: conteúdo editorial e recursos por tema, sem dados comerciais.
- `public/js/{home,themes}.js`: integração com o componente; removidos os timers/handlers antigos.
- `public/css/{home,themes}.css`: apoio mobile e remoção do CSS dos banners anteriores.
- `test/hero-carousel.mjs`: comparação com snapshot d433518, gestos touch reais via CDP e ciclo de vida.
- `test/{browser,visual-home}.mjs`: atualização dos seletores/assertivas para o novo componente, preservando a regressão funcional e a altura exata.
- `scripts/sync-shell.mjs`: gera categorias iniciais da mesma fonte comercial, sem alterar seus dados.
- `test/home-loading.mjs`: resposta do catálogo retida nas seis larguras, posição exata antes/depois e zero shifts.
- `scripts/measure-frontend.mjs`: opções de baseline por SHA/home-only; CLS pela maior janela de shifts sem interação, em vez de apenas soma.

## Validação

`npm test`:5 aprovados/1 Neon real pulado por falta de THEME_TEST_DATABASE_URL. Suítes executadas: `node test/browser.mjs`, `node test/visual-accessibility.mjs`, `node test/visual-home.mjs`, `node test/visual-motion.mjs`, `node test/visual-shell.mjs`, `node test/hero-carousel.mjs`, `node test/home-loading.mjs`.

O teste novo percorre4temas×6resoluções×3slides; exige altura exata220/320/380, texto/CTA contidos, botões44px, produtos antecipados e indisponibilidade explícita das camisetas. Interação: rotação real em5,5s, gestos CDP touch horizontais/verticais, prevenção de clique após swipe, indicadores, teclado, foco, visibilidade, fora de tela, reduced motion, pagehide/pageshow, destruição/reinício e20trocas de tema com no máximo1timer pendente e identidade dos nós preservada. Nenhum erro JavaScript nas execuções aprovadas. Prévia autenticada isolada, ativação/restauração e reinício local continuam validados na regressão.

Falhas encontradas durante o desenvolvimento e resolvidas antes do commit: link da folha CSS inicialmente ausente; cancelamento indevido do gesto ao transferir captura implícita do elemento filho para o viewport. A altura e o swipe foram reexecutados sem remover assertivas ou tolerar o comportamento incorreto. A medição intermediária encontrou CLS0,328–0,340: categorias vazias cresciam após a API e o rodapé saía da primeira tela ao inserir produtos. Categorias iniciais agora são geradas da fonte comercial, e placeholders reservam a primeira linha sem preços/itens fictícios. A geometria exata com API atrasada foi testada em todas as resoluções. A regressão também identificou contraste transitório3,87:1 no CTA de Natal: fundo animava enquanto o texto mudava imediatamente. Removida a transição de cor do CTA, mantendo a transição400ms dos slides e a asserção4,5:1 sem tolerância.

## Medição local

Comparação do snapshot d433518 com o candidato deste commit, em Chromium390×844, cache do navegador desabilitado, CPU4×, latência150ms, download200.000B/s (~1,6Mbps) e upload75.000B/s. Três execuções por tema, observando6,5s após DOMContentLoaded (inclui a primeira rotação). Sem outras suítes concorrentes durante as medições.

Comandos: `node scripts/measure-frontend.mjs --baseline --baseline-ref=d433518 --home-only work/carousel-before.json` e `node scripts/measure-frontend.mjs --home-only work/carousel-after.json`.

Resultados detalhados e JSONs estão registrados junto ao commit. São amostras de laboratório, não metas p75 de campo, medições em aparelhos físicos ou evidência do desempenho do Render. CLS é a maior janela com gap<1s e duração<5s dentro desta amostra limitada; LCP é observado até o fim da captura. Não há pagamentos nesta medição.

## Homologação e limites

Destino: branch `feature/gerenciador-temas`, serviço `artize-homologacao`, PR#1. Push autorizado pode acionar Auto-Deploy; nenhum deploy manual, configuração Render ou merge na main. Publicação HTTP permanece não verificada quando o proxy bloqueia acesso (CONNECT403), sem interpretar isso como falha do serviço.

Validar também em aparelhos físicos/Safari/iOS/Firefox, inclusive gestos e zoom com tecnologias assistivas. Neon real não disponível nesta sessão; driver, rotas, proteção e persistência existentes não foram alterados. Os bloqueadores de segurança/integridade operacional já documentados na auditoria continuam fora do escopo deste ajuste.

### Resultados finais (medianas de três execuções)

| Tema | LCP antes → depois | CLS antes → depois | Transferência concluída antes → depois |
|---|---:|---:|---:|
| artize | 1036 → 900 ms | 0.000 → 0.000 | 69.2 → 87.0 KB |
| natal | 912 → 1108 ms | 0.000 → 0.000 | 72.3 → 90.1 KB |
| pascoa | 1716 → 928 ms | 0.000 → 0.000 | 73.1 → 90.9 KB |
| dia-das-maes | 1052 → 856 ms | 0.000 → 0.000 | 71.1 → 88.9 KB |

[Amostras anteriores](banner-mobile/before.json) · [Amostras finais](banner-mobile/after.json). O carrossel acrescenta cerca de18KB de transferência no cenário observado. O LCP de Natal ficou196ms maior nesta pequena amostra; não há ganho uniforme nem garantia de p75. CLS final zero nas12 amostras, inclusive primeira rotação. Medição intermediária com CLS0,328–0,340 foi rejeitada e corrigida antes de publicar.

A suíte final completa passou após as correções: npm test (5 aprovados/1 Neon real pulado), browser, visual-accessibility, visual-home, home-loading, visual-motion, visual-shell e hero-carousel. Nenhum teste ficou em execução. Os registros de SHA no after.json indicam a base d433518 e workingTree=true: o candidato medido corresponde ao frontend deste commit.
