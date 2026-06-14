# Curadoria Luiz — 2026-06-14 (bugs obstétricos PROD + showcase MAMARIA)

> Backlog FIEL do feedback do Luiz (2026-06-14). Duas frentes:
> **A. Bugs obstétricos em PRODUÇÃO (críticos — OBSTETRICA/MORFOLOGICO estão LIVE).**
> **B. Curadoria MAMARIA (flag OFF — refinar antes de ligar).**

---

## PRINCÍPIOS TRANSVERSAIS (valem para TODAS as categorias)

- **P1 — Obrigatório nunca some.** Informação obrigatória do modelo NUNCA é
  removida silenciosamente. Se for opcional, o Luiz avisa explicitamente. Caso
  contrário, permanece SEMPRE — com **placeholder** quando houver dificuldade de
  interpretação. (Ex.: saco gestacional/DSM no obstétrico inicial.)
- **P2 — Não assumir unidade errada.** O sistema deve assumir que o que o médico
  falou está CORRETO. Conversão de unidade SÓ quando: (a) o médico informar
  explicitamente a unidade em cm, E (b) houver regra específica daquele exame
  que exija mm. Nunca "corrigir" a unidade por conta própria.
- **P3 — Uma casa decimal em todas as medidas**; preservar o zero decimal falado
  ("1,0" não pode virar "1"; "6,0" não pode virar "6"). [Parte é Deepgram:
  avaliar preservar o zero quando explicitamente dito.]
- **P4 — Corpo não repete a conclusão.** A seção "OS SEGUINTES ASPECTOS FORAM
  OBSERVADOS" descreve os achados; não copia o texto da CONCLUSÃO.
- **P5 — Zero alucinação.** Nunca acrescentar dado não fornecido (ex.: "feto A",
  "ambos os fetos" num exame de feto único).

---

## FRENTE A — BUGS OBSTÉTRICOS EM PRODUÇÃO (🔴 CRÍTICO)

> **Status 2026-06-14:** A1, A2, A3 corrigidos no código + typecheck limpo + testes
> `obstetrica.manual.ts` 8/8 (A1/A3 determinísticos). **A2 é correção de PROMPT
> (LLM) → precisa validação E2E com chave/prod.** Os 3 só chegam em prod após
> deploy (@devops). Categorias OBSTETRICA/MORFOLOGICO seguem LIVE.

### A1 — DSM / saco gestacional obrigatório SUMINDO (obstétrico inicial) ✅
**Fix:** `OBSTETRICA.ts` ~407 — removida a condição `&& saco_gestacional_mm !== null`;
no inicial a linha SEMPRE aparece (placeholder `____` se sem valor). _Pendente
(melhoria): calcular DSM a partir das 3 medidas — exige estender schema/prompt._
- Luiz pediu o cálculo do **diâmetro médio do saco gestacional (DMSG/DSM)** num
  exame obstétrico inicial → a frase do saco gestacional + DSM foi **removida**
  do laudo. O resto saiu correto.
- No obstétrico inicial essa frase **NÃO é opcional** → viola P1.
- Esperado: permanecer sempre (placeholder se houver dificuldade). Ver `dsmGuard.ts`.

### A2 — Conversão de unidade INDEVIDA (viola P2) ⚠️ (prompt — validar E2E)
**Fix:** prompts de extração `OBSTETRICA.ts` (regra 4 + 10) e `MORFOLOGICO.ts`
(regra 2) reescritos: não assumir unidade; só converter cm→mm quando "cm" for
explícito; preservar casa decimal ("2,4"→2.4, "4,1"→4.1, nunca 24/41). É
instrução de LLM → confirmar com ditado real (chave OpenAI/prod).
- **CCN:** Luiz ditou "CCN 2,4" (sem unidade, querendo dizer 2,4 mm). O sistema
  assumiu cm e converteu para **24 mm**. ERRADO — gerou medida ~10x.
- **Maior bolsão vertical:** ditado "4,1 cm" saiu como **"41 cm"** (perda da
  vírgula/decimal → ×10). Visível na imagem do app.
- Regra: NÃO assumir unidade; só converter cm→mm quando a unidade cm for dita E
  a regra do exame exigir. Investigar onde há conversão no structurer/guards/render.

### A3 — Alucinação GEMELAR em exame de FETO ÚNICO (viola P5) ✅
**Fix:** `OBSTETRICA.ts` `liquido()` — feto único (`numero_fetos < 2`) com MBV
agora sai "Maior bolsão vertical de X cm." (corpo) e "...em quantidade normal
(maior bolsão vertical de X cm)." (conclusão), SEM "(feto A)" nem "ambos os
fetos". Gemelar (≥2) mantém individualização.
- Exame obstétrico simples, biometria de **1 feto**. No fim saiu:
  - Corpo: "Maior bolsão vertical de 4,1 cm **(feto A)**."
  - Conclusão: "Líquido amniótico em quantidade normal **para ambos os fetos**
    (maior bolsão vertical de 4,1 cm (feto A))."
- Não havia menção a gestação gemelar → "(feto A)" e "ambos os fetos" foram
  inventados. Investigar `amnioticFluidGuard.ts` + render OBSTETRICA + detecção
  de gemelar.

---

## FRENTE B — CURADORIA MAMARIA (showcase do boletim 2026-06-14)

> **Status 2026-06-14 — ✅ APROVADO pelo Luiz.** Os 9 ajustes (#3,4,5,7,8,16,17,
> 18,20) + regra de fotos + P3 (1 casa decimal, helper `med()`) aplicados em
> `MAMARIA.ts`; boletim revisado e aprovado. **GOLDEN criado** (`mamaria-golden.
> manual.ts`, 28 asserções verdes) travando as decisões. **Item 3 confirmado:** a
> frase "Não há sinais evidentes de imagem nodular sólida, cística ou complexa."
> aparece em calcificações E ginecomastia (decisão Luiz "pode colocar nas duas").
> **Frente A também APROVADA.** Próximo: @devops liga `RENDERER_CATEGORIES +=
> MAMARIA` + deploy dos fixes obstétricos. A2 (unidade) validar E2E pós-deploy.

> Regra geral aplicável a TODOS os modelos (não só MAMARIA): nos COMENTÁRIOS,
> **remover a quantidade de fotos** — "A documentação fotográfica foi obtida em
> 06 fotos, segundo..." → "A documentação fotográfica foi obtida segundo...".

| # | Veredito | Ajuste |
|---|----------|--------|
| 1 | ✅ aprovado | só remover "em N fotos" |
| 2 | ✅ aprovado | só remover "em N fotos" |
| 3 | ⚠️ cistos bilaterais | descrever a MAIOR de CADA mama separadamente (não "ambas as mamas… a maior"). Corpo: "Imagens anecoicas de mama direita, com margens circunscritas, a maior medindo 0,6 x 0,5 x 0,5 cm, situada no quadrante superolateral às "11 horas", distando 0,9 cm do seu centro até a pele e 1,4 cm até o mamilo." + linha análoga p/ mama esquerda. Conclusão: "Cistos mamários simples bilateralmente" (NÃO "em ambas as mamas"); acrescentar "subcentimétricos" se maior eixo < 1 cm → "Cistos mamários simples bilateralmente, subcentimétricos (Categoria BI-RADS® 2)." |
| 4 | ⚠️ microcistos agrupados | padrão: "Imagens anecoicas de mama esquerda, **coalescentes**, com margens circunscritas, **medindo em conjunto** 1,2 x 1,0 x 0,9 cm, situadas no quadrante superolateral às "10 horas", distando 0,8 cm do seu centro até a pele e 3,0 cm até o mamilo." (1 casa decimal — P3) |
| 5 | ⚠️ cisto complicado | nomenclatura "**Cisto de conteúdo espesso**" (não "cisto complicado"). Conclusão: "Cisto de conteúdo espesso em mama direita no quadrante superolateral (Categoria BI-RADS® 3)." Corpo: descrever se os finos ecos internos são **móveis** ou formam **nível líquido-líquido** → "Imagem anecoica, com finos ecos internos que formam nível líquido-líquido, de mama direita…" |
| 6 | ✅ aprovado | (trauma) |
| 7 | ⚠️ calcificações grosseiras | corpo NÃO repete a conclusão (P4). Em vez de "Calcificações grosseiras medindo até 0,4 cm…": "Imagens hiperecoicas, medindo até 0,4 cm no seu maior eixo, ocasionando sombra acústica, mais evidentes na mama esquerda." (ou singular: "Imagem hiperecoica, medindo 0,4 cm no seu maior eixo, ocasionando sombra acústica."). Conclusão mantém. |
| 8 | ⚠️ microcalcificações | corpo NÃO repete conclusão (P4): "Imagens hiperecoicas puntiformes, que não ocasionam sombras acústicas, agrupadas em mama direita, no quadrante superolateral, às "10 horas"." Conclusão mantém. |
| 9 | ✅ (boletim: sólido benigno=3) | — |
| 10–15 | ✅ aprovados | — |
| 16 | ⚠️ NML | usar **2 medidas** (não 3): "Área heterogênea de mama direita, sem configuração nodular, medindo aproximadamente 2,4 por 2,0 cm, situada no quadrante superolateral, às "11 horas"." Conclusão mantém. |
| 17 | ⚠️ ginecomastia | corpo: remover "compatível com ginecomastia" → "Mama esquerda com aumento do tecido fibroglandular retroareolar." (diagnóstico fica só na conclusão). |
| 18 | ⚠️ próteses | a frase "Não há sinais evidentes de imagem nodular sólida, cística ou complexa." é OBRIGATÓRIA no corpo — NÃO remover (P1). **Plano cirúrgico OPCIONAL**: se ditado, especificar — "Próteses mamárias em topografia habitual, predominantemente retromusculares, de contornos regulares, sem sinais ecográficos de rotura intracapsular ou extracapsular."; se nada dito, manter o padrão atual. |
| 19 | ✅ aprovado | (correlação mamografia) |
| 20 | ⚠️ conduta | a conduta NÃO fica dentro da CONCLUSÃO. Após os linfonodos axilares, pular linha e criar seção própria: "Conduta sugerida:" + "BI-RADS 4C. Biópsia para avaliação histopatológica." Sem redundância "Conduta sugerida" + "recomenda-se" (usar só uma forma). |

### Nota sobre o boletim 4A/4B/4C/5
Os casos 9–15 da escalada do sólido foram **aprovados** (10–15 ok). A gradação
em si passou; os ajustes da MAMARIA são de FRASES/estrutura, não da heurística
de BI-RADS.

---

## Ordem de execução sugerida
1. 🔴 **A2 (unidade)** e **A3 (gemelar)** — risco clínico direto em prod.
2. 🔴 **A1 (DSM obrigatório)** — perda de informação obrigatória em prod.
3. ⚙️ **Regra global de "fotos"** (todos os modelos) — rápida e transversal.
4. 🎨 **MAMARIA #3,4,5,7,8,16,17,18,20** — refinar frases no renderer → regenerar
   boletim → Luiz reconfere → golden → ligar flag.
