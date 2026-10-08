# Cruzamento Laudário × LaudoUSG — Obstétrico 2º/3º Trimestre - Gemelar

Data: 07/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final ([caso](cases/obstetrico-gemelar-2026-10-07.md)). O LaudoUSG foi conferido em `main` `ca0b55e`, junto com a auditoria [audits/lote3/obstetrico-gemelar-2026-10-05.md](audits/lote3/obstetrico-gemelar-2026-10-05.md). Nenhum dado clínico real foi usado.

Rótulos:
- **observado**: visto na interface do Laudário;
- **observado-código**: visto no código do LaudoUSG;
- **inferido**: interpretação sem teste dedicado;
- **candidato a lacuna**: parece faltar, sem busca exaustiva;
- **gap confirmado**: ausência ou defeito comprovado no LaudoUSG.

## Síntese

O Laudário tem um gemelar estruturado:
- cabeçalho de corionicidade com amnionicidade condicional;
- massas placentárias como dado próprio;
- PFE, percentil e discordância calculados por feto;
- classe de líquido por saco.

Ele também repete dois problemas do feto único: defaults publicados como fatos e estado que sobra depois de mudar um controle.

No LaudoUSG, o gemelar existe só no ditado (renderer/writer), com os defeitos G‑1 a G‑5 ainda presentes. A Web não tem formulário gemelar, e a calculadora Barcelona MC do shared não é usada por nenhum produto.

| Tema | Laudário observado | LaudoUSG atual | Classificação |
| --- | --- | --- | --- |
| Abertura | Abre DC/DA, com 2 placentas, 2 bolsas e apresentações e dorsos por feto; BCF, cordão, líquido e placentas já viram fatos | Sem estado de vitalidade, o ditado gemelar afirma BCF presente com lacuna (`OBSTETRICA.ts:1214-1219`) | risco confirmado nos dois produtos (G‑3) |
| Corionicidade | Lista DC/DA, MC e indeterminada; amnionicidade só na MC; lambda/T opcional | Texto livre, sem amnionicidade, origem ou sinal (`OBSTETRICA.ts:119`) | gap confirmado (G‑8) |
| Placentas | Massas placentárias separadas; MC → única com sulco | Sem quantidade informada, assume o nº de fetos: "duas" na MC (`:868`, `:1559`) | gap confirmado (G‑2) |
| PFE e percentil | Hadlock IV com percentil de feto único, mantido também na MC | Ditado só ecoa peso e percentil se ditados (`:460`, `:862`); curva MC Barcelona existe mas está isolada (`packages/shared/src/calculators/monochorionicTwins.ts`) | gap confirmado de cálculo por feto; curva MC: vantagem latente do LaudoUSG (D‑G1) |
| Discordância | 4,4% e 25,3%, relativa ao maior peso, identificando o menor; faixas de atenção (≥ 20%) e significativa (≥ 25%) | Mesma fórmula em duas implementações (`calcPonderal` `:716-725` e `discordanciaGemelar`); um único corte de 20% (`:1259`, `:1684`); não diz qual feto é o menor; inclui feto sem vitalidade | gap confirmado (fonte dupla, G‑5); corte = decisão D‑G2 |
| Feto B < p3 | Conclui restrição tardia do B; alerta de restrição seletiva só na interface; recomendações sugeridas, não publicadas | Ditado conclui "divergência significativa" sem item por feto; `fetalGrowth.ts` trata < p3 como critério, mas é por exame, não por feto | candidato a lacuna (G‑6) |
| Líquido discordante na MC | Classe automática por saco (oligo A, poli B); nenhuma síndrome concluída | "Normal para ambos" sem classificar, em três fontes (renderer `:970`, catálogo `OBSTETRICA.classico.ts:963`, writer `OBSTETRICA.json:331`) | gap confirmado P0 (G‑1) |
| Transfusão feto-fetal | Campo de estado (ficou "ausente, sem critérios") + antecedentes | Não existe campo nem alerta | candidato a lacuna |
| Volta MC → DC | Indicador mostra 2 placentas, mas o texto mantém a única com sulco; as classes de líquido permanecem coerentes com os MBV ainda preenchidos | Sem formulário; sem teste equivalente | defeito confirmado apenas na placenta; requisito de não-regressão para o LaudoUSG |

## Cabeçalho da gestação

**Observado.** A amnionicidade aparece só quando a corionicidade a torna relevante. É um bom padrão: DC implica DA e evita uma combinação inválida. O sinal lambda/T é opcional. Não vimos campo de origem (exame atual ou 1º trimestre).

**Requisito (reforça a auditoria §6.1):** enum de corionicidade; amnionicidade obrigatória só na MC; sinal de membrana opcional; origem com data quando vier de exame anterior. A Web hoje fixa `numero_fetos: 1` e `corionicidade: null` (`apps/web/src/lib/catalog/obstetricaParaCatalogo.ts:238-239`).

## Placentas derivadas da corionicidade

**Observado.** A troca para MC tornou a placenta única. Na volta para DC, o controle e o texto divergiram.

**Requisito:**
- A quantidade de placentas deriva da corionicidade: MC = 1. Na DC, o médico escolhe 2 ou fundidas.
- O texto vem do estado salvo, nunca de um indicador recalculado em paralelo.
- Trocar a corionicidade invalida a escolha anterior e gera uma pendência. A escolha antiga não pode ser preservada em silêncio.
- No ditado, remover o fallback `placenta_quantidade ?? numero_fetos`.

## Crescimento por feto e discordância

**Observado.** O cálculo por feto bate exatamente com Hadlock IV, e a discordância bate com a fórmula do LaudoUSG. O diferencial do concorrente é a apresentação: o feto menor é identificado, há duas faixas e o alerta de restrição seletiva fica separado da conclusão.

**Inferido.** Concluir restrição tardia do B sem Doppler é coerente com PFE < p3 como critério isolado, o mesmo tratamento de `fetalGrowth.ts:177-178`. O concorrente não fecha restrição *seletiva* sozinho. Isso está alinhado à proposta de confirmação médica da auditoria (§6.5, `alerta_rcius`).

**Gap confirmado no LaudoUSG:**
- Não há PFE nem percentil calculados por feto no ditado.
- A divergência tem duas implementações.
- O feto sem vitalidade entra no cálculo.
- O texto não nomeia o feto menor.

## Curva em monocoriônicas

**Observado.** O Laudário mantém o Hadlock de feto único na MC.

**Observado-código.** O LaudoUSG já tem a curva MC Barcelona por sexo (24–40+6 semanas) e a CA precoce, sem consumidor.

**Inferido.** Esse pode ser um diferencial próprio, mas depende de D‑G1 (curva gemelar ou de feto único) e de tornar o sexo obrigatório quando a curva o exigir. Em DC, a curva continua sem definição.

## Líquido e transfusão feto-fetal

**Observado.** A classe automática por saco existe e funciona nos dois extremos testados. O estado de transfusão feto-fetal não mudou com 1,5/9,0 cm em 32 semanas.

**Inferido.** Esse estado pode ser só um default ou refletir um critério dependente da IG. Em critérios europeus, após 20 semanas o polidrâmnio exige MBV > 10 cm, então 9,0 cm não basta. A auditoria propôs cortes únicos de 2/8 cm para a discordância de líquido. Antes de qualquer alerta, eles precisam de revisão médica para a dependência da IG.

## Persistência de estado

**Observado.** A placenta única com sulco sobrou depois da volta para DC/DA, apesar do indicador resumido passar a duas placentas. As classes de líquido não contam como sobra porque os MBV permaneceram preenchidos.

**Requisito:** todo derivado (placenta, classe, alerta, recomendação) é recalculado a partir do estado atual. Apagar ou trocar uma entrada remove o texto derivado na hora, sem exigir reabrir.

## Melhorias sugeridas ao LaudoUSG

Ponto de partida: auditoria §6 (requisitos N fetos) e delta de 07/10 (calculadora MC isolada). Tudo depende de revisão médica antes de ativação clínica.

1. **P0, ditado (renderer, catálogo e writer juntos):**
   - classe de líquido por saco no lugar de "normal para ambos" (G‑1);
   - placenta derivada da corionicidade ou pendente (G‑2);
   - BCF sem estado vira pendência (G‑3);
   - validação de rótulo e contagem (G‑4).
   Corrigir uma só fonte mantém a falsa normalidade nas outras.
2. **P1, shared como autoridade única:**
   - PFE e percentil por feto;
   - discordância por par, identificando o menor e excluindo feto sem vitalidade;
   - remover `calcPonderal` em favor de `discordanciaGemelar` ou de um sucessor comum.
3. **P1, faixas e alertas:**
   - duas faixas de discordância como no concorrente (cortes = D‑G2);
   - alertas de restrição seletiva e transfusão feto-fetal fora da conclusão até confirmação médica (D‑G3);
   - critério de transfusão feto-fetal sensível à IG, se aprovado.
4. **P1, Web:**
   - cabeçalho com amnionicidade condicional, massas placentárias e origem;
   - abas por feto sem defaults que viram fato;
   - adaptador `numero_fetos ≥ 2`.
5. **P1, curva MC:** decidir D‑G1. Se aprovada, ligar `percentilPesoGemelarMonocorionico` com o sexo exigido e declarar a curva no laudo.
6. **P2:** campo de antecedentes (transfusão feto-fetal, restrição seletiva, anemia–policitemia); modo para 3 a 5 fetos com texto plural correto (G‑7); Doppler por feto (G‑9).

## Testes de aceite propostos

- C1 a C3 deste caso como goldens, comparando texto de Web e ditado (paridade).
- A troca MC → DC → MC não deixa placenta nem classe residual.
- O MBV apagado remove a classe na hora.
- Um feto < p3 com discordância ≥ corte gera alerta pendente, sem conclusão automática de restrição seletiva.
- O feto sem vitalidade sai da discordância.
- O baseline não publica vitalidade, cordão, placenta nem líquido sem estado.

## Status

`partial`: três cenários observados. Ficam pendentes a edição de rótulos, Doppler por feto, 3 a 5 fetos, óbito, MC/MA e a fronteira de transfusão feto-fetal acima de 10 cm.
