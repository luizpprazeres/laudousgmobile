# Mamas com Doppler e Mamas e Axilas com Doppler: auditoria do lote 3

- Data: 05/10/2026. Base: `06c88cd` (worktree); main em `407362d`, sem diferença relevante para a mama desde `06c88cd`.
- Laudário: não observado (sem navegador). Só a existência no catálogo, linha 11 de `catalogo-ultrassonografia-2026-10-02.json` ("Mamas com Doppler" e "Mamas e Axilas com Doppler", grupo `mama`). O estudo de 02/10 de "Mamas e Axilas" registrou "fluxo interno" como descritor do nódulo e padrão Doppler hilar no linfonodo normal, mas no modelo sem Doppler; os modelos "com Doppler" não foram abertos. Nenhuma redação do concorrente foi usada.
- Escopo: só o Doppler e o efeito dele em título, técnica, corpo, conclusão e BI-RADS. O BI-RADS em si foi estudado em `crosswalk-mamas-e-axilas-2026-10-02.md` e não foi reestudado.
- Prova: `audits/probes/probe-mamas-doppler-2026-10-05.ts`, executada com `npx tsx` contra a main (estado no formato do `MamariaFormPanel`, `adaptarMamaria`, `renderizarSelecao("MAMARIA")`, `sugestoesBiradsMamaria` e `biradsRevisarNotes`). A saída foi lida integralmente.

## 1. Estado por plataforma

| Plataforma | Evidência | Classificação |
|---|---|---|
| Web (controle) | `doppler_mamario` (`nao`/`sim`, padrão `nao`) nos controles da categoria (`apps/web/src/lib/deterministic/organs/mamaria.ts:414-422`); repassado como `dopplerEnabled` (`LaudarWebExperience.tsx:1194`) | estruturado ativo |
| Web (achado) | Com Doppler ligado, cada achado com medidas mostra "Vascularização" (ausente / periférica / interna / periférica e interna) + detalhe livre (`apps/web/src/components/laudar/MamariaFormPanel.tsx:40`, `:374-382`); vale para nódulo, cistos, linfonodo intramamário, calcificações e achado não nodular (`mamariaParaCatalogo.ts:196-211`) | estruturado ativo |
| Web (axila) | Nenhum campo de Doppler no módulo axilar (`mamaria.ts:289-346`) | ausente (só texto livre) |
| Adaptador | `doppler_realizado` lido de `__opts` (`mamariaParaCatalogo.ts:331`, `:356`); `vascularizacao` atravessa mesmo com Doppler desligado (`:295-296`) | parcial |
| Renderer | `doppler_realizado` + `vascularizacao` (`apps/api/src/server/renderer/categories/MAMARIA.ts:75`, `:94-95`, `:123`); frase de técnica (`:451-470`, objetivo `:941`); frase de vascularização só com Doppler realizado (`:618-632`, `:790-793`); título **não** muda (`:445-449`); a conclusão e o BI-RADS não leem vascularização (`packages/shared/src/calculators/mamariaBirads.ts:7-14`) | estruturado ativo (modo) |
| API ditado | Extrator com `doppler_realizado` e `vascularizacao` (`MAMARIA.ts:239-240`, `:256-257`); dormente sem `RENDERER_CATEGORIES` → writer | estruturado dormente → writer |
| Android/RN | Card "Mamas e axilas" (`apps/mobile/src/ui/tokens.ts:156`); o seletor de Doppler existe só para `DOPPLER_OBSTETRICO` (`apps/mobile/app/generate.tsx:641-648`); atalhos de mama sem Doppler (`:1215-1219`) | genérico (ditado) |
| iOS | `.mamaria` sem atalho de Doppler (`Features/Generate/GenerateViewModel.swift:42-46`) | genérico (ditado) |
| Conhecimento | Nenhum snippet de Doppler em `packages/knowledge/snippets/MAMARIA/` | ausente |
| Códigos | Não existem `MAMARIA_DOPPLER` nem `MAMAS_DOPPLER` no código (busca em `apps/*/src`, `packages`, `supabase/migrations`) | — |

## 2. Inventário de controles (Doppler)

| Campo | Opções | Padrão inicial |
|---|---|---|
| `doppler_mamario` (categoria) | Não / Sim | Não |
| `achados.<id>.vascularizacao` | ausente / periferica / interna / mista | vazio (só visível com Doppler "Sim") |
| `achados.<id>.vascularizacao_descricao` | texto livre | vazio |
| `achados.<id>.lado` ao criar achado | direita / esquerda | **direita** (pré-marcado em `MamariaFormPanel.tsx:127`) |
| Doppler do linfonodo axilar, índice de resistividade, intensidade, "não avaliado ao Doppler" | **inexistentes** | n/a |

## 3. Provas (dados sintéticos)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência / guard | Veredito |
|---|---|---|---|---|---|
| D0 | Doppler "Sim", sem achados | técnica ganha "Foi realizado estudo complementar com Doppler colorido."; corpo normal sem menção ao Doppler | mamas normais BI-RADS 1 + axilas normais | nenhuma | `observado no LaudoUSG`: título igual ao sem Doppler; nada é inventado sobre vascularização |
| D1 | nódulo direito 14 × 10 × 8 mm, oval, circunscrito, paralelo, **vasc. interna**, BI-RADS 3 confirmado | nódulo + "Ao Doppler colorido, observa-se vascularização interna na imagem." | "Imagem sólida em mama direita… (BI-RADS 3)"; sem menção ao Doppler | nenhuma; sugestão continua "3"; guard vazio | `observado no LaudoUSG`: o Doppler **não reclassifica** sozinho (desejado); mas nenhum aviso ao médico de que vascularização interna é descritor associado a reavaliar |
| D1b | igual, sem BI-RADS confirmado | idem | sem categoria | guard (desligado por padrão) só anota `[REVISAR]` | `observado no LaudoUSG`: comportamento de BI-RADS já descrito no crosswalk de 02/10 |
| D2 | Doppler "Não" com `vascularizacao = interna` ainda no estado | sem frase de Doppler | igual a D1 | nenhuma | `observado no LaudoUSG`: o renderer filtra; o contrato ainda carrega `vascularizacao` (`inferido`: risco se outro caminho não respeitar a trava) |
| D3 | Doppler "Sim", nódulo **sem** vascularização preenchida | técnica afirma Doppler; nenhuma frase de vascularização | BI-RADS 3 | **nenhuma** | `defeito confirmado` (P1): o laudo declara que o Doppler foi feito e fica mudo sobre o achado principal |
| D4 | **cisto simples** direito com vasc. **interna**, BI-RADS 2 | "Imagem anecoica… margem circunscrita" + "vascularização interna" | "Cisto simples… (BI-RADS 2)" | **nenhuma**; sugestão "2" | `defeito confirmado` (P0): fluxo interno é incompatível com cisto simples, e o laudo publica as duas coisas com categoria benigna, sem aviso |
| D5 | Doppler "Sim" + linfonodo axilar esquerdo atípico, Doppler só no texto livre | "… na axila esquerda. com fluxo periférico ao Doppler" (pontuação quebrada) | "Linfonodos axilares de aspecto atípico (…)" | nenhuma | `defeito confirmado` (P1): Doppler axilar sem campo; texto livre colado sem tratamento |
| D6 | remoção: D1 e depois Doppler "Não" | frase de técnica e de vascularização somem | BI-RADS 3 mantido | nenhuma | `observado no LaudoUSG`: remoção limpa |
| D7 | "Somente mamas" + Doppler | título "ULTRASSONOGRAFIA DAS MAMAS"; técnica com Doppler | normal | nenhuma | `observado no LaudoUSG`: os dois cards do concorrente cabem nos escopos existentes |

## 4. Lacunas concretas (Web e paridade)

- **M1, P0, `defeito confirmado`.** Contradição tipo × Doppler sem aviso (D4). Cisto simples com fluxo interno deve abrir pendência bloqueante pedindo que o médico revise o tipo (cisto complicado / complexo sólido-cístico) ou a vascularização. O sistema **não** troca o tipo nem o BI-RADS.
- **M2, P1, `defeito confirmado`.** Doppler realizado sem vascularização registrada em achado focal (D3). Pendência por achado: "vascularização ao Doppler" ou "não avaliado ao Doppler".
- **M3, P1, `candidato a lacuna`.** Nenhum aviso quando a vascularização interna aparece em nódulo com BI-RADS 2 ou 3 confirmado (D1). Requisito: aviso não bloqueante que só pede confirmação; a categoria final continua do médico, e a sugestão automática continua sem ler Doppler.
- **M4, P1, `defeito confirmado`.** Doppler axilar sem campo (D5). Depende do contrato `LINFONODO_REGIONAL` (ver `axilas-2026-10-05.md` §5): `doppler` = hilar / periférico / misto / ausente.
- **M5, P1, `defeito confirmado` (código inequívoco).** Achado novo nasce com lado "direita" (`MamariaFormPanel.tsx:127`): um nódulo vascularizado à esquerda sai à direita se o médico não tocar no lado. Afeta todos os modos da mama; achado novo deve nascer sem lado, com pendência.
- **M6, P2, `candidato a lacuna`.** Título não menciona Doppler; em `CERVICAL` o título muda para "COM DOPPLER COLORIDO" (lote 2). Decidir uma regra única do produto (sugestão: título com Doppler quando realizado, igual aos demais exames).
- **M7, P2, `inferido`.** Paridade: Android e iOS não têm controle de Doppler para mama; o extrator tem, mas está dormente, e a base de conhecimento não tem frases de Doppler mamário. O writer decide sozinho.
- **M8, P2, `inferido`.** A frase de técnica com Doppler fica depois da frase de documentação fotográfica no clássico (`MAMARIA.ts:451-470`); revisar ordem com o Luiz.

## 5. Decisão: variante ou contrato?

**Decisão: (b) variante (modo) do contrato `MAMARIA`, sem código novo.** O renderer já tem `doppler_realizado`, a técnica, a frase por achado e a trava que impede vascularização sem Doppler. "Mamas com Doppler" = escopo `mamas` + Doppler "Sim"; "Mamas e Axilas com Doppler" = escopo `mamas_axilas` + Doppler "Sim". O seletor pode ganhar sinônimos de busca ("mamas com Doppler") que abrem `MAMARIA` com o Doppler ligado; um card derivado só se o Luiz quiser os dois títulos no seletor. O que muda no contrato: (1) `vascularizacao` ganha o valor `nao_avaliada`; (2) o achado ganha pendências Doppler (M1, M2); (3) o linfonodo axilar passa a usar `LINFONODO_REGIONAL.doppler`; (4) regra de título decidida em M6.

**Regra de BI-RADS (inegociável):** o Doppler nunca entra no cálculo nem na sugestão; apenas gera aviso para o médico reconsiderar a categoria que ele mesmo confirma.

## 6. Requisitos originais

### 6.1 Modelo normal com Doppler

| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
|---|---|---|---|
| Técnica | Doppler "Sim" | registrar que o estudo complementar com Doppler colorido foi realizado | sem item |
| Mamas sem achados | estado normal confirmado | sem frase vascular (não afirmar "vascularização normal" sem dado) | inalterada (BI-RADS conforme confirmado) |
| Axilas avaliadas | lado normal + Doppler "Sim" | padrão hilar só se o médico marcar | sem item próprio |

### 6.2 Biblioteca de alterações (efeito do Doppler)

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
|---|---|---|---|---|
| `vasc_ausente` | achado focal + Doppler "Sim" | sem fluxo detectável no achado | sem item | nenhuma |
| `vasc_periferica` | idem | fluxo predominantemente periférico | sem item | aviso leve em cisto simples |
| `vasc_interna` | idem | fluxo no interior do achado | sem item; BI-RADS não muda | **bloqueia** em cisto simples (M1); aviso em nódulo com BI-RADS 2/3 (M3) |
| `vasc_mista` | idem | periférico e interno | idem | idem |
| `vasc_nao_avaliada` | achado + Doppler "Sim" | declarar que o achado não foi avaliado ao Doppler (motivo opcional) | sem item | encerra a pendência M2 |
| `linfonodo_doppler` | linfonodo do contrato regional | padrão hilar / periférico / misto / ausente | entra na classificação confirmada do linfonodo | só com Doppler "Sim" |

### 6.3 Formulário Web

- Seções: as da `MAMARIA`, com o bloco "Doppler" dentro de cada achado e dentro de cada linfonodo.
- Estado inicial: Doppler "Não"; ao ligar, cada achado focal fica com vascularização **vazia** (pendente).
- Dependências: desligar o Doppler esconde e **não exporta** `vascularizacao` (o adaptador passa a zerar, além da trava do renderer); ligar não preenche nada.
- Pendências bloqueantes: achado focal com Doppler "Sim" e vascularização vazia; cisto simples com fluxo interno ou misto; achado novo sem lado.
- Avisos: fluxo interno em nódulo com BI-RADS 2 ou 3 confirmado; detalhe livre do Doppler que contradiga o enum escolhido.

### 6.4 Prompt mobile (extrator)

Extrair: `doppler_realizado` só com menção explícita ao Doppler; vascularização por achado, com o lado do achado; padrão do linfonodo axilar. Nunca presumir: ausência de fluxo quando o médico não falou; Doppler realizado por existir a palavra "vascularização" em outro contexto; mudança de BI-RADS por causa do fluxo.

### 6.5 Casos de aceitação sintéticos

1. Doppler "Sim", sem achados → técnica com Doppler; corpo sem frase vascular; BI-RADS 1 confirmado.
2. Nódulo direito oval, circunscrito, paralelo, fluxo interno, BI-RADS 3 confirmado → frase vascular no corpo; conclusão BI-RADS 3; aviso exibido, sem bloqueio.
3. Mesmo nódulo com Doppler "Sim" e vascularização vazia → pendência bloqueante.
4. Cisto simples com fluxo interno → pendência bloqueante pedindo revisão; nada é publicado como "cisto simples".
5. Doppler desligado depois de D2 → nenhuma frase vascular e `vascularizacao` ausente do contrato.
6. Linfonodo axilar esquerdo com padrão periférico → frase estruturada na axila esquerda, sem texto livre colado.
7. Achado novo sem tocar no lado → pendência "lado".
8. "Somente mamas" + Doppler → título de mamas (ou com Doppler, conforme M6) e nenhuma frase axilar.

## 7. Perguntas para a rodada no concorrente (não observado no concorrente)

1. "Mamas com Doppler" é um modelo separado ou uma opção? O título e a técnica mudam?
2. O Doppler aparece por lesão (nódulo, cisto) e por linfonodo? Quais categorias de fluxo? Há índice de resistividade?
3. Marcar fluxo interno altera o BI-RADS automático ou a recomendação?
4. Cisto simples com fluxo é aceito sem aviso?
5. O estado inicial afirma "sem fluxo anômalo" sem dado?

## 8. Ordem de implementação sugerida

1. P0: pendência bloqueante cisto simples × fluxo interno/misto (M1).
2. P1: achado novo sem lado pré-marcado (M5).
3. P1: pendência de vascularização com Doppler "Sim" e o valor `nao_avaliada` (M2); o adaptador zera `vascularizacao` com Doppler "Não".
4. P1: aviso não bloqueante de fluxo interno em BI-RADS 2/3 confirmado (M3), sem tocar na sugestão.
5. P1: Doppler do linfonodo axilar via `LINFONODO_REGIONAL` (M4, junto com `axilas-2026-10-05.md`).
6. P2: regra de título com Doppler (M6), ordem da técnica (M8), sinônimos no seletor e controle de Doppler no mobile/iOS (M7).
