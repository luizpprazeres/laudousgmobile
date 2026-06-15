# Modelos objetivo (nReport) — referência para o renderer estilo OBJETIVO

> Capturado do nReport (app-nreport.ionic.health) via Playwright, 2026-06-14.
> Fonte do **estilo OBJETIVO** do renderer. Estrutura do nReport: **TÉCNICA /
> ANÁLISE / OPINIÃO** (≠ Clássico que usa COMENTÁRIOS / OS SEGUINTES ASPECTOS /
> CONCLUSÃO). Captura incremental por categoria conforme os sprints.

## ⚠️ Decisões pendentes (Luiz)
1. **Nomenclatura das seções:** nReport usa `TÉCNICA / ANÁLISE / OPINIÃO`; o Luiz
   havia dito `TÉCNICA / ACHADOS / IMPRESSÃO`. Definir qual padronizar.
2. **Escore de nódulo tireoidiano:** nReport usa **TI-RADS (ACR)**; o renderer
   CLÁSSICO usa **escore de Domingos**. No OBJETIVO: TI-RADS, Domingos, ou ambos?

---

## TIREOIDE — objetivo (nReport)

### Estrutura / painéis da UI (campos do "modelo web sem IA")
- Estado glândula: **Normal | Tireoidopatia | Tireoidectomia**
- Medidas por **Lobo direito / Lobo esquerdo / Istmo** (3 medidas cada) + **Volume** (mm³) + **Volume total**
- Achados: **CISTO**, **NÓDULO** (com **MEDIDA**, **PUNÇÃO**, **TI-RADS**)
- **LINFONODOMEGALIAS** (Linfonodomegalia / Linfonodos proeminentes / Nível Cervical)
- ACHADOS ADICIONAIS · INDICAÇÃO · ASSINATURA

### Modelo NORMAL (verbatim capturado)
```
ULTRASSONOGRAFIA DA TIREOIDE

TÉCNICA:
Exame realizado com transdutor linear de alta frequência.

ANÁLISE:
Glândula tireoide tópica, de dimensões normais e contornos preservados.
Parênquima tireoidiano com ecotextura homogênea. Não foram caracterizadas lesões sólidas ou císticas.
Lobo direito da tireoide:
Lobo esquerdo da tireoide:
Istmo:
Volume total:

Não há evidência de linfonodomegalias.

OPINIÃO:
Estudo ultrassonográfico dentro dos padrões da normalidade.
```

### Alterados (nódulo / cisto / tireoidopatia)
> A capturar (interação dinâmica no TinyMCE — pendente). Pode ser fornecido pelo
> Luiz (colar) OU re-capturado após as decisões acima.

---

## OBSTETRICA — objetivo (nReport) — Sprint 2

> Capturado de "Obstétrico (2º e 3º trimestre)" (`/laudos/obsTransSegTerc`),
> 2026-06-14, via Playwright. O nReport usa `Técnica:` + `OS SEGUINTES ASPECTOS
> FORAM OBSERVADOS:` + `CONCLUSÃO:`. **Decisão Luiz (estilo OBJETIVO):** padronizar
> em `TÉCNICA: / ACHADOS: / IMPRESSÃO:` (mais enxuto). O conteúdo abaixo é a
> referência clínica das frases — o renderer OBJETIVO reusa 100% a extração e os
> cálculos determinísticos já existentes (peso médio/divergência, DSM, líquido).

### Modelo NORMAL (verbatim capturado — feto único, 2º/3º trimestre)
```
ULTRASSONOGRAFIA OBSTÉTRICA

Técnica:
Exame realizado com transdutor convexo multifrequencial.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Útero globoso e proeminente, apresentando no seu interior 1 feto.

Feto localizado em situação ***, apresentação ***, com posição de dorso à ***.
Movimentos corpóreos e batimentos cardíacos presentes.
Frequência cardíaca em torno de *** bpm.

Biometria Fetal:
Diâmetro biparietal (DBP): *** mm.
Diâmetro occiptofrontal (DOF): *** mm.
Circunferência cefálica (CC): *** mm.
Circunferência abdominal (CA): *** mm.
Comprimento umeral (CUM): *** mm.
Comprimento femoral (CF): *** mm.
Peso fetal em torno de *** gramas (+/- 15%).

ANATOMIA FETAL
Crânio: ** / Sistema Nervoso Central: ** / Tórax: ** / Coração: **
Parede Abdominal: ** / Abdome: ** / Aparelho Urinário: ** / Cordão Umbilical: **

Placenta:
Localização ***, com aspecto compatível com grau *** de Grannum. Espessura de *** mm.

Cordão umbilical:
Inserção fetal e placentária preservadas. Presença de 2 artérias e 1 veia.

Líquido amniótico:
Volume de líquido amniótico subjetivamente normal.

CONCLUSÃO:
Gestação única, tópica e de concepto vivo.
1. Este exame não tem o objetivo de analisar anatomia fetal detalhada (...);
2. Alguns fatores como a estática fetal (...) podem limitar a acurácia do exame;
```

---

## MORFOLOGICO — objetivo (nReport) — Sprint 2

> Capturado de "Morfológica (1º trimestre)" (`/laudos/morfoPrim`) e "Morfológica
> (2º trimestre)" (`/laudos/morfoSeg`), 2026-06-14. nReport (1t) usa `TÉCNICA: /
> ANÁLISE: / OPINIÃO:`; (2t) usa cabeçalhos de seção + `CONCLUSÃO:`. **Estilo
> OBJETIVO do renderer:** `TÉCNICA: / ACHADOS: / IMPRESSÃO:`.

### Modelo NORMAL — 1º trimestre (verbatim capturado, resumido)
```
ULTRASSONOGRAFIA MORFOLÓGICA DO 1º TRIMESTRE

TÉCNICA:
Exame realizado com transdutor convexo multifrequencial.

ANÁLISE:
MEDIDAS DO PRIMEIRO TRIMESTRE
Comprimento cabeça-nádegas (CCN): ** mm
Translucência nucal (NT): ** mm (percentil ** %)
Osso nasal: **
Ducto venoso com onda A ** e índice de pulsatilidade (IP) de **, no percentil **.
Batimentos cardíacos fetais (BCF): ** bpm
Líquido amniótico: **

ANATOMIA FETAL
Crânio / cérebro / Coluna / Coração / Abdome / Estômago / Bexiga / rins / Mãos / Pés

PLACENTA
Localização ***, com aspecto compatível com grau *** de Grannum.

CORDÃO UMBILICAL
Inserção fetal e placentária, preservadas. Presença de 2 artérias e 1 veia.

OPINIÃO:
Gestação única, tópica, de concepto vivo.
Biometria atual compatível com ** semanas e ** dia (variação de até +/- 5 dias) (Hadlock et al).
```

### Modelo NORMAL — 2º trimestre (verbatim capturado, resumido)
```
ULTRASSONOGRAFIA MORFOLÓGICA DO 2º TRIMESTRE

Feto único em apresentação ***, com dorso à ***.
Movimentos corpóreos e batimentos cardíacos presentes.
Frequência cardíaca em torno de *** bpm.

AVALIAÇÃO DO CRESCIMENTO FETAL
Diâmetro biparietal (DBP): *** mm. (...) Comprimento femoral (CF): *** mm.
Peso fetal em torno de **** gramas (+/- 15%).

BIOMETRIA COMPLEMENTAR
Cerebelo / Cisterna magna / Átrio ventricular / Úmero / Rádio / Ulna / Tíbia / Fíbula: *** mm.

CRÂNIO E SISTEMA NERVOSO CENTRAL / FACE / TÓRAX / CORAÇÃO / ABDOME / GENITÁLIA / COLUNA / EXTREMIDADES
(blocos de frases de normalidade anatômica)

PLACENTA
Localização ***, com aspecto compatível com grau *** de Grannum.

CORDÃO UMBILICAL
Inserção fetal e placentária, preservadas. Presença de 2 artérias e 1 veia.

LÍQUIDO AMNIÓTICO
Volume normal de líquido amniótico (maior bolsão vertical: ** cm).

CONCLUSÃO:
Gestação única, tópica, de concepto vivo, compatível com ** semanas e ** dias.
Biometria atual compatível com ** semanas e ** dia (variação de até +/- 5 dias) (Hadlock et al).
```
