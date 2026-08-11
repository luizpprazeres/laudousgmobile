# Revisão adversarial do Codex 1 — 2026-08-10

Consulta pedida pelo Luiz: decisão conjunta entre terminais. O pedido ao Codex foi
explicitamente por **crítica, não concordância** — "onde essa arquitetura quebra?".

Resultado: **7 críticas procedentes**, todas verificadas no código antes de aceitas.
Cinco já estão incorporadas e provadas no PoC (29/29); duas mudam o plano de execução.

---

## Veredito do Codex

> "Eu não implementaria o catálogo completo ainda. A direção 'motor separado de conteúdo'
> é válida, mas o contrato atual de Slot é fraco demais para sustentar segurança clínica.
> A unidade interna precisa ser um documento estruturado; a frase deve ser apenas a
> última etapa de serialização."

Aceito. A direção se mantém; o contrato foi reforçado.

---

## Críticas incorporadas ao PoC

### C1 — `slot.id` morria na serialização ✅ corrigido

> "slot.id desaparece assim que o renderer devolve string. Sem essa camada, vocês acabam
> parseando texto novamente e recriam o problema com outro nome."

Procede. A v1 fazia `aspectos.join("\n")` e perdia a origem de cada linha; os 16 guards
posteriores voltariam a caçar frases por regex.

**Correção:** o PoC agora produz um `ReportDoc` — segmentos com
`{slotId, instance, kind, text, origin}` — e a string é o **último** passo (`serialize`).
Provado em `[H4]`: o mesmo guard de peso fetal funciona com cabeçalho `CONCLUSÃO:` **e**
`IMPRESSÃO:`, sem regex — o bug do estilo objetivo morre por construção.

### C2 — invariante protegia a linha, não o dado ✅ corrigido

> "o slot 'obrigatório' ainda pode ser substituído por texto vazio ou perder o placeholder
> da medida; portanto, ele protege a presença da linha, não o conteúdo clínico."

Procede. A v1 só barrava `remove_slot`. Passavam:
`{op:"replace_phrase", slot:"dbp", value:"  "}` e `value:"Diâmetro biparietal normal."`
(mantém a linha, perde a medida).

**Correção:** invariante de **conteúdo** — `placeholdersObrigatorios` por slot e recusa de
texto vazio. Provado em `[H3]`.

Também procede a parte de repetição: no gemelar não existe "o slot dbp", existem o DBP do
feto A e o do feto B. **Correção:** chave composta `slotId#instance` (`dbp#A`, `dbp#B`),
provada em `[H5]`.

### C3 — placenta e líquido não são redação, são estado clínico ✅ corrigido

> "Um único slot editável chamado placenta pode permitir que uma frase personalizada
> normal substitua uma saída patológica."

**Esta é a crítica de maior gravidade clínica de toda a revisão.** Sem ela, um médico que
personalizasse "Placenta de aspecto normal." veria essa frase aparecer **também num exame
com placenta prévia**.

**Correção:** slots marcados `estadoClinico` aceitam personalização **apenas do estado
normal**; quando o achado é patológico, quem escreve é o motor e o segmento é marcado
`origin: "computed"`. Provado em `[H7]` com placenta prévia e com oligoâmnio.

### C4 — `replace_section` recria o template integral ✅ aceito, removido

> "Removeria replace_section como 'válvula de escape'. Isso recria o template integral
> dentro da arquitetura nova e contorna todos os controles."

Procede — era uma contradição com a decisão Q2. **Removido da proposta.**

### C12 — `interpolate` falhava aberto ✅ corrigido

Placeholder desconhecido vazava literalmente para o laudo (`vars[k] ?? "{k}"`).
**Correção:** interpolação estrita + validação contra vocabulário conhecido + recusa de
cabeçalho de seção injetado na frase. Provado em `[H8]`.

---

## Críticas que mudam o PLANO (não o PoC)

### C9 — o catálogo-base deve nascer no Git, não no banco ⚠️ plano revisado

> "Hoje `renderer_schema` é aceito como `z.unknown()` em
> `server/admin/reportTemplateVariants.ts:12`, e o endpoint permite alterar o JSON sem
> incrementar automaticamente a versão em
> `app/api/admin/report-template-variants/[id]/route.ts:70`. Torná-lo canônico no banco
> agora cria risco de incompatibilidade entre código e catálogo, além de rollback não
> atômico. Banco deveria guardar primeiro overlays, versão/hash exatos e auditoria."

Procede e é importante. **Revisão do plano:** o catálogo-base fica **versionado no Git**
(deploy atômico com o código que o interpreta); o banco guarda apenas as
**personalizações do usuário**, com a versão/hash do base a que se ancoram. Promover o
base para o banco vira uma fase posterior, com schema tipado e versão automática.

Isso inverte o passo 3 do corte vertical.

### C8 — v1 como DSL restrita, não operações livres ⚠️ decisão de produto pendente

> "Para a primeira versão, eu usaria uma DSL de preferências restritas, não operações
> genéricas sobre frases. Exemplos: `sacoGestacionalDisplay = dsm | medidas_e_dsm`;
> `phraseVariant = padrao | alternativa_usuario`; `showOptionalSlot`;
> `appendConclusionItem`. Isso entrega os casos concretos com superfície de risco muito
> menor. Edição livre ficaria limitada a slots puramente estilísticos."

Parcialmente procede. Entrega 4 dos 5 exemplos do briefing com risco muito menor, mas
**não entrega o exemplo 2** ("substituir uma frase por uma redação de minha preferência"),
que é edição livre por natureza. **Ver Q7 em `03-perguntas-abertas.md`.**

### C10 — a chave genérica perde a FK ⚠️ aceito

> "A chave genérica (scope_type, scope_id) perde a FK direta para profiles que existe hoje
> em `packages/db/src/schema/accountReportPreferences.ts:24`. Se essa decisão ficar, eu
> criaria uma entidade de escopo com FK; não deixaria apenas UUID solto."

Procede. **Correção do desenho:** tabela `report_scopes (id, scope_type, user_id FK →
profiles)`, e a customização referencia `scope_id FK → report_scopes`. Mantém a decisão Q3
sem abrir mão da integridade referencial.

### C6 — não migrar os 28 guards de uma vez ✅ tranquilizador

> "No caminho renderer, quase todos os pós-processadores do writer já são pulados; ficam o
> guard de comandos e os normalizadores universais. Portanto, para OBSTETRICA, isso não
> precisa virar um projeto de seis meses. Vira pântano se você tentar unificar renderer,
> writer, writerV2 e fast-path numa única migração."

Procede, e reduz o risco que eu havia estimado. **Guardrail adotado:** a migração para
guards estruturais fica **restrita ao caminho renderer**. Writer e fast-path continuam com
os guards textuais atuais — eles nem sempre têm findings confiáveis.

Ele também propõe uma classificação útil, adotada: **(a)** invariantes clínicas sobre
findings; **(b)** composição sobre nós do documento; **(c)** lint final sobre texto.
Sanitização de ditado, placeholders vazando e formatação de medidas **continuam** exigindo
inspeção textual — "tentar eliminar qualquer inspeção textual seria erro".

---

## Bug novo encontrado pelo Codex — e verificado por mim

### `numero_fetos` × `fetos.length` — inconsistência não barrada pelo schema

> "O schema valida `numero_fetos` e `fetos` separadamente, mas não exige igualdade entre
> eles em `renderer/categories/OBSTETRICA.ts:38`. O renderer decide se é gemelar por
> `numero_fetos`, mas gera os blocos usando `fetos.length`. Isso permite 'Dois fetos' com
> apenas um bloco fetal."

**Confirmado por execução.** Com `numero_fetos: 2` e `fetos: [A]`, `renderObstetricaClassico`
produz:

```
ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR
...
Dois fetos: o feto A.

Feto A:
```

Anuncia dois, descreve um — um feto perdido no laudo.

**Impacto real hoje: nenhum.** Consulta em produção: **25 laudos gemelares** gerados entre
12/06 e 31/07/2026, **zero** com menos de dois blocos de feto. A extração nunca produziu o
estado inconsistente. É bug **latente**, como o do `IMPRESSÃO:`.

**Correção sugerida** (fora deste projeto, 3 linhas): um `.refine()` no
`ObstetricaFindingsSchema` exigindo `fetos.length === numero_fetos`.

### E o bug do `IMPRESSÃO:` deve ser corrigido já, separado

> "O bug de IMPRESSÃO: deve ser corrigido agora, separado deste projeto. Enquanto existir
> texto puro, ele deve reconhecer explicitamente os dois papéis."

Concordo. É independente da arquitetura nova e desarma a bomba descrita em `02-riscos.md §1`.

---

## Estado do PoC após a revisão

`apps/api/src/server/renderer/__tests__/model-catalog-poc.manual.ts` — **29/29**,
`typecheck` limpo.

| Bloco | Prova |
|---|---|
| H1 | catálogo + documento reproduzem o renderer **byte-a-byte** (2 variantes) |
| H2 | personalização como operação validada (3 medidas do SG; troca de frase) |
| H3 | invariantes de **presença e conteúdo** (6 casos) |
| H4 | guard por **slot**, funcionando em `CONCLUSÃO:` e `IMPRESSÃO:` |
| H5 | chave composta `slotId#instance` no gemelar |
| H6 | rastreabilidade `base` / `custom` / `computed` para o Lab |
| H7 | **estado clínico não é personalizável** (placenta prévia, oligoâmnio) |
| H8 | placeholder desconhecido e cabeçalho injetado são rejeitados |
