# Glossário de keyterms médicos para o ASR (Deepgram Nova-3 + prompt Whisper)

**25/07/2026.** Expande os 24 keyterms atuais (só obstétricos). Termos que o ASR erra hoje ("bursa"→"bolsa", "subacromial", "tendinopatia", "amniótico"…) + os mais comuns por eixo. Fonte: snippets/estilo-casa + os erros relatados pelo Luiz.

> **Recomendação de design (elegante e mais preciso):** o app já sabe a CATEGORIA antes do médico ditar. Então o `/api/deepgram/token` deve receber a categoria e devolver **os keyterms daquela categoria** (transversais + específicos), em vez de uma lista global gigante — keyterm demais dilui. Limite Nova-3 ~100 termos; por categoria fica folgado e mais certeiro.

## Transversais (sempre)
anecoico, hipoecoico, hiperecoico, isoecoico, ecotextura, ecogenicidade, ecográfico, sombra acústica, Doppler colorido, transdutor, córtico-medular, parênquima

## MSK / Musculoesquelético (os que mais falham hoje)
bursa, subacromial, subdeltóidea, tendinopatia, tendíneo, supraespinal, supraespinhoso, infraespinal, subescapular, cabo longo do bíceps, calcária, entesófito, bursite, derrame articular, cisto de Baker, rotura, fibrilar, fáscia plantar, epicondilite, líquido sinovial

## Vascular / Doppler
pampiniforme, safena magna, safena parva, perfurante, refluxo, recanalização, incompetência, trombose, poplítea, femoral, tibial, fibular, panturrilha, carótida, vertebral, bulbo carotídeo, médio-intimal, anterógrado, retrógrado, fístula arteriovenosa, anastomose

## Abdome / Renal
colédoco, hepatopatia, esteatose, colelitíase, nefrolitíase, pielocalicial, seio renal, ateromatose, cálculo, microlitíase, cortical, hilar, esplênico, pancreático

## Escrotal
epidídimo, varicocele, hidrocele, microlitíase, Valsalva, testicular

## Obstétrico / GO (manter os atuais + reforço)
amniótico, oligoâmnio, polidrâmnio, translucência nucal, ducto venoso, artéria cerebral média, cisterna magna, osso nasal, Hadlock, Intergrowth, Gratacós, biometria, cefálico, incisura, pré-centralização, leiomioma, adenomiose, endometrioma, placenta, Grannum

## Tireoide / Cervical / Mama
TI-RADS, BI-RADS, O-RADS, istmo, tireoidite, Hashimoto, fibroadenoma, linfonodo, retroareolar, Robbins, parótida, submandibular

## Classificações e epônimos (números/siglas)
BI-RADS, TI-RADS, O-RADS, PI-RADS, FIGO, Bosniak, NASCET, Sarteschi, Papile

---

## Aplicação
- **iOS (Deepgram keyterm):** substituir a lista hardcoded em `apps/api/src/app/api/deepgram/token/route.ts` (KEYTERMS). Idealmente, `token/route.ts` recebe `?category=` e devolve transversais + os da categoria.
- **Android (Whisper prompt):** expandir o `MEDICAL_STYLE_PROMPT` em `apps/api/src/app/api/transcribe/route.ts` com os mesmos termos (o prompt do Whisper aceita glossário; cuidado com o limite de tamanho — priorizar transversais + categoria).
- Manter como DADO editável (mesma filosofia do spec do writer): dá para o médico adicionar termos próprios no futuro.
