# Cervicometria (`CERVICOMETRIA`): execução sintética e requisitos

- Data: 05/10/2026. Base: `01155d0` (main = worktree).
- Laudário: **não observado** (sem navegador). Só a existência no catálogo (`catalogo-ultrassonografia-2026-10-02.json`, linha 14, grupo `obstetrica_outros`: “Cervicometria”). Nenhuma frase do concorrente foi vista ou copiada.
- Probe: `audits/probes/probe-cervicometria-2026-10-05.ts` (caminho Web real: `adaptarCervicometria` → `renderizarSelecao("CERVICOMETRIA", "CLASSICO_COMPLETO", [], dados)`; C7 passa pela obstétrica com o addon).
- Compõe com `synthesis/requisitos-pelve-obstetrico-2026-10-05.md` §2.3 (`placenta_baixa/marginal/previa`: “campo único, reaproveitado pela cervicometria”; `colo_curto`: “item vindo da cervicometria”).

## 1. Estado por plataforma

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web (isolada) | `apps/web/src/lib/deterministic/organs/cervicometria.ts:12` (formulário) + `apps/web/src/lib/catalog/cervicometriaParaCatalogo.ts:26` (adaptador); migrada (`migradas.ts:42`) | **estruturado ativo** |
| Web (addon) | `organs/cervicometriaAddon.ts` dentro de OBSTETRICA e MORFOLOGICO (“Acrescentar cervicometria”, padrão Não) | **estruturado ativo** |
| API (ditado) | `apps/api/src/server/renderer/categories/CERVICOMETRIA.ts` (fonte única `renderCervicometriaBloco` :221, usada também pelo addon). `RENDERER_CATEGORIES` default vazio (`env.ts:74`) e vazio em produção na verificação de 03/10 → ditado em `writer-pure` | **estruturado dormente** no ditado. A memória de julho registrava a categoria ligada; hoje não está |
| Writer / conhecimento | não há `snippets/CERVICOMETRIA` nem contrato em `prompts/contracts/` | **ausente** (o writer redige sem regra própria) |
| Android/RN | `apps/mobile/src/ui/tokens.ts:161` | **genérico** |
| iOS | `Models/Category.swift:17` | **genérico** |
| shared | sem modelo clínico | **ausente** |

## 2. Inventário do formulário Web (isolada)

| Campo | Opções / unidade | Padrão |
| --- | --- | --- |
| Comprimento OI–OE | texto, rótulo “cm”; o adaptador divide por 10 só se o texto contiver “mm” (`cervicometriaParaCatalogo.ts:17`) | vazio |
| Orifício interno | fechado / aberto | **fechado** |
| Distância placenta–OI | texto, “cm” | vazio |
| Placenta distante sem medida | não / sim | não |
| IG (semanas) | texto, opcional | vazio |
| Cerclagem | não / sim | não |
| Observação | texto livre (só corpo) | vazio |

Título e técnica fixos: “ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL”, transdutor 6,5 MHz por via transvaginal (`CERVICOMETRIA.ts:156-158`). Não existem: via (TV/abdominal/translabial), afunilamento com medidas, sludge, resposta à pressão fundica, menor comprimento entre medidas, data do exame, gestação gemelar, história de parto prematuro.

## 3. Provas (dados sintéticos)

| Cenário | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
| --- | --- | --- | --- | --- | --- |
| C1 estado inicial | nada | comprimento `____` cm; **OI fechado** | “medida não caracterizada [REVISAR]” | nenhuma | conclusão correta (não afirma normal); **lacuna P1**: OI fechado afirmado sem dado e nenhuma pendência bloqueante, só a marca no texto |
| C2a colo 18 mm em 22s, digitado “1,8” | colo 1,8; IG 22 | 1,8 cm | comprimento acentuadamente reduzido (1,8 cm) | nenhuma | **observado no LaudoUSG**: correto para 22s |
| C2b “18 mm” | colo “18 mm” | 1,8 cm | idem | nenhuma | correto (adaptador converte) |
| C2c “18” sem unidade | 18 → renderer divide (>6) | 1,8 cm | idem | nenhuma | correto por acaso (backstop `normalizeMedidasMm` :146) |
| C2d colo de 5 mm digitado “5” | 5 → 5,0 cm | 5,0 cm | **colo ecograficamente normal** | nenhuma | **defeito confirmado P0**: valor em mm sem unidade, entre 0,6 e 6, vira cm e conclui normal. O backstop não alcança |
| C3 afunilamento + sludge | OI aberto + colo 1,8 + observação | aberto; observação literal | **só “OI aberto (colo 1,8 cm)”** | nenhuma | **defeito confirmado P1**: OI aberto substitui a classe de comprimento (`:191-193`); afunilamento e sludge não estruturados, sem conclusão própria |
| C4 colo 1,8 sem IG | IG vazia | 1,8 cm | acentuadamente reduzido | nenhuma | **lacuna P1**: classe não depende da IG nem pede a IG |
| C4b colo 1,8 com 34s | IG 34 | 1,8 cm | igual a C4 | nenhuma | confirma: limiar fixo de 2,5/2,0 cm (`:164`, marcado “a confirmar”) para qualquer IG |
| C5 placenta a 1,5 cm em 33s | placenta 1,5 | distância 1,5 cm | colo normal; **“não há sinais de placenta prévia”** | nenhuma | **defeito confirmado P1**: placenta a menos de 2 cm (inserção baixa pela nomenclatura `candidata` de diretriz) só recebe a negativa de prévia |
| C5b placenta “15” (mm sem unidade) | 15 → 15 cm (backstop só > 30) | **distando 15,0 cm** | sem prévia | nenhuma | **defeito confirmado P0**: medida dez vezes maior, usada na conclusão |
| C5c distante + medida | ambos marcados | só a medida | sem prévia | nenhuma | aceitável (medida vence); **P2**: sem aviso |
| C6 remoção | OI aberto + cerclagem → desfeitos | sem sobra | colo normal | nenhuma | **correto** |
| C7 obstétrico 33s: inserção baixa 15 mm + addon placenta 1,5 cm | dois campos | placenta “15 mm” no bloco obstétrico **e** “1,5 cm” no bloco da cervicometria | “placenta de inserção baixa” **e** “não há sinais de placenta prévia” | nenhuma | **defeito confirmado P1**: a mesma distância em duas unidades e dois campos; a conclusão traz itens que se sobrepõem. Nada impede valores divergentes |

## 4. Lacunas da Web (e paridade)

1. **P0 — unidade ambígua** (C2d, C5b): campo em cm, mas o padrão da área é mm. Trocar para mm com conversão única e faixa plausível (`defeito confirmado`).
2. **P1 — distância placenta–OI duplicada** (C7): mm no obstétrico (`placenta_distancia_orificio_mm`), cm na cervicometria (`placenta_distancia_cm`). Um campo só, em mm, dono no contrato obstétrico (§2.3), referenciado aqui.
3. **P1 — placenta baixa sem item** (C5): a relação com o OI precisa ser derivada da distância e não pode ser só “não há prévia” (`defeito confirmado`).
4. **P1 — afunilamento/sludge sem estrutura** (C3), e OI aberto apagando a classe de comprimento (`defeito confirmado`).
5. **P1 — IG não participa** (C4/C4b): a classe deveria depender da janela gestacional; sem IG, pendência (`candidato a lacuna`).
6. **P1 — via fixa** (TV): sem opção abdominal/translabial e sem ressalva de que a medida abdominal é menos fiel (`candidato a lacuna`).
7. **P2 — OI fechado por padrão** (C1) e ausência de pendência bloqueante sem medida.
8. **Paridade**: RN e iOS sem regra (writer genérico, sem snippet); renderer dormente no ditado.

## 5. Requisitos originais

### 5.1 Modelo normal

| Estrutura | Dado mínimo para “normal” | Intenção no corpo | Intenção na conclusão |
| --- | --- | --- | --- |
| Contexto | via + IG (semanas+dias) ou data do exame com datação | via e técnica | — |
| Comprimento cervical | menor comprimento fechado OI–OE em **mm** (opcional: as três medidas) | valor em mm e via | “comprimento dentro do esperado para a IG” só com IG e valor acima do corte aprovado |
| Orifício interno | estado marcado (fechado / afunilado / aberto) | estado | sem item quando fechado |
| Placenta | relação com o OI, vinda do contrato obstétrico (mm) | referência ao bloco obstétrico ou, no exame isolado, a mesma estrutura | item derivado da distância |
| Cerclagem | presente/ausente | posição dos pontos | item quando presente |

### 5.2 Biblioteca de alterações

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `colo_curto` | comprimento mm + IG | valor | item com valor e classe derivada da IG | cortes `candidatos` (< 25 mm antes de 24 semanas, diretrizes de prematuridade; faixas acima de 24 semanas a definir), a aprovar pelo Luiz; nunca escolhido à mão contra o número |
| `afunilamento` | forma (lista) + largura e profundidade em mm + comprimento residual | medidas | item próprio, **sem apagar** `colo_curto` | percentual de afunilamento só calculado |
| `sludge` | presença | descrição | item | — |
| `oi_aberto_dilatacao` | estado + medida quando houver | descrição | item | `physicianConfirmed` |
| `colo_dinamico` | menor e maior comprimento + manobra | ambos | item quando a variação for marcada | — |
| `placenta_baixa` / `previa` | distância mm (componente obstétrico) | referência | item conforme o contrato obstétrico | não emitir “não há prévia” se a distância estiver abaixo do corte aprovado |
| `cerclagem` | presença + distância do ponto ao OE em mm (opcional) | descrição | item | — |

### 5.3 Formulário Web

- Cabeçalho: via (TV padrão, abdominal, translabial), IG ou data + datação, número de fetos.
- Colo: comprimento em mm (aceita “2,5 cm” e converte, exibindo o valor convertido), OI em três estados, afunilamento com subcampos, sludge, colo dinâmico, cerclagem.
- Placenta: componente único da obstétrica, em mm.
- Pendências bloqueantes: sem medida; sem IG quando houver classe a derivar; unidade fora da faixa plausível (`candidata` 5–60 mm); OI aberto sem confirmação.
- Avisos: via abdominal (“recomenda-se confirmação transvaginal”); placenta distante marcada com medida.

### 5.4 Prompt mobile (extrator)

- Extrair comprimento sempre em mm, com a unidade ditada preservada no rastro; número sem unidade fora da faixa → pendência, nunca conversão silenciosa.
- Via ditada; sem menção, `não informada` (não presumir TV).
- Afunilamento, sludge, cerclagem e OI só quando ditados; OI não ditado = `não avaliado`.
- Distância da placenta em mm, no campo do contrato obstétrico.

### 5.5 Fronteiras

- **OBSTETRICA/MORFOLOGICO**: cervicometria como addon usa a IG do exame principal (já faz) e a placenta do bloco obstétrico. O exame isolado reaproveita os mesmos componentes.
- **PELVE_FEMININA**: colo fora da gestação não é cervicometria.

## 6. Perguntas para a rodada no concorrente

1. Unidade padrão do comprimento (mm ou cm) e se converte entrada mista.
2. Pede IG? A classe muda com a IG?
3. Como estrutura afunilamento (forma, medidas) e sludge?
4. Oferece via abdominal/translabial? Muda o texto?
5. Onde vive a distância placenta–OI quando a cervicometria acompanha o obstétrico? Há duplicidade?
6. O exame isolado conclui sobre placenta prévia? Com que regra de IG?

## 7. Ordem de implementação sugerida

1. **P0** Campo de comprimento em mm + conversão única + faixa plausível bloqueante (adaptador e renderer, removendo o backstop > 6).
2. **P0** Mesmo tratamento para a distância placenta–OI, unificada em mm no componente obstétrico.
3. **P1** Placenta baixa derivada da distância; suprimir a negativa de prévia abaixo do corte.
4. **P1** Afunilamento e sludge estruturados, sem apagar a classe de comprimento.
5. **P1** Classe dependente da IG (decisão clínica do Luiz sobre os cortes) + via selecionável.
6. **P2** Snippet/contrato do writer para paridade RN/iOS enquanto o renderer seguir dormente no ditado.
