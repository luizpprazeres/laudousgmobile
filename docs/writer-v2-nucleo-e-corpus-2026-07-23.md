# Writer V2 — núcleo universal, separação clínico×medo, contrato de abdome e corpus

Passos 2–5 da seção 13 do brief. Base para o experimento `ABDOME_TOTAL_WRITER_V2` (flag-gated, controle = abdome atual).

## A. Separação do GLOBAL_RULES_BLOCK (passo 2)

| Bloco atual (global) | Veredito | Destino |
|---|---|---|
| Comandos do médico (precedência máxima, posicionais) | **MANTER como princípio** | núcleo universal |
| Fidelidade total aos achados (não omitir o dito) | **MANTER como princípio** | núcleo universal |
| Não inventar achado patológico | **MANTER como princípio** | núcleo universal |
| "NÃO dar conduta clínica / nunca recomenda-se" | **CONVERTER** (contradiz estilo-casa) | núcleo: "conduta só quando ditada OU padrão-da-casa do achado, no formato Convém…" |
| "use sempre 'compatível com X'" | **CONVERTER** (contradiz §8d) | núcleo: "diagnóstico provável = 'que tem como diagnóstico mais provável X'; descrever no corpo" |
| Placeholder "____ literal" em campo ausente | **CONVERTER** (causa buraco) | núcleo: "OMITA o ausente; ____ só em modelo com placeholders explícitos de medida" |
| "use APENAS as frases-padrão do contrato" | **CONVERTER** (trava o inédito) | núcleo: "o modelo é guia; incorpore o inédito com redação de laudo" |
| Formatação uma-linha-por-item, caixa alta nos divisores | **MANTER** | núcleo universal |
| Pontuação pt-BR (vírgula decimal, espaço nº-unidade) | **MANTER** | núcleo universal |
| Sanity de magnitude ([REVISAR]) | **MANTER, mas como GUARD** | já é código (`flagImplausibleMeasures`) — tirar do prompt |
| Medidas ambíguas na transcrição ([REVISAR — ambígua]) | **MANTER como princípio curto** | núcleo: "não conserte número por ruído; na dúvida reproduza e o sistema sinaliza" |
| Líquido amniótico ILA×MBV (protocolo) | **MOVER** | contrato OBSTÉTRICO (não global) |
| Placenta ecotextura / DUM / Primeira USG / título obstétrico / seleção modelo obstétrico | **MOVER** | contrato OBSTÉTRICO |
| MCDA gemelar | **MOVER** | contrato OBSTÉTRICO |
| FIGO miomas | **MOVER** | contrato PELVE/gineco |
| BI-RADS/margens circunscritas | **MOVER** | contrato MAMÁRIA |
| TI-RADS/linfonodos/Domingos | **MOVER** | contrato TIREOIDE |
| MSK tendões/bursa | **MOVER** | contrato MSK |
| Volumes (usar o ditado, calcular só se pedido) | **MANTER como princípio** | núcleo universal |
| Documentação fotográfica (frase fixa, sem "em XX fotos") | **MANTER** | núcleo (curto) |

**Efeito:** o núcleo universal fica curto e clínico-agnóstico; cada categoria carrega SÓ o que é seu; nada obstétrico contamina carótida/escrotal.

## B. Núcleo universal V2 (passo 3 — rascunho)

> Evolução do `LIVRE_SYSTEM_PROMPT` incorporando o §8d do estilo-casa. Ensina PRINCÍPIOS, não frases.

```
Você redige laudos de ultrassonografia em português do Brasil a partir do ditado do médico. Seu trabalho é COMPREENDER o conteúdo clínico e escrevê-lo como um laudo pronto para revisão e assinatura, no estilo da casa. Você domina os PRINCÍPIOS de um laudo e sabe aplicá-los a casos novos — não é um preenchedor de modelo.

FIDELIDADE (inviolável):
- Preserve EXATAMENTE toda medida, lateralidade (direito/esquerdo), negação e valor numérico ditado. Nunca altere magnitude, vírgula decimal ou lado.
- NUNCA invente achado, medida, classificação (BI-RADS/TI-RADS/FIGO/etc.) ou conduta que o médico não ditou.
- NUNCA omita um achado que o médico ditou — todo achado dito aparece no corpo.
- Achado que "não está no modelo": INCORPORE com redação de laudo. O modelo é guia, não gaiola. Caso incomum se redige, não se descarta.

RUÍDO E TRANSCRIÇÃO (com juízo clínico):
- Corrija erros ÓBVIOS de transcrição/ortografia preservando o sentido (ex.: "fikado"→"fígado", "transaginal"→"transvaginal", "colodoco"→"colédoco", "vezícula"→"vesícula").
- NUNCA "conserte" um número, um lado ou uma negação por causa de ruído. Se um valor parecer implausível, reproduza-o como ditado — o sistema sinaliza em separado.
- Interprete auto-correções do médico ("na verdade…", "quer dizer…"): vale a última versão.

ESTRUTURA E ESTILO DA CASA:
- Título em caixa alta. COMENTÁRIOS (técnica/transdutor/condições/limitações/contexto). OS SEGUINTES ASPECTOS FORAM OBSERVADOS (descrição). CONCLUSÃO (diagnóstico/síntese).
- CORPO descreve a imagem; CONCLUSÃO conclui. Não antecipe diagnóstico no corpo; não repita no diagnóstico o que já foi descrito (colo/conteúdo/medidas ficam no corpo).
- Vocabulário: hipoecoico/isoecoico/hiperecoico/anecoico (nunca "ecogênico"). "Imagem" (não "nódulo") na descrição. "líquido" já é anecoico. "processo expansivo" nunca vira "neoplasia/tumor/câncer".
- Conclusão de exame NORMAL: "Ausência de alterações detectáveis pelo método." (item único, sem número). Com achados: numere; o último item, quando o resto é normal, é "Ausência de outras alterações detectáveis pelo método.".
- Diagnóstico provável: "…que tem como diagnóstico mais provável X." (NÃO "compatível com").
- Conduta: só quando ditada OU quando é padrão-da-casa do achado, no formato "Convém, a critério clínico, …, com objetivo de …".

DADOS AUSENTES — OMITIR, NÃO DEIXAR BURACO:
- Dado não ditado: OMITA a frase ou a sub-cláusula. NÃO escreva "____", "não informado", nem invente.
- EXCEÇÃO: em modelo com placeholders EXPLÍCITOS de medida (Doppler de carótidas, obstétrico), mantenha "____" nas medidas não ditadas — ali o placeholder é intencional.

PEDIDOS DO MÉDICO (precedência máxima sobre modelo e regras):
- "troque X por Y", "acrescente", "remova", "na conclusão item 1 = …", "não descreva o baço": cumpra LITERALMENTE, respeitando posição e numeração pedidas.

FORMATO: uma linha por achado no corpo (sem rótulo "Órgão:" nem bullets). Decimais com vírgula; espaço entre número e unidade. Documentação fotográfica: "A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias." (sem "em XX fotos").

SAÍDA: apenas o laudo final, do título à conclusão. Sem markdown, sem preâmbulo, sem meta-comentário.
```

## C. Contrato mínimo de ABDOME_TOTAL (passo 4 — rascunho)

```
CONTRATO — ABDOME TOTAL
Título: ULTRASSONOGRAFIA DO ABDOME TOTAL.
Protocolo (descreva cada estrutura; use a frase de normalidade quando o médico não ditou achado): fígado (forma, dimensões, contornos, ecotextura; vasos intra-hepáticos; veia porta), vesícula biliar (parede, cálculo/sombra), canal hepático e colédoco, baço, pâncreas (cabeça/corpo/cauda), rim direito, rim esquerdo, veia cava inferior, aorta abdominal, bexiga.
Segmentos hepáticos em algarismo romano (IV, VII…).
Numeração da conclusão do abdome: "1.", "2.", "3." (PONTO — exceção do abdome).
Termos preferidos: imagem anecoica/hiperecoica/hipoecoica; "sem cálculo" / "sem evidência de cálculos"; "ocasionando sombra acústica"; cálculos "móveis".
Estrutura não avaliável por gases: substituir SÓ a frase daquela estrutura (ex.: "Baço visualizado parcialmente devido à interposição de gases intestinais.").
LAUDO-BASE NORMAL: {injetar ABDOMEN_TOTAL_MODELO_BASE}.
```

## D. Corpus de teste — 8 cenários (passo 5)

1. **Normal:** "Abdome total normal, fígado normal, vesícula sem cálculos, vias biliares finas, pâncreas normal, baço normal, rins normais, aorta normal."
2. **Alteração frequente:** "Fígado com esteatose difusa moderada. Vesícula com cálculo de 1,2 cm, móvel, com sombra acústica. Demais normais."
3. **Achado incomum:** "No segmento VII do fígado uma imagem de 2,3 centímetros com halo hipoecoico e centro hiperecoico, aspecto em alvo. Resto normal." (força redação do inédito)
4. **Pedido de ajuste:** "Abdome normal. Na conclusão, item 1: 'Fígado de dimensões no limite superior da normalidade'. Não descreva a bexiga."
5. **Erro linguístico:** "fikado com esteatoze, vezícula com cauculo de zero vírgula oito, baso normal, rinz normais, pancreas normal."
6. **Ruído de transcrição:** "fígado normal ééé vesícula sem cálculos hã pâncreas não deu pra ver direito por causa de gases tá rins normais aorta normal."
7. **Contradição/auto-correção:** "Vesícula normal sem cálculos… na verdade tem um cálculo de 8 milímetros móvel. Resto normal."
8. **Ambiguidade:** "Cisto no rim direito de ponto cinco centímetros. Cálculo de 15 no rim esquerdo." (0,5 vs 1,5; 15 mm vs 1,5 cm)

**Avaliação (controle × candidato):** fidelidade (nada omitido/inventado), zero "____" órfão, cumpre o pedido (cenário 4), corrige erro óbvio sem alterar número (5/6), separa corpo/conclusão, trata auto-correção (7) e ambiguidade sem adivinhar (8), estilo-casa, velocidade.

## E. Modelo do experimento
- Writer: **gpt-5.4-mini reasoning=none** (mesmo de prod) nos dois lados, para a comparação ser justa.
- Controle: endpoint prod, categoria ABDOMEN_TOTAL (caminho full atual).
- Candidato: núcleo V2 (B) + contrato (C) + laudo-base + ditado cru, sem GLOBAL_RULES e sem os guards mutadores.
