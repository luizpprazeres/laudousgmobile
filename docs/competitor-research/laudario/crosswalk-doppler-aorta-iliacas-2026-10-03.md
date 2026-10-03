# Cruzamento Laudário × LaudoUSG — Doppler de aorta e artérias ilíacas

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi verificado no monorepo, no cliente iOS e na documentação versionada.

## Síntese

O exame está ausente como categoria própria na Web, no Android/RN, no iOS, na API, no seed do banco e nos contratos compartilhados. Hoje seus componentes aparecem de forma fragmentada em Abdome Total, Abdome com Doppler, Doppler renal e Doppler arterial de membros inferiores, sem uma fonte única.

O código canônico proposto é `DOPPLER_AORTA_ILIACAS`. Ele permanece apenas como proposta documental até aprovação clínica e técnica.

| Camada | Estado atual | Evidência |
| --- | --- | --- |
| Web | Categoria e formulário próprios ausentes | `apps/web/src/lib/writerCategories.ts:2-24`; `apps/web/src/components/laudar/categoryGroups.ts:55` |
| Android/RN | Categoria ausente | `apps/mobile/src/features/generate/categories.manual.ts:5-14` |
| iOS | Categoria ausente | `laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:3-43` |
| API | Sem normalização, renderer, writer ou auditoria próprios | `apps/api/src/server/pipeline/categoryNormalization.ts:75-76`; `apps/api/src/server/pipeline/categoryNormalization.ts:156-166` |
| Banco versionado | Sem código próprio | `packages/db/src/seeds/data.ts:58-128`; três migrações em `supabase/migrations/` verificadas |
| Contrato compartilhado | Ausente | `packages/shared/src/clinicalModels/contracts.ts:3-9`; o contrato abdominal vizinho está em `packages/shared/src/clinicalModels/contracts.ts:34-52` |

## Lacunas confirmadas

Não há contrato tipado para visibilidade e qualidade por segmento, parede, diâmetros com eixo e método, aorta suprarrenal e infrarrenal, relação com artérias renais, bifurcação, ilíacas comuns, internas e externas por lado, placas, trombo mural, dissecção, aneurisma, pseudoaneurisma, estenose, oclusão, circulação colateral, endoprótese ou comparação longitudinal.

Em Abdome Total, a aorta é apenas um órgão do exame e sua classificação como aneurismática ou ectasiada depende de palavras do ditado (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:553-554`). A checagem de sanidade lê o texto final e emite um aviso para medida compatível com aneurisma sem menção correspondente (`apps/api/src/server/pipeline/deterministicSanity.ts:103`), mas seu extrator só reconhece diâmetro aórtico com unidade explícita em milímetros; valores em centímetros não são lidos (`apps/api/src/server/pipeline/deterministicSanity/extractor.ts:383-389`). Isso não forma um exame vascular completo. No Doppler renal, a aorta serve apenas como referência de velocidade. No Doppler arterial de membros inferiores, o estudo começa na femoral comum e uma possível lesão ilíaca só é inferida indiretamente pelo padrão distal.

## Riscos inferidos

Sem código canônico, um ditado de aorta e ilíacas pode seguir para Abdome Total, Abdome com Doppler, Doppler renal, Doppler arterial de membros inferiores ou Laudo Livre. Cada destino preserva apenas parte do conteúdo e pode publicar normalidade de estruturas que não pertencem ao escopo realmente documentado.

Também existe risco de unidade: o aviso atual de Abdome Total não interpreta uma medida expressa em centímetros. Além disso, a presença da palavra “ectasia” silencia o aviso qualquer que seja o diâmetro (`apps/api/src/server/pipeline/deterministicSanity/extractor.ts:424-428`). Reconhecer centímetros e decidir se “ectasia” deve continuar suficiente são pendências clínicas do saneamento abdominal; nenhuma delas substitui o novo contrato vascular.

## O que aproveitar do concorrente

A organização por aorta, ilíaca direita, ilíaca esquerda, parâmetros, estado pós-EVAR e recomendações facilita a navegação. Morfologia, dimensão e hemodinâmica devem permanecer separadas. Medidas de origem, unidade, método e derivados precisam ficar visíveis. Recomendações sugeridas devem continuar separadas da decisão de publicá-las.

## O que deve ser melhor no LaudoUSG

Cada segmento deve admitir não avaliado, normal, alterado ou limitado. O formulário não deve declarar normalidade por padrão de segmentos não documentados. Medidas incompatíveis com a classificação escolhida criam pendência, em vez de coexistirem silenciosamente com uma conclusão normal.

Colo, relação com artérias renais, trombo, morfologia, endoleak, aliasing, estenose percentual, oclusão e sinais de urgência só entram quando informados ou confirmados. Estados incompatíveis devem ser mutuamente exclusivos e derivados devem ser apagados imediatamente quando a origem é removida.

## Contrato mínimo proposto

O contrato compartilhado deve conter contexto e indicação; técnica e qualidade global e por segmento; método, eixo e unidade das medidas; aorta por topografia; bifurcação; ilíacas comuns, internas e externas por lado; estado de parede e lúmen; medidas e velocidades de origem; morfologia e extensão de aneurisma; relação com artérias renais; trombo mural; dissecção; estenose e oclusão confirmadas; circulação colateral; módulo EVAR; comparação longitudinal; recomendações sugeridas, confirmadas e publicadas; e confirmação final do médico.

Conversões e razões devem ser determinísticas, preservar a unidade original e indicar quais medidas as originaram. A classificação precisa ser derivada por regras versionadas e ficar pendente quando faltarem eixo, unidade, segmento ou confirmação. Diagnósticos positivos e alertas de urgência exigem dados mínimos definidos por fonte própria.

## Fronteiras com outros modelos

Abdome Total continua descrevendo a aorta como parte do exame abdominal, com alerta de segurança para medidas relevantes. Doppler renal pode reutilizar um tipo compartilhado de medida aórtica como referência, sem herdar a interpretação do exame de aorta. Doppler arterial de membros inferiores começa nos vasos do membro e pode referenciar doença proximal, sem substituir a avaliação direta das ilíacas.

O novo contrato poderá ser composto a outros exames apenas de forma explícita. Não haverá roteamento por palavra aproximada nem herança silenciosa de frases normais.

## Ordem de implementação

Primeiro aprovar escopo, fontes clínicas e código canônico. Depois criar o contrato compartilhado dormente, a validação determinística e o renderer original. O formulário Web servirá para validar a experiência, mas Android/RN e iOS consumirão o mesmo contrato antes de qualquer ativação pública.

O formulário deve ser testado com normal completo e parcial, limitação por gases, unidades mm e cm, medida sem eixo, classificação incompatível, aneurisma confirmado, estenose com e sem dados suficientes, oclusão, lateralidade, estados mutuamente exclusivos, remoção de achado, EVAR e retomada serializada. A ativação pública deve ser simultânea nas três plataformas.

O caso funcional está em [cases/doppler-aorta-iliacas-2026-10-03.md](cases/doppler-aorta-iliacas-2026-10-03.md). O preflight técnico está em [audits/preflight-doppler-aorta-iliacas-2026-10-03.md](audits/preflight-doppler-aorta-iliacas-2026-10-03.md).
