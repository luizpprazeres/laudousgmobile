# Plano de ação — 2026-07-04 (boletim 03/07 + visão de produto do Luiz)

> Consolida: (1) análise ultrathink do boletim 03/07 com root causes verificados no
> banco; (2) os itens de médio prazo que o Luiz levantou (lab.laudousg, /adm, corpus
> tool, cerclagem, [REVISAR], sala do auxiliar, IG-DUM).

---

## PARTE 1 — Correções do boletim 03/07 (ordem de ataque)

### 🔴 P0 — Doppler falso-normal (RISCO DE MORTE FETAL)
**Evidência (89ffa1ef→edb74082, mesmo caso reenviado 4×):** feto PIG (peso 678g, P<3),
IP umbilical **2,11**, médico ditou **"diástole zero na artéria umbilical"**. Laudo saiu com
`4) Índice de pulsatilidade normal nas artérias uterinas e umbilical` **coexistindo com**
`Diástole zero na artéria umbilical` — contradição fatal. Só ficou correto quando o médico
COLOU os percentis manualmente (4ª tentativa).

**Root cause (código):** `buildDopplerConclusionItems` (dopplerOverlay.ts) decide "IP normal"
por `umbilicalAlterado` (flag que o LLM só seta quando o médico VERBALIZA "alterada") + percentil.
O **IP umbilical BRUTO (2,11) é extraído mas NUNCA usado** para decidir normalidade. Sem
percentil colado e sem a palavra "alterada", defauta para normal.

**Fix (flag DOPPLER_UMBILICAL_SAFETY):** `extractDopplerData` deriva `umbilicalAlterado` de:
(a) **diástole zero/reversa/ausente** ditada na umbilical (o sinal mais grave); (b) **IP umbilical
≥ 1,5** (grosseiramente anormal em qualquer IG obstétrica — P95 varia 0,8–1,2). Nunca afirmar
"IP normal na umbilical" nesses casos. Regra de ouro: **nunca tranquilizar quando não se sabe.**

### 🟠 P1 — Sanity de IG (divergência grosseira)
**Evidência (10813392):** biometria 24s6d, médico ditou por erro "hoje com **4** semanas e 6 dias"
(era 24). O sistema aceitou e a conclusão saiu "Gestação em torno de 24s6d, devendo ser corrigida
pela ultrassonografia precoce, compatível com **4 semanas e 6 dias**" — absurdo. Recebeu feedback
POSITIVO (o defeito passou pela revisão).

**Fix:** se |ig_referencia_hoje − ig_biometria| > ~4 semanas → erro de ditado: NÃO disparar a
correção Domingos + sinalizar [REVISAR]. (A correção só faz sentido para divergências de dias.)

### 🟠 P1 — Duplicação da frase "Primeira ultrassonografia realizada…"
**Evidência (10813392):** a frase entra 2×: (1) após o título via `fraseReferencia` (renderer,
correto); (2) DENTRO dos COMENTÁRIOS ("A primeira ultrassonografia realizada…"), porque o médico
ditou "após o título **acrescente** a primeira ultrassonografia…" e o **commandInterpreter
re-inseriu** o texto — conflito renderer × interpretador de comando (exatamente a suspeita do Luiz).

**Fix:** quando os campos `primeira_us_*` foram extraídos e a `fraseReferencia` foi montada,
suprimir o comando de acréscimo que repete a mesma frase (dedup determinístico do comando).

### 🟡 P2/P3 — recorrentes (já mapeados, atacar em lote depois)
- Parser "IG pela DUM" gerando `DUM: null` / `41/01/0000` / `23/2` (datas inválidas).
- Alucinação de achados não ditados (osso nasal, ducto venoso trifásico) — reforço de extração.
- BCF = `____` placeholder em branco → omitir linha quando não ditado.
- Vazamento literal de comando na conclusão (≥9 laudos) — commandStripper.
- Rótulo MBV→ILA no morfológico (mesmo garble do boletim 02/07 — já temos o fix ASR).
- Achado corpo→conclusão (bile espessa no corpo, "sem alterações" na conclusão) — reflexo.

---

## PARTE 2 — Proposta do Luiz: renomear o campo de IG extraído das imagens
O template de extração de imagem (app iOS) rotula "IG pela DUM". Na prática o aparelho mostra a
MESMA IG tanto pela DUM quanto pela USG precoce (o técnico configura). Resultado: o sistema vê
"IG pela DUM: 20s", o médico dita "primeira US realizada em DD/MM, hoje com 20s", e o sistema
**inventa uma data de DUM fictícia** para montar a frase — quando a referência real é a USG precoce.

**Proposta (Luiz):** renomear o campo extraído para **"IG pela DUM / ultrassonografia precoce"**.
Assim o médico pode apagar ou deixar, e a IA entende que a referência pode ser qualquer uma —
menos alucinação de DUM. Mudança no template do app iOS (`ImageAnalysisService`) + tratamento no
backend (nunca derivar `DUM:` de IG; a frase de referência usa a data ditada, não uma DUM inventada).
Conecta diretamente com o P1 do parser IG-DUM.

---

## PARTE 3 — Itens de produto / médio prazo (registrados, não implementar agora)

### lab.laudousg.com — reconstruir a plataforma de observabilidade do laudo
Ficou disfuncional quando saímos do RAG para renderer/writer. Objetivo: **entender como o laudo é
feito**. Tarefas: (a) remover tudo referente a RAG; (b) **especificar as regras de cada categoria
(writer)** de forma visualizável — o Luiz quer ler/entender o conjunto de regras por categoria;
(c) atualizar a infra.

### Padronizar a ferramenta de corpus (o "corpus bootstrap" foi muito bem recebido)
Metodologia recorrente: um **comando fixo no terminal** que o Luiz cola → o Fable (modelo máximo,
raciocínio profundo) gera N laudos de uma categoria (foco em PATOLÓGICOS, que são infinitos; os
normais saturam) → publica numa página (lab.laudousg?) → Luiz corrige direto no texto com
observações embaixo → copia e devolve → viram few-shots/golden. Padronizar o fluxo terminal↔página.

### Trazer de volta o /adm do laudoUSG antigo (`~/laudousg/`, laudoUSG.com/adm, login luiz/teste123)
Incorporar ao NOVO laudoUSG.com: KPIs, acompanhamento, financeiro, arquitetura, infraestrutura,
design system. **NÃO** trazer geração de imagens / módulo de estudo (deixar separado — sempre varia).

### Cerclagem (cervicometria) — texto definido pelo Luiz
- **Corpo (OS SEGUINTES ASPECTOS):** "Imagens hiperecoicas puntiformes, em trajeto linear no canal
  endocervical, ocasionando discreta sombra acústica, circundando parcialmente o canal cervical,
  compatíveis com pontos de cerclagem."
- **Conclusão:** "Imagens hiperecoicas no colo uterino, cujo diagnóstico mais provável são pontos
  de cerclagem uterina em topografia habitual."

### [REVISAR] inline — padronizar highlight + pop-up (decisão de produto do Luiz)
- **Realce por cor:** ROXO = item faltando (placeholder `____`, `?`); AMARELO = suspeita de
  inconsistência/incoerência (ex.: valor de magnitude implausível). Dá controle ao usuário.
- **Pop-up ao clicar em Editar:** lista os itens a revisar de forma extensa, com mensagem gerada
  pela IA por tipo de erro — ex.: placeholder → "Confira os itens que estão faltando"; magnitude →
  "Os valores parecem muito grandes, confira por favor". Fica aberto no fim do laudo só no modo
  Editar; some no modo Visualizar.
- Idealmente o mesmo aviso aparece na **sala do auxiliar** (para a auxiliar avisar o médico).

### Sala do auxiliar — sinal claro liberado/bloqueado (comunicação sem rodeio)
A auxiliar tem instrução limitada e é ansiosa; copia o laudo antes de o médico terminar. Precisa de
sinal INEQUÍVOCO: **barra do topo verde** (ameno) = liberado para copiar; **vermelha** (ameno) =
médico ainda editando. Mecanismo candidato: toggle "pode copiar" no app do médico → mensagem clara
na sala do auxiliar. (Viabilidade a estudar.)

### Padrão estético / fixes obstétricos pendentes de commit
Há fixes do modelo obstétrico (DUM / USG precoce) a commitar + puxar via @devops. A duplicação da
frase 1ª US (P1 acima) faz parte disso.
