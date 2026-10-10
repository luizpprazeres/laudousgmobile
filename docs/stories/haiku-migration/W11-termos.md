# W11 — Revisão de termos médicos e ultrassonográficos (NA FILA: começa depois da rodada W10)

Terminal: Claude Code Opus 5.5 (a definir) + subagente para a documentação do Deepgram. Branch: `feat/lexico-da-casa`.

## Pedido do Dr. Luiz (10/10/2026)

Melhorar a redação dos termos no **app** (voz; a web é pouco afetada). Exemplos dele:
- "hiperecogênico/hipoecogênico" → **hiperecoico/hipoecoico**; "anecóico" → **anecoico** (sem acento).
- Mama, quadrantes: **superolateral, inferolateral, superomedial, inferomedial** (saem "super lateral", "superior lateral"…).
- MSK: compartimentos do punho em **algarismo romano** (I, II, III…), "bursa subacromial-subdeltoidea", "tendinopatia",
  "metacarpofalangiana"; fígado: **segmentos I a VIII** em romano.
- Origem dupla: às vezes o **ditado** (Deepgram) erra, às vezes a **IA** escreve errado.
- **Deepgram: reler a documentação oficial antes de qualquer mudança** — agir com cautela.

## O que já existe (construir em cima, não duplicar)

- `apps/api/src/server/asr/medicalGlossary.ts` — keyterms por categoria, entregues aos apps pelo **servidor** em
  `/api/deepgram/token` (iOS e Android): mudar a lista **não exige nova versão dos apps**. Teto `KEYTERM_WORD_BUDGET = 137`
  palavras; flag `DEEPGRAM_KEYTERMS_ENABLED`.
- `asr/medicalTermCorrector.ts` (lista `CORRECTIONS`, via `transcriptNormalizer.ts`), `pipeline/asrClinical.ts`
  (`normalizeAsrClinical`, antes da extração), `pipeline/asrNormalize.ts`, `measureNormalizer`, `dictationSanitizer`.
- Regra da casa já escrita: `docs/estilo-casa-regras-gerais.md` §1 (vocabulário canônico).

## Solução proposta (a validar nesta frente)

1. **Medir antes, sem LLM**: minerar 90–180 dias de laudos (banco, só leitura) — (a) trocas que o médico fez entre o
   `generated_output` e o `final_output` (termo da IA → termo do médico); (b) erros do ditado (`raw_input`/transcrição
   consolidada) que chegam ao laudo. Sai uma tabela: termo canônico, variantes, origem (ASR × IA), categorias, frequência.
2. **Léxico da casa versionado em código** (uma fonte só): canônico + variantes + **escopo** (categorias e contexto) +
   camada (ditado / saída) + tipo (troca **segura** de grafia × troca **contextual**, ex.: "compartimento 4" → "IV" só
   no punho, "segmento 4" → "IV" só no fígado). Cada entrada com testes positivos **e negativos** (não tocar
   "isoecoico", "ecogenicidade", números de medida, BI-RADS/TI-RADS, horários do relógio na mama).
3. **Aplicação em camadas, cada uma com flag por categoria e rollback por env**:
   - ditado → correção determinística antes do LLM (estende `medicalTermCorrector`/`asrClinical`);
   - saída → normalizador pós-geração **só no caminho de voz** (`/api/generate` e edição), para o que a IA erra mesmo com
     o prompt certo (ex.: -ecogênico → -ecoico com gênero e número);
   - prompt → no máximo uma linha curta de léxico por categoria (o determinístico é preferível a encher o prompt);
   - Deepgram → ajuste dos keyterms por categoria a partir dos erros minerados, **dentro do orçamento** e só depois de
     reler a doc oficial (keyterm prompting do modelo em uso, limites, termos com várias palavras, pt-BR, interação com
     formatação de números). Algarismos romanos **não** são tarefa do ASR: ficam no normalizador contextual.
   - frases fixas dos renderers que usam "hiperecogênica" etc. afetam a web/Biblioteca: **proposta separada**, com GO do Luiz.
4. **Validação**: bancada sem LLM (aplicar o léxico aos `generated_output` históricos e comparar com o final: quantas
   trocas do médico o léxico teria evitado, e zero troca indevida); para o Deepgram, como não há áudio guardado,
   comparar transcrições antes × depois por categoria após ligar (métrica de termo), com flag para voltar.
5. **Decisões para o Luiz** que a mineração deve trazer prontas: "ecogênico" sozinho ("foco ecogênico", "conteúdo
   ecogênico") também vira "ecoico"?; grafia exata da bursa ("subacromial-subdeltoidea"?); lista final dos romanos.

## Entregável

Tabela de termos minerados, léxico + normalizadores com testes, proposta de keyterms com a doc do Deepgram citada,
relatório e status `status/W11.md`. Nada de push/deploy/env.
