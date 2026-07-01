# Plano de ação — Boletins 21/23/28-jun (consolidado)

> Gerado 2026-06-29 a partir dos boletins `quality_bulletins` de 21/06 (`9790b7e6`),
> 23/06 (`f9fa3033`) e 28/06 (`f9c81b08`) + briefing por voz do Luiz + auditoria do
> código (`apps/api`) e dos laudos reais no banco MOBILE (`yldtkqrsbgcnwlydrrot`).

---

## Parte 0 — Como os dados funcionam (o boletim está CERTO)

> Correção de uma premissa errada da 1ª versão deste plano. Verificado no código.

- **`generated_output` = a saída REAL da IA** (já depois dos guards automáticos do
  `route.ts`). É o que é transmitido ao app no evento `done` e o que você vê primeiro.
  Gravado em `generate/route.ts:999/1045` (`generatedOutput: finalText`).
- **`final_output` = a SUA correção manual salva** (null se você não salvou edição). O
  servidor nunca grava `final_output`; ele só aparece quando o cliente salva a edição.
  `me/analytics/route.ts:44` mede exatamente `final_output <> generated_output` = taxa
  de edição manual.

**Logo: o boletim lê `generated_output` → mede a IA CORRETAMENTE.** Os defeitos que ele
acha são reais — você os conserta à mão **toda vez**, antes de entregar. Não é
falso-positivo; é retrabalho seu que o sistema deveria eliminar.

### Os 3 casos confirmam isso (IA errou → VOCÊ corrigiu à mão)

| Caso | IA produziu (`generated_output`) | Você corrigiu p/ (`final_output`) |
|---|---|---|
| `d213131b` (28/06, RCF) | "Gestação 24s6d" (re-datou, sem Domingos) | "24s6d **pela biometria atual, devendo ser corrigida pela US precoce compatível com 26s6d**" |
| `51367e7c` (28/06) | "CCN de **____** mm" | "CCN de **31,5 mm**" |
| `2ec3effd` (21/06) | "DUM: **32/06/0000**" | linha removida |
| `ec3ee06c` (23/06) | golf ball + recomendação **dropados** | achado + recomendação restaurados |

### Tamanho do problema (dado, últimos 30 dias)
2.374 laudos; 199 com `final_output` salvo; desses **99,5% foram editados**. (`final_output`
só é populado numa fração dos fluxos — onde existe, é quase sempre correção sua.) Cada
defeito da lista abaixo = retrabalho manual recorrente.

### Ação P0 — minerar suas correções para priorizar
Em vez de "consertar o boletim" (ele está certo), usar os **diffs `generated_output` →
`final_output`** dos laudos editados para **rankear os defeitos que você mais corrige** e
atacar por frequência. Ajustes finos opcionais no boletim (NÃO trocar a coluna):
1. Reenquadrar "fallback gpt-4.1-mini": o modelo é **sempre gpt-4.1-mini**; "renderer/v1
   vs LLM" não é defeito por si — Doppler legitimamente ainda não tem renderer (ver P1).
2. Opcional: deduplicar regenerações (o "41s 3×") na contagem.
3. Opcional (aditivo): cruzar com `final_output` quando existir para o boletim **aprender
   com suas correções** (não para esconder defeito — para extrair padrão).

---

## Parte 1 — Defeitos REAIS (sobrevivem no `final_output`, precisam de código)

### P1.A — DOPPLER_OBSTETRICO não tem renderer determinístico  *(raiz sistêmica)*
Confirmado: `DOPPLER_OBSTETRICO` não está em `RENDERER_PROGRAMMATIC_CATEGORIES`
(`extraction.ts`), não tem extractor, e cai **sempre** no writer LLM + remendo
`correctDopplerConclusion` (`route.ts:922-925`, `dopplerOverlay.ts`).
- É a raiz de: latência 13–36s (boletins 23 e 28), cabeçalho com `____`, âncora de IG
  errada (`b8f67ca5` usou 41 da referência em vez de 38s4d da biometria) e dos
  `final_output = NULL` (o remendo às vezes falha/não persiste).
- **Ação:** construir o renderer programático de `DOPPLER_OBSTETRICO` (espelhar
  OBSTETRICA/MORFOLOGICO), chamando `computeIg()` (Domingos, `ig.ts`) na conclusão.
  Isso entrega de uma vez: âncora correta, correção automática >5d, fim dos placeholders,
  latência baixa. **Maior alavanca do conjunto.**

### P1.B — Golf Ball (foco ecogênico intracardíaco): achado + conduta DROPADOS
`ec3ee06c` (23/06, MORFOLOGICO): médico ditou o foco + recomendação de ecocardiografia;
o `generated_output` **dropou** o achado do corpo e a recomendação da conclusão (só
sobreviveu no `final_output` porque o Luiz **corrigiu à mão**). Não existe snippet de
golf ball no `packages/knowledge` (grep vazio). **Risco de segurança: falha de seguimento.**

**Frase-padrão a oficializar** (extraída da correção manual do Luiz), aplicável a
**OBSTETRICA, DOPPLER_OBSTETRICO e MORFOLOGICO** — disparar quando o ditado mencionar
"golf ball" / "foco ecogênico intracardíaco":
- **Corpo (ACHADOS):** `Imagem hiperecoica puntiforme no ventrículo {esquerdo|direito}, medindo {medida ditada} cm no seu maior eixo.`
- **Conclusão (item próprio):** `Foco ecogênico intracardíaco no ventrículo {esquerdo|direito} de aspecto inespecífico (Golf Ball). Convém, a critério clínico, realizar ecocardiografia fetal em torno de 28 semanas de idade gestacional com o objetivo de acompanhar a evolução.`
- Preservar lateralidade/câmara e a medida ditadas; não inventar medida se não houver.

### P1.C — Medidas/achados ditados que o template DROPA
- **Placenta na obstétrica inicial** (`51367e7c`): "Placenta posterior com ecotextura
  homogênea" ditada, **ausente no `final_output`** (template/esquema da obstétrica inicial
  não tem slot de placenta). Defeito ENTREGUE.
- Generalizar a doutrina "nunca dropar o inusitado" (memória [[arquitetura-ux-modelo]]):
  conteúdo clínico ditado que não cabe no schema strict precisa de um caminho de
  preservação (camada generativa/flex), não ser silenciosamente descartado.

### P1.D — Rótulo do líquido fiel ao ditado (bolsão ≠ ILA)  *(recorrente)*
`8db914c1` (23/06) e casos de 28/06: médico ditou "maior bolsão vertical 6,1" →
`final_output` imprimiu "**Índice do líquido amniótico** de 6,1 cm". `amnioticMeasureGuard`
não pega porque 6,1 é válido p/ ambos (MBV 2–8 e ILA 5–25) — ele reclassifica por VALOR,
mas aqui o erro é o RÓTULO.
- **Ação:** preservar o **tipo ditado** (se o raw diz "bolsão" → rótulo "maior bolsão
  vertical", nunca "índice/ILA"; e vice-versa), independentemente do valor.
- **NÃO é bug** ter os DOIS no corpo (ILA + MBV) com a conclusão dizendo só "líquido
  normal" — isso é permitido (esclarecimento do Luiz). Só o rótulo trocado é defeito.

### P1.E — IG pela DUM (semanas/dias) nunca pode virar "DUM: dd/mm/aaaa"
`2ec3effd` ("DUM: 32/06/0000") e `8db914c1` ("DUM: 21s2d"): o renderer sintetiza uma
linha de DUM-data a partir da IG-em-semanas. Hoje um guard remove a linha no
`final_output`, mas a raiz continua no renderer (frágil).
- **Ação:** renderer só emite "DUM: <data>" se uma **data de calendário** foi ditada;
  "IG pela DUM: Xs Yd" é **IG de referência em semanas/dias**, não data. + validador de
  sanidade de datas (rejeitar mês>12, dia>31, ano 0000). + teste de regressão.
- **Extração/plataforma:** o app injeta "IG pela DUM" mas o Luiz muitas vezes quer dizer
  "pela US precoce". Renomear o rótulo extraído para **"IG DUM/US precoce"** e nunca
  assumir data real de DUM a partir desse campo.

---

## Parte 2 — Comandos: o "divisor de águas"

O médico mistura achados determinísticos com **comandos direcionados** ("antes da
conclusão acrescente X", "no final da conclusão acrescente a frase Y", "no lugar de X
escreva Y", "correlacione com US precoce"). Hoje `commandGuard` usa regex greedy +
heurística de 60% de overlap → frágil. Falhas reais:
- `b8f67ca5`: "Acione na conclusão com a ultrassonografia precoce" → virou item lixo
  "**Com a ultrassonografia precoce.**".
- 23/06 (próstata, pelve): "**no lugar de… escreva…**" impresso literal na conclusão.
- ASR: "**correlacionar**" sai como "**acionar/acione**" → comando não reconhecido.

### P2.A — Parser de meta-comandos robusto (tático)
- Cobrir: substituição ("no lugar de X escreva/coloque Y"), "escreva/escreve",
  "correlacione/correlacionar" (+ fuzzy "acionar/acione" quando perto de "US precoce" /
  "ultrassonografia precoce" / "DUM"), "antes/depois da conclusão acrescente".
- Guard que **remove meta-imperativo residual** da conclusão em **TODAS** as categorias
  (hoje `filterFreeConclusionItems` é só OBSTETRICA).
- Não emitir "Primeira USG: ____ semanas" quando a 1ª US não foi ditada em prosa.

### P2.B — Correlação automática de IG (regra Domingos), confirmada
A regra do Luiz: **padrão = biometria atual**; se houver US precoce OU DUM registrada e
divergência **≥5 dias**, emitir **automaticamente** "X pela biometria atual, devendo ser
corrigida pela {fonte}, compatível com Y" — sem precisar de comando.
- **Já funciona no caminho renderer** (provado em `2ec3effd` e no `final_output` de
  `d213131b`). O gap é (1) o Doppler (resolve com P1.A) e (2) robustez quando a geração
  aborta. Não reescrever o que já está certo; **estender ao Doppler**.

### P2.C — Interpretador de comandos híbrido (estratégico — discutir com dex1)
Visão de longo prazo (memória [[arquitetura-ux-modelo]]): núcleo determinístico + **uma
passada estruturada** que classifica cada segmento do ditado como **achado / comando /
ruído** e emite `ReportOperation[]` posicionais determinísticas (insert-before-conclusão,
insert-after-item-N, substitute, append-conclusão), corrigindo typos de ASR mas mantendo
a intenção literal — o comportamento "tipo ChatGPT" que o Luiz quer.
- **Ação:** spike de design + **review adversarial com dex1** (processo [[medmaestri-dex-delegation]]).

---

## Parte 3 — Sanidade e normalização

### P3.A — Sanidade de BCF
`8db914c1`: "BCF = 41 bpm" impresso junto a "movimentos fetais ativos" sem alerta.
`measureSanity` não cobre frequência cardíaca. **Ação:** range de BCF (ex.: <90 ou >200 →
`[REVISAR]`).

### P3.B — Dicionário de normalização de termos
- "encefálica" não está no mapa `apresentacaoFmt` (OBSTETRICA.ts) → não vira "cefálica".
- "DUM: null" literal nunca pode aparecer (garantir omissão quando null).
- Centralizar um dicionário de sinonímia/normalização (hoje cada categoria reinventa o seu).

---

## Não-bugs (NÃO mexer)
- **"Fallback gpt-4.1-mini"**: o modelo é sempre gpt-4.1-mini; não há Groq/llama. Reenquadrar no boletim.
- **ILA + MBV no mesmo corpo**: permitido (conclusão diz só "líquido normal"). Só o rótulo trocado é defeito.

---

## Parte 4 — Aprender com as correções do Luiz (loop de melhoria contínua)

O par `generated_output` (IA) → `final_output` (correção manual do Luiz) é **sinal
supervisionado de graça**: para cada laudo editado, sabemos exatamente o que a IA errou e
qual a forma certa. Hoje só 1 usuário (o Luiz) salva `final_output`, e só quando edita —
**226 pares de correção** acumulados. Plano para fechar o loop:

1. **Arquivo vivo de correções** (`docs/aprendizado-correcoes-luiz.md`, referenciado no
   README): corpus curado das correções do Luiz, ranqueado por frequência, com a frase
   canônica certa de cada padrão recorrente (golf ball, correção de IG, rótulo de líquido…).
   Atualizado periodicamente pela mineração `generated`→`final`. É a "memória infinita".
2. **Persistir `final_output` em TODA entrega** (mesmo sem mudança). Hoje ele só é gravado
   quando há edição → não dá pra distinguir "não precisou de correção" de "não salvou".
   Com isso: `final == generated` = **correto**; `final ≠ generated` = **precisou revisão**;
   `final null` = não entregue. Habilita a métrica que o Luiz quer sem marcação manual.
3. **Analytics de qualidade** (`me/analytics`): classificar cada laudo entregue como
   *correto* vs *precisou de revisão* a partir do diff; somar o `user_feedback` como sinal
   lógico (feedback negativo → conta como precisou-revisão mesmo sem edição salva).
4. **Boletim aprende com as correções**: addendum no prompt da automação diária para, além
   de analisar `generated_output`, cruzar com `final_output` quando existir e
   **contabilizar/extrair os padrões de correção** (o Luiz enviará o prompt atual da
   automação para colar esse adendo).
5. **Pipeline de promoção**: padrão recorrente detectado na mineração → vira snippet/guard
   determinístico → **sai da lista de correção manual**. Cada item promovido reduz seu
   retrabalho de forma permanente. É assim que o sistema "passa a fazer sozinho".

> Caveat de dado: a métrica de "% correto" só fica confiável depois do item 2 (persistir
> sempre). Hoje só temos o numerador (correções), não o denominador (entregas limpas).

## Ranking da mineração (226 correções suas — feito 2026-06-29)
Corpus completo + frases canônicas em **`docs/aprendizado-correcoes-luiz.md`**. Top tipos
(multi-rótulo, ~/226): ESTRUTURA_SECAO 29% · PLACEHOLDER 18% · COMANDO_NÃO_EXECUTADO 18% ·
MEDIDA_RESTAURADA 15% · TERMO 15% · ESTILO 15% · IG_DOMINGOS 14% · ACHADO_DROPADO 10% ·
ALUCINAÇÃO 9% · DATA_DUM 8% · LÍQUIDO 8% · IMPLAUSÍVEL 6%. **Os 6 do topo são quase todos
mecânicos/determinísticos** (template/guard, não "inteligência"). Confirma a fila P1/P2/P3.
Camada de segurança (menor volume, alta severidade): óbito perdido, feto inventado, achado
dropado, BI-RADS, falso oligoâmnio — pede **guards de validação** (§4 do arquivo).

## Parte 5 — Categorias (revisar agora; coringa = depois)

### P5.A — Desbloquear categorias + fallback genérico  *(achados confirmados no código)*
Vários "exames trocados" da mineração (joelho→obstétrico, abdômen→carótidas/parede) **não
são alucinação — são categorias sem renderer determinístico** que te forçaram a refazer.

**Confirmado no código:**
- `RENDERER_SUPPORTED_CATEGORIES` (`extraction.ts:85-97`) = 12 categorias com renderer pronto.
- `RENDERER_CATEGORIES` no `.env:48` (local) = só **10**: ABDOMEN_TOTAL, OBSTETRICA,
  MORFOLOGICO, TIREOIDE, MAMARIA, PARTES_MOLES, CERVICAL, ABDOMEN_SUPERIOR, PELVE_FEMININA,
  VIAS_URINARIAS. **Fora da lista (renderer pronto mas DESLIGADO): `MUSCULOESQUELETICO_V2` e
  `PROSTATA_SUPRAPUBICA`** → caem no writer LLM (degradado), e se o bundle faltar → `blocked`.
- **Fallback genérico com `OPENAI_MODEL_CONSULTANT` (gpt-5) NÃO está implementado** no
  `/api/generate` — só existe o fallback renderer→writer (`route.ts:812-849`). O gpt-5
  consultant só roda no endpoint separado `/api/consultant`. Ou seja: a decisão antiga
  (nenhuma categoria bloqueada via motor genérico) **foi planejada e nunca foi codada**.

**Ressalva:** o `.env:48` é o LOCAL; o `RENDERER_CATEGORIES` de **prod (Vercel)** pode
diferir. **@devops confirma** o valor real em prod + qual categoria retornou "blocked"
recentemente. **Ações:** (1) ligar MSK_V2 e PROSTATA no `RENDERER_CATEGORIES` (após validar);
(2) implementar o fallback genérico (estrutura COMENTÁRIOS/ASPECTOS/CONCLUSÃO + gpt-5) para
nenhuma categoria retornar `blocked`; (3) deploy via @devops.

### P5.D — Menopausa automática na PELVE_FEMININA ✅ FEITO (PR #7)
Ajuste frequente do Luiz: ao dizer "menopausa", o renderer marca automaticamente ambos os
ovários atróficos ("poucas imagens anecoicas" / "ambos praticamente sem folículos") e o
endométrio ("faixa etária da menopausa"). `mergeMenopausaPelve` (determinístico, TA+TV);
o renderer já tinha as frases, faltava o gatilho. Golden 57/57. Pendente: merge + deploy.

### P5.B — Consolidar MSK ✅ FEITO (banco)
Achado: a tabela `categories` tinha `MUSCULOESQUELETICO_V2` (funciona, 44 laudos) e
`MUSCULOESQUELETICO_RARAS` ("Raras", sem renderer, 0 laudos, bloqueada). **Desativada a
`_RARAS`** (`active=false`) — sobra só a V2 ("Musculoesquelético"). Reversível.

### P5.B (antigo) — Validar MUSCULOESQUELETICO_V2  *(paralelo)*
MSK teve delta −2391 chars na mineração: a IA **substitui o COMENTÁRIOS do médico por
boilerplate e junta as linhas** quando o input já vem formatado → o Luiz reverte. Renderer
deve fazer **passthrough fiel** (preservar quebras + COMENTÁRIOS). Cruzar com a doutrina MSK
já estudada ([[doutrina-msk]]). Verificar lados/subtipos pendentes.

### P5.C — Categoria "automática/coringa" (orb multicolor)  *(planejar; implementar DEPOIS)*
Categoria sem seleção de modelo: o usuário dita vários exames em sequência ("1º US
obstétrica… próximo joelho direito… próximo tireoide…") e o sistema **identifica cada exame
(RAG simples), levanta os elementos determinísticos de cada categoria e gera todos os laudos
de uma vez**, encadeados. Caso de uso: paciente que faz vários USs na mesma visita (abdome
total + tireoide c/ doppler + pelve + joelho…). O coringa é **orquestrador** (segmenta +
roteia) e reusa os renderers determinísticos por categoria — por isso depende da revisão de
categorias vir antes. UI: orb multicolor (não verde/amarelo/vermelho). **Decisão do Luiz:
deixar para depois** — primeiro as correções/ajustes.
> **Visão completa + arquitetura + revisão ultrathink de todas as categorias:
> `docs/plano-revisao-categorias-2026-07-01.md` (§5).**

## Parte 6 — Tooling / eficiência do agente (investigar)

**Investigar o repo `ponytail`** (https://github.com/DietrichGebert/ponytail) — sistemática
para o Claude (e outros agentes) escreverem código de forma mais enxuta, rápida e com menos
tokens. Técnica central: **"laziness ladder"** (antes de gerar código, parar no 1º degrau
aplicável: precisa existir? já existe no repo? stdlib? feature nativa? já instalado? uma
linha? → MVP). Resultados medidos no projeto deles: ~54% menos linhas, ~22% menos tokens,
~20% menos custo, ~27% mais rápido, mantendo segurança/validação. Adoção no Claude Code:
plugin (`/plugin install ponytail@ponytail`) + `AGENTS.md`/skills; comando `/ponytail
[lite|full|ultra]` e `/ponytail-review` (audita diff por over-engineering). **Ação:** avaliar
o plugin/skills, ver se alinha com a doutrina REUSE>ADAPT>CREATE que já seguimos, e testar
num incremento (ex.: a fase 2 do parser) medindo tokens/linhas. Casa bem com este projeto
(determinístico, reuso pesado de OBSTETRICA/dopplerOverlay/pesoFetalGuard).

## Prioridade sugerida
`P0` minerar correções (priorizar por dado) → `P1.A` renderer Doppler → `P1.B` golf ball →
`P1.C/D/E` preservação/rótulo/DUM-data → `P2.A` meta-comandos → `P3` sanidade/normalização →
`P2.C` interpretador híbrido (spike + dex1). Em paralelo (infra de aprendizado): Parte 4
(arquivo de correções + persistir final_output + analytics + addendo do boletim).

> Processo por item (memória [[medmaestri-dex-delegation]]): implementar → review dex1 +
> adversarial dex2 → golden/byte-stability → flag prod + push (@devops).
