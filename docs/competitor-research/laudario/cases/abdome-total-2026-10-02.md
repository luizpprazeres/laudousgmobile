# Laudário — Abdome Total

Observado em 02/10/2026, com valores exclusivamente sintéticos. O modelo foi restaurado ao estado normal e o catálogo foi reaberto ao final.

## Estrutura

Abas vistas: Dados do Paciente, Técnica, Indicação, Fígado, Veias Hepáticas, Veia Porta, Vias Biliares, Vesícula Biliar, Pâncreas, Baço, Rim e Ureter Direito, Rim e Ureter Esquerdo, Bexiga, Aorta e Retroperitôneo, Veia Cava, Alças Intestinais, Líquido Livre, Quantificação Gordurosa, Exames Comparativos, Achados Adicionais e Recomendações.

O estado normal já produz um laudo completo. O fígado inclui situações clínicas, dimensões, variantes, lesões císticas, nódulos, colaterais portossistêmicas e calcificações. A vesícula separa distensão, colelitíase, lama, colecistite, espessamento reativo, doença crônica, pólipos e outras lesões.

## Cenário 1 — esteatose leve

**Entrada:** seleção de esteatose/distúrbio gorduroso difuso leve, mantendo os demais controles normais.

**Observado:** a descrição hepática trocou o estado homogêneo por aumento leve e difuso da ecogenicidade, preservando visualização vascular e diafragmática. A conclusão passou a registrar hepatopatia de depósito leve de provável origem gordurosa e manteve as demais estruturas como sem alterações relevantes.

**Implicação:** o preset combina achado, graduação e conclusão. Os refinamentos de bordos, hepatomegalia, áreas poupadas e outras doenças de depósito permanecem editáveis dentro do mesmo cenário.

## Cenário 2 — hepatopatia aguda

**Entrada:** seleção de hepatopatia aguda/hepatite, sem marcar refinamentos adicionais.

**Observado:** o sistema descreveu parênquima hipoecogênico, realce periportal e padrão vascular normal. Também substituiu automaticamente a frase normal da vesícula por espessamento parietal reativo no contexto da hepatopatia aguda, sem sinais específicos de colecistite. Corpo e conclusão foram alterados nos dois órgãos.

**Implicação:** existe uma dependência explícita entre um cenário hepático e o estado da vesícula. Esse tipo de cascata precisa ser representado como regra clínica revisável, não como simples texto pronto.

## Cenário 3 — cálculo vesicular móvel

**Entrada:** cálculo único móvel, com maior eixo sintético de 1,2 cm.

**Observado:** a frase normal da vesícula foi substituída por descrição de imagem hiperecogênica móvel, com sombra acústica e a medida informada. A conclusão passou a registrar colelitíase, sem acrescentar inferências clínicas.

## Restauração

Após retornar fígado e vesícula aos estados habituais/ausentes, a conclusão normal reapareceu. As conclusões de hepatite e colelitíase deixaram de constar no texto. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

## Próximas sondagens

Testar medida incompleta do cálculo, risco de migração, pólipo com regra SRU, cisto renal, hidronefrose e o módulo de quantificação gordurosa. Antes disso, cruzar os três cenários desta rodada com os fluxos reais do LaudoUSG Web, iOS e Android/RN.

O cruzamento técnico dos três cenários está em [crosswalk-abdome-total-2026-10-02.md](../crosswalk-abdome-total-2026-10-02.md).
