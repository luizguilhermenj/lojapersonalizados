# Artize Visual 2.0 — Medição local antes/depois

Comparação de `bb57b50` (etapa 1 já publicada) com o candidato final da etapa 6. Não mede o ganho isolado da etapa 1. São medições de laboratório em Chromium local; não representam Render, aparelhos físicos ou p75 de campo.

Condições: 390×844, escala1, touch/mobile, cache do navegador desabilitado, latência150ms, download200.000B/s (~1,6Mbps), upload75.000B/s, CPU4×. Três execuções por página/tema, contextos novos, imagens reais. Captura por 6,5s após DOMContentLoaded e, na galeria, seleção da segunda arte +500ms. Antes e depois rodaram sequencialmente com o mesmo script e servidor/dados sintéticos. Não houve pagamento.

Valores abaixo são medianas de três execuções. FCP/LCP e evento em ms. O evento é uma amostra de Event Timing, **não INP**; 0 significa ausência de evento registrado acima do limiar de16ms. A coluna de shifts é a soma dos layout-shift sem interação na janela observada; não constitui CLS p75 nem avaliação de sessões reais.

| Página/tema | FCP antes → depois | LCP antes → depois | Shifts antes → depois | Requisições antes → depois | Evento seleção antes → depois | Maior tarefa longa antes → depois |
|---|---:|---:|---:|---:|---:|---:|
| home/artize | 856 → 976 | 984 → 1016 | 0.377 → 0.000 | 27 → 20 | 0 → 0 | 114 → 125 |
| caneca-ceramica/artize | 1116 → 1004 | 1172 → 1032 | 0.000 → 0.000 | 209 → 33 | 208 → 48 | 466 → 60 |
| home/natal | 900 → 860 | 1888 → 888 | 0.206 → 0.000 | 28 → 21 | 0 → 0 | 116 → 104 |
| caneca-ceramica/natal | 1012 → 1004 | 1104 → 1024 | 0.000 → 0.000 | 209 → 33 | 312 → 64 | 252 → 72 |
| home/pascoa | 892 → 952 | 1728 → 960 | 0.206 → 0.000 | 28 → 21 | 0 → 0 | 137 → 157 |
| caneca-ceramica/pascoa | 960 → 1096 | 1028 → 1096 | 0.000 → 0.000 | 209 → 33 | 224 → 64 | 211 → 134 |

A galeria passou de195 para24 cards iniciais (−87,7%) e de209 para33 requisições neste cenário (−84,2%). No padrão, nós DOM passaram de1295 para275 (−78,8%). A seleção preserva a identidade dos nós, verificada por teste funcional independente. Não se afirma que as 195 artes sejam baixadas na versão atual; elas são paginadas e as imagens usam lazy/srcset.

Os originais totalizam149.660.340B e permanecem intactos. Derivados200px:1.201.446B;400px:3.595.698B;800px:12.072.322B. São tamanhos do conjunto completo, não tráfego por visita. O custo de armazenamento adicional é16.869.466B versionados no repositório, sem serviço pago.

Os JSONs registram requisições, respostas concluídas e bytes concluídos. Transferências pendentes/abortadas não entram nesses bytes; portanto não comparar esses valores como se fossem o peso completo de uma página. Algumas tarefas longas variaram bastante entre repetições (ver amostras), mostrando ruído do ambiente compartilhado. Não há estimativa de bateria, FPS, CPU/GPU ou heap em smartphone físico.

O LCP/FCP padrão não melhorou uniformemente; os ganhos mais claros estão na galeria, quantidade de pedidos de recursos, estabilidade dos banners e renderização dos heros sazonais. As metas LCP≤2,5s, INP≤200ms e CLS≤0,1 no p75 exigem RUM/tráfego real e validação posterior.

Reproduzir: `node scripts/measure-frontend.mjs --baseline` e depois `node scripts/measure-frontend.mjs`, sem executar outras suítes concorrentes. Playwright e Chromium são ferramentas do executor; não se adicionaram ao runtime da loja. `[before.json](before.json)` e `[after.json](after.json)` contêm todas as36 amostras.
