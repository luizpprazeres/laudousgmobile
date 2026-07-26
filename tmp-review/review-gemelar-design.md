# Review dex1 — design gemelar determinístico em DOPPLER_OBSTETRICO

Veredito curto: o plano está na direção certa. Eu recomendo implementar o renderer gemelar primeiro recebendo `fetos[]`, com flag própria e golden do 9cb5204c, e tratar a Rota 2 como alvo de produto/extração depois. O maior risco não é renderizar o corpo gemelar; isso a OBSTETRICA já resolveu. O maior risco é modelar Doppler fetal como top-level e concluir "para os dois fetos" quando só um feto tem dado/alteração.

## 1. Extração: Rota 1 vs Rota 2

### Recomendação

Recomendo Rota 2 como arquitetura final, mas não como primeiro passo de backend.

Implementar primeiro:

1. Renderer gemelar determinístico que recebe `fetos[]` já estruturado.
2. Schema Doppler per-feto.
3. Golden manual do 9cb5204c.
4. Prompt Rota 1 melhorado só para destravar casos atuais.

Depois, em sessão separada:

1. UI Swift com input por feto.
2. API aceitando blocos por feto.
3. Extração N chamadas por feto + 1 bloco compartilhado.

### Por quê

Rota 1, uma chamada LLM parseando tudo, é aceitável como ponte porque o renderer só precisa de um contrato `fetos[]`. Mas ela continua frágil em ditado real: o modelo pode misturar IP da AU do Feto A com ACM do Feto B, ou jogar Doppler fetal em campos top-level. O próprio bug crítico nasceu desse tipo de colapso: DOPPLER_OBSTETRICO ainda usa `feto0()` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:178` a `:181` e depois renderiza só o primeiro feto em `renderClassico` (`:325` a `:354`).

Rota 2 é a rota clinicamente melhor porque reduz ambiguidade antes da IA: cada extração vê só um feto. Isso é especialmente importante em gemelar monocoriônica/diamniótica, onde um feto pode ter Doppler normal e o outro alterado. Também prepara trigemelar sem inventar heurística de texto.

Risco da Rota 2: é uma mudança de produto, não só backend. Exige UI, payload novo, compatibilidade com o fluxo atual de ditado/imagem e decisão sobre campos compartilhados. Se entrar junto com o renderer, fica difícil saber se uma falha veio do parser, da UI, do merge ou da redação.

## 2. Reuso da OBSTETRICA + Doppler por feto

### Faz sentido, com ressalvas

Reusar a lógica gemelar da OBSTETRICA faz sentido para:

- título gemelar;
- frase conjunta dos fetos;
- loop por feto;
- biometria por feto;
- peso médio e divergência ponderal via `calcPonderal`, que já está implementado em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:309` a `:319`;
- conclusão de divergência ponderal, já existente em `OBSTETRICA.ts:585` a `:595`.

Mas eu não copiaria `renderObstetricaClassico` inteiro para Doppler. O Doppler já tem fraseologia própria validada:

- peso em `g`, não `gramas`, em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:193` a `:200`;
- líquido "O maior bolsão vertical mede X cm" para feto único em `DOPPLER_OBSTETRICO.ts:202` a `:215`;
- placenta com sufixo "de acordo com a fase da gestação" em `DOPPLER_OBSTETRICO.ts:235` a `:244`;
- remoção da linha numérica de perfil no corpo em `DOPPLER_OBSTETRICO.ts:246` a `:253`.

Então a melhor implementação é extrair helpers gemelares pequenos da OBSTETRICA ou criar helpers locais no Doppler que espelhem a estrutura, mas preservem a fraseologia Doppler.

### Onde quebra se copiar literalmente

**ALTO — schema per-feto incompleto para Doppler alterado**

O plano cita adicionar ao `Feto`: `ip_umbilical`, `perc_umbilical`, `ip_acm`, `perc_acm`, `ducto_venoso_ip`, `ducto_venoso_qualitativo`. Isso ainda é pouco.

Em Doppler gemelar, também precisam ser per-feto:

- `rcp`;
- `umbilical_alterado`;
- `acm_alterado`;
- `pre_centralizacao`;
- `centralizacao`;
- possivelmente `restricao_crescimento`, se a conclusão de peso fetal usar Gratacós/PIG por feto.

Hoje esses campos são top-level em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:61` a `:71`. Em gemelar, top-level é seguro para uterinas/incisura/ectasia, mas não para AU/ACM/ducto/RCP/centralização/peso, que são fetais. Se ficar top-level, qualquer alteração de um feto pode contaminar a conclusão dos dois.

Correção concreta: criar `DopplerFetoSchema` estendendo o feto obstétrico com campos Doppler fetais e sobrescrever `fetos` no `DopplerObstetricoFindingsSchema`. Manter campos top-level atuais para feto único/backward-compat, mas no branch gemelar ler prioritariamente `fetos[i].*`.

**MÉDIO — FetoSchema/FETO_JSON da OBSTETRICA não estão exportados**

O schema base de feto está fechado dentro de `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:20` a `:36`, e o JSON schema fica em `:79` a `:114`. Para estender o feto sem duplicação feia, precisa exportar `FetoSchema` e `FETO_JSON`, ou criar no Doppler um schema próprio equivalente.

Correção concreta: prefiro exportar helpers/schema do feto na OBSTETRICA com cuidado, sem mudar required/properties da OBSTETRICA. Não adicionar campos Doppler no `FetoSchema` compartilhado da OBSTETRICA, porque isso contamina a extração obstétrica sem necessidade.

**ALTO — buildDopplerConclusionItems não serve sozinho para "para os dois fetos"**

O builder atual é feto-único. Ele lista vasos medidos em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/dopplerOverlay.ts:285` a `:309` e monta conclusão em `:320` a `:399`. Ele nem inclui ducto venoso na frase normal de IP. Se o gold exige "artérias uterinas, umbilical, ACM e ducto venoso para os dois fetos", reusar esse builder cru não basta.

Correção concreta: criar `buildGemelarDopplerConclusionItems(f)` no renderer Doppler. Ele deve:

- validar se AU/ACM/DV foram medidos para todos os fetos antes de dizer "para os dois fetos";
- se um feto tiver dado ausente, escrever por feto ou omitir a normalidade daquele vaso;
- se um feto tiver alteração, não emitir "para os dois fetos"; emitir item individualizado;
- manter uterinas como shared.

**ALTO — "para os dois fetos" só é seguro quando os dois têm dado normal**

Frases como "não há pré-centralização ou centralização para os dois fetos" e "perfil hemodinâmico normal para os dois fetos" são clinicamente perigosas se a ACM/RCP de um feto não foi medida. O código atual tem essa preocupação para feto único: `fraseNormalIP` só afirma vaso medido (`dopplerOverlay.ts:262` a `:309`) e `acmComprometida` bloqueia falsa normalidade (`:272` a `:283`).

Correção concreta: no branch gemelar, antes de emitir qualquer conclusão global, calcular por feto:

- `hasAU`;
- `hasACM`;
- `hasDV`;
- `rcp/perfil`;
- `acmComprometida`;
- flags de centralização.

Só usar "para os dois fetos" quando todos os fetos tiverem os dados necessários e todos estiverem normais. Caso contrário: "Feto A: ..." / "Feto B: ...".

**MÉDIO — líquido gemelar da OBSTETRICA não bate exatamente com o Doppler**

A OBSTETRICA já individualiza MBV em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:391` a `:408`, mas a frase sai como `Maior bolsão vertical de X cm (feto A) e Y cm (feto B).` O plano e as correções do Doppler apontam para algo mais canônico no Doppler: `O maior bolsão vertical do feto A mede X cm...`.

Correção concreta: criar `liquidoDopplerGemelar(f)`, usando `liquido_mbv_por_feto_cm[i]`, sem cair em ILA em gemelar. Se `numero_fetos >= 2` e `liquido_tipo === "ila"`, isso deve ser tratado como suspeito: converter para MBV só se houver array MBV; caso contrário, não inventar.

**MÉDIO — IG gemelar "datadas pelo maior feto" não sai da OBSTETRICA atual**

A OBSTETRICA troca o lead para `Gestação gemelar {corionicidade} em torno de...` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:539` a `:544`, mas não vi ali a frase "datadas pelo maior feto". Se o gold 9cb5204c exige esse sufixo, precisa ser explicitamente construído no branch Doppler gemelar.

Correção concreta: item 1 da conclusão gemelar Doppler deve ser próprio. Exemplo de regra: `Gestação gemelar {corionicidade} em torno de X semanas..., datadas pelo maior feto.` Só usar "maior feto" se essa é a doutrina aceita para o laudo; não inferir de peso quando a IG vem de referência precoce estruturada. A âncora de IG continua sendo a biometria/referência calculada por `computeIg`, não a maior medida isolada.

## 3. Gotchas específicos

### Byte-stability do feto único

Obrigatório manter `renderClassico` e `renderObjetivo` de feto único byte-idênticos.

Pontos de risco:

- Alterar `DopplerObstetricoFindingsSchema` pode mudar a extração, mas não deve mudar render se `numero_fetos=1`.
- Alterar helpers compartilhados da OBSTETRICA pode mudar OBSTETRICA sem querer.
- Trocar `toDopplerData(f)` para ler per-feto pode mudar feto único se não fizer fallback top-level.

Correção concreta:

- Branch inicial no dispatcher: se `isGemelar(f)` e flag ligada, `renderGemelarDoppler`; senão manter exatamente `renderClassico/renderObjetivo`.
- Campos top-level continuam sendo fonte do feto único.
- Per-feto só entra no branch gemelar.
- Golden atual de feto único precisa rodar antes/depois e comparar saída completa.

### MBV por feto

`liquido_mbv_por_feto_cm` já existe no schema obstétrico em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:63` a `:66`. Para gemelar Doppler, ele deve ser a única fonte de líquido individualizado.

Gotchas:

- Se houver dois fetos e só um MBV, não escrever "para os dois fetos".
- Se `liquido_tipo=ila` em gemelar, não usar ILA como conclusão gemelar.
- Se o ditado disser "maior bolsão do A 4,2 e B 3,8", o prompt deve preencher `[4.2, 3.8]` na ordem dos fetos.

### Conclusão gemelar e gold 9cb5204c

Eu mapearia o gold em 7 blocos, mas com validação de segurança antes de usar frases globais:

1. IG + gemelaridade/corionicidade/amnionicidade + regra "datadas pelo maior feto", se esse for o texto aceito do gold.
2. Líquido/MBV por feto.
3. Peso médio + divergência ponderal, ou "pesos concordantes" se <20%.
4. IP normal: uterinas shared + AU/ACM/DV fetal, com "para os dois fetos" só se ambos medidos/normais.
5. Incisuras uterinas: shared.
6. Pré-centralização/centralização: por feto; global só se ambos seguros.
7. Perfil hemodinâmico: por feto; global só se ambos seguros.

Não reutilizar cegamente `buildPesoFetalItems(toPesoFetalData(f))`, porque `toPesoFetalData` hoje só olha `f.fetos[0]` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:310` a `:318`. Em gemelar isso volta ao bug original, só que na conclusão de peso.

### Pós-processadores

Quando o renderer programático roda, o route cai no branch de renderer. O pós-processamento do writer para DOPPLER_OBSTETRICO (`correctDopplerConclusion`) está no branch não-renderer em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:939` a `:962`. Portanto o renderer gemelar precisa sair com conclusão final pronta. Não contar com o overlay para consertar depois.

### Flag

O plano cita `DOPPLER_GEMELAR`. Faz sentido, mas precisa cuidado com interação com `RENDERER_CATEGORIES`.

Sugestão:

- `RENDERER_CATEGORIES` controla se DOPPLER entra no renderer.
- `DOPPLER_GEMELAR` controla apenas o branch gemelar.
- Se `DOPPLER_GEMELAR=false` e `numero_fetos>=2`, manter o throw atual de `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:481` a `:488` para fallback writer.
- Se `DOPPLER_GEMELAR=true`, renderizar gemelar.

## 4. Ordem de implementação sugerida

1. Preparar schema sem tocar no feto único:
   - exportar ou duplicar base do `FetoSchema`;
   - criar `DopplerFetoSchema`;
   - sobrescrever `fetos` no schema Doppler;
   - manter top-level atual para backward-compat.

2. Criar helpers internos do Doppler:
   - `isGemelar(f)`;
   - `rotuloFeto`;
   - `dopplerDataForFeto(ft, f)` sem uterinas;
   - `buildDopplerFetalSection(ft, rotulo)`;
   - `liquidoDopplerGemelar`;
   - `pesoGemelarDoppler`, usando `calcPonderal`;
   - `buildGemelarDopplerConclusionItems`.

3. Implementar `renderGemelarDoppler(f, igCorrection)`:
   - título com `GEMELAR`;
   - lead de IG com corionicidade;
   - frase conjunta dos fetos;
   - loop por feto com BCF, biometria, peso e Doppler fetal;
   - peso médio/divergência;
   - placenta compartilhada;
   - MBV por feto;
   - artérias uterinas uma vez;
   - conclusão 1-7 do gold.

4. Dispatcher/flag:
   - em `renderDopplerObstetrico`, antes do throw gemelar, checar `DOPPLER_GEMELAR`.
   - flag off mantém throw/fallback writer.
   - flag on chama `renderGemelarDoppler`.

5. Golden:
   - manter golden atual feto único byte-idêntico.
   - manter teste do fallback gemelar com flag off.
   - adicionar gold 9cb5204c com flag on.
   - testar caso adversarial: Feto A com AU/ACM/DV, Feto B sem DV; conclusão não pode dizer "ducto venoso normal para os dois fetos".
   - testar caso adversarial: Feto A centralizado, Feto B normal; conclusão não pode dizer "não há centralização para os dois fetos".

6. Só depois ajustar prompt Rota 1:
   - instruir explicitamente que AU/ACM/DV/RCP/centralização são por feto;
   - uterinas/placenta/corionicidade/IG/líquido compartilhado ficam top-level;
   - se o texto não identificar qual feto, deixar null em vez de distribuir por palpite.

7. Depois fazer Rota 2:
   - app separa Feto A/Feto B;
   - backend roda extração por feto;
   - merge determinístico monta `fetos[] + shared`;
   - renderer não muda.

## Conclusão

A decisão de reaproveitar a OBSTETRICA é boa para estrutura, mas o Doppler gemelar precisa de schema fetal próprio e conclusão própria. O design mais seguro é: OBSTETRICA fornece o esqueleto gemelar e `calcPonderal`; DOPPLER_OBSTETRICO mantém sua fraseologia, seus guards de vaso medido e cria uma camada gemelar que nunca afirma normalidade global sem todos os dados por feto.
