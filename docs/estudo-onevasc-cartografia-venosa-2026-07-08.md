# Estudo OneVASC → Cartografia venosa MMII no LaudoUSG (2026-07-08)

> Análise estratégica + arquitetura de replicação. Foco: **mapeamento venoso e Doppler venoso dos membros inferiores**. Fonte OneVASC: onevasc.com/en (+ /offers). Fonte interna: inventário de código do eixo vascular (jul/2026). Complementa a memória `onevasc-cartografia-vascular` e o `docs/plano-motor-doppler-vascular-2026-07-01.md`.

---

## 1. Veredito executivo (a resposta primeiro)

**Não clonar o OneVASC inteiro.** Ele cobre 12+ territórios com um editor manual clique-a-clique de anatomia + lesões. Reproduzir tudo isso é trabalho de meses e replica uma *commodity* — mapeamento vascular desenhado existe em vários lugares, como você mesmo notou. O mapa, por si só, não é o diferencial.

**Investir sim — mas na fatia certa:** a **auto-cartografia venosa**. Um mapa SVG que **se desenha sozinho a partir dos achados estruturados que o LaudoUSG já extrai do ditado**. Isso é exatamente o que o OneVASC **não** tem: a plataforma dele é 100% manual — o médico posiciona cada estenose, cada refluxo, cada trombo à mão. No LaudoUSG, o médico dita e o mapa aparece. Esse é o diferencial real, e é defensável.

**O pré-requisito duro (e a boa notícia):** hoje o eixo vascular **não tem findings estruturados** — roda inteiro pelo *writer* LLM em texto livre. Um mapa precisa de um objeto por-segmento (`{segmento, lado, patente, refluxo_s, trombo, calibre_mm, competente}`), que não existe nem é persistido. **Mas** esse schema estruturado **já está planejado** — é a fase 2 do `plano-motor-doppler-vascular`. A cartografia surfa nessa onda: o schema strict por modalidade que o plano propõe **é** o input do mapa. Basta desenhá-lo já com chaves de segmento estáveis, pensando no desenho.

**Recomendação:** build interno, faseado, começando por **um território (venoso MMII)**. Reusar o motor depois para arterial/carótida/FAV — a nomenclatura desses já está curada. Parceria com o OneVASC deixa de ser necessária para o objetivo (e, mesmo fechando, seria integrar uma ferramenta manual, sem resolver o auto-mapa).

---

## 2. O que é o OneVASC (destrinchado)

| Dimensão | OneVASC |
|---|---|
| Natureza | Web app; motor de **SVG paramétrico** de vasos |
| Territórios | 12+ (MMII arterial/venoso, TSA/carótidas, MMSS, renais, digestivas, FAV/pré-FAV, polígono de Willis…) |
| Lesões | Estenose %, aneurisma, falso aneurisma, trombose, refluxo de perfurante, **stent**, **bypass** |
| Variações anatômicas | Edição dinâmica de vasos (adicionar/remover/reencaminhar segmentos), "possibilidades ilimitadas" |
| Legendas | Auto-preenchimento de parâmetros morfológicos/hemodinâmicos |
| Saída | Imagem, **PDF**, arquivo de backup `.onev`; **copy-paste** direto no software de laudo |
| Persistência | Ficha do paciente online (planos pagos) |
| Modelo | Assinatura: Individual · Instituição · Estudante (grátis, sem base de pacientes) · **API para editores de software** |
| Conformidade | HDS (hospedagem de dados de saúde, FR); multilíngue EN/ES/FR/DE; integrações Doctolib, Lifen |
| Proposta | *"A good vascular mapping is better than a long report"* |

**A limitação estratégica que abre nossa janela:** o fluxo dele é **Seleção de anatomia → adição manual de lesões → export**. Não há ditado → estrutura → mapa. O médico faz o trabalho de posicionamento. Nós já temos a etapa que falta neles (extração estruturada do ditado). Nosso mapa é o output natural do que o LaudoUSG já faz.

---

## 3. Diagnóstico do LaudoUSG hoje (do inventário de código)

### 3.1 O que já temos — e é ouro
A **nomenclatura venosa MMII está totalmente curada** nos snippets (`packages/knowledge/snippets/DOPPLER_VENOSO_MMII/` e `…_MEDIDAS/`), com critérios clínicos:

- **Profundo:** femoral comum, femoral, femoral profunda, poplítea, tibiais (anterior/posterior), fibular.
- **Superficial:** safena magna, safena parva, tributárias, perfurantes (nomeadas por topografia).
- **Junções:** safeno-femoral (JSF), safeno-poplítea (JSP).
- **Segmentos de calibre da safena magna** (template MEDIDAS — o mais "cartográfico" que já existe): JSF · coxa proximal/média/distal · joelho · perna proximal/média/distal (maléolo). Idem safena parva.
- **Critérios por segmento:** refluxo patológico >1,0 s (profundas troncais) / >0,5 s (superficiais, tibiais, perfurantes); perfurante incompetente = refluxo >0,5 s **e** diâmetro >3,5 mm; TVP por incompressibilidade + trombo + distensão + perda de fasicidade, com idade do trombo (agudo/crônico-recanalizado/indeterminado); calibres de referência da safena magna; CEAP C0–C6.

Essa taxonomia **é** o conjunto de nós do mapa. Não precisamos inventá-la — precisamos convertê-la de prosa para **enum de segmentos com chave estável**.

### 3.2 O que falta (os bloqueadores)
1. **Nenhum schema tipado vascular.** As 13 categorias com extractor strict (`renderer/extraction.ts`, `EXTRACTORS`) não incluem nenhuma DOPPLER_*. Todo vascular cai no *writer* texto-livre.
2. **Nada estruturado é persistido.** `structured_findings` vem `null` no fast-path vascular; o laudo guarda `generated_output`/`final_output` (strings). Não há objeto por-segmento por laudo.
3. **Clients só exibem texto.** Web/sala usa `pre-wrap`; mobile usa `MarkdownLite`. **Porém** o mobile já depende de `react-native-svg` (usado nos ícones) — a capacidade técnica de desenhar SVG existe, falta o componente. Não há asset SVG anatômico no repo.

### 3.3 O que já está planejado (a alavanca)
`docs/plano-motor-doppler-vascular-2026-07-01.md` propõe um **renderer determinístico vascular** (padrão MSK: código monta estrutura, LLM extrai só valores), com **schema strict por modalidade**. Fases: RENAL (piloto) → **VENOSO_MMII + MEDIDAS (fase 2)** → ARTERIAL → CARÓTIDAS. O roteiro venoso previsto já lista profundo (perviedade/compressibilidade/fasicidade/Valsalva), superficial (safenas: refluxo + tempo, varizes, perfurantes) e TVP (segmento). Extração devolve `null` para segmento não medido (mata os placeholders `____`).

> **Ponto-chave:** esse JSON estruturado por modalidade **é o input da cartografia**. Fazer a fase 0 do mapa = fazer a fase 2 do plano-motor, com uma exigência a mais: chaves de segmento estáveis e atributos normalizados. Zero retrabalho se alinharmos agora.

---

## 4. Se replicássemos do zero — a arquitetura

Quatro camadas, do dado ao pixel:

### 4.1 Modelo de dados
```ts
// Enum estável — a PONTE entre o texto do vaso e o nó do desenho.
type SegmentoVenoso =
  | "femoral_comum" | "femoral" | "femoral_profunda" | "poplitea"
  | "tibial_posterior" | "tibial_anterior" | "fibular"
  | "gastrocnemias" | "soleares"
  | "safena_magna" | "safena_parva"
  | "safena_acessoria_anterior" | "safena_acessoria_posterior" | "giacomini"
  | "jsf" | "jsp";

type EstadoSegmento =
  | { tipo: "normal" }
  | { tipo: "refluxo"; tempo_s: number }
  | { tipo: "trombose"; extensao: "oclusiva" | "parcial"; idade: "aguda" | "cronica" | "recanalizada" | "indeterminada" }
  | { tipo: "ausente" }          // aplasia/não visibilizada
  | { tipo: "duplicada" };       // variação anatômica

type Lesao = {
  segmento: SegmentoVenoso;
  posicao_t: number;            // 0..1 ao longo do segmento (onde desenhar o glifo)
  tipo: "estenose" | "trombo" | "refluxo" | "perfurante_incompetente" | "varicosidade" | "stent";
  params?: { percentual?: number; diametro_mm?: number; tempo_refluxo_s?: number };
  label: string;                // ex.: "Perfurante de Cockett incompetente (4,2 mm)"
};

type MapaVenoso = {
  lado: "direito" | "esquerdo";
  segmentos: Partial<Record<SegmentoVenoso, EstadoSegmento>>;
  lesoes: Lesao[];
  calibres?: Partial<Record<SegmentoVenoso, number>>; // mm, p/ safenas
};
```

### 4.2 Motor de render SVG paramétrico
- `viewBox` normalizado (ex.: 0–1000 × 0–1400), **duas pernas** (D/E) lado a lado, cada segmento um `<path>` desenhado a partir de pontos de controle anatômicos fixos.
- **Estado dirige o estilo** (determinístico): normal = traço azul cheio; refluxo = seta descendente sobreposta + realce; trombose oclusiva = preenchido/hachurado; recanalizada = tracejado; ausente = fantasma esmaecido.
- **Lesão = glifo + rótulo + linha-guia** (leader line) — exatamente como o screenshot da carótida do OneVASC ("Sténose 50%", "Stent").
- Mesma filosofia dos renderers DET: **construção determinística**, o LLM nunca desenha — só fornece o `MapaVenoso`.

### 4.3 Camada de auto-população (o diferencial)
- Passo de extração (irmão de `runRendererExtraction`) transforma o ditado no `MapaVenoso`. É a fase 0/plano-motor com chaves estáveis.
- O médico dita "refluxo em safena magna de 2,3 segundos, perfurante de coxa incompetente" → o mapa nasce pronto.

### 4.4 Editor manual (fase 2, leve)
- Clicar num segmento → trocar estado; arrastar → adicionar lesão; toggle de variação anatômica (Giacomini presente, duplicação de safena). Mínimo, porque a auto-população faz o grosso — o editor é só refino/correção.

### 4.5 Export / embed
- SVG → PNG (canvas no client) e SVG embutido no PDF do laudo; copy-to-clipboard como imagem (paridade com o OneVASC).

---

## 5. Como introduzir como esquema visual no LaudoUSG

- **Bloco visual opcional** no laudo `DOPPLER_VENOSO_MMII`, **flag-gated** (`VASCULAR_MAP`, default OFF — padrão da casa). Mapa acima/ao lado do texto.
- **O texto continua soberano** (peça legal do laudo). O mapa é complemento visual. Resultado: o *"mapa melhor que um laudo longo"* do OneVASC — **mas com o laudo estruturado junto**. Ganhamos nos dois eixos.
- **Onde renderiza:** web/sala (SVG inline) e mobile (`react-native-svg`, já disponível). O PDF do laudo embute o SVG.

---

## 6. Plano faseado

| Fase | Entrega | Depende de | Valor independente |
|---|---|---|---|
| **0 — Fundação** | Schema strict venoso + extractor + persistir `structured_findings`. Chaves de segmento estáveis. | plano-motor fase 2 | Mata placeholders `____`, melhora consistência do laudo venoso |
| **1 — Motor visual MVP** | Asset SVG do sistema venoso MMII (D/E) + `<VascularMap/>` consumindo o schema (estados + lesões). Só leitura, auto-populado. Flag OFF. | Fase 0 | Prova de conceito visual |
| **2 — Refinamento** | Editor manual leve; variações anatômicas (Giacomini, duplicação); export PNG/PDF; copy-image. | Fase 1 | Paridade funcional com OneVASC no território venoso |
| **3 — Expansão** | Reusar motor: arterial MMII → carótidas → FAV. | Fase 1/2 | Cobertura multi-território (nomenclatura já curada) |

---

## 7. Build vs. parceria

- **Parceria OneVASC:** não fechou até hoje; e, mesmo fechando, integraríamos uma ferramenta **manual** — não resolve o auto-mapa, que é o nosso diferencial.
- **Build interno:** viável. O custo real está na **fase 0 (schema)**, que já será construída pelo `plano-motor-doppler-vascular` de qualquer forma. O motor SVG é trabalho de front bem delimitado e determinístico.
- **Curadoria clínica:** critérios de grau/estenose/refluxo precisam de validação (Dr. Domingos), igual ao resto do vascular. O mapa **não asservera** o que o texto não asseverou — ele só espelha o `MapaVenoso`.

---

## 8. Próximos passos

1. **Alinhar o schema venoso do `plano-motor` às necessidades do mapa** (enum de segmentos estável + atributos normalizados) — decisão de design a tomar *antes* de codificar a fase 2 do plano.
2. **Validar o protótipo visual** (artifact anexo a esta sessão) com o Luiz — calibrar estilo do desenho (cores, glifos, layout D/E, densidade de rótulos).
3. **Curadoria de critérios** com Dr. Domingos para os estados que o mapa exibe.
4. Só então implementar Fase 0 → 1.

> **Diferencial em uma frase:** o OneVASC transforma cliques em mapa; o LaudoUSG transforma **voz** em mapa — porque a descrição exata do achado já existe. A cartografia é a camada visual que faltava em cima do que já sabemos extrair.
