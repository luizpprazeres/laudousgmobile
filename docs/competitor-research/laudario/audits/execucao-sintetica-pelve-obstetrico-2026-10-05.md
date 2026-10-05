# Execução sintética no LaudoUSG — pélvico transvaginal e obstétrico 2º/3º trimestre

Data: 05/10/2026. **O Laudário não foi observado nesta rodada.** O navegador continuou indisponível na sessão, então a parte funcional do concorrente segue pendente. Em seu lugar, o caminho Web real do LaudoUSG foi executado com dados sintéticos. O formulário passa pelo adaptador e pelo renderer do catálogo, e o ditado gemelar foi testado direto no renderer da API. Os itens que os preflights marcavam como `inferido` passaram a `observado no LaudoUSG`.

Base: `4d5ad45`. Scripts reproduzíveis em `audits/probes/probe-pelve-2026-10-05.ts` e `audits/probes/probe-obst-2026-10-05.ts`. Para executá-los, rode `npx tsx` a partir de `apps/api` num checkout com dependências instaladas. Nenhum código foi alterado.

Cada linha segue a cadeia `controle → estado → corpo → conclusão`. Os textos do LaudoUSG aparecem resumidos, sem transcrição integral.

## Pélvico transvaginal (caminho Web: `adaptarPelve` → `renderizarSelecao`)

| Cenário | Controle e estado | Corpo | Conclusão | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| P1 — estado inicial, via TV, nenhuma medida | estado inicial do formulário; `volume_classe: normal` e `frase: padrao` pré-marcados (`apps/web/src/lib/deterministic/organs/pelveFeminina.ts:132`, `:237`) | útero, endométrio e ovários com `____`; ovários “com imagens anecoicas” sem dado | útero “de volume normal (____ cm³)”, endométrio normal para a fase do ciclo, ovários normais “contendo folículos” | nenhuma | **defeito**: normalidade completa sem uma única medida e sem bloqueio |
| P2 — menopausa + endométrio 1,2 cm | checkbox Menopausa; espessura 1,2 | endométrio 1,2 cm; ovários iguais ao P1 | endométrio “normal para a faixa etária da menopausa”; ovários “contendo folículos” | nenhuma | **defeito P0**: a medida não influencia a conclusão. A Web não usa a variante “praticamente sem folículos”, que existe no renderer (`apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:872`) e no ditado |
| P3 — adenomiose + mioma 3,0 × 2,5 × 2,0 cm | Adenomiose marcada; Mioma 1 com medidas e parede posterior | o miométrio descreve só a adenomiose; **o mioma não aparece no corpo** | itens de nódulo miomatoso e de adenomiose | nenhuma | **defeito P0**: a conclusão cita um achado sem base no corpo e sem medida |
| P4 — útero 10,0 × 7,0 × 7,0 cm | medidas; classe mantida no padrão | medidas | “Útero de volume normal (256,3 cm³)” | nenhuma | **defeito P1**: a classe não é derivada nem confrontada com o volume calculado |
| P5 — ovário direito não visualizado | `visualizado: nao` | ovário direito não visualizado | item próprio do lado direito; esquerdo normal com `____` | nenhuma | correto quanto à lateralidade; **lacuna**: sem motivo (técnica, atrofia, cirurgia) |

## Obstétrico 2º/3º trimestre (caminho Web: `adaptarObstetrica` → `renderizarSelecao`)

| Cenário | Controle e estado | Corpo | Conclusão | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| O1 — estado inicial, nada preenchido | estado inicial de todos os módulos | feto único cefálico, BCF presente com `____ bpm`, movimentos ativos, crânio, coluna, estômago e bexiga normais, biometria `____`, placenta normal e líquido subjetivo normal | IG `____` semanas; líquido normal | nenhuma | **defeito P1**: vitalidade, apresentação, anatomia, placenta e líquido afirmados sem nenhum dado (`apps/api/src/server/renderer/categories/OBSTETRICA.ts:899`, `:1283`, `:1438`) |
| O2a — 32s2d, PFE 1650 g, percentil 6 Intergrowth, sem Doppler, ILA 4 cm | Crescimento “Sim”, percentil 6, curva Intergrowth; Líquido ILA 4 | bloco de crescimento com curva e protocolo; ILA 4 cm | oligoâmnio; peso abaixo de p10 com classificação PIG/RCF incompleta | nenhuma | **correto** no caminho Web: o módulo do shared não fecha PIG sem Doppler. Diverge do snippet do writer usado no mobile |
| O2b — mesma biometria, crescimento não classificado | Crescimento “Não” (padrão) | peso sem percentil | sem item de crescimento | nenhuma | aceitável, mas a classificação de crescimento é opt-in e fácil de esquecer |
| O3 — gemelar DC/DA, MBV 1,2 cm (A) e 9,5 cm (B) | renderer da API com `liquido_tipo: mbv` e MBV por feto | MBV por feto com os dois valores | **“quantidade normal para ambos os fetos”** | n/a | **defeito P0** confirmado por execução (`OBSTETRICA.ts:965-971`): oligoâmnio em A e polidrâmnio em B concluídos como normais |

## Consequências para o estudo

- Os defeitos P0 de pelve (endométrio, achado sem par no corpo) e de obstétrico (MBV gemelar) independem do concorrente e podem virar story de correção agora.
- O caminho Web obstétrico de crescimento já é o comportamento desejado. O que falta é o writer e os apps obedecerem à mesma regra.
- A rodada funcional do Laudário continua pendente para os dois exames. As perguntas do concorrente estão nos preflights e na síntese de 05/10.
