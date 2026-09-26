# Evidência clínica — próstata transretal/HPB, bexiga e MSK (rodada 26/09/2026)

Data da consulta: 26/09/2026. Frente: pesquisa clínica (story `docs/stories/2026-09-26-clinical-composition-categories.md`). **Só fontes e revisão; nenhum código foi alterado.** Sem commit, push, deploy nem banco.

Convenções: **[EVIDÊNCIA]** = o que a fonte diz, verificado como indicado; **[DECISÃO EDITORIAL]** = escolha de produto/curadoria que a fonte não resolve; **[LACUNA]** = não consegui acessar ou não existe fonte primária localizada.
Verificação: "PDF lido" = extraí e li o texto do PDF; "página lida por resumo automático" = a página foi resumida por ferramenta e **não conferi o trecho literal**, então a alegação precisa ser reconferida antes de citar como recomendação formal.

## 0. Correção de premissa: bexiga e rins já foram unificados

Uma primeira lista informal desta rodada dizia que a bexiga tinha "4 módulos divergentes". **Isso é do diagnóstico de 24/09 e está superado.** Conferi o código atual: `apps/web/src/lib/deterministic/organs/urinaryShared.ts` e `apps/api/src/server/renderer/categories/sharedUrinary.ts` definem uma bexiga compartilhada (`SharedBladderSchema`): repleção (adequada/moderada/pequena/insuficiente/vazia), parede (normal/espessada/trabeculada), resíduo (não informado/desprezível/valor/dupla micção/sondado), jatos ureterais com lateralidade e `achados[]` tipados (debris, cálculo, coágulo, sonda, divertículo, ureterocele, lesão focal) com medidas, mobilidade, lateralidade e Doppler. `docs/reviews/2026-09-24-urinary-validation.md` documenta o GO técnico.
Os gaps abaixo são, portanto, **o que falta depois da unificação**, não a divergência anterior.

## 1. Fontes consultadas

| Fonte | Versão / data | O que sustenta | Acesso |
|---|---|---|---|
| [CBR — Protocolos iniciais de ultrassonografia](https://cbr.org.br/wp-content/uploads/2025/11/Protocolos-de-Ultrassonografia_2025.pdf) | nov/2025 | cobertura e imagens mínimas por exame (urinário, próstata suprapúbica, próstata **transretal**) | **PDF lido** (pp. 4, 26–27 do PDF; rodapé 3, 25–26) |
| [AIUM — Practice Parameter, Ultrasound Evaluation of the Prostate](https://www.aium.org/docs/default-source/official-statements-or-practice-parameters/prostate_2025.pdf), *J Ultrasound Med* doi:10.1002/jum.70128 | revisão 2025 (aceito 10/11/2025); anterior 2021 | via transretal como método de escolha, volume, o que avaliar, limites de Doppler/elastografia | **PDF lido** (5 pp.) |
| [AIUM/AUA — Practice Parameter, Ultrasound in the Practice of Urology](https://www.aium.org/docs/default-source/resources/guidelines/urology.pdf?sfvrsn=50849c24_1) | vigente na consulta de 24/09 | rim/bexiga por indicação, Doppler, medir áreas anormais | citado do doc de 24/09; não reaberto |
| [EAU — Non-neurogenic Male LUTS, Diagnostic Evaluation](https://uroweb.org/guidelines/management-of-non-neurogenic-male-luts/chapter/diagnostic-evaluation) | edição 2026 | imagem da prôstata, PVR, IPP, parede vesical | **página lida por resumo automático** |
| Revisão de IPP: [PMC6198776](https://pmc.ncbi.nlm.nih.gov/articles/PMC6198776/) | 2018 | definição, graduação em mm, correlação com obstrução | página lida por resumo automático; artigo original da graduação **não acessado** |
| [EFSUMB — Guidelines on the clinical use of elastography](https://www.thieme-connect.com/products/ejournals/pdf/10.1055/a-0838-9937.pdf) | 2019 (seção próstata) | elastografia prostática é descritiva/adjunta | **só resultado de busca**, não li o PDF |
| [WFUMB — Liver Multiparametric US, Part 1 e Part 2](https://wfumb.info/wp-content/uploads/2024/05/WFUMB_LiverMultiparametric-Part-1.pdf) | 2024 | já usadas em `2026-09-24-ultrasound-sources.md` | não reabertas nesta rodada |
| Lins et al., *Ultrassonografia Musculoesquelética* (2020) | livro local (`study/Print 2.pdf`) | rotura parcial (graus, tipos), retração do coto, epicondilites | **PDF lido** (24/09); **não é diretriz de sociedade** |

**[LACUNA] acesso fechado ou bloqueado:** PubMed (2025 Revision e artigo de forma prostática por TRUS) devolveu verificação anti-robô; `radiologic.theclinics.com` (Wasserman 2006, "BPH: a review and ultrasound classification") devolveu 403; RSNA (consenso SRU 2020) devolveu 403. Não usei esses textos.

## 2. O que a evidência primária realmente diz

**[EVIDÊNCIA — PDF lido] AIUM 2025.** A via transretal é o método de escolha; a transabdominal serve para estimar o tamanho. A próstata é imageada inteira em pelo menos dois planos ortogonais; volume = comprimento × altura × largura × 0,52, com planimetria como alternativa mais exata. Avaliar massa focal, ecogenicidade, simetria e continuidade das margens; Doppler colorido/power pode ajudar a escolher pontos de biópsia. Documentar o trajeto da uretra prostática, assimetria dos tecidos periuretrais e "qualquer efeito sobre a base da bexiga". Vesículas seminais: tamanho, forma, posição, simetria, ecogenicidade, e presença/tamanho de cistos. Doppler e ecografia em escala de cinza são insuficientes para confirmar ou excluir câncer; elastografia e CEUS "não são rotina". **O texto não contém**: classificação de padrões de HPB, graduação de IPP, zonas (periférica/transição), resíduo pós-miccional nem "lobo médio" (busquei os termos). O único vínculo com HPB é a referência bibliográfica a Wasserman 2006.

**[EVIDÊNCIA — PDF lido] CBR 2025.** Aparelho urinário: bexiga com repleção adequada, incluindo o volume inicial, para caracterizar espessura da parede e conteúdo, e avaliar o resíduo pós-miccional (pp. 4). Próstata suprapúbica: bexiga cheia com medidas ortogonais para o volume inicial e bexiga vazia para o resíduo (p. 26). **Próstata transretal: planos transversal e longitudinal com as medidas dos maiores eixos, imagem da zona periférica direita e esquerda, vesículas seminais, e "bexiga urinária cheia e vazia — medidas dos volumes pré e pós-miccionais" (pp. 26–27).**

**[EVIDÊNCIA — resumo automático, reconferir] EAU 2026.** PVR: recomendação forte de medir na avaliação inicial, com valor prognóstico limitado (PVR grande não contraindica conduta expectante). Imagem da próstata: recomendada ao escolher tratamento medicamentoso (fraca) e antes de cirurgia (forte); TRUS mede volume melhor que a via transabdominal. IPP correlaciona bem com obstrução, mas seu papel como substituto do estudo urodinâmico "segue em avaliação". Espessura de parede vesical tem acurácia para obstrução, com **falta de padronização** e sem recomendação de rotina. Imagem do trato superior nos casos de PVR grande, hematúria ou litíase.

**[EVIDÊNCIA — resumo automático, reconferir] Literatura de IPP.** Ver §9, itens 3 e 4: método, limites de grau e relação com o volume estão ali, com citações e URL. (Uma versão anterior deste parágrafo dizia que a via transretal é a preferida; os estudos-fonte de graduação medem por via **transabdominal**, e essa frase foi retirada.)

## 3. Gaps concretos: código atual × evidência

| # | Achado | Onde | Evidência × decisão |
|---|---|---|---|
| G1 | **Não existe categoria/variante de próstata transretal.** Só `PROSTATA_SUPRAPUBICA`. O pedido original descrevia normalidade e HPB com seleção de padrão no exame transretal. | `organs/prostataSuprapubica.ts`, `catalog/prostataParaCatalogo.ts`, `categories/PROSTATA_SUPRAPUBICA.ts`, `catalog/migradas.ts` | CBR 2025 e AIUM 2025 tratam o transretal como exame próprio. |
| G2 | **O CBR 2025 inclui volumes pré/pós-miccionais no transretal**; o doc de 24/09 (baseado na normatização de 2018) dizia que o transretal não avalia a bexiga. Fontes divergem por data. | `docs/reviews/2026-09-24-ultrasound-sources.md` | Preferir a mais recente (nov/2025), mas registrar a divergência. **[DECISÃO EDITORIAL]** se bexiga/resíduo entram por padrão ou como campo opcional. |
| G3 | **Escala de IPP da casa vs. literatura.** `ippGrau` (`PROSTATA_SUPRAPUBICA.ts:127`): Grau 1 ≤ 0,5 cm; Grau 2 ≤ 1,0; Grau 3 ≤ 1,5; > 1,5 "protrusão acentuada". Graduação de Chia 2003, como citada por Lee 2015: grau 1 ≤ 5 mm, grau 2 > 5–10 mm, grau 3 > 10 mm. **Coincide até 1,0 cm**; a divergência é acima de 1,0 cm: a casa restringe o Grau 3 a 1,0–1,5 cm e cria "protrusão acentuada" acima de 1,5 cm, que a literatura não separa. Na fronteira de 5 mm as fontes divergem entre si (≤ 5 em Lee 2015; < 5 em Aganovic 2012). | `categories/PROSTATA_SUPRAPUBICA.ts` | **[DECISÃO EDITORIAL]**: escala curada pelo Luiz; não é bug. Guardar sempre o valor em mm; rotular a escala. |
| G4 | **HPB é booleana e não descrita.** `hiperplasia: boolean`; o renderer se recusa a rotular HPB na via transabdominal (comentário em `PROSTATA_SUPRAPUBICA.ts`, correto). Não há campo para local de crescimento, calcificações da pseudocápsula, cistos de degeneração ou uretra prostática. | mesmos arquivos | AIUM 2025 pede uretra prostática, assimetria periuretral e efeito na base da bexiga. |
| G5 | **Resíduo "elevado" com limiar fixo de 100 mL** no caminho legado da próstata (`!sharedBladder`). O caminho compartilhado não tem limiar. | `PROSTATA_SUPRAPUBICA.ts` (~l. 198–205) | Nenhuma fonte lida define um corte universal; EAU fala de 350 mL só como prognóstico. **[DECISÃO EDITORIAL]** manter, remover ou sinalizar como convenção da casa. |
| G6 | **Ainda faltam na bexiga compartilhada** (vs. inventário de 24/09): espessura do detrusor por medida, esvaziamento com classificação, cistite/espessamento com subopções, bexiga de esforço/neurogênica, massa vesical com descritores, endometriose vesical, "bexigoma/retenção" como estado. | `urinaryShared.ts`, `sharedUrinary.ts` | Só parte tem fonte primária (ver §4, E3). |

## 4. Extensões propostas (implementáveis agora)

Nenhuma infere HPB pelo volume, nenhuma gera conduta automática, e todas mantêm o achado como **seleção do médico**.

### E1 — Próstata transretal como exame/variante própria, com escopo do CBR
- **O quê:** volume por três eixos (elipsoide × 0,52, ou o valor digitado), zona periférica D/E (ecogenicidade/focos como seleção), vesículas seminais bilaterais (tamanho, simetria, ecogenicidade, cistos com medida), uretra prostática e assimetria periuretral, e bloco de bexiga opcional (volume pré/pós-miccional) reaproveitando `SharedBladderSchema`.
- **Fontes:** [CBR 2025](https://cbr.org.br/wp-content/uploads/2025/11/Protocolos-de-Ultrassonografia_2025.pdf) pp. 26–27; [AIUM 2025](https://www.aium.org/docs/default-source/official-statements-or-practice-parameters/prostate_2025.pdf).
- **Limites:** não avaliar câncer por Doppler/elastografia (AIUM 2025); não incluir classificação PI-RADS (é de RM; não foi pesquisada). A bexiga entra só se o médico a avaliou.
- **Arquivos prováveis:** `organs/prostataSuprapubica.ts` (ou módulo novo), `catalog/prostataParaCatalogo.ts`, `categories/PROSTATA_SUPRAPUBICA.ts`, `catalog/migradas.ts`.

### E2 — Descritores de HPB como seleção, sem padrão nomeado da concorrência
- **O quê:** a opção "próstata aumentada/HPB" vira uma escolha explícita do médico, com descritores independentes e opcionais: aumento volumétrico (medidas/volume), local predominante do crescimento (lobos laterais, lobo médio, ambos — descritivo), IPP em **mm** medido no plano sagital mediano, calcificações (incluindo junto à pseudocápsula), cistos de degeneração, uretra prostática e efeito sobre a base da bexiga.
- **Evidência:** AIUM 2025 (uretra prostática, assimetria periuretral, base da bexiga); [IPP](https://pmc.ncbi.nlm.nih.gov/articles/PMC6198776/) e [EAU 2026](https://uroweb.org/guidelines/management-of-non-neurogenic-male-luts/chapter/diagnostic-evaluation).
- **Limites:** **[LACUNA] não encontrei fonte primária atual para "tipo 1 – crescimento lateral"** nem para uma classificação em tipos numerados. A pista é Wasserman 2006 (citado pela AIUM), com acesso bloqueado; um resultado de busca sugere padrões por distribuição (pré-uretral, retrouretral, biuretral), **não confirmado**. Não usar "tipo 1" como rótulo clínico até haver o texto. HPB nunca deduzida do volume. IPP = descrição + valor, sem "obstrução" automática (EAU).
- **Decisão editorial:** qual escala de IPP exibir (G3).

### E3 — Bexiga: o que tem sustentação para acrescentar
- **Massa/lesão vesical focal:** descritores (medidas, topografia, forma polipoide × séssil, vascularização ao Doppler, calcificação) — sustentado como *documentação de área anormal com Doppler e medida* pelo parâmetro AIUM/AUA; **não** sustenta histologia nem "compatível com neoplasia".
- **Espessura da parede/detrusor:** campo de medida com **estado de repleção declarado** (vazia ou cheia), sem limiar. EAU: sem padronização; a literatura citada por busca usa limiar de 5 mm em bexiga vazia, mas isso não é consenso.
- **Estados de repleção:** o esquema já tem "vazia/insuficiente"; o inventário sugere "retenção/bexigoma" como estado — sem fonte lida, tratar como texto do médico.
- **Não recomendo agora:** cistite enfisematosa, bexiga neurogênica/de esforço e endometriose vesical como opções prontas — não achei fonte primária lida que sustente o vocabulário (a bexiga neurogênica pediria contexto clínico).
- **Arquivos:** `urinaryShared.ts`, `sharedUrinary.ts`.

### E4 — Resíduo pós-miccional sem limiar automático
- **O quê:** manter valor em mL, indicar qual medida foi obtida (pré/pós), estados "desprezível", "não avaliado", "sondado"; **retirar ou parametrizar o "elevado > 100 mL" do caminho legado** (G5), ou rotulá-lo como convenção da casa.
- **Fontes:** CBR 2025 pp. 4 e 26–27 (documentar volume pré e pós); EAU 2026 (medir PVR; valor prognóstico limitado).
- **Limite:** nenhum corte universal foi encontrado.

### E5 — MSK: próxima camada, restrita e com fonte declarada
- **O quê:** ombro (manguito) — graduação da rotura parcial por espessura (< 25%, 25–50%, > 50%), tipo (bursal, intratendínea, justa-articular), medida da lesão em dois cortes e retração do coto medida em distância. **Só no manguito**, como descritor de segmento, sem generalizar a todos os tendões (mesma cautela aplicada em 24/09). Cotovelo — achados complementares (calcificação, focos anecoicos) já existem; entesopatia como complementar por epicôndilo.
- **Fonte:** Lins 2020 (livro, PDF lido em 24/09). **[LACUNA]** não localizei nesta rodada fonte de sociedade (EFSUMB/SRU) que sustente esses graus; as diretrizes AIUM/ACR/SPR/SRU de MSK de 24/09 sustentam documentação por estrutura, não a graduação.
- **Arquivos:** `organs/musculoesqueletico.ts`, `catalog/musculoesqueleticoParaCatalogo.ts` (o teste `msk-descritores-lados.manual.ts` já protege o comportamento atual).

## 5. Elastografia e gordura hepática sem eleger equipamento

**[DECISÃO EDITORIAL, sustentada por 24/09]** capturar de forma agnóstica de aparelho: método (pSWE, 2D-SWE, elastografia transitória, outro), unidade (kPa ou m/s, sem converter), número de medições, mediana e IQR (ou IQR/mediana quando o aparelho fornece), condições (jejum, respiração), qualidade declarada pelo médico e contexto clínico. Para gordura: parâmetro e unidade **do aparelho**, sem % universal nem grau.
**[LACUNA]** não confirmei nesta rodada o critério numérico de confiabilidade (IQR/mediana) nem a "regra dos quatro" por texto de origem: o consenso SRU 2020 (RSNA) retornou 403. Por isso **não há cortes nem regra automática** nesta proposta; medida fica descritiva e a interpretação é do médico.

## 6. Evidência × decisão editorial

| Tema | É evidência | É decisão editorial |
|---|---|---|
| Transretal como exame próprio, volume ×0,52, vesículas, uretra, base da bexiga | AIUM 2025; CBR 2025 | Nome/rótulo da variante e quais campos são padrão |
| Bexiga/resíduo no transretal | CBR 2025 (inclui); CBR 2018 (via doc 24/09) diverge | Obrigatório ou opcional |
| Grau de IPP | Literatura: I < 5, II 5–10, III > 10 mm (fonte original não acessada) | Manter a escala A10 da casa ou alinhar |
| HPB por padrão/tipo | Nenhuma fonte primária atual localizada | Vocabulário de "padrão": só após ler Wasserman ou outra fonte |
| Limiar de resíduo (100 mL) | Nenhum corte universal | Manter/remover |
| Parede/detrusor | Sem padronização (EAU) | Só medir, sem limiar |
| Graus da rotura parcial e retração | Livro didático (Lins) | Ombro apenas; buscar fonte de sociedade |
| Elastografia/gordura hepática | Método/unidade/qualidade (WFUMB, 24/09) | Campos genéricos, sem cortes |

## 7. Lista para o root/implementação clínica

1. **Próstata transretal:** `apps/web/src/lib/deterministic/organs/prostataSuprapubica.ts`, `apps/web/src/lib/catalog/prostataParaCatalogo.ts`, `apps/api/src/server/renderer/categories/PROSTATA_SUPRAPUBICA.ts`, `apps/web/src/lib/catalog/migradas.ts`.
2. **IPP e resíduo:** decidir G3 e G5 antes de mexer (estão em `PROSTATA_SUPRAPUBICA.ts`).
3. **Bexiga:** `apps/web/src/lib/deterministic/organs/urinaryShared.ts`, `apps/api/src/server/renderer/categories/sharedUrinary.ts` (E3/E4).
4. **MSK:** `organs/musculoesqueletico.ts` e o adaptador (E5), reutilizando o teste existente.
5. **Antes de rotular "HPB tipo N":** obter o texto de Wasserman 2006 (Radiol Clin North Am 44:689–710) — **peço ao Luiz se conseguir fornecer o PDF** — ou outra fonte primária.

## 8. O que esta rodada não prova

- Não valida redação, limiares nem conduta clínica.
- Os resumos automáticos (EAU 2026, revisão de IPP, EFSUMB) precisam de conferência do trecho literal antes de virarem citação formal.
- Nada aqui autoriza inferir HPB pelo volume, nem gerar recomendação a partir de uma seleção.

## 9. Respostas objetivas ao Opus urinário/próstata (26/09/2026)

Convenção de acesso: **[literal]** = trecho conferido por mim no texto do PDF; **[ferramenta]** = trecho devolvido por ferramenta de leitura de página (traz número de recomendação, mas **reconferir o literal** antes de citar formalmente).

### 1) Espessura da parede vesical (BWT) vs detrusor (DWT)
- **Há limiar consensual? Não.** [ferramenta] [EAU — Non-neurogenic Male LUTS, 4.13.2](https://uroweb.org/guidelines/management-of-non-neurogenic-male-luts/chapter/diagnostic-evaluation): *"Measurement of BWT/DWT is therefore not recommended for the diagnostic workup of men with LUTS."* A mesma seção descreve a medida como de boa acurácia para obstrução, porém **sem padronização**. (Edição 2026; a versão 2025 não foi aberta.)
- **Método (uma fonte de método, não consenso).** [ferramenta] [PMC7436043](https://pmc.ncbi.nlm.nih.gov/articles/PMC7436043/): medida **na parede anterior** da bexiga, por ultrassom transabdominal; faixa de 1–7 mm usada como limites de busca "com base na faixa em adultos da literatura" (citando Yang 2003, máximo ≈ 5 mm). Ressalva: qualidade de imagem varia com profundidade, que muda com o volume; variabilidade interobservador 0,55–0,69 mm. **Não consta** repleção em mL nem número de medidas.
- **Repleção.** [ferramenta] busca sobre Oelke (*Neurourol Urodyn* 2006; *Eur Urol* 2007): relação hiperbólica entre volume vesical e DWT, **sem mudança significativa acima de ~250 mL**. A busca também traz a afirmação de que 5 mm é limiar para obstrução infravesical, mas com repleção/técnica não uniformes entre estudos. Textos originais não abertos ([Oelke 2006](https://onlinelibrary.wiley.com/doi/10.1002/nau.20242) e [PubMed 30488269](https://pubmed.ncbi.nlm.nih.gov/30488269/): bloqueio anti-robô).
- **ICS:** **[LACUNA]** não localizei relatório de padronização da ICS sobre BWT/DWT.
- **Não tem fonte:** número de medidas por paciente, se se faz média, repleção-alvo e qualquer limiar de "espessada" utilizável em laudo. Recomendação: campo de medida + repleção declarada, **sem limiar**.

### 2) Vesículas seminais no escopo do US de próstata
- **AIUM 2025 [literal]** ([PDF](https://www.aium.org/docs/default-source/official-statements-or-practice-parameters/prostate_2025.pdf), p. 3): *"The seminal vesicles should be evaluated for size, shape, position, symmetry, and echogenicity from their insertion into the prostate via the ejaculatory ducts to their cranial and lateral extents."* Também: presença e tamanho de cistos seminais/ejaculatórios/mullerianos/do utrículo e sinais de obstrução; vasos deferentes se infertilidade.
- **CBR 2025 [literal]** ([PDF](https://cbr.org.br/wp-content/uploads/2025/11/Protocolos-de-Ultrassonografia_2025.pdf), rodapé p. 26, PDF p. 27): transretal — vesículas seminais em plano transversal (direita e esquerda) e imagem longitudinal de cada uma. Suprapúbica (rodapé p. 25): plano transversal das duas.
- **Documentar quando não visualizadas: nenhuma fonte lida diz isso para a próstata.** O parâmetro AIUM de documentação (2019, DOI 10.1002/jum.15187, 4 pp.) [literal] só exige imagens "de todas as áreas relevantes… normais e anormais" e descrição dos achados; **não consta** cláusula sobre estrutura não visualizada. O único texto próximo é do CBR, para **pelve suprapúbica** (rodapé p. 6): *"Caso haja dificuldades técnicas que diminuam a acurácia do exame por via transabdominal, deve ser explicitado, de forma ética, no corpo do laudo."* Aplicar isso às vesículas seminais é **[DECISÃO EDITORIAL]** por analogia.

### 3) IPP — Chia 2003, graus e relação com o volume
- **Chia et al., *BJU Int* 2003;91:371–4** ([Wiley](https://bjui-journals.onlinelibrary.wiley.com/doi/10.1046/j.1464-410X.2003.04088.x)) — 239 pacientes, IPP vs. estudo pressão-fluxo; **texto original não acessado**.
- **Graus [ferramenta], citando Chia via** [Lee 2015, PMC5730749](https://pmc.ncbi.nlm.nih.gov/articles/PMC5730749/): *"Grade 1 = 5 mm or less, Grade 2 = greater than 5–10 mm and Grade 3 = greater than 10 mm… measured in millimeters perpendicularly from the intravesical edge of the prostate to the base of the bladder in the mid-sagittal plane, by transabdominal ultrasound."* **Divergência de fronteira:** [Aganovic 2012, PMC3508850](https://pmc.ncbi.nlm.nih.gov/articles/PMC3508850/) escreve *"<5 mm grade I, 5–10 mm grade II, >10 mm grade III"*, com TAUS a 150–200 mL de bexiga.
- **A graduação foi definida por via transabdominal, e a medida depende do volume vesical:** Lee 2015 [ferramenta]: *"IPP measurements via transabdominal ultrasound are affected by bladder volume…"* e cita variabilidade interobservador como principal fonte de erro. Aplicar a escala a medidas transretais é extrapolação — **[DECISÃO EDITORIAL]**.
- **IPP independe de "classificar volume"? Só em parte.** É uma distância medida separadamente do volume, e pode ser registrada com qualquer volume. Mas **não é estatisticamente independente dele:** Aganovic reporta correlação IPP × volume de rho = 0,53; Lee 2015 reporta que a IPP correlacionou melhor com o índice de obstrução (rs 0,497) que o volume (rs 0,318). O EAU [ferramenta] (4.13.1) diz que a IPP *"correlates well with BOO, with a PPV of 94% and a NPV of 79%"* e que seu papel como alternativa à urodinâmica segue em avaliação. Logo: registrar IPP em mm sem exigir volume; **não deduzir obstrução**.

### 4) Tipologia morfológica de HPB transretal — há fonte primária suficiente? **Não para o TRUS.**
- **AIUM 2025 [literal]:** não traz classificação de HPB; só cita Wasserman 2006 (*Radiol Clin North Am* 44:689–710, "BPH: a review and ultrasound classification") na bibliografia.
- **Wasserman 2006:** texto **[LACUNA]** (403 no site do periódico; PubMed anti-robô).
- **O que existe, de segunda mão [ferramenta]:** [PMC9978045](https://pmc.ncbi.nlm.nih.gov/articles/PMC9978045/) descreve os tipos de Wasserman **por RM** (AJR 2015;205:564–571): tipo 1 *"bilateral TZ"* (zona de transição bilateral, isto é, crescimento lateral), 2 retrouretral, 3 ZT bilateral + retrouretral, 4 pedunculado solitário, 5 ZT bilateral + pedunculado, 6 subtrigonal; e uma versão modificada em 3 padrões (pré-uretral, retrouretral, biuretral). **Isto é compatível com o rótulo "tipo 1 – crescimento lateral" visto na referência de interface, mas não prova a origem desse rótulo.**
- **Conclusão:** há uma classificação por tipos publicada, porém (a) definida em RM no artigo que consegui ver, (b) o texto ultrassonográfico original não foi lido. **Não é suficiente para rotular tipos em laudo de US**; se o Luiz obtiver o PDF de Wasserman 2006, dá para decidir. Sem o texto, usar descritores anatômicos livres (lobos laterais/lobo médio/ambos) e não numerar.

### 5) Volume prostático: 0,52 e densidade ~1,05 g/mL
- **0,52 [literal]:** AIUM 2025, p. 2: *"volume = length × height × width × 0.52"*, com planimetria como alternativa mais exata *"by accommodating individual variations in prostate shape"*. Também 2021.
- **O código usa 0,5233** (π/6) — coerente com 0,52 (a AIUM arredonda).
- **Densidade 1,05:** **não achei fonte primária lida.** Busca traz, sem acesso ao texto, que a gravidade específica do tecido prostático é *"1,050"* e, em outra fonte, que volume em cm³ ≈ peso em g (densidade ≈ 1,0). Uma revisão de 2008 no [*J Urol*](https://www.auajournals.org/doi/10.1016/j.juro.2007.09.083) diz que a fórmula do elipsoide **subestima** o tamanho real. Logo: peso = volume × 1,05 é convenção usada no código (`PROSTATA_SUPRAPUBICA.ts`), **não fundamentada por fonte que eu tenha lido**; se o laudo exibir "peso estimado", deve ser explícito que é estimativa e o fator é convenção.

### Resumo do que NÃO tem fonte
Limiar de espessura de parede/detrusor; número de medidas e média; repleção-alvo para BWT/DWT; relatório ICS de BWT/DWT; regra para "vesícula seminal não visualizada"; classificação de tipos de HPB em US (texto original inacessível); aplicabilidade da escala de IPP à via transretal; densidade 1,05 g/mL; limiar de resíduo "elevado".
