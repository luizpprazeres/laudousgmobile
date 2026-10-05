# Requisitos originais — pélvico transvaginal e obstétrico 2º/3º trimestre

Data: 05/10/2026. Estado: **rascunho para revisão médica**, sem ativação.

Fontes usadas: preflights de 05/10 (`audits/preflight-pelvico-transvaginal-2026-10-05.md`, `audits/preflight-obstetrico-2-3-trimestre-2026-10-05.md`), execução sintética do LaudoUSG (`audits/execucao-sintetica-pelve-obstetrico-2026-10-05.md`) e o código em `4d5ad45`. **O Laudário não foi observado nesta rodada.** Nada aqui reproduz controles ou frases do concorrente. Os itens marcados `validar no concorrente` são perguntas para a rodada com navegador, não requisitos herdados.

Os requisitos descrevem a **intenção** de cada frase, não a redação final. A redação será feita no estilo Domingos e passará por revisão médica. Os limiares aparecem como `candidato` com a fonte provável e só valem depois de aprovados.

---

## 0. Princípios comuns às duas categorias

1. **Uma fonte de verdade.** Um contrato versionado em `packages/shared` por categoria. Web, ditado (renderer e writer), iOS e Android/RN produzem ou consomem o mesmo objeto. O prompt mobile é um extrator para esse contrato, não uma segunda biblioteca de frases.
2. **Quatro estados por estrutura:** `não avaliado`, `normal`, `alterado` e `limitado` (com motivo). Nenhuma estrutura nasce `normal` sem ação do médico.
3. **“Normal” exige o dado mínimo.** Cada frase normal declara os campos de que depende. Sem eles, a estrutura fica `normal (medida pendente)` e gera pendência, e não uma frase com `____`.
4. **Coerência corpo ↔ conclusão.** Todo item de conclusão aponta para um achado do corpo, e todo achado `alterado` gera um item de conclusão ou uma dispensa explícita do médico. Um validador determinístico bloqueia a publicação quando isso falha. A regra corrige os defeitos P3 de pelve e O3 de obstétrico.
5. **Derivados determinísticos, com origem visível.** Volume, classe de volume, PFE, percentil, IG biométrica, classe de líquido e divergência ponderal são calculados no shared, com fórmula e versão registradas. Uma sobrescrita manual fica marcada como tal e gera aviso quando diverge do cálculo.
6. **Diagnóstico ou categoria de risco só com confirmação.** O-RADS, FIGO definitivo, PIG/RCF, acretismo, descolamento e óbito fetal exigem dados mínimos e `physicianConfirmed`. Sem confirmação, o achado aparece de forma descritiva.
7. **Unidades canônicas.** Medidas lineares de órgão em cm, biometria fetal e distância placenta–orifício interno em mm, volumes em cm³, BCF em bpm. O extrator converte o que for ditado, preserva a unidade original e rejeita valores fora da faixa plausível.
8. **Modelo normal rápido sem falsa normalidade.** Um botão “Exame normal” marca as estruturas como `normal`, mas mantém as medidas obrigatórias como pendência visível. Rapidez sem afirmar o que não foi medido. (**Decisão D1 do Luiz**: hoje o estilo da casa preenche frases normais por omissão — `packages/knowledge/snippets/OBSTETRICA/regra/frases-normais-quando-omitido.md`.)

---

## 1. Pélvico transvaginal (`PELVE_FEMININA`)

### 1.1 Escopo e variantes

- Via: `TV`, `TA`, `TA+TV`. A via aparece no título e na técnica. Em TV a bexiga é omitida; em TA limitada, a técnica registra o que não foi avaliado.
- Finalidade: `rotina`, `com Doppler`, `pós-abortamento`. A monitorização folicular fica como variante própria, a estudar depois.
- Contexto clínico, um estado único reutilizável por histerossonografia, HyCoSy e endometriose:
  - `status_hormonal`: menacme, menopausa, terapia hormonal, contracepção hormonal ou não informado.
  - Data da última menstruação ou fase do ciclo, quando informada.
  - Antecedente cirúrgico: histerectomia total ou subtotal, anexectomia direita ou esquerda, miomectomia, cesárea.

### 1.2 Modelo normal: o que cada frase exige

| Estrutura | Para dizer “normal” precisa de | Corpo (intenção) | Conclusão (intenção) |
| --- | --- | --- | --- |
| Útero | posição + 3 medidas (cm) → volume calculado; classe derivada da referência aprovada para idade e paridade | posição, forma e contornos, medidas | útero de volume normal com o volume entre parênteses, só se a classe derivada for normal |
| Miométrio | estado `normal` marcado | ecotextura homogênea | entra no item do útero, sem item próprio |
| Endométrio | espessura medida (cm) + aspecto + `status_hormonal` | espessura e aspecto; linha média e junção quando avaliadas | normal **para o contexto informado** (fase ou menopausa) somente se a espessura estiver dentro da referência aprovada para esse contexto |
| Colo | estado marcado | aspecto habitual | sem item, salvo achado |
| Ovários (por lado) | 3 medidas → volume; folículos `presentes / escassos / ausentes` | dimensões e folículos | normal por lado com volume; a menção a folículos segue o estado marcado, sem presumir pelo status |
| Anexos | estado marcado | ausência de massas anexiais | sem item próprio |
| Fundo de saco | estado marcado | ausência de líquido livre | sem item próprio |

A conclusão global de normalidade só aparece quando todas as estruturas obrigatórias estão `normal` com dados. Se alguma estiver `não avaliado` ou `limitado`, a conclusão restringe o escopo e nomeia o que não foi avaliado.

### 1.3 Biblioteca de alterações

| ID | Dados mínimos | Corpo | Conclusão | Regras e salvaguardas |
| --- | --- | --- | --- | --- |
| `utero_volume_alterado` | volume calculado + referência | volume medido | aumento ou redução de volume com o valor | derivado; sobrescrita manual gera aviso (corrige P4) |
| `utero_pos_histerectomia` | antecedente informado | útero ausente por cirurgia; colo ou cúpula conforme o caso | estado pós-histerectomia | nunca inferido da não visualização |
| `mioma` (lista) | medidas (3) + localização + tipo FIGO por lista fechada 0–8 + parede | cada nódulo com medidas, parede e tipo | nódulos miomatosos com o maior ou o mais relevante; tipo FIGO só se confirmado | sem localização pré-marcada (o padrão atual “intramural” chega à conclusão); coerência entre tipo FIGO e relação com a cavidade |
| `utero_miomatoso` | quantidade não individualizável + volume | múltiplos nódulos, os maiores medidos | útero miomatoso | não substitui os nódulos medidos |
| `adenomiose` | ao menos um sinal ecográfico tipado (lista fechada de sinais diretos e indiretos) + distribuição (difusa ou focal; parede) | sinais observados | achados sugestivos de adenomiose | **coexiste** com miomas: os dois aparecem no corpo (corrige P3) |
| `endometrio_espessado` | espessura + `status_hormonal` + aspecto | espessura e aspecto; vascularização se houver Doppler | espessamento endometrial **para o contexto** | limiar candidato para pós-menopausa a partir de diretriz de sangramento pós-menopausa (a definir); sem `status_hormonal`, só descritivo (corrige P2) |
| `polipo_endometrial` | medidas + pedículo vascular (sim, não ou sem Doppler) | lesão focal com medidas | imagem sugestiva de pólipo | tipo compartilhado com histerossonografia |
| `conteudo_cavitario` / `sinequia` | descrição tipada | descrição | item próprio | tipos compartilhados com histerossonografia |
| `diu` | tipo (cobre ou hormonal, se informado) + posição: tópico, baixo, cervical, rodado ou incorporado | posição e distância ao fundo, se medida | DIU tópico ou mal posicionado, com a posição | “tópico” só com posição marcada |
| `istmocele` | profundidade, largura e miométrio residual (mm) | defeito com medidas | istmocele com miométrio residual | tipo compartilhado com histerossonografia |
| `cistos_naboth` | presença | cistos no colo | item opcional (decisão D2) | — |
| `ovario_cisto_simples` | lado + 3 medidas | cisto unilocular anecoico, paredes finas | cisto simples com lado e medida | O-RADS somente com confirmação (alinhar o contrato do writer, que hoje aplica O-RADS 2 sozinho) |
| `ovario_cisto_hemorragico_funcional` | lado + medidas + descritores típicos | descrição | sugestivo de cisto funcional ou hemorrágico | seguimento sugerido fica separado e é publicado só com confirmação |
| `endometrioma` | lado + medidas + aspecto | descrição | sugestivo de endometrioma | não duplicar o modelo de endometriose |
| `massa_anexial_complexa` | lado + medidas + descritores tipados (componente sólido, septos, projeções papilares, escore de cor) | descritores | lesão anexial complexa, descritiva; categoria de risco somente confirmada | léxico candidato: O-RADS US v2022 / IOTA (a aprovar) |
| `padrao_policistico` | contagem de folículos por ovário e/ou volume por lado + via | contagem e volume | morfologia ovariana policística | critério candidato: diretriz internacional de SOP 2023 (a aprovar); não força “volume aumentado” |
| `ovario_atrofico` | `status_hormonal` menopausa + medidas | ovários reduzidos, sem folículos | ovários atróficos, de forma coerente na Web e no ditado | aplicado pelo renderer, não pelo cliente (corrige a divergência da P2) |
| `ovario_nao_visualizado` | lado + motivo: técnica, gases, atrofia provável ou cirurgia | ovário não caracterizado e o motivo | item restrito ao lado | cirurgia só quando informada |
| `hidrossalpinge` / `cisto_paraovariano` | lado + medidas | descrição | item próprio | separado do ovário no contrato |
| `liquido_livre` | quantidade (pequena, moderada, acentuada) + aspecto | localização e quantidade | item próprio | opt-in; nunca afirmado sem campo |
| `produtos_retidos` (pós-abortamento) | presença + medidas + vascularização, se houver Doppler | descrição | sugestivo de material retido | só na finalidade pós-abortamento |
| `doppler_pelvico` | Doppler realizado por estrutura + achados (vascularização de lesão; índices quando aprovados) | fluxo descrito | só se alterado | sem Doppler não há afirmação de fluxo; título e técnica mudam só quando realizado |

### 1.4 Formulário Web

- **Cabeçalho:** via, finalidade, `status_hormonal`, antecedente cirúrgico e o botão “Exame normal” (regra 0.8).
- **Seções:** Útero → Miométrio (miomas em lista repetível com esquema FIGO clicável e adenomiose em checklist de sinais) → Endométrio → DIU e cavidade → Ovário direito → Ovário esquerdo → Anexos e fundo de saco → Doppler (visível só com a finalidade “com Doppler”) → Achados adicionais (cada um com item de conclusão).
- **Derivados exibidos ao lado do campo:** volume uterino e ovariano, classe sugerida e a referência usada. A classe pode ser editada, com aviso quando diverge.
- **Pendências bloqueantes:**
  - medida obrigatória ausente numa estrutura `normal`;
  - endométrio sem `status_hormonal`;
  - conclusão sem par no corpo;
  - categoria de risco sem confirmação;
  - lateralidade ausente em achado ovariano.
- **Avisos:** volume fora da faixa plausível; tipo FIGO incoerente com a localização; espessura endometrial acima da referência com conclusão normal.

### 1.5 Prompt mobile (extrator)

- Mapear o ditado para o contrato e nunca escrever frase.
- Medida não ditada fica ausente e vira pendência no app; o extrator não a normaliza.
- Reconhecer `status_hormonal` (“menopausada”, “em uso de TH”), cirurgias (“histerectomizada”, “ooforectomia à direita”) e vários achados por ovário.
- O atalho “Menopausa” passa a preencher `status_hormonal` e deixa de ditar uma frase de normalidade.

### 1.6 Testes de aceitação mínimos

Normal completo; normal sem medidas (deve bloquear); menopausa com 0,3 cm e com 1,2 cm; adenomiose + mioma; útero de 256 cm³; ovário com dois achados; ovário não visualizado com motivo; pós-histerectomia; DIU baixo; Web × ditado com o mesmo caso produzindo o mesmo texto.

**Validar no concorrente:** como trata menopausa e espessura, se exige medida para normalidade, se oferece motivo de não visualização e o que muda na variante “com Doppler”.

---

## 2. Obstétrico 2º/3º trimestre (`OBSTETRICA`)

### 2.1 Escopo e contexto

- Feto único e gemelar no mesmo contrato, com um bloco por feto e rótulo estável (A/B por posição). A variante Doppler (`DOPPLER_OBSTETRICO`) e o perfil biofísico (categoria proposta) compõem o contrato por referência, sem duplicar campos.
- Contexto: data do exame (obrigatória para datação), DUM, 1ª ultrassonografia de datação (data + IG naquela data), número de fetos e corionicidade (gemelar).
- Este exame **não é morfológico**: a anatomia é uma avaliação básica e o texto deve dizer isso quando ela for registrada.

### 2.2 Modelo normal: o que cada frase exige

| Bloco | Para dizer “normal” precisa de | Corpo (intenção) | Conclusão (intenção) |
| --- | --- | --- | --- |
| Situação e apresentação | situação + apresentação + dorso (opcional) marcados | estática fetal | apresentação só entra na conclusão a partir da IG definida pela casa (decisão D3) |
| Vitalidade | BCF numérico (bpm) | BCF presente com o valor | feto vivo; ritmo normal somente com o valor dentro da referência |
| Movimentos | estado marcado | movimentos presentes | sem item |
| Anatomia básica | estado `avaliada sem alterações`, `não avaliada` ou `limitada` | estruturas avaliadas, listadas pelo que foi marcado | sem item quando normal; “avaliação anatômica limitada” quando limitada |
| Biometria | DBP, CC, CA e CF em mm | medidas | — |
| PFE | 4 medidas + fórmula registrada | peso com a fórmula | — |
| Percentil | PFE + IG de referência + curva e versão (+ sexo, se a curva exigir) | percentil com a curva | normal somente se o percentil estiver na faixa aprovada |
| Datação | IG biométrica derivada + IG de referência (DUM ou 1ª US) | IG biométrica e IG de referência | IG pela referência adotada, com a origem; discordância só acima da tolerância aprovada |
| Placenta | localização + relação com o orifício interno (distante, baixa, marginal, prévia) com distância em mm quando aplicável; grau opcional | localização e aspecto | sem item quando normal e distante do orifício |
| Líquido | método (subjetivo, ILA ou MBV) + valor quando medido | método e valor | normal somente se a classe derivada for normal |
| Cordão | número de vasos (`não avaliado` como padrão) | vasos quando avaliado | sem item quando normal |

### 2.3 Biblioteca de alterações

| ID | Dados mínimos | Corpo | Conclusão | Regras e salvaguardas |
| --- | --- | --- | --- | --- |
| `apresentacao_nao_cefalica` | situação + apresentação | estática | item conforme D3 | sem cefálica por padrão (corrige O1) |
| `bcf_ausente` | ausência de atividade cardíaca + `physicianConfirmed` | descrição objetiva | óbito fetal, somente confirmado | bloqueio de publicação sem confirmação |
| `bradicardia` / `taquicardia` | BCF numérico | valor | derivados do valor | limiares candidatos 110 e 160 bpm (a aprovar); não selecionados à mão contra o número |
| `movimentos_reduzidos_ausentes` | estado | descrição | item | — |
| `discordancia_biometrica` | IG biométrica + IG de referência | ambas as IGs | discordância com a diferença em dias | tolerância por idade gestacional (candidata, da regra de referência da casa) |
| `crescimento_abaixo_p10` / `abaixo_p3` / `acima_p90` | percentil + curva + IG; Doppler para fechar PIG ou RCF | percentil e curva | via `classifyFetalGrowth`: PIG/RCF somente com os dados que o protocolo exige; sem eles, “classificação incompleta” | **uma única autoridade**; o snippet do writer deve ser alinhado (decisão D4) |
| `oligoamnio` / `polidramnio` | método + valor | valor | derivado: ILA ou MBV pelos cortes aprovados (o código usa ILA < 5 / > 25 e MBV < 2 / > 8 cm) | no gemelar, por feto (corrige O3) |
| `placenta_baixa` / `marginal` / `previa` | distância ao orifício interno em mm + via usada (TV recomendada) | relação e distância | item com a relação; sugestão de reavaliação publicada separadamente | cortes candidatos de diretriz de placenta prévia (a aprovar); campo único, reaproveitado pela cervicometria |
| `sinais_acretismo` | sinais tipados + `physicianConfirmed` | sinais | suspeita somente confirmada | cesárea prévia como contexto, quando informada |
| `descolamento` / `hematoma` | localização + medidas + `physicianConfirmed` | descrição | item | — |
| `arteria_umbilical_unica` | vasos = 2 | descrição | item | — |
| `circular_cordao` | número de voltas | descrição | decisão D5: corpo apenas ou conclusão | — |
| `colo_curto` | referência ao bloco de cervicometria | — | item vindo da cervicometria | sem duplicar a medida |
| `achado_anatomico` | estrutura (lista) + descrição | descrição | item obrigatório ou dispensa explícita | substitui o `achados_adicionais` que hoje vai só ao corpo |
| `gemelar_divergencia_ponderal` | PFE por feto | pesos e divergência percentual | derivado acima do corte aprovado (o código usa ≥ 20%) | rótulos por feto obrigatórios |
| `gemelar_liquido_discordante` | MBV por feto | valores por feto | classe por feto; hipótese de síndrome de transfusão somente confirmada e só em monocoriônica | nunca “ambos normais” sem avaliar cada valor |

### 2.4 Formulário Web

- **Cabeçalho:** data do exame, DUM, 1ª US de datação, número de fetos, corionicidade e o botão “Exame normal” (regra 0.8).
- **Por feto:** estática → vitalidade (BCF numérico) → movimentos → anatomia básica (três estados) → biometria (mm) com PFE e percentil calculados no shared, mostrando fórmula, curva e versão → cordão.
- **Gestação:** placenta (uma ou duas no gemelar) → líquido (por feto no gemelar) → colo (atalho para a cervicometria) → achados com item de conclusão.
- **Crescimento:** calculado automaticamente sempre que houver PFE, curva e IG. Hoje é opt-in, com “Classificar crescimento? Não” como padrão (`apps/web/src/lib/deterministic/organs/fetalGrowth.ts:13-14`). Os campos de Doppler necessários aparecem somente quando o percentil exigir.
- **Gemelar na Web:** hoje ausente; entra com o mesmo contrato.
- **Pendências bloqueantes:**
  - BCF ausente sem confirmação;
  - estrutura `normal` sem o dado mínimo;
  - líquido medido sem classe coerente;
  - conclusão sem par no corpo;
  - percentil sem curva;
  - gemelar sem rótulos.
- **Avisos:** PFE manual diferente do calculado; IG biométrica discordante; distância placenta–orifício interno informada em cm.

### 2.5 Prompt mobile (extrator)

- Extrair para o contrato, sem frases normais por omissão.
- Ausência vira `não avaliado` e pendência na revisão do app.
- Calculadoras iOS e RN deixam de inserir texto e passam a preencher o objeto estruturado, com o cálculo do shared (decisão D6: qual fórmula de PFE e qual curva são o padrão da casa).
- Identificar o feto em cada medida no gemelar; sem rótulo, o extrator não atribui.

### 2.6 Testes de aceitação mínimos

Normal de 28 semanas completo; estado vazio (deve bloquear); PFE p6 sem Doppler (classificação incompleta) e p2 (critério isolado); ILA 4 e MBV 9; placenta a 15 mm do orifício interno; pélvica de 34 semanas; BCF 95 bpm; gemelar DC/DA com MBV 1,2 / 9,5 cm e divergência de 25%; mesmo caso pela Web, pelo ditado e pela calculadora iOS produzindo o mesmo PFE e o mesmo percentil.

**Validar no concorrente:** se o 2º/3º trimestre afirma anatomia normal sem campo, como trata percentil, curva e PIG/RCF, se líquido e placenta derivam classe de medida e como o gemelar organiza os fetos.

---

## 3. Decisões que dependem do Luiz

| # | Decisão | Opções |
| --- | --- | --- |
| D1 | Normalidade por omissão no estilo da casa | manter frases normais por omissão / “Exame normal” explícito com medidas pendentes (recomendado) |
| D2 | Cistos de Naboth na conclusão | sim / só no corpo |
| D3 | A partir de que IG a apresentação entra na conclusão | sempre / a partir de IG definida |
| D4 | Autoridade de crescimento fetal | `classifyFetalGrowth` para todos os caminhos (recomendado) / manter o snippet do writer |
| D5 | Circular de cordão na conclusão | sim / só no corpo |
| D6 | Fórmula de PFE e curva padrão da casa | Hadlock 1985 (4 medidas) + Intergrowth / outra |

## 4. Ordem sugerida de implementação

1. Correções P0 sem esperar o contrato:
   - **Pelve:** endométrio sem normalidade presumida e mioma preservado junto da adenomiose.
   - **Obstétrico:** MBV gemelar classificado por feto.
   - **Ambas as categorias:** validador de coerência corpo ↔ conclusão.
2. Contratos dormentes no shared com os estados e derivados acima, mais goldens das seções 1.6 e 2.6.
3. A Web passa a consumir o contrato (já é a plataforma mais estruturada) e as calculadoras mobile passam a preencher o objeto.
4. Rodada funcional no Laudário para fechar os itens `validar no concorrente`.
5. Revisão médica da redação e ativação simultânea nas três plataformas.
