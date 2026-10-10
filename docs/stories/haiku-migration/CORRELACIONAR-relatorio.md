# "Correlacionar com dados clínicos" só quando ditado — todas as categorias e superfícies — relatório

Branch `feat/correlacionar-ditado` (base `feat/haiku-migration` `34829789`). Fonte: último item de
`DECISOES-LUIZ-2026-10-10.md`. Banco só leitura; sem push, deploy nem env. A Biblioteca do banco vai só como SQL-proposta.

## Escopo

Entra a **correlação clínica genérica**: "correlacionar com dados/achados/quadro/queixa/história clínica(os)", "…e
laboratoriais", "clínico-laboratorial", "correlacionar clinicamente", "correlação clínica", "a correlacionar com os demais
critérios clínicos". Uma regra só reconhece todas as formas: `CORRELACAO_CLINICA_RE` (`apps/api/src/server/pipeline/correlacaoClinica.ts`).

Fica fora, porque não é "correlacionar com dados clínicos":
- condutas específicas ("correlacionar com as dosagens de TSH / cálcio e PTH / PSA / FSH e LH", "marcadores tumorais",
  "avaliação urológica");
- a correlação obstétrica com a US precoce ou a DUM;
- o rótulo "Correlação clínica: <contexto ditado>" da pelve.

Quando a correlação é **escolha do médico**, ela conta como ditada e fica:
- web: painel de Recomendações e as recomendações opcionais confirmadas da histerossonografia e da HyCoSy;
- tórax (shared, mobile, iOS): o campo "Sugerir correlação clínica" que o médico liga.

## Histórico — gerados × finais (365 dias, 3963 laudos, `correlacionar-historico.ts`, sem LLM)

| Categoria | Gerado com a frase | … com final | Ditado pedia | Final com a frase | Gerado sem pedido | Final manteve sem pedido |
|---|---|---|---|---|---|---|
| CERVICAL | 12 | 0 | 0 | 0 | 12 | 0 |
| PARTES_MOLES | 7 | 1 | 0 | 1 | 7 | 1 |
| DOPPLER_RENAL | 5 | 0 | 0 | 0 | 5 | 0 |
| PROSTATA_SUPRAPUBICA | 4 | 2 | 0 | 0 | 4 | 0 |
| DOPPLER_VENOSO_MMII (+ _MEDIDAS) | 3 | 0 | 0 | 0 | 3 | 0 |
| MORFOLOGICO | 2 | 1 | 2 | 0 | 0 | 0 |
| MUSCULOESQUELETICO_V2 | 1 | 1 | 1 | 0 | 0 | 0 |
| ABDOMEN_TOTAL | 0 | 0 | 0 | 1 | 0 | 0 |
| VIAS_URINARIAS | 0 | 0 | 1 | 0 | 0 | 0 |
| **Total** | **34** | **5** | **4** | **2** | **31** | **1** |

Formas no gerado: "correlação clínica" 15 (writers LLM: "Recomenda-se correlação clínica…"), "correlacionar com achados
clínicos" 11 (renderer cervical), "correlacionar com dados clínicos" 6 (renderer de partes moles), "correlacionado com o
contexto clínico" 2 (ditado). Leitura:
- **Sem pedido:** a frase é quase sempre do sistema (31 de 34). O médico manteve 1 vez sem pedir (0b2a0c38, já reescrita
  na redação dele) e escreveu por conta própria em 1 final de abdome.
- **Com pedido, perdida:** o renderer de vias perdeu uma correlação ditada (be6b466c, "Convém correlação com os dados
  clínicos e laboratoriais").
- **Com pedido, mantida:** no morfológico e no MSK a frase ditada saiu no gerado. Num caso de MSK o médico a reescreveu no
  final ("cuja relevância pode ser considerada de acordo com o contexto clínico e eletroneuromiográfico").

**O guard aplicado ao mesmo histórico** corrige 31/31 gerados sem pedido, restam 0 e garante a correlação ditada no caso
perdido. O guard só roda na geração, nunca em texto assinado; aplicado aos finais só como medida de falso positivo, ele
mudaria 3, todos com a correlação escrita pelo próprio médico (2 sem ditar, 1 removida por ele).

## O que mudou

| Superfície | Como |
|---|---|
| **Guard no `/api/generate`**: writer completo, writers dedicados e renderer, todas as categorias | `aplicarCorrelacaoDitada(texto, ditado)` no fim da cadeia universal (antes do léxico). **Não ditada → sai**: a frase só de conduta sai inteira, a cláusula colada ao achado ("…, a correlacionar clinicamente.") sai, e o item que esvazia sai com a conclusão renumerada. Se a correlação vem coordenada com outra conduta que o médico ditou ("Convém correlação … e complementar com avaliação X"), só a correlação sai. **Ditada e perdida → entra** na redação do médico, em parágrafo no fim da conclusão e antes de rodapés; não duplica quando a saída já traz a correlação, mesmo reescrita. Rollback sem deploy: `CORRELACAO_SO_DITADA=false`. A bancada (`bench-abdomen.ts`) espelha o guard. |
| Renderers da API | cervical (linfonodo suspeito, clássico e objetivo), vias (nódulo renal), abdome total (parede da vesícula). Partes moles já estava feito (A10). |
| Prompts | global enxuto: "Conduta, acompanhamento, recomendação ou 'correlacionar com dados clínicos' só quando o médico ditar"; contrato dos modelos clínicos (tórax). O bloco obstétrico já proibia. `PROMPT_VERSION` v1.15. Few-shots em código: nenhum tinha a frase. Os few-shots do writer completo vêm da Biblioteca (blocos tipo exemplo) e estão na SQL. |
| Web (`apps/web`) | 11 órgãos: partes moles (5), Doppler testicular (6, incluindo as hipóteses de torção, orquite, epididimite e orquiepididimite), escrotal (2), cervical, região inguinal, transplante renal (2), tireoidites (3), vesícula, próstata transretal, glândulas salivares (2), ocular. |
| Shared | artérias temporais (hipótese de arterite). |
| Biblioteca: snippets | `correlacionar-biblioteca.ts`, uma tabela curada de 34 trocas exatas: a correlação colada ao achado sai; a frase de recomendação isolada fica com "— só quando o médico ditar, na redação dele"; as linhas de regra do redator viram "só quando o médico ditar". 25 arquivos, idempotente, 0 sobras. |
| Biblioteca: banco | `CORRELACIONAR-biblioteca-proposta.sql` (+ `.json`): **74 de 1106 blocos validados**, mesma tabela, 0 sobras. **Não aplicada.** Guardas: um `DO` numa transação, cada UPDATE exige `id` + `status = 'validated'` + `md5(content)` lido hoje e confere `row_count = 1`, senão aborta tudo. **20 blocos também estão na proposta dos TERMOS**: aplicada uma, regenere a outra com `pnpm exec tsx scripts/bench-haiku/correlacionar-biblioteca.ts --sql` (relê o banco). |

## Testes

- **Guard**, `correlacaoClinica.manual.ts` 45/45, com positivos e negativos:
  - reconhece as formas genéricas e não as específicas;
  - tira frase, cláusula e item (renumera; item único sem número) e item com hífen (aed8b784);
  - mantém o rótulo da pelve e as condutas de TSH;
  - coordenada com conduta ditada (0b2a0c38): sai só a correlação;
  - ditada fica; ditada e perdida entra (be6b466c), inclusive antes de rodapé e só no 1º laudo;
  - reescrita pelo modelo (2117aad0) não duplica; idempotente.
- **Rota:** `generate-fail-closed` 41/41 (com o módulo real no harness).
- **Goldens:** cervical 28 e objetivo 32, vias 44 e objetivo 36, partes moles 47, matriz clínica do abdome — todos com
  a ausência da frase verificada.
- **Demais renderers:** 87 suítes passam. As que falham também falham na base `34829789` ou dependem de chave de API e
  de fixtures em `/tmp`.
- **Web:** 457 casos verdes, inclusive o teste novo da histerossonografia (sem a opção, nenhuma correlação; com a opção
  confirmada, "Correlacionar com dados clínicos." uma vez) e as negações no Doppler testicular e nas glândulas salivares.
- **Typecheck:** api, web e shared ✓.
- **Prompts:** morfológico 528 (obstetrícia byte a byte), `w14-revisao-global` 9.
- **Writers e guards:** writers dedicados, `writerOutputGuard` 17/17, `lexicoDaCasa` 99, `volumeGuard` 39.

## Para o Luiz / orquestrador

- Condutas específicas automáticas que continuam e **não são desta decisão**:
  - TSH/anticorpos na tireoide (renderer);
  - observação PSA/urológica da próstata transabdominal;
  - cálcio e PTH (paratireoide, web);
  - marcadores tumorais e avaliação urológica (escrotal, web e Biblioteca);
  - PSA (próstata transretal, web).

  Se a regra "só quando ditado" também valer para conduta específica, é uma rodada à parte.
- Doppler testicular na web: a hipótese de **torção** levava "Correlacionar com dados clínicos e avaliação urológica.". A
  frase saiu inteira; a avaliação urológica agora entra pelo painel de Recomendações.
- O guard vale para toda categoria, inclusive a obstétrica (a correlação com a US precoce não casa).
