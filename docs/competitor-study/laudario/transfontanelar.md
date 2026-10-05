# Transfontanelar

## Concorrente

**Observado (03/10/2026, `competitor-research/laudario/cases/transfontanelar-2026-10-03.md`):**
- Estado inicial: anatomia e sistema ventricular normais, sem medidas, idade ou Doppler.
- Estrutura em blocos: técnica, parênquima, linha média, sistema ventricular, conclusão; dados
  etários, Doppler, patologias e recomendações como seções próprias.
- Dilatação ventricular sem medida nem graduação chegou ao corpo e à conclusão.
- Hemorragia graduada antes de informar lado e medidas; depois, o lado chegou ao corpo e à conclusão.
- A normalidade de uma estrutura coexistiu com a lesão na mesma região; valores ficaram guardados
  após desativar o achado.
- Recomendações sugeridas ficaram fora do texto até uma escolha explícita.

**Não observado:** Doppler (IR das artérias cerebrais), leucomalácia, malformações, espaços extra-axiais,
limitação técnica por estrutura.

## LaudoUSG (repo)

- **MVP local existe** (posterior ao crosswalk de 03/10): `apps/web/src/lib/deterministic/organs/transfontanela.ts`,
  com dados neonatais, janela acústica, parênquima e ventrículos no mesmo módulo, Levene por lado,
  3º ventrículo, hemorragia com lado/extensão/região e Papile confirmado, periventricular, cistos,
  calcificações, linha média, fossa posterior e cisterna magna.
- O formulário nasce normal: janela "adequada", parênquima "habitual" e ventrículos "normais" como padrão.
- Medida obrigatória ausente e lado ausente são impressos como lacuna (`____`) em vez de bloquear;
  só a hemorragia gera pendência (`transfontanela.ts:143,231,240,307`).
- Janela limitada vira uma frase global; não restringe estruturas.
- Sem Doppler.

## Backlog (sugestão)

**Modelo basal necessário:** o mesmo do MVP, mas só por modelo normal explícito; formulário em branco
pendente em parênquima, sistema ventricular e linha média.

**Alterações essenciais (v1):** já presentes no MVP (dilatação ventricular, hemorragia, periventricular,
cistos, calcificações). Acrescentar: estado "limitado/não avaliado" por estrutura e Doppler opcional.

**Campos obrigatórios:** dias de vida ou IG corrigida; janela acústica; estado de parênquima,
ventrículos e linha média; lado em todo achado lateralizado; medida quando o achado depende dela.
**Opcionais:** IG ao nascimento, Levene e 3º ventrículo, cisterna magna, Doppler com IR, comparação.

**Riscos fail-closed:**
- Trocar `____` impresso por pendência bloqueante (lado e medidas obrigatórias).
- Dilatação sem medida descrita como qualitativa, sem graduação automática por limiar.
- Papile só derivado dos componentes marcados e com confirmação; nunca antes de lado e extensão.
- Desativar um achado limpa os derivados (lado, medidas, grau, recomendação).
- Janela limitada com estrutura "normal" exige marcar qual estrutura foi avaliada.

## Perguntas para a rodada manual (não observado)

Doppler e campos de IR; leucomalácia e malformações; se existe "não avaliado" por estrutura; o que
acontece com a normalidade quando a janela é limitada.
