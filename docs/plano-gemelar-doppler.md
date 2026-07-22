# Plano — Suporte gemelar determinístico (DOPPLER_OBSTETRICO + extração)

> Origem: boletim 30/06 (CRÍTICO 9cb5204c — gemelar colapsado). Fix de segurança já
> mergeado (PR #8): 2+ fetos → fallback writer (não dropa feto). Este plano é a v2:
> renderer gemelar DETERMINÍSTICO + extração adequada. Referência de ouro: o
> `final_output` do 9cb5204c (o Dr. Luiz corrigiu à mão = template ideal).

## Descoberta-chave: a OBSTETRICA JÁ TEM gemelar
`renderer/categories/OBSTETRICA.ts` (renderObstetricaClassico, linhas 536-595) já faz:
- Título "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR" (numero_fetos>=2).
- Lead da IG com corionicidade: "Gestação gemelar {corionicidade} em torno de...".
- Frase "Dois fetos: o feto à direita (feto B), em apresentação X com dorso Y, e ...".
- Loop por feto: "Feto A:\nBCF... biometria... peso".
- `calcPonderal(fetos)` → peso médio + divergência (g e %).
- Conclusão gemelar: IG + líquido + divergência significativa (≥20%) vs concordante.
→ **80% do que o Dr. pediu já existe.** A tarefa é o DOPPLER REUSAR isso + adicionar o
Doppler FETAL por feto (umbilical/ACM/ducto), que a OBSTETRICA não tem.

## Requisitos do Dr. Luiz (conferidos vs gold 9cb5204c)
- CORPO: peso médio, divergência em g e %, individualizar cada feto. ✓ (OBSTETRICA já)
- CORPO Doppler: por feto — Artéria umbilical / ACM / Ducto venoso. ← NOVO no DOPPLER
- Placenta única + MBV POR FETO ("Maior bolsão vertical do feto A mede X cm"). ← ajuste
- Artérias uterinas: compartilhadas (uma vez). ✓
- CONCLUSÃO item 1: IG + amnionicidade + corionicidade ("gemelar monocoriônica e
  diamniótica ... datadas pelo maior feto"). ✓ (via lead)
- CONCLUSÃO: sufixo "para os dois fetos" nos itens do modelo padrão (líquido, IP normal,
  pré-centralização, perfil hemodinâmico). ← ajuste no builder de conclusão Doppler
- TÍTULO: + "GEMELAR" (também MORFOLÓGICO 1º tri gemelar). ✓ padrão OBSTETRICA

## PARTE A — Extração (a decisão arquitetural)
Problema: uma ÚNICA chamada LLM parseando ditado multi-feto é frágil (foi o que
colapsou). Duas rotas:

**Rota 1 (single-call, atual):** o LLM identifica "FETO A/B" no ditado e preenche
`fetos[]`. Barato, mas frágil em ditado longo/bagunçado.

**Rota 2 (RECOMENDADA — ideia do Luiz): input POR FETO + 1 LLM/feto.**
- App (Swift): botão discreto "Adicionar feto" → seções separadas (Feto A: imagens/
  ditado; Feto B: ...). Dados compartilhados (placenta, uterinas, corionicidade, IG,
  líquido) numa seção "Geral".
- Backend: N chamadas de extração (1 por feto, schema de feto simples e ROBUSTO) +
  1 para os campos compartilhados. Monta `fetos[] + shared`.
- Vantagem: cada chamada é SIMPLES (1 feto) → extração muito mais precisa; escala p/
  3, 4+ fetos trivialmente; imagens organizadas por feto.
- Custo: mudança de UI (Swift) + endpoint aceitar N blocos. Maior, mas é o certo.

**Decisão:** Rota 2 é o alvo. Mas o RENDERER é IGUAL nas duas rotas (recebe `fetos[]`).
Então: implementar o RENDERER primeiro (destrava a Rota 1 já), depois a Rota 2 (UI+API).

## PARTE B — Renderer gemelar do DOPPLER (implementação)
1. **Schema:** adicionar Doppler fetal ao Feto do DOPPLER (por feto): `ip_umbilical,
   perc_umbilical, ip_acm, perc_acm, ducto_venoso_ip, ducto_venoso_qualitativo`. Manter
   os campos top-level p/ feto único (backward-compat, byte-idêntico). MBV: usar
   `liquido_mbv_por_feto_cm[i]` (já existe, array por feto).
2. **renderGemelarDoppler(f):** espelhar renderObstetricaClassico gemelar (título,
   lead corionicidade, frase "Dois fetos", loop por feto com BCF+anatomia+biometria+
   peso), e no loop de cada feto ACRESCENTAR o bloco:
   `\nDOPPLERVELOCIMETRIA:\nArtéria umbilical: IP x.\nArtéria cerebral média: IP y.\nDucto venoso: IP z.`
   Depois: peso médio + divergência, placenta única, MBV por feto, e a seção de
   artérias uterinas (compartilhada, uma vez).
3. **Conclusão gemelar Doppler:** IG (lead corionicidade) + líquido "para os dois fetos"
   + IP normal "nas artérias uterinas, umbilical, ACM e ducto venoso para os dois fetos"
   + ausência de incisuras + "não há pré/centralização para os dois fetos" + "perfil
   hemodinâmico normal para os dois fetos". (Mapear do gold, itens 3-7.)
4. **Guard:** substituir o throw por: se gemelar E flag DOPPLER_GEMELAR ON →
   renderGemelarDoppler; senão mantém throw→writer (fallback seguro atual).
5. **Golden:** caso 9cb5204c → bater o corpo (2 fetos, Doppler por feto, peso médio
   1466.5 g, divergência 81 g / 5.4%, MBV por feto) e a conclusão (7 itens do gold).
6. **Flag:** DOPPLER_GEMELAR default OFF → golden + validação + review codex → on.

## Extração prompt (DOPPLER) — ajuste
Instruir: em gemelar, preencher Doppler fetal POR FETO em fetos[i]; uterinas/placenta/
corionicidade/líquido nos campos compartilhados. (Rota 2 elimina essa complexidade.)

## Ordem sugerida
1. Renderer gemelar + schema per-feto Doppler + golden (destrava Rota 1). ← começar aqui
2. Ajuste do prompt de extração + validação E2E no 9cb5204c.
3. Ligar DOPPLER_GEMELAR.
4. Rota 2 (UI Swift "add feto" + API por bloco) — maior, sessão dedicada.

---

## REVIEW DO CODEX (dex1) — refinamentos críticos (incorporar na implementação)

**Veredito:** design na direção certa. Renderer primeiro (recebe `fetos[]`), Rota 2 depois.
OBSTETRICA dá o ESQUELETO gemelar + `calcPonderal`; o DOPPLER mantém a fraseologia própria
e cria uma camada gemelar que **NUNCA afirma normalidade global sem TODOS os dados por feto**.

### 🔴 SEGURANÇA #1 — "para os dois fetos" só quando TODOS medidos E normais
Frases globais ("IP normal ... para os dois fetos", "não há centralização para os dois
fetos", "perfil hemodinâmico normal para os dois fetos") são **clinicamente perigosas** se
um feto não foi medido ou está alterado. Regra: computar por feto `hasAU/hasACM/hasDV/rcp/
acmComprometida/centralização`; só usar "para os dois fetos" se **todos** têm o dado E estão
normais; senão **individualizar** ("Feto A: ...", "Feto B: ..."). Espelha o guard de vaso
medido do feto único (dopplerOverlay `fraseNormalIP`/`acmComprometida`).

### 🔴 Schema per-feto MAIOR do que planejado
Não só ip_umbilical/ip_acm/ducto_venoso_ip — também **por feto**: `rcp, umbilical_alterado,
acm_alterado, pre_centralizacao, centralizacao, restricao_crescimento`. Top-level só é
seguro p/ MATERNO/compartilhado (uterinas, incisura, ectasia). Criar `DopplerFetoSchema`
estendendo o feto; sobrescrever `fetos` no schema Doppler; **manter top-level p/ feto único**.

### 🟠 Não copiar renderObstetricaClassico inteiro
O Doppler tem fraseologia validada própria: peso em "g" (não "gramas"), líquido "O maior
bolsão vertical mede X cm", placenta "de acordo com a fase da gestação", remoção da linha
de perfil no corpo. Criar helpers LOCAIS do Doppler que espelham a estrutura gemelar mas
preservam essas frases. `toPesoFetalData`/`buildPesoFetalItems` hoje só olham `fetos[0]` →
em gemelar recriaria o bug na conclusão de peso: fazer versão per-feto.

### 🟠 Exportar FetoSchema/FETO_JSON da OBSTETRICA (sem contaminar)
Estender o feto sem duplicação feia — exportar da OBSTETRICA SEM mudar required/properties
dela; NÃO adicionar campos Doppler no FetoSchema compartilhado (contaminaria a extração obst).

### 🟠 Conclusão gemelar = builder PRÓPRIO (buildGemelarDopplerConclusionItems)
`buildDopplerConclusionItems` é feto-único e nem inclui ducto venoso na frase normal. Criar
builder gemelar com a validação de segurança acima. Item 1 "datadas pelo maior feto" é
próprio do Doppler (não sai da OBSTETRICA) — mas a âncora de IG continua `computeIg`
(biometria/referência), não "maior medida".

### 🟡 Líquido/MBV gemelar
`liquidoDopplerGemelar` usando `liquido_mbv_por_feto_cm[i]` (única fonte). Se `liquido_tipo=ila`
em gemelar → suspeito, não usar ILA; só MBV se houver array. Se só 1 MBV p/ 2 fetos → não
dizer "para os dois fetos".

### 🟡 Pós-processador
`correctDopplerConclusion` está no branch NÃO-renderer (route:939-962). O renderer gemelar
tem que sair com a conclusão FINAL pronta — não contar com overlay.

### Byte-stability (obrigatório)
Feto único byte-idêntico. Branch gemelar SÓ quando `isGemelar(f) && DOPPLER_GEMELAR on`.
Top-level continua fonte do feto único. Golden feto único roda antes/depois.

### Goldens adversariais (além do gold 9cb5204c)
- Feto A com AU/ACM/DV, Feto B SEM DV → conclusão NÃO pode dizer "ducto venoso normal para
  os dois fetos".
- Feto A centralizado, Feto B normal → NÃO pode dizer "não há centralização para os dois fetos".

### Ordem (codex): schema → helpers locais → renderGemelarDoppler → dispatcher/flag →
### goldens (feto único + fallback flag-off + gold + 2 adversariais) → prompt Rota 1 → Rota 2.
