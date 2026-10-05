# Morfológico do 1º trimestre (`MORFOLOGICO`, trimestre = 1t): execução sintética e requisitos

- Data: 05/10/2026. Base: `06c88cd` (execução na main `407362d`; o único commit novo altera `examCategoryImages.ts`, fora do escopo).
- Laudário: **não observado** nesta rodada (sem navegador). Só a existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 12: “Morfológico 1º Trimestre”; linha 13: variante gemelar). O estudo concluído do Obstétrico 1º trimestre (`cases/obstetrico-1t-2026-10-02.md` e `crosswalk-obstetrico-1t-2026-10-02.md`) é referência e não é repetido aqui: datação por CCN, ausência de atividade, fatores maternos pré-preenchidos no mobile e versão do golden FMF ficam lá.
- Probe: `audits/probes/probe-morfologico-1t-2026-10-05.ts` (caminho Web real: `adaptarMorfologico(estado, { trimestre: "1t" })` → `renderizarSelecao("MORFOLOGICO", "CLASSICO_COMPLETO", [], dados)`; calculadora: `calculateTrisomyWeb`).
- Compõe com `synthesis/requisitos-pelve-obstetrico-2026-10-05.md` §2 (placenta, líquido, achado com item de conclusão) e com o lote 2 do morfológico (`audits/lote2/morfologico-2-trimestre-2026-10-05.md`: estado limitado por estrutura, achados tipados).

## 1. Estado por plataforma

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web | mesmo card `MORFOLOGICO`, controle “Trimestre” (`apps/web/src/lib/deterministic/organs/morfologico.ts:481-491`); seções do 1t em `:464-470` (`ig`, `primeiro_trimestre`, `cervicometria`, `doppler` só com IP das uterinas, `achados`); módulo `primeiroTrimestreModule` `:164-245`; adaptador `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts:83`; teste `morfologicoPrimeiroTrimestre.test.mts` | **estruturado ativo**, sem nenhuma estrutura anatômica |
| Calculadoras Web | PE FMF sempre no 1t; trissomias só com `NEXT_PUBLIC_FMF_TRISOMY_VALIDATION === 'true'` (`morfologico.ts:501-506`); painel com selo “validação clínica pendente” (`TrisomyFmfPanel.tsx`) | **parcial**: bloco de texto opcional, fora do laudo estruturado. Valor da flag em produção **não verificado** |
| API (ditado) | `apps/api/src/server/renderer/categories/MORFOLOGICO.ts:665` (`render1t`); `RENDERER_CATEGORIES` vazio por padrão | **estruturado dormente** |
| Writer / conhecimento | `packages/knowledge/snippets/MORFOLOGICO/modelo/template-1t.md` (normalidade embutida, “Morfologia fetal normal para esta fase”); `regra/selecao-automatica-trimestre.md` | **genérico** |
| Android/RN | categoria única “Morfológico” (`apps/mobile/src/ui/tokens.ts:160`); `TrisomyCalculatorSheet` anexa texto ao fim do laudo (`apps/mobile/app/generate.tsx:284-295`) | **genérico** + calculadora como texto |
| iOS | `Models/Category.swift:16`; calculadora de trissomias própria (ver crosswalk do Obstétrico 1T) | **genérico** + calculadora como texto |
| shared | motor FMF de trissomias e PE em `packages/shared/src/calculators/`; formatador `fmfTrisomyFormatter.ts`; nenhum modelo clínico de marcadores ou anatomia precoce | **parcial** (só cálculo) |

## 2. Inventário do formulário Web (1t)

| Seção | Campo → opções | Padrão inicial |
| --- | --- | --- |
| IG e datas | IG biométrica (sem/dias), referência DUM/1ª US | vazio; **CCN não gera IG** |
| Feto e marcadores | BCF (texto); CCN (mm); TN (mm); osso nasal presente/ausente/não avaliado; regurgitação tricúspide não avaliada/ausente/presente; ducto venoso normal/onda A reversa/não avaliado; placenta (texto livre) | osso nasal **presente**, ducto **normal**, tricúspide não avaliada |
| Cervicometria | addon | desligado |
| Doppler uterino | IP uterina D e E | desligado |
| Achados | texto livre (só corpo) | vazio |
| Calculadoras | PE FMF; trissomias (com flag) | painel separado; inserção por clique |

Não existem: vitalidade (o adaptador força `normal`, `morfologicoParaCatalogo.ts:140`), movimentos, apresentação (força “cefálica”, `:152`), líquido (força normal, `:144`), anatomia precoce por estrutura, IP do ducto venoso (o painel de trissomias lê `realizado.sim.ip_dv`, que o Doppler do 1t não oferece: `LaudarWebExperience.tsx:499` × `dopplerObstetrico.ts:79-82`), estado “limitado”, gemelar.

## 3. Provas (dados sintéticos, 12s4d, CCN 62 mm quando medido)

| Cenário | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| T1 estado inicial | nada preenchido | “apresentação cefálica”, BCF presente sem valor, movimentos ativos, CCN/TN `____`, osso nasal presente, tricúspide ausente, ducto trifásico, líquido normal | IG `____`; líquido normal; ducto normal; **morfologia fetal normal** | nenhuma | **defeito confirmado P0**: exame normal completo sem um dado; tricúspide “ausente” com o campo em “não avaliada” |
| T2a TN 3,8 mm | só TN alterada | “TN de 3,8 mm” | IG; líquido; ducto normal; **morfologia fetal normal** | nenhuma | **defeito confirmado P0**: TN aumentada não gera item e não retira a síntese normal |
| T2b TN 3,8 + osso nasal ausente + tricúspide presente | marcadores | os três no corpo | ausência de osso nasal e regurgitação no item; **TN ausente da conclusão**; síntese normal retirada | nenhuma | **defeito P1**: a conclusão cita os marcadores categóricos e omite o quantitativo |
| T3 osso nasal e ducto “não avaliado” | `na` nos dois | **“Presença de osso nasal”** e **“onda trifásica”** | **“Doppler do ducto venoso normal”**; morfologia normal | nenhuma | **defeito confirmado P0**: “não avaliado” vira normal (`na` → `null` no adaptador `:170-181`; `null` = padrão normal no renderer `MORFOLOGICO.ts:677-683`) |
| T4 ducto com onda A reversa | ducto alterado | onda reversa | ducto alterado; síntese normal retirada | nenhuma | **correto** no par corpo/conclusão; sem item de correlação com o rastreio |
| T5 anatomia precoce limitada | só via achados livres | limitação no fim do corpo, **todos os marcadores seguem afirmados** | síntese normal some; **nenhum item de limitação** | nenhuma | **defeito confirmado P0**: limitação vira silêncio (mesmo defeito M4/M9 do 2T) |
| T6 uterinas IP 2,6/2,9 | Doppler uterino | IPs **duas vezes** (lista do 1t + bloco “DOPPLERVELOCIMETRIA” com percentil 98) | **“Dopplervelocimetria normal das artérias uterinas”** e, logo abaixo, “IP médio acima do percentil 95”; mais “ausência de incisuras” e “sem centralização” num exame de 12 semanas | nenhuma | **defeito confirmado P0**: conclusão contraditória (frase normal incondicional, `MORFOLOGICO.ts:717-719`) e corpo duplicado (adaptador envia `uterina_ip_*` e `doppler` juntos) |
| T7 CCN 92 mm, IG vazia | CCN fora da faixa do rastreio | CCN 92 mm | IG `____`; morfologia normal | nenhuma | **lacuna P1**: sem aviso de CCN fora da janela nem derivação da IG pelo CCN |
| T8 remoção | ducto e osso alterados → padrão | volta ao normal | volta ao normal | nenhuma | **correto** |
| F1 calculadora, TN 3,8, osso ausente, 36 anos | painel FMF (flag simulada) | — | bloco separado: T21 1 em 2, T13/18 1 em 14, alto risco | — | o bloco entra **depois da conclusão** (`LaudarWebExperience.tsx:710-718`); com T2a o laudo diria “morfologia fetal normal” e, abaixo, “alto risco” |
| F2 calculadora, TN 1,6, marcadores normais, 28 anos | idem | — | “Baixo risco para trissomia 21” **calculado** | — | o “baixo risco” só aparece com cálculo; a síntese “morfologia normal” é que sai sem dado |

Risco FMF, em resumo (`observado no LaudoUSG`): quem calcula é `packages/shared` (via `calculateTrisomyWeb` / `calcularPreEclampsiaWeb`); o resultado entra **como texto** autoidentificado, por clique, fora da conclusão; não é dado estruturado do laudo e não muda a síntese. O renderer **não afirma “baixo risco”** sem cálculo, mas afirma “morfologia fetal normal” e “ducto normal” sem dado. A PE não recebe os IPs das uterinas digitados no formulário (o painel não tem `initialValues`): digitação dupla e possível divergência.

## 4. Lacunas da Web (e paridade)

1. **P0 — normalidade sem dado** (`defeito confirmado`, T1/T3): osso nasal e ducto pré-marcados; “não avaliado” imprime normal; tricúspide “não avaliada” imprime ausente.
2. **P0 — síntese “morfologia normal” sem nenhuma estrutura anatômica no formulário** (`defeito confirmado`, T1): o 1t não tem seção de anatomia.
3. **P0 — TN aumentada sem item e sem retirar a síntese** (`defeito confirmado`, T2a). Corte de TN é `candidato` (percentil 99 por CCN, ou 3,5 mm como valor absoluto, conforme publicações da FMF), a aprovar.
4. **P0 — Doppler uterino contraditório e duplicado** (`defeito confirmado`, T6); frases de incisura e centralização no 1º trimestre.
5. **P0 — limitação sem item** (`defeito confirmado`, T5).
6. **P1 — risco FMF fora da conclusão**: bloco de texto anexado; sem par estruturado; sem coerência com a síntese (F1 × T2a). Ducto venoso só qualitativo (IP inexistente no 1t), IPs das uterinas não chegam à PE.
7. **P1 — vitalidade, apresentação e líquido forçados** (`defeito confirmado` por código, `:140-152`); “apresentação cefálica” no 1º trimestre. CCN não deriva IG (já registrado no crosswalk do Obstétrico 1T).
8. **P2 — gemelar ausente**; aviso de CCN fora da janela; aviso de trimestre × IG.
9. **Paridade**: RN e iOS usam o template com normalidade embutida e anexam o bloco da calculadora como texto (`genérico`).

## 5. Decisão de contrato

**(b) variante do `MORFOLOGICO`**, mantendo o card e o controle de trimestre, mas com **contrato de seção próprio** `MORFOLOGICO/1t` (proposta) composto por: (i) datação e vitalidade do 1º trimestre, o mesmo bloco que o crosswalk do Obstétrico 1T propõe compartilhar com `OBSTETRICA`; (ii) marcadores de aneuploidia; (iii) anatomia precoce por estrutura; (iv) Doppler das uterinas, por referência ao bloco do `DOPPLER_OBSTETRICO` com janela de 11–14 semanas; (v) rastreios FMF como **resultado estruturado** referenciado. Não justifica código novo: o título, o card e o renderer já existem; o que falta é o conteúdo do contrato.

## 6. Requisitos originais

### 6.1 Modelo normal

| Estrutura | Dado mínimo para “normal” | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Datação | CCN em mm (faixa plausível 30–90; rastreio 45–84) | CCN e IG derivada, com a fórmula | IG pelo CCN ou pela referência adotada |
| Vitalidade | BCF numérico | BCF com valor | sem item quando dentro da referência |
| TN | valor em mm + CCN | valor | sem item quando abaixo do corte aprovado |
| Osso nasal, tricúspide, ducto venoso | estado marcado (`presente/ausente/não avaliado`; IP do ducto opcional) | um por linha, só quando avaliado | “não avaliado” nunca vira normal |
| Anatomia precoce | estado por estrutura: calota, foice/plexos, estômago, parede abdominal com inserção do cordão, bexiga, quatro membros, coração (4 câmaras com cor, opcional) | estruturas avaliadas | síntese “sem alterações nas estruturas avaliadas para a idade gestacional” **só** com todas marcadas; com limitação, frase restrita + item |
| Placenta e líquido | localização; líquido subjetivo marcado | — | sem item quando normal |
| Uterinas | IP D e E | valores e médio com percentil | normal **só** com percentil abaixo do corte aprovado |
| Rastreios | resultado do shared com versão do modelo | referência ao bloco | item com a classe calculada, nunca sem cálculo |

### 6.2 Biblioteca de alterações

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `tn_aumentada` | TN mm + CCN mm | valor | item “TN aumentada para o CCN”, com valor | corte `candidato`; derivado, não escolhido à mão |
| `osso_nasal_ausente` | estado | ausência | item | “hipoplásico” como opção separada (`candidato`) |
| `regurgitacao_tricuspide` | estado + valva | presença | item | — |
| `ducto_onda_a_reversa` | estado (+ IP opcional) | onda A reversa | item | IP alimenta o FMF somente quando numérico |
| `uterinas_ip_elevado` | IP D/E + IG | valores e percentil | item derivado do percentil | **remove** a frase normal; sem incisura/centralização antes de 20 semanas |
| `anatomia_precoce_alterada` | estrutura (lista) + descrição | descrição | item obrigatório | `physicianConfirmed` para malformação maior (ex. defeito de parede, acrania) |
| `avaliacao_precoce_limitada` | estruturas + motivo (biotipo, posição, IG precoce) | “não adequadamente avaliadas” | item com escopo e sugestão de reavaliação no 2º trimestre | retira a síntese global |
| `rastreio_trissomias` | entradas, versão, riscos T21/T18/T13 | bloco de referência | item com a classe calculada | inserção consciente; nunca “baixo risco” sem cálculo |
| `rastreio_pre_eclampsia` | entradas e resultado da PE FMF | bloco | item com a classe calculada | IPs reaproveitados do formulário |

### 6.3 Formulário Web

- Seções: datação (CCN → IG; referência) → vitalidade (BCF numérico; presente/ausente com confirmação) → marcadores (TN, osso nasal, tricúspide, ducto com IP opcional) → anatomia precoce (estados avaliada normal / alterada / limitada-não avaliada) → placenta e líquido → Doppler das uterinas → rastreios (painéis lendo o formulário).
- Nada pré-marcado. Botão “Marcadores e anatomia normais” registra a escolha.
- Pendências bloqueantes: marcador sem estado; TN sem CCN; estrutura sem estado; alteração sem item; texto livre sem item ou dispensa; bloco de rastreio inserido e depois invalidado por mudança de entrada.
- Avisos: CCN fora de 45–84 mm (rastreio indisponível); IG derivada × referência discordante; trimestre 1t com IG > 14 semanas; síntese normal ao lado de rastreio de alto risco.
- Derivados: IG pelo CCN; percentil das uterinas; classe da TN; risco FMF (shared). Painéis recebem CCN, TN, BCF, ossos, ducto (IP) e IPs das uterinas do formulário, sem digitação dupla.

### 6.4 Prompt mobile (extrator)

- Extrair CCN, TN, BCF, marcadores e estruturas ditadas; silêncio = `não avaliado`.
- “Não vi”, “prejudicado”, “biotipo” → `avaliacao_precoce_limitada` com a estrutura.
- Nunca inferir risco nem “baixo risco”; risco só vem do cálculo com entradas confirmadas.
- Nunca presumir tricúspide ausente, ducto normal ou osso nasal presente.

### 6.5 Casos de aceitação sintéticos

1. Formulário intocado → bloqueia publicação; nenhuma frase normal.
2. CCN 62 mm, TN 1,6 mm, marcadores e anatomia normais marcados → IG derivada; síntese normal restrita ao avaliado.
3. TN 3,8 mm com CCN 62 mm → item de TN aumentada; sem síntese normal.
4. Osso nasal “não avaliado” → linha “não avaliado”, nenhum “presente”.
5. Uterinas 2,6/2,9 em 12 semanas → item de IP elevado; nenhuma frase normal das uterinas; sem incisura/centralização.
6. Coração não avaliado por biotipo → item de limitação; síntese restrita.
7. Rastreio inserido com T21 de alto risco → item coerente; síntese não contradiz.
8. CCN 92 mm → aviso; painel FMF desabilitado com motivo.

## 7. Perguntas para a rodada no concorrente

1. O morfológico do 1º trimestre tem anatomia precoce por estrutura ou só marcadores?
2. TN aumentada gera item na conclusão? Com qual corte (absoluto ou por CCN)?
3. “Não avaliado” em osso nasal e ducto aparece como tal ou some?
4. O risco calculado entra na conclusão automaticamente? Se a TN mudar, o bloco é invalidado?
5. Doppler das uterinas no 1º trimestre: classe por percentil e efeito na conclusão.

## 8. Ordem de implementação sugerida

1. **P0** `na` → linha “não avaliado” no renderer; padrões neutros no formulário (osso nasal e ducto).
2. **P0** Frase normal das uterinas derivada do percentil; remover duplicação; sem incisura/centralização antes de 20 semanas.
3. **P0** Item de TN aumentada derivado e retirada da síntese normal; item de limitação.
4. **P0** Seção de anatomia precoce com três estados; síntese condicionada.
5. **P1** Painéis FMF lendo o formulário e devolvendo resultado estruturado à conclusão; invalidar ao mudar entradas.
6. **P1** Bloco compartilhado de datação e vitalidade do 1º trimestre (crosswalk do Obstétrico 1T); paridade RN/iOS.
7. **P2** Gemelar; avisos de janela.
