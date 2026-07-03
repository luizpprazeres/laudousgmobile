# Classificação das categorias nos 2 modos (formulário × linguagem)

> **Data:** 2026-07-03. **Autor:** Claude (proposta — a classificação final é do Dr. Luiz,
> que conhece o padrão de ditado de cada exame). Consolida a arquitetura de 2 modos
> (`docs/plano-arquitetura-3-modos-2026-07-02.md`) com o estado real de implementação.
> Volumes: `reports` por `category_code` (03/07).

## Os 2 modos (recap)

- **`renderer_with_free_slots`** — exame ESTRUTURADO (campos fixos: medidas, índices,
  catálogo de órgãos). O CÓDIGO calcula/estrutura; o LLM tece o inusitado num slot livre.
  Bom quando o médico consegue listar TODOS os campos possíveis numa tabela.
- **`writer_guarded`** — exame de LINGUAGEM ABERTA (achados ilimitados, frases que mudam
  muito). O LLM ESCREVE com o estilo da casa (few-shots + roteiro), com guards
  determinísticos só pros FATOS (medida/lado dropado, alucinação). Bom quando o exame é
  "o médico descreve o que vê em prosa".

**Regra prática:** campos enumeráveis → renderer; prosa/variação alta → writer.
**Nunca publicar quando não entendeu** (sem frase-neutra) — vale nos dois modos.

## Estado atual + classificação proposta

| Categoria | Laudos | Modo HOJE | Modo PROPOSTO | Racional |
|---|---:|---|---|---|
| ABDOMEN_TOTAL | 778 | renderer (slots órgão) | renderer_with_free_slots | catálogo de órgãos fixo + slot p/ inusitado. **Falta o slot livre.** |
| OBSTETRICA | 476 | renderer programático | renderer_with_free_slots | biometria/cálculo fixos + slot p/ frase livre (adrenais, comparação). |
| PELVE_FEMININA | 253 | **writer_guarded** (dormente #24) | **writer_guarded** | TA/TV mudam muito → renderer repetia/alucinava. **Migrado (Luiz pediu).** |
| DOPPLER_OBSTETRICO | 234 | renderer programático | renderer_with_free_slots | idem obstétrico. |
| MORFOLOGICO | 215 | renderer programático | renderer_with_free_slots | biometria fixa + slot p/ malformação inusitada. |
| TIREOIDE | 212 | renderer programático | renderer_with_free_slots | nódulos = atributos fixos + TI-RADS + slot. |
| MAMARIA | 161 | renderer programático | renderer_with_free_slots | lesões catalogadas + BI-RADS + slot. Guard BI-RADS só-sinaliza LIVE. |
| CERVICAL (pescoço) | 57 | renderer programático | **avaliar writer** | níveis + achados variáveis; candidato a writer. |
| DOPPLER_RENAL | 57 | **writer_guarded** (dormente #26) | **writer_guarded** | ditado compacto → renderer enche de ____. **Feito.** |
| MUSCULOESQUELETICO_V2 | 54 | **writer_guarded** (LIVE) | writer_guarded | achados ilimitados. **LIVE.** |
| DOPPLER_VENOSO_MMII | 37 | **writer_guarded** (dormente #27) | writer_guarded | protocolo TVP-only vs completo, segurança. **Feito.** |
| PROSTATA_SUPRAPUBICA | 37 | renderer programático | renderer_with_free_slots | template fixo (volume/IPP). |
| VIAS_URINARIAS | 25 | renderer programático | renderer_with_free_slots | catálogo fixo. |
| ESCROTAL | 22 | writer geral | **writer_guarded** | achados variáveis (varicocele, cisto, orquite) — candidato. |
| DOPPLER_ARTERIAL_MMII | 16 | writer geral | **writer_guarded** (pausado) | fasicidade/ateromatose/estenose; mesmo padrão vascular. |
| PARTES_MOLES | 14 | **writer_guarded** (LIVE) | writer_guarded | lesão de qualquer tipo/topografia. **LIVE.** |
| DOPPLER_VENOSO_MMII_MEDIDAS | 7 | writer geral | **writer_guarded** | variante mapeamento pré-op do venoso. |
| PAREDE_ABDOMINAL | 5 | writer geral | renderer_with_free_slots OU writer | hérnia/diástase = poucos campos; avaliar. |
| ABDOMEN_SUPERIOR | 5 | renderer programático | renderer_with_free_slots | subconjunto do abdome. |
| DOPPLER_CAROTIDAS | 2 | writer geral | **writer_guarded** (pausado) | VPS/EMI/placas/NASCET; padrão vascular. |
| GLANDULAS_SALIVARES | 2 | writer geral | **writer_guarded** | prosa descritiva. |
| CERVICOMETRIA | 0* | renderer programático (LIVE) | renderer_with_free_slots | exame simplíssimo (2 medidas). **LIVE** (*novo, 0 histórico). |
| ESCROTAL/OCULAR/TORAX/QUADRIL_INFANTIL/PROSTATA_TRANSRETAL/PARATIREOIDE/REGIAO_INGUINAL/TRANSFONTANELA/…_MMSS/FISTULA_AV | 0 | writer geral | a definir | sem volume; classificar quando surgir demanda. |

## Leitura estratégica

1. **Os writers já provaram o padrão** (MSK, partes_moles LIVE; pelve, renal, venoso
   dormentes) — a receita `prompt+roteiro+few-shots+fact-audit` generaliza. Toda categoria
   de LINGUAGEM aberta deve seguir esse molde.
2. **A metade FALTANTE da arquitetura é o `renderer_with_free_slots`** — as categorias
   estruturadas (obstétrico/tireoide/mama/pelve-quando-era-renderer/abdome) precisam do
   SLOT LIVRE p/ o inusitado que hoje dropam/ecoam. Base: `docs/camada-flexivel-design.md`.
   É o próximo grande eixo depois do vascular.
3. **Vascular:** renal+venoso feitos (84% do volume vascular); arterial+carótidas pausados
   até a validação de estilo (0 corpus assinado — ver memória vascular-doppler-writer).
4. **Candidatos a migrar p/ writer** (linguagem, hoje no writer geral degradado): ESCROTAL,
   GLANDULAS_SALIVARES, CERVICAL (pescoço), DOPPLER_VENOSO_MMII_MEDIDAS.

## Pendências que dependem do Luiz (sticky note "DÚVIDAS")

- Validar o ESTILO dos writers vasculares (0 corpus assinado) antes de ativar.
- Confirmar a classificação acima (ele conhece o padrão de ditado real).
- Ativação (piloto) do PELVE writer e do vascular renal.
