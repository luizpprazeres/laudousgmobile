# Saneamento dos Writing Styles — achado grave (2026-06-13)

> Descoberto ao iniciar a MAMARIA. O Luiz confirmou: **só existem 2 estilos reais
> — CLÁSSICO e OBJETIVO.** A "enxuta" NÃO é um terceiro estilo/variante; é a
> própria OBJETIVO.

## O mecanismo real (corrigido)

Os estilos são **overlays de prompt** (`apps/api/src/server/prompts/styles.ts`):
o estilo NÃO muda os blocos — muda a instrução de formato no fim do prompt do
writer. Por isso os blocos são **idênticos por design** entre CLÁSSICO,
DIRETO_OBJETIVO e DETALHADO_PROTOCOLAR (md5 igual): mesma base, overlay diferente.

`writing_styles` (DB mobile) tem **4 estilos, todos `active=true`**:

| code | id | overlay | blocos | veredito |
|---|---|---|---|---|
| `CLASSICO_COMPLETO` | 1111… | nenhum (nativo) | 178 (19 cat) | ✅ **manter (Clássico)** |
| `OBJETIVO` | 4444… | TÉCNICA/ANÁLISE/OPINIÃO (= "enxuta/resumido") | 89 (13 cat) | ✅ **manter (Objetivo)** |
| `DIRETO_OBJETIVO` | 2222… | "frases curtas" | 178 (19 cat) | ❌ Luiz não quer — consolidar |
| `DETALHADO_PROTOCOLAR` | 3333… | "cobertura completa" | 178 (19 cat) | ❌ Luiz não quer — consolidar |

> Não são bugs de duplicação — são 4 estilos reais no código. Mas o Luiz quer só
> **2 estilos** (Clássico + Objetivo). A consolidação é decisão de produto.

### Lacunas que isso expõe (mapa completo, 3 camadas)
- 🔴 **iOS picker QUEBRADO:** `ProfileService.fetchWritingStyles()` faz
  `GET /rest/v1/writing_styles?select=id,slug,label,description,is_default,category_code`,
  mas a tabela só tem `id, code, name, description, active, created_at`. A query
  retorna **`42703: column writing_styles.slug does not exist`** (testado ao vivo)
  → `availableStyles` fica VAZIO. O picker de Writing Style do iOS não funciona
  hoje. (A query precisa ser `select=id,code,name,active&active=eq.true`.)
- **Picker é backend-driven** (Supabase REST direto na tabela), não hardcoded —
  então, depois de corrigir a query, basta filtrar `active=eq.true` para sumir os
  estilos desativados.
- **OBJETIVO cobre só 13/19 categorias** (89 blocos) — pré-existente. Selecionar
  OBJETIVO numa das 6 sem bloco objetivo → `BUNDLE_EMPTY`.
- **`/api/me/profile` PATCH não valida `active`** — aceita fixar estilo inativo.

### Resumo do estado (multi-camada, mais bagunçado que esperado)
| Camada | Problema |
|---|---|
| DB | 4 estilos ativos, 2 desejados; variante `enxuta` = estilo OBJETIVO |
| API | profile PATCH não valida `active`; sem endpoint de listagem |
| iOS | `fetchWritingStyles` quebrado (colunas inexistentes) → picker vazio |
| Conteúdo | OBJETIVO só 13/19 categorias (gera BUNDLE_EMPTY nas outras) |

### Impacto
- Os 4 estilos estão `active` → o picker do app (web/iOS) provavelmente mostra os
  **2 espúrios** como opções. Médico que escolher "Direto objetivo" ou "Detalhado
  protocolar" recebe o conteúdo **CLÁSSICO** (errado), não o objetivo.
- Afeta **as 19 categorias** (os espúrios cobrem 19 cat. cada).
- **Baixo risco de migração:** `prefs_usuarios = 0` para todos os estilos
  (nenhuma conta fixou preferência nesses variants ainda).

### A "enxuta" (conflação estilo × variante)
`report_template_variants` tem MAMARIA com variant_key **`enxuta`** replicado sob
TODOS os 4 estilos (e o bloco `mamaria-modelo-template-enxuta` idem). Mas "enxuta"
(LAUDO RESUMIDO, TÉCNICA/ACHADOS/CONCLUSÃO) **é o estilo OBJETIVO**, não uma
variante. A demo DET-3 (MAMARIA padrao/enxuta) conflou estilo com variante.

## Remediação proposta (a confirmar com o Luiz)
1. **Desativar** (`active=false`) `DIRETO_OBJETIVO` + `DETALHADO_PROTOCOLAR` —
   somem do picker. Reversível, sem deletar blocos ainda.
2. (Opcional, depois) **deletar** os ~356 blocos duplicados + variants espúrios.
3. **Remover a variante `enxuta`** — MAMARIA fica só com `padrao`; o formato
   resumido vem de escolher o estilo OBJETIVO. (Ajustar `preference_eligible`.)
4. Confirmar que o picker (web + iOS DET-4) lê só `active=true`.

## Relação com o renderer
O renderer programático (tireoide/obstétrica/morfo) é **agnóstico de estilo** —
hoje monta no formato CLÁSSICO. Para o OBJETIVO virar 1ª classe no renderer,
seria uma ramificação de formato por estilo (futuro). A MAMARIA renderer desta
onda mira o CLÁSSICO; a "enxuta/objetivo" entra quando o estilo OBJETIVO for
tratado no renderer.

## Status
⬜ Aguardando decisão do Luiz sobre a remediação (mudança em prod — não aplicada).
