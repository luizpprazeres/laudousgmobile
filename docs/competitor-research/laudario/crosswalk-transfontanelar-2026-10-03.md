# Cruzamento Laudário × LaudoUSG — Transfontanelar

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi verificado no monorepo, no cliente iOS e na documentação versionada.

## Síntese

`TRANSFONTANELA` está disponível na Web, Android/RN e iOS, mas usa entrada genérica por texto ou ditado nas três plataformas. Não existe contrato compartilhado, formulário clínico, renderer neonatal, esquema visual ou auditoria específica. A API normaliza a categoria e envia o conteúdo pelo writer genérico.

| Camada | Estado atual |
| --- | --- |
| Web | Categoria disponível; workspace genérico de “Achados do exame” |
| Android/RN | Categoria disponível; fluxo genérico de achados e laudo |
| iOS | Categoria disponível; fluxo genérico de achados e laudo |
| API | Normalização e writer genérico; sem renderer ou auditor neonatal |
| Banco | Código ativo no seed; sem contrato clínico versionado |
| Contrato compartilhado | Ausente |

O rótulo ainda diverge: “Transfontanela” no compartilhado, seed e clientes móveis; “Transfontanelar” no writer Web. O código `TRANSFONTANELA` deve ser preservado e o rótulo normalizado.

## Lacunas confirmadas

O LaudoUSG não registra de forma tipada dias de vida, idade gestacional ao nascer, qualidade técnica, estruturas avaliadas, sistema ventricular, medidas, Doppler, hemorragia, leucomalácia, malformações, espaços extra-axiais ou recomendações. O texto é a única fonte de verdade.

O extrator geral reconhece índice de Levene, mas nenhuma regra específica consome esse valor. Um padrão aceita número sem unidade e o trata como milímetro. A verificação genérica de lateralidade só procura palavras de lado no texto e não consegue provar que uma hemorragia manteve o lado correto quando outras estruturas bilaterais são descritas.

O glossário de reconhecimento de voz associa `TRANSFONTANELA` apenas ao grupo vascular; “Papile” está na lista global, mas o vocabulário neonatal não está organizado por categoria.

## O que aproveitar do concorrente

A divisão em dados etários, parênquima, linha média, ventrículos, Doppler, patologias e recomendações reduz omissões. O contrato do LaudoUSG deve aproveitar essa separação conceitual, com redação e regras próprias. Recomendações sugeridas precisam continuar separadas da decisão de publicá-las.

## O que deve ser melhor no LaudoUSG

O estado normal não deve coexistir com uma alteração da mesma estrutura. Hemorragia precisa guardar lado, topografia, componentes observados, extensão ventricular, repercussão e medidas, sem transformar um checkbox de grau em prova clínica. Ventriculomegalia deve separar descrição qualitativa, medidas, referência aplicável, idade e confirmação médica. Campo apagado ou achado desativado deve limpar derivados e impedir reaparecimento silencioso.

Limitação técnica deve suprimir normalidade das estruturas não avaliadas. Valores devem preservar unidade original e lado. O contrato precisa representar `não avaliado`, `avaliado normal`, `alterado` e `limitado` por estrutura.

## Contrato mínimo proposto

O primeiro contrato deve conter contexto neonatal; técnica e qualidade; parênquima por compartimento; linha média; ventrículos por lado e terceiro/quarto ventrículos; medidas com unidade e origem; Doppler opcional; hemorragia com achados componentes e classificação confirmada; substância branca; malformações; achados adicionais; comparação; recomendações sugeridas, confirmadas e publicadas; e confirmação final do médico.

Classificação de Papile ou outra escala adotada deve ser determinística a partir dos componentes aprovados e ainda exigir confirmação médica. O contrato não deve misturar escalas. As fontes e os critérios clínicos serão aprovados antes da implementação; o estudo do concorrente não é fonte médica.

## Ordem de implementação

Primeiro normalizar o rótulo e criar o contrato compartilhado dormente. Depois implementar validação e renderer com casos sintéticos normal, hemorragia unilateral, dilatação sem medida, medida unilateral, limitação técnica e remoção de achado. Em seguida, construir o formulário Web para aprovação de experiência. Android/RN e iOS devem consumir o mesmo contrato antes de qualquer ativação pública.

O modelo continuará no writer genérico até o novo caminho passar por revisão clínica. O gate de ativação deve ser conjunto, com Web, Android/RN, iOS e API fechados na mesma versão.

## Provas necessárias antes de ativar

São obrigatórios: normal completo e parcial; dias de vida e prematuridade; hemorragia unilateral e bilateral nos limites aprovados; alteração sem dados suficientes; supressão de normalidade contraditória; ventriculomegalia medida e não medida; unidade mm/cm; lado trocado; Doppler opcional; recomendação sugerida sem publicação; remoção de achado limpando derivados; serialização e retomada nos três clientes.

O caso funcional está em [cases/transfontanelar-2026-10-03.md](cases/transfontanelar-2026-10-03.md). O preflight técnico detalhado está em [audits/preflight-transfontanelar-2026-10-03.md](audits/preflight-transfontanelar-2026-10-03.md).
