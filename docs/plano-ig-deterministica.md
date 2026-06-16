# Épico — Idade Gestacional determinística + 1ª US/DUM (planejado 2026-06-16)

Origem: briefing do Luiz (2026-06-16). Afeta **OBSTETRICA, DOPPLER_OBSTETRICO,
MORFOLOGICO**. Objetivo: tornar a IG da conclusão e os cálculos dependentes
(percentis Doppler) determinísticos, padronizados e fiéis à escola do Dr. Domingos.

## Princípio clínico (Dr. Domingos)
A **âncora é sempre a biometria atual** — não se terceiriza o dado mais
importante a um exame que não foi você que fez. A referência precoce
(US precoce **ou** DUM, o que o usuário escolher) só entra quando há divergência.

## Regra da IG na conclusão

**Clássico** (1 item):
| Situação | Saída |
|---|---|
| Biometria = referência | `Gestação em torno de 20 semanas e 3 dias.` |
| Divergência ≤ 5 dias | `Gestação em torno de 19 semanas e 6 dias.` (só biometria, sem referenciar) |
| Divergência > 5 dias | `Gestação em torno de 19 semanas e 6 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 20 semanas e 3 dias.` |

**Objetivo** (itens separados quando diverge):
```
1) Gestação em torno de 19 semanas e 6 dias pela biometria atual.
2) Gestação em torno de 20 semanas e 3 dias corrigido pela ultrassonografia precoce.
```
- "ultrassonografia precoce" → "data da última menstruação" conforme a fonte dada.
- Threshold ≤ 5 dias (CONFIRMAR se fixo ou por trimestre).

## Decisões (AskUserQuestion 2026-06-16)
- **Sinalização da correção:** toggle na conta (default de como o médico lauda) +
  override por comando de voz ("correlacione com a primeira US" / "corrija pela DUM").
- **Frase da 1ª US/DUM no laudo:** prosa combinada —
  `Primeira ultrassonografia realizada 12/01/2026 com 8 semanas e 2 dias. Hoje com 20 semanas e 3 dias.`

## Pontos-chave de implementação
1. **App passa DADOS estruturados, não frase pronta.** Hoje o app injeta a frase
   da 1ª US em português e a IA re-padroniza e erra/omite — pedir à IA refazer
   trabalho determinístico. Correção: campos tipados (data_1aUS, IG_na_data,
   data_hoje / DUM) → renderer monta a frase canônica. Quando o médico dita, o
   structurer extrai os mesmos campos. Convergem.
2. **Schema de achados obstétricos:** IG_biometria_atual; referência precoce
   {data, IG_naquela_data} OU DUM {data}; flag corrigir (toggle/voz).
3. **Cálculo determinístico:** corrige a IG de referência para hoje, compara com
   a biometria (faixas =, ≤5d, >5d), monta a frase do estilo ativo.
4. **Percentis Doppler usam a IG de referência** (precoce/DUM) quando existe,
   senão a biometria. Hoje o overlay Doppler já calcula IP médio uterinas +
   percentis de forma determinística — falta parametrizar qual IG alimenta.
5. **Botão "preencher calculadoras com os achados"** (peso fetal, percentil
   Doppler, IG, escores, RADS): reusa a extração tipada. Feature de UX. Médio.

## Visão de longo prazo — "fluxograma + agente" (reflexão Luiz)
O renderer determinístico É o começo do fluxograma: structurer (IA) = agente que
escuta e aponta o caminho; renderer (código) = fluxograma que percorre. Gaps para
o quadro completo:
1. Cobertura horizontal (migrar DOPPLER e demais do writer para o renderer).
2. Cobertura vertical / cauda longa (mapear patologias raras; writer como fallback).
3. **Fluxograma como dados, não código** — extrair as regras clínicas de dentro
   do TS para uma forma declarativa (tabela de decisão: condição → frase/ação/
   classificação), auditável e editável sem programar. A regra da IG é o 1º
   candidato. Vale pressure-test com o codex (Dex) antes de cravar a DSL.
