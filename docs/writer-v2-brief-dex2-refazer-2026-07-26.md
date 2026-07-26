# Brief de reorientação p/ Dex2 (colar quando o medmaestri voltar)

REVISÃO do meu review: os specs de conclusão que você fez NÃO batem com o gabarito (o renderer). O Luiz decidiu refazer batendo linha-a-linha. Rodei os renderers com findings normais e extraí os gabaritos EXATOS — estão em `docs/writer-v2-gabaritos-conclusao-2026-07-26.md`. Leia esse doc inteiro primeiro.

DIVERGÊNCIAS que você precisa corrigir (exemplos):
- OBSTETRICA normal do gabarito = SÓ 2 itens: "1) Gestação em torno de 30 semanas. 2) Líquido amniótico em quantidade normal." Você pôs 4 (feto vivo + IG separada + líquido + placenta fixa). O gabarito COMBINA gestação+IG num item, NÃO diz "tópica única/feto vivo" no normal, e placenta é CONDICIONAL (só quando ditada).
- MORFOLOGICO: líquido é "DE quantidade normal" (não "em"!); OBSTETRICA é "EM". Reproduza cada preposição como o gabarito.
- PELVE: bexiga é CONDICIONAL à via (TV puro NÃO tem bexiga); ovários são UM item combinado quando ambos normais (você separou em 2).

TAREFA: refazer frase_conclusao/conclusao_modo/conclusao_ordem + dicionário dos 3 specs (PELVE_FEMININA, OBSTETRICA, MORFOLOGICO) reproduzindo os gabaritos do doc EXATAMENTE. Use as ferramentas do motor (commit 4d6ee4b): item condicional = slot SEM frase_conclusao + conclusao no plano (para placenta/bexiga); frase_conclusao = item sempre-presente. NÃO toque o motor.

PONTOS DIFÍCEIS — se algo NÃO couber fielmente no modelo por-slot, FLAG p/ mim (não aproxime em silêncio): (a) ovários combinados num item quando ambos normais mas separados quando um alterado; (b) volumes calculados no normal (útero 75,3 cm³) que o V2 não calcula — proponha usar a frase sem o parentético quando não há medida ditada, e me diga.

VALIDAÇÃO: no assemble.manual.ts, para cada categoria adicione um caso que compara a CONCLUSÃO-normal do assemble V2 com o gabarito do doc (texto exato, exceto números calculados). tsc 0. NÃO deploy. Me diga file:line + quais pontos você teve que aproximar/flaggar. O DOPPLER_OBSTETRICO deixa pra depois (não tem renderer, revisamos separado).
