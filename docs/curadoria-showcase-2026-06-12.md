# Curadoria S2 — revisão visual do Showcase (Luiz, 2026-06-12)

> Backlog FIEL do feedback do Luiz sobre as 27 amostras. Fonte de verdade
> da execução dos lotes A/B abaixo. Cada item: onde aplicar (blocos curados,
> template do renderer, frases do renderer, schema).

## Veredito geral
- ✅ OK sem ajuste: ABDOMEN_SUPERIOR (estrutura), PARTES_MOLES,
  DOPPLER_VENOSO_MMII_MEDIDAS (mapeamento), abdome total padrão (exceto 1 frase).
- ⚠️ Ajustes pontuais: vesícula/litíase, títulos, comentários, tireoide,
  próstata, escrotal, glândulas salivares, doppler renal/venoso/obstétrico.
- 🔴 Rework: MORFOLOGICO 1t (estrutura quebrada), OBSTETRICA gemelar (spec
  nova), DOPPLER_ARTERIAL_MMII (modelo cru), MSK (consolidar categorias).

---

## LOTE A — ajustes pontuais (texto/estrutura)

### A1. Vesícula biliar — lógica completa (ABDOMEN_TOTAL + ABDOMEN_SUPERIOR)
Ordem de decisão:
1. SEM vesícula → "Ausência da imagem da vesícula biliar (paciente submetida à colecistectomia)."
2. COM vesícula → SEMPRE iniciar "Vesícula biliar de topografia usual e parede fina"
   (default automático quando nada for dito), EXCETO alteração de parede.
3. Parede espessada (informada) → "parede espessada, medindo X cm no seu maior
   diâmetro". Conclusão: ressaltar espessamento + "Convém, a critério clínico,
   correlacionar com exames laboratoriais para investigação da possibilidade de
   colecistite."
4. "…apresentando" + cálculo único / imagem hiperecoica única / múltiplas
   imagens hiperecoicas (conforme ditado).
5. Mobilidade SEMPRE especificada quando informada: "móveis à mudança de
   decúbito" OU "imóveis à mudança de decúbito".
6. "a menor medindo X cm" é OPCIONAL — só quando medida informada (NUNCA
   placeholder aqui; omitir a cláusula).
7. Final: "ocasionando sombra(s) acústica(s)" — NUNCA "com sombras acústicas".
8. Conclusão com imagens compatíveis com cálculos: "Litíase da vesícula biliar."
Aplicar em: phrases/ABDOMEN_TOTAL.ts (renderer) + schema (campo mobilidade +
tipo parede_espessada) + blocos regra de ABDOMEN_TOTAL e ABDOMEN_SUPERIOR.

### A2. Abdome total com Doppler — título
Acrescentar título "ULTRASSONOGRAFIA DO ABDOME TOTAL COM DOPPLER COLORIDO" no
template doppler (template_body + bloco modelo). Manter como variante/rota do
ABDOMEN_TOTAL (decisão de implementação autorizada).

### A3. Abdome total padrão — comentários
"A documentação fotográfica foi obtida em 12 fotos, segundo…" →
"A documentação fotográfica foi obtida segundo…" (remover "em 12 fotos").
Aplicar em template_body padrao + bloco modelo.

### A4. DOPPLER_OBSTETRICO — frase pós-título OPCIONAL
"Primeira ultrassonografia realizada em DD/MM/AAAA com X semanas e Y dias.
Hoje com X semanas e Y dias." — data SEMPRE numérica (mesmo ditada por
extenso); IG com zero dias omite "e zero dias". Restante do modelo ok.

### A5. DOPPLER_RENAL — estrutura
COMENTÁRIOS logo após o título; frase da documentação fotográfica VOLTA para
os comentários (estava no fim). Conclusão simplificada:
1. "Artérias renais com fluxo preservado bilateralmente, sem evidência
   ecográfica de estenose hemodinamicamente significativa."
2. "Índices de resistência intrarrenais dentro dos limites da normalidade."

### A6. DOPPLER_VENOSO_MMII completo — comentários
Encerrar os comentários na frase "Compressão distal manual aplicada."
(cortar o excesso repetitivo depois disso).

### A7. DOPPLER_VENOSO_MMII protocolo TVP
- Conclusão de item ÚNICO sem numeração "1)".
- "OS SEGUINTES ASPECTOS": menos fragmentado — frase fluida única ou uma
  frase por vaso; reduzir repetição.

### A8. ESCROTAL
- Conferir se o modelo do showcase é o padrão ou um com achados (varicocele).
- Frases do plexo: "Veias do plexo pampiniforme esquerdo de calibre aumentado,
  medindo até 3,2 mm, com refluxo à manobra de Valsalva com duração maior do
  que um segundo." + linha seguinte "Veias do plexo pampiniforme direito de
  calibres normais."

### A9. GLANDULAS_SALIVARES — estrutura
Falta COMENTÁRIOS; depois "OS SEGUINTES ASPECTOS FORAM OBSERVADOS" com as
glândulas avaliadas. Conclusão de item único sem "1)".

### A10. PROSTATA_SUPRAPUBICA
- Título: "ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)".
- Conclusão: só "peso aproximado de Y g" (remover redundância volume+peso).
- Corpo, abaixo da bexiga:
  "Bexiga de paredes finas, ecotextura homogênea e contornos regulares."
  "Volume pré-miccional de X ml."
  "Próstata medindo X x X x X cm." (formato 5,1 x 4,4 x 3,9 cm)
- REMOVER "lobo médio protruso" → "Índice de protrusão prostática (IPP) mede
  X cm." (opcional). Na conclusão, graduar: Grau 1 ≤0,5cm; Grau 2 >0,5–1,0cm;
  Grau 3 >1,0–1,5cm.

### A11. TIREOIDE com Doppler
Remover referência ao padrão Chammas (não faz parte do modelo). Resto ok.

### A12. TIREOIDE padrão
- Corpo NÃO usa "nódulo": "Lobo direito medindo X x X x X cm, com volume de
  X ml, apresentando imagem isoecoica, de contornos regulares, mais larga do
  que alta, sem calcificações, medindo X x X x X cm, situada no terço médio."
- Remover "parênquima homogêneo" dessa parte.
- Conclusão: "Tireoide de volume normal, sem evidência de alteração
  estrutural" SÓ sem nódulo/cisto. Com nódulo/cisto:
  1. Tireoide de volume normal (volume TOTAL incluindo istmo).
  2. Achado do lobo ("Lobo direito apresentando nódulo…").

---

## LOTE B — rework (pesquisa na fonte + spec nova)

### B1. MORFOLOGICO 1º trimestre — 🔴 estrutura quebrada
Sintoma no showcase: sem COMENTÁRIOS e sem OS SEGUINTES ASPECTOS FORAM
OBSERVADOS; frase de comentários vazou pro fim da conclusão.
Corrigir usando o PROMPT ANTIGO fornecido pelo Luiz (íntegra abaixo na
seção "Anexo — prompt morfológico"), extraindo o que for pertinente:
modelo padrão 1t completo (CCN por extenso, TN, osso nasal, ducto venoso
trifásico, uterinas + IP médio, conclusão de 4 itens) + regras específicas
(onda reversa, osso nasal ausente, hematoma perigestacional etc).
Validar 2t contra o mesmo prompt (modelo + regras de ossos longos bilaterais,
ordem anatômica, placenta por idade gestacional, circular de cordão,
pielectasia, peso/percentil PIG/GIG).

### B2. OBSTETRICA gemelar — spec nova (Luiz)
- Título: "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR".
- 1ª frase personalizada: quantidade ("Dois fetos…", "Três fetos…") +
  individualização: "O feto da direita (feto A), em situação transversa com
  polo cefálico à esquerda, e o feto da esquerda (feto B), em apresentação
  pélvica com dorso à direita." (apresentação/dorso/polo conforme ditado).
- BCF, considerações anatômicas e biometria INDIVIDUALIZADOS por feto
  (Feto A. / Feto B.).
- No corpo, antes das placentas: peso de cada feto, peso médio, divergência
  ponderal em gramas e em %.
- Placentas: quantidade primeiro ("Placenta única."/"Duas placentas."), depois
  localização e ecotextura. Maior bolsão vertical: já ok.
- Conclusão item 1 OBRIGATÓRIO com IG: "Gestação gemelar dicoriônica e
  diamniótica em torno de X semanas e Y dias." (corionicidade conforme ditado).
- Item de placentas geralmente NÃO existe → substituir por comparação
  ponderal: "O feto da esquerda é discretamente menor que o feto da direita,
  sem divergência ponderal significativa."
- Conclusão do líquido: explicitar válido PARA AMBOS os fetos.

### B3. DOPPLER_ARTERIAL_MMII — 🔴 modelo cru, rework
- Título individualizado por membro: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO
  ARTERIAL DO MEMBRO INFERIOR DIREITO" / "…ESQUERDO" (regra geral: MMII/MMSS
  sempre individualizados por membro).
- Acrescentar seção COMENTÁRIOS (recebe as informações introdutórias).
- Remover índice tornozelo-braquial (não é ultrassonográfico).
- Corpo ("OS SEGUINTES ASPECTOS…") descritivo: imagens hipo/hiperecoicas
  aderidas às paredes arteriais, velocidades de fluxo por vaso, demais
  características. SEM repetir na conclusão.
- Conclusão = só resumo diagnóstico. Ex.: "Doença aterosclerótica difusa no
  membro inferior esquerdo, sem estenoses hemodinamicamente significativas."
- Aplicar a TODOS os modelos de Doppler arterial. Revisar da fonte
  ~/laudousg (suspeita de modelos nunca efetivamente construídos) — usar
  dex1/dex2 para estruturar modelos coerentes.

### B4. Musculoesquelético — consolidação
- EXCLUIR categoria MUSCULOESQUELETICO (antiga, importada); manter SÓ
  MUSCULOESQUELETICO_V2 e renomeá-la para o nome normal "Musculoesquelético".
- Modelo inadequado: revisar DIRETO da fonte ~/laudousg (prompt do
  musculoesquelético V2 em lib/categoryDefaults.ts).
- Bug atual: conclusão repete o corpo; deve ter 2 itens (ex.: 1. achado
  principal; 2. "Não há sinais de ruptura do manguito rotador direito.").

---

## Validação por item
Após cada lote: regenerar amostras afetadas no showcase (botão ↻ ou script
com SHOWCASE_FILTER) + golden onde existir. Luiz revalida visualmente.

## Anexo — prompt morfológico antigo (referência para B1)
Fornecido na íntegra pelo Luiz em 2026-06-12; pontos-chave: estrutura fixa
COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM OBSERVADOS / CONCLUSÃO; 1t com 06
fotos, CCN por extenso, TN, osso nasal, ducto venoso trifásico, uterinas com
IP médio, conclusão (IG, ducto venoso, morfologia p/ a fase, uterinas); 2t com
18 fotos, ordem anatômica fixa, ossos longos bilaterais, análise extra-fetal
(cordão 2a1v, placenta por IG, ILA, colo), regras de inserção baixa, circular
de cordão, pielectasia, PIG/GIG; formatação: manter todos os campos mesmo sem
dado, ponto decimal, 12–14 semanas → modelo de 1t, linguagem neutra.
(Texto integral arquivado pelo Luiz; transcrição operacional nos blocos.)
