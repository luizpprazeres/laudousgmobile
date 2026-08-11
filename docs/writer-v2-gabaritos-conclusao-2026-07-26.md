# Writer V2 — Gabaritos de CONCLUSÃO (renderer) para os specs obst/pelve

Extraídos do RENDERER (a autoridade do estilo) rodando findings normais, sem LLM.
Os specs V2 devem reproduzir ESTES textos. Onde o renderer combina/condiciona/calcula,
ver as notas. Decisão do Luiz (26/07): refazer os specs batendo no gabarito.

## PELVE_FEMININA (via ta_tv, tudo normal)

```
1) Bexiga ecograficamente normal.
2) Útero de volume normal (75,3 cm³).
3) O endométrio tem espessura normal para a fase do ciclo menstrual.
4) Ovários ecograficamente normais (o direito com 6,9 cm³ e o esquerdo 6,8 cm³), ambos contendo folículos.
```

Notas:
- **Bexiga = CONDICIONAL à via.** TA/TA+TV → entra (item 1). TV puro → NÃO entra
  (nem no corpo nem na conclusão). pos_abortamento tem lógica própria. O writer V2
  não recebe "via" estruturada — modelar a bexiga como item que só aparece quando o
  ditado indica via abdominal/repleção; se não der p/ inferir com segurança, FLAG p/ Claude.
- **Útero:** "Útero de volume normal (VOL cm³)." O volume é CALCULADO pelo renderer das
  medidas. O V2 não calcula — quando o médico ditar medidas, o plano preenche; sem medida,
  usar "Útero de volume normal." (sem o parentético) OU placeholder. Alinhar com Claude.
- **Ovários = 1 ITEM COMBINADO** quando ambos normais: "Ovários ecograficamente normais
  (... volumes ...), ambos contendo folículos." Quando UM está alterado, o renderer
  SEPARA (item do alterado + item do normal). No modelo por-slot isto é o ponto difícil:
  modelar um slot de conclusão combinado p/ o normal e usar o dicionário p/ o caso separado;
  se não couber fielmente, FLAG p/ Claude (não aproximar em silêncio).
- Endométrio: a frase normal varia por contexto (menopausa/TRH/fase). Modelar as variações
  como entradas achado→conclusao no dicionário, iguais ao renderer (linhas ~600-617 do
  PELVE_FEMININA.ts). NÃO inventar.

## OBSTETRICA (feto único, 30 sem, sem placenta/líquido ditados)

```
1) Gestação em torno de 30 semanas.
2) Líquido amniótico em quantidade normal.
```

Notas:
- **Gestação + IG = 1 ITEM SÓ:** "Gestação em torno de X semanas." (NÃO separar em
  "feto vivo" + "idade gestacional"; NÃO usar "tópica única"/"feto vivo" no normal).
  Gemelar muda o lead ("Gestação gemelar [corionicidade] em torno de..."). X vem da
  biometria (placeholder ____ quando não ditado).
- **Placenta = CONDICIONAL:** NÃO entra no normal. Só quando ditada (grau/localização/
  ecotextura). Modelar como item condicional (slot sem frase_conclusao + conclusao no plano).
- Líquido: "Líquido amniótico **em** quantidade normal." (preposição "em"). Classes
  (oligo/poli) via dicionário, iguais ao renderer.

## MORFOLOGICO (2t, 22 sem, sem placenta/líquido ditados)

```
1) Gestação em torno de 22 semanas.
2) Líquido amniótico de quantidade normal.
3) Morfologia fetal sem evidência de alteração detectável pelo método.
```

Notas:
- Mesma regra de Gestação+IG num item (item 1).
- Líquido: "Líquido amniótico **de** quantidade normal." — ATENÇÃO: aqui é **"de"**,
  DIFERENTE da OBSTETRICA que é **"em"**. Reproduzir cada um como o gabarito.
- Placenta CONDICIONAL (não entra no normal).
- Morfologia: item fixo "Morfologia fetal sem evidência de alteração detectável pelo método."
- 1º trimestre tem morfologia diferente ("Morfologia fetal normal para esta fase") + TN/DV/
  osso nasal. Ver render1t. Modelar por trimestre se o spec cobrir 1t.

## DOPPLER_OBSTETRICO

NÃO tem renderer-gabarito. A referência são os golden cases validados. Revisar separado.

## Ferramentas do motor disponíveis (commit 4d6ee4b)

- `SpecSlot.frase_conclusao` — item SEMPRE-presente (normal; achado substitui).
- Slot SEM frase_conclusao + `conclusao` no plano → item CONDICIONAL (só quando ditado).
- `contract.conclusao_ordem` — ordem da conclusão (desacoplada da ordem do corpo).
- `plan.conclusao` (avulsos) — itens que não nascem de um slot.
- `dictionary[].conclusao` — diagnóstico por achado (substitui o item normal do slot).
