# Backlog pós-Android — retomar SÓ depois do Android aprovado

> Registrado 2026-07-04. **Decisão do Luiz:** o foco agora é **exclusivamente o app Android**
> até ele estar aprovado/lançado na Play Store. Tudo abaixo continua planejado e será feito —
> **depois** do Android. Este arquivo garante que nada se perca.

## A. Laudos — writers das categorias sem corpus (corpus JÁ assinado 04/07)
O Dr. Luiz corrigiu/aprovou o corpus de 6 categorias (bootstrap). Falta transformá-los em
writers `writer_guarded` (receita MSK: prompt + roteiro + few-shots + fact-audit, flag OFF):
ESCROTAL, GLANDULAS_SALIVARES, DOPPLER_CAROTIDAS, DOPPLER_ARTERIAL_MMII (v2 aprovado),
CERVICAL, DOPPLER_VENOSO_MMII_MEDIDAS. Aplicar as **regras gerais** de
`docs/estilo-casa-regras-gerais.md` (ecoico≠ecogênico, processo expansivo≠neoplasia, conduta
"convém a critério clínico", título Doppler sem "COM", lateralidade individualizada).

## B. Laudos — free_slots nas estruturadas restantes
Propagar a camada flexível (corpo+conclusão livres) — validada na OBSTETRICA/DOPPLER (flag
FLEXIBLE_CONCLUSION, LIGADA em prod 04/07) — para **TIREOIDE, MAMARIA, ABDOMEN, PROSTATA**.
Mesmo mecanismo: 2 campos + 2 filtros de dedup + wire. (Task #14.)

## C. Laudos — gaps de boletim ainda abertos
- Sanity de IG (`OBST_IG_SANITY`) só cobre OBSTETRICA; estender ao **DOPPLER_OBSTETRICO**.
- Recorrentes do boletim 03/07: parser "IG pela DUM" com datas inválidas; alucinação de
  achados não ditados (osso nasal, ducto venoso trifásico); BCF `____` em branco; vazamento
  de comando na conclusão; reflexo corpo→conclusão (achado citado no corpo, omitido na conclusão).
- Proposta do Luiz: renomear o campo extraído "IG pela DUM" → "IG pela DUM/ultrassonografia
  precoce" (app iOS `ImageAnalysisService` + backend) — reduz alucinação de DUM fictícia.
- Cerclagem (cervicometria): aplicar o texto que o Luiz definiu (corpo + conclusão).
- Guard de volume elipsoide (ditado × calculado) — bônus do boletim 02/07.

## D. lab.laudousg.com — reconstruir a plataforma de observabilidade
Ficou disfuncional na saída do RAG para renderer/writer (build atual falha por env faltando).
Objetivo: **entender como o laudo é feito**. (a) remover tudo de RAG; (b) especificar as **regras
de cada categoria (writer) de forma visualizável**; (c) atualizar a infra. + Padronizar a
**ferramenta de corpus** (comando fixo no terminal → gera N laudos patológicos → Luiz corrige →
few-shots) como fluxo recorrente.

## E. /adm de volta ao novo laudoUSG.com
Incorporar do laudoUSG antigo (`~/laudousg/`, laudoUSG.com/adm): KPIs, acompanhamento,
financeiro, arquitetura, infraestrutura, design system. **NÃO** trazer geração de imagens /
módulo de estudo (fica separado).

## F. UX do app (iOS + Android) — decisões de produto do Luiz
- **[REVISAR] inline:** highlight por cor — ROXO = item faltando (placeholder); AMARELO =
  suspeita de inconsistência. Pop-up ao clicar em Editar com a mensagem por tipo de erro.
- **Sala do auxiliar:** sinal claro liberado/bloqueado (barra verde/vermelha ameno; toggle
  "pode copiar") — comunicação inequívoca para a auxiliar.

> Fonte detalhada: `docs/plano-acao-2026-07-04.md` (boletim 03/07 + itens de produto) e as
> memórias do projeto.
