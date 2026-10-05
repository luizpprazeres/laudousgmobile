# Cervical com Doppler (`CERVICAL`, modo `com_doppler`): auditoria do lote 3

- Data: 05/10/2026. Base: `06c88cd` (worktree). A execução rodou na main `407362d`, que não altera `cervical.ts`, `cervicalParaCatalogo.ts` nem `CERVICAL.ts`.
- Laudário: não observado, porque não havia navegador. Só se confirmou a existência no catálogo: linha 9 de `catalogo-ultrassonografia-2026-10-02.json` ("Cervical com Doppler", ao lado de "Cervical" e "Cervical (Linfonodos)"). Nenhuma redação do concorrente foi usada.
- **Referência obrigatória:** `audits/lote2/cervical-linfonodos-2026-10-05.md`. O lote 2 já provou o título "COM DOPPLER" presumido ao marcar um linfonodo alterado (C2b, L3), a falta de lado (L1) e a conclusão "reacional" contra sinais de atipia (L2, C5). Nada disso é repetido aqui; este arquivo trata **só do efeito do Doppler**.
- Prova: `audits/probes/probe-cervical-doppler-2026-10-05.ts` (estilos `CLASSICO_COMPLETO` e `OBJETIVO`). D3 e D4 chamam o renderer com `dados` que a tela não consegue produzir, para isolar o contrato.

## Decisão de forma

**(b) Modo do contrato `CERVICAL`, sem categoria nova.** O código canônico continua `CERVICAL`, com o bloco `doppler` no nível do exame. O Doppler cervical acrescenta atributos ao linfonodo (padrão vascular e, opcionalmente, índices); ele não traz estrutura anatômica nova. Um contrato separado duplicaria a grade de lado × nível proposta no lote 2.

## 1. Estado por plataforma (só o Doppler)

| Plataforma | Evidência | Classificação |
|---|---|---|
| Web | Não há controle de Doppler. `cervicalParaCatalogo.ts:34-35` faz `com_doppler = alterado`. O subcampo `vasc` começa em **"ausente"** (estado inicial lido pela prova) | ausente como modo; presumido |
| Renderer | `CERVICAL.ts:61-69`: cinco padrões (ausente / hilar / periférica / mista / aumentada). `:299-300`: a vascularização só é escrita com `com_doppler`. `:337-339`: o título muda só no clássico. `:503-505`: a técnica muda só no objetivo. Sem IR/IP | estruturado ativo, raso |
| Conclusão | `:399-414` e `:563-575`: suspeito × reacional vem só do booleano `suspeito`; **o padrão vascular não pesa** | parcial |
| API ditado | `:192-193` (com_doppler, negações vencem); `:205-206` (vascularização só com Doppler). Dormente → writer (`env.ts:74`) | estruturado dormente |
| Android/RN / iOS | só ditado (`tokens.ts:153`; `Category.swift:144`) | genérico |
| Conhecimento | `snippets/CERVICAL/regra/criterios-linfonodo-normal-vs-suspeito.md:33,54`: hilar central = normal; periférico, capsular ou caótico = suspeito | publicado, não usado na conclusão |

## 2. Provas (dados sintéticos)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
|---|---|---|---|---|---|
| D1 | alterado IIA, 18×7×6 mm, oval, hilo presente, vascularização **hilar** | "…com vascularização hilar ao Doppler colorido"; título clássico "COM DOPPLER COLORIDO"; no objetivo, a técnica cita o Doppler e o título não | "Linfonodo proeminente de aspecto reacional no nível IIA" | nenhuma | `observado no LaudoUSG`: coerente. Também se vê "de dimensões aumentadas" com eixo curto de 0,7 cm (ver L5 do lote 2) |
| D2 | o mesmo linfonodo, só a vascularização passa a **periférica** | "…com vascularização periférica ao Doppler colorido" | **"aspecto reacional"**, igual a D1 | nenhuma | `defeito confirmado`: o único sinal Doppler de atipia descrito na base não muda nada na conclusão. É o caso isolado do L2 do lote 2, agora com o Doppler como única variável |
| D2b | o mesmo linfonodo, vascularização deixada no padrão (pretendido: Doppler **não** feito) | "…**sem vascularização significativa ao Doppler colorido**"; título com Doppler | reacional | nenhuma | `defeito confirmado`: um Doppler não realizado vira um achado Doppler negativo (reforça o L3 do lote 2) |
| D3 | contrato: `com_doppler = true`, nenhum linfonodo alterado | clássico: título com Doppler, mas comentários e corpo **sem nenhuma menção** ao Doppler; objetivo: técnica com Doppler, título sem | normal | n/a (a tela não produz este estado) | `candidato a lacuna`: o exame normal com Doppler não é representável na Web, e no contrato não há frase de vascularização normal |
| D4 | contrato: `com_doppler = false` com vascularização periférica preenchida | a vascularização é **descartada em silêncio** | reacional | nenhuma | `observado no LaudoUSG`: o renderer não vaza o achado, mas também não avisa. Dado perdido sem aviso |

## 3. Lacunas do Doppler cervical

- **CD1, P0, `defeito confirmado`.** O Doppler é deduzido da presença de um linfonodo alterado, e não declarado pelo médico (D2b, D3). Requisito: `doppler.realizado` ∈ {sim, não}, no nível do exame, padrão **não**. O título e a técnica (nos dois estilos) dependem só desse campo.
- **CD2, P0, `defeito confirmado`.** O padrão vascular suspeito (periférico, misto ou caótico) não interfere na conclusão (D2). Requisito: compor com a pendência L2 do lote 2. A vascularização periférica, mista ou aumentada passa a contar como sinal de atipia: com "reacional" e sem confirmação do médico, abre uma pendência bloqueante. Nunca reclassificar sozinho.
- **CD3, P1, `candidato a lacuna`.** Faltam o padrão "capsular/caótico" (a base o cita) e a separação entre "ausente ao Doppler" e "não avaliado". Opções propostas: hilar, periférico/capsular, misto, caótico, ausente (com Doppler realizado). A presença de vascularização "aumentada" não é padrão e vira um modificador.
- **CD4, P1, `candidato a lacuna`.** O exame normal com Doppler não tem frase própria (D3). Intenção: linfonodos dos níveis avaliados com padrão vascular hilar preservado, sem afirmar nada sobre os níveis não avaliados.
- **CD5, P2, `candidato a lacuna`.** IR/IP do linfonodo: campos opcionais e sem interpretação automática. Limiar só como `candidato`: IR ≥ 0,8 ou IP ≥ 1,5 como aviso. A literatura diverge (fonte provável: série de Ahuja e Ying sobre o Doppler de linfonodos cervicais, a confirmar), e por isso o limiar não entra na conclusão.
- **CD6, P2, `inferido`.** Paridade: o mobile e o iOS dependem do extrator dormente (`:205-206` já exige Doppler para a vascularização); no writer, nada impede presumir o padrão.

## 4. Requisitos originais (composição com o contrato do lote 2)

### 4.1 Campos (por linfonodo, além de lado, nível, eixos e hilo do lote 2)

| Campo | Tipo e opções | Padrão | Dependência |
|---|---|---|---|
| `doppler.realizado` (exame) | sim / não | **não** | controla o título, a técnica e os campos abaixo |
| `padrao_vascular` | hilar / periférico-capsular / misto / caótico / ausente | vazio | só com Doppler "sim"; desabilitado e limpo com "não" |
| `vasc_aumentada` | caixa de marcação | desmarcada | só com um padrão escolhido |
| `ir` / `ip` | número 0,30–1,20 / 0,30–4,00 | vazio | opcionais; só com Doppler "sim" |

### 4.2 Efeito no corpo e na conclusão

| Situação | Corpo | Conclusão | Salvaguarda |
|---|---|---|---|
| Doppler sim, nenhum linfonodo alterado | frase de padrão hilar preservado nos níveis avaliados | normal, restrita aos níveis avaliados | exige a grade de lado × nível (L4 do lote 2) |
| linfonodo com padrão hilar | cita o padrão vascular | reacional só se não houver outro sinal de atipia | — |
| padrão periférico, misto ou caótico | cita o padrão vascular | o médico confirma "suspeito" ou "reacional" (pendência) | nunca automático |
| IR/IP preenchidos | linha com os valores | sem item, salvo pedido do médico | aviso `candidato` apenas |
| Doppler não | nenhuma menção vascular | — | pendência se houver padrão vascular salvo |

### 4.3 Casos de aceitação sintéticos

1. Estado inicial → título sem Doppler; nenhuma frase vascular.
2. Doppler sim, nenhum linfonodo alterado, níveis D e E avaliados → título e técnica com Doppler nos dois estilos; frase de padrão hilar preservado.
3. Linfonodo IIA à direita, oval, hilo presente, hilar → conclusão reacional, com lado.
4. O mesmo, com padrão periférico e suspeição desmarcada → bloqueia até o médico decidir.
5. Doppler não, com padrão vascular salvo de antes → o campo é limpo ou bloqueia; o laudo não cita vascularização.
6. IR 0,85 preenchido → linha com o valor e aviso na tela; a conclusão fica inalterada.

## 5. Perguntas para a rodada no concorrente (não observado no concorrente)

1. "Cervical com Doppler" difere de "Cervical (Linfonodos)" só no título e na técnica, ou acrescenta campos?
2. Quais padrões vasculares são oferecidos? Há "capsular" ou "caótico"?
3. Pede IR/IP? Interpreta os valores?
4. O padrão vascular suspeito altera a impressão automaticamente?

## 6. Ordem de implementação sugerida

1. P0: `doppler.realizado` explícito no exame; título e técnica condicionados a ele; vascularização sem padrão inicial (CD1, junto com o L3 do lote 2).
2. P0: o padrão vascular suspeito entra na pendência atipia × reacional (CD2, junto com o L2 do lote 2).
3. P1: padrões capsular/caótico e frase normal com Doppler (CD3, CD4), depois da grade de lado × nível (L1/L4 do lote 2).
4. P2: IR/IP opcionais com aviso `candidato` (CD5); paridade no extrator mobile (CD6).
