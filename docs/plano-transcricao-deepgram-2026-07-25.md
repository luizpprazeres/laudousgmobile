# Plano — revisão robusta das transcrições (Deepgram) para laudos

**25/07/2026.** As transcrições em tempo real estão com muitos erros que atrapalham a IA na redação. Objetivo: elevar muito a qualidade do ASR, com a ressalva de **jamais alterar número/lado/negação/medida sem sinalizar** (segurança clínica).

## 1. Sintomas relatados → causa provável → alavanca

| Sintoma (exemplos do Luiz) | Causa provável | Alavanca |
|---|---|---|
| Termos médicos errados: "bursa"→"bolsa", "subacromial", "subdeltoidea", "amniótico", "tendinopatia" | modelo genérico sem vocabulário médico; keywords fracas (Nova-2) | **Nova-3 + keyterm prompting** com glossário médico (até +625% em reconhecimento de entidades) |
| Datas: "02/03/2026" → "2 do 3 de 2020 e 6" | formatação de números falados em pt-BR fraca | `smart_format` + `numerals` + **pós-processamento determinístico de datas** |
| Medidas: "0.5 por 0.6 por 0.6" → deveria "0,5 x 0,6 x 0,6" | "por" não vira "x"; separador decimal | `measureNormalizer` (já faz "A por B"→"A x B" + cm/mm) — confirmar cobertura e ligar no caminho |
| Termos OMITIDOS, como se pausasse | **cliente descartando os últimos words de cada utterance** (lifecycle de streaming mal tratado) ou endpointing cortando | tratar `is_final`/`speech_final`/`UtteranceEnd` corretamente; `interim_results=true` + `utterance_end_ms` |
| Erros de digitação em termos médicos em geral | idem termos + falta de correção clínica pós-ASR | keyterm + camada `asrClinical` (glossário de correção) |

## 2. Fatos da documentação Deepgram (Nova-2 vs Nova-3)
- **Nova-3** tem WER menor (6,84% streaming vs 9,09% do Nova-2) e, crucialmente, **Keyterm Prompting** — injeta até ~100 termos de domínio (mais no multilíngue), com **até 625% de melhora no reconhecimento de entidades**. Nova-2 **não** tem keyterm (só `keywords`, inferior).
- **pt-BR é suportado no Nova-3** (mono `pt`/`pt-BR`, ou `multi` para code-switching). Keyterm multilíngue disponível.
- **nova-3-medical**: otimizado para vocabulário médico, mas **suporte a português NÃO confirmado** (provável só inglês por ora). ⚠️ Não migrar cegamente para `nova-3-medical` se forçar inglês — validar; senão usar `nova-3` (general) + keyterm médico em pt.
- **Termos omitidos (streaming):** doc é explícita — *"Skipping this step drops the final words of each utterance. Proper handling of lifecycle events is essential to prevent word loss."* UtteranceEnd exige `interim_results=true` e olha timings; `utterance_end_ms` < 1000 não ajuda (interims são ~1/s). Ruído de fundo pode impedir o `speech_final`.

Fontes: [Nova-2 vs Nova-3](https://deepgram.com/learn/model-comparison-when-to-use-nova-2-vs-nova-3-for-devs) · [Nova-3 + Portuguese](https://deepgram.com/learn/deepgram-expands-nova-3-with-spanish-french-and-portuguese-support) · [10 novos idiomas + keyterm multilíngue](https://deepgram.com/learn/deepgram-expands-nova-3-with-10-new-languages-and-multilingual-keyterm-prompting) · [UtteranceEnd](https://developers.deepgram.com/docs/utterance-end) · [Endpointing & Interim](https://developers.deepgram.com/docs/understand-endpointing-interim-results) · [Word loss / lifecycle](https://github.com/orgs/deepgram/discussions/798)

## 3. Estratégia em 4 camadas (defesa em profundidade)

1. **Modelo + config Deepgram:** migrar para **Nova-3**, `language=pt-BR` (ou `multi`), `smart_format=true`, `punctuate=true`, `numerals=true`, e streaming com `interim_results=true` + `utterance_end_ms` (~1000–1500) + `endpointing` calibrado.
2. **Glossário médico (keyterm):** lista curada de termos de US (bursa, subacromial, subdeltoidea, amniótico, tendinopatia, colédoco, pampiniforme, esteatose, anecoico, hiperecoico… + por especialidade). Passado via `keyterm`. Manutenível como dado (igual ao spec do writer).
3. **Streaming lifecycle no cliente:** garantir que NENHUM `final`/`speech_final` seja descartado; acumular corretamente interim→final; não cortar no endpointing durante pausas naturais do ditado. (Confirmar no código Swift/RN — mapeamento em curso.)
4. **Pós-processamento determinístico (seguro):** normalizar datas (dd/mm/aaaa), medidas ("A por B"→"A x B", cm/mm — `measureNormalizer`), e correção de garble clínico (`asrClinical`), **sempre preservando número/lado/negação** e sinalizando `[REVISAR]` na dúvida (nunca "consertar" às cegas).

## 4. Estado atual do código (mapeado 25/07)

**Há DOIS caminhos de ASR — um por plataforma:**
- **iOS (Swift):** Deepgram **Nova-3 streaming** (WS direto `wss://api.deepgram.com/v1/listen`). Params (montados no `DeepgramLiveService.swift`): `language=pt-BR, encoding=linear16, sample_rate=16000, interim_results=true, smart_format=true, punctuate=true, numerals=true, endpointing=300, keyterm=<cada termo>`. AUSENTES: `utterance_end_ms`, `vad_events`, `no_delay`. Backend só emite token + lista de keyterms (`/api/deepgram/token`).
- **RN/Android (Expo):** **Whisper `whisper-1` em batch** (`POST /api/transcribe`) — grava `.m4a` e envia inteiro. NÃO usa Deepgram (migração pendente, comentada no código).

**Glossário atual = só 24 keyterms (iOS) / ~40 no prompt Whisper — ambos focados em OBSTETRÍCIA/GO.** NÃO contêm "bursa", "subacromial", "subdeltoidea", "tendinopatia" nem "amniótico". → **Causa raiz confirmada dos erros de termo MSK/vascular.**

**Pós-processamento:** `measureNormalizer` (faz "A por B"→"A x B" ✓ e cm/mm ✓) e `dumValidation` rodam no **laudo final (pós-LLM)**, NÃO no transcript cru. `dictationSanitizer` idem. **Não existe** `asrClinical`/normalizador de datas. O transcript cru chega à IA sem correção (só o caminho Whisper tem `stripAsrHallucinations`).

**Termos omitidos (streaming iOS) — causas REAIS no `DeepgramLiveService.swift`:**
- `endpointing=300` corta em 300 ms de silêncio → **corte agressivo nas pausas naturais do ditado**.
- `maxPending=64` **dropa buffers de áudio** quando a fila enche / reconecta (perde áudio).
- Reconexão zera o interim pendente (`interimText=""`) → se cair antes do `is_final`, perde o trecho.
- `speech_final` é decodificado mas **não usado**; `stop()` não confirma o último interim.

## 5. Ações priorizadas (impacto × esforço)

**P0 — Glossário médico (ganho enorme, esforço baixo, seguro):** expandir os keyterms (iOS) e o prompt-glossário (Whisper) com MSK (bursa, subacromial, subdeltóidea, tendinopatia, supraespinal, calcária…), vascular (pampiniforme, safena, perfurante, colédoco), e termos gerais US. Reusar termos das snippets/estilo-casa. Manter como DADO editável. **Resolve o bursa/subacromial imediatamente.**

**P1 — Streaming lifecycle (resolve termos omitidos, esforço médio, CUIDADO):** trocar `endpointing=300` por endpointing maior + `utterance_end_ms` (~1000–1500) com `interim_results=true`; usar `speech_final`/`UtteranceEnd` para fechar segmento; confirmar o último interim no `stop()`; aumentar `maxPending` (buffer de áudio) para não dropar em pausas. Testar com ditado pausado real antes de ligar.

**P2 — Normalização determinística no TRANSCRIPT (pré-LLM):** aplicar medidas ("A por B"→"A x B", cm/mm) e um normalizador de DATAS ("dois do três de dois mil e vinte e seis"→"02/03/2026") já no transcript, **preservando número/lado/negação e sinalizando `[REVISAR]` na dúvida**. (Reusar `measureNormalizer`; criar normalizador de datas.)

**P3 — Whisper→Deepgram no Android:** migrar o RN para o mesmo streaming Nova-3 do iOS (paridade + qualidade). Maior esforço; fase separada.

## 6. Segurança (sinalizar ao Luiz)
A `DEEPGRAM_API_KEY` aparece em texto claro no `.env` local (gitignored, não está no git). Como apareceu num relatório, vale **rotacionar a chave** por precaução e confirmar que o `.env` nunca é commitado.

## 7. Execução
1. Definir o glossário inicial (P0) — Claude monta a lista a partir das snippets/estilo-casa.
2. Delegar ao **Dex1** a execução: P0 (glossário) + P1 (lifecycle Swift) + P2 (normalizadores), com a ressalva de **não introduzir regressão** e testar com ditados reais antes de ligar cada mudança.
3. Validar com áudios reais do Luiz nos casos que falham hoje (bursa, datas, medidas 3D, pausas).
