# W15 — Comentários (técnica) padrão por via e transdutor (NA FILA — fase 1 = estudo)

Pedido do Luiz (10/10/2026). A seção de comentários/técnica segue um padrão simples: **via do exame, transdutor, frequência**, e o
resto se repete. A variação real é rara: informação de contexto clínico sem relação com as imagens ("Exame realizado em contexto
de urgência", "Exame realizado em uma criança de 3 anos de idade"). Na maioria das vezes o médico não fala nada; quando diz a via
(ex.: "fiz transvaginal"), a frase da via e a frequência do transdutor devido entram sozinhas, salvo se ele disser outro
transdutor. Mais afetada: **obstétrica** (1º trimestre pode ser TA ou TV) e pelve.

## Fase 1 — estudo (sem LLM, banco só leitura)
1. Minerar a seção de comentários/técnica dos finais assinados (180 dias), por categoria: frases distintas, via, transdutor
   (convexo, linear, endocavitário…), frequência (MHz), frequência de cada variante, e as frases extras de contexto clínico.
2. Montar a tabela canônica: categoria × via → frase padrão (com transdutor e MHz que o Luiz usa); regras de troca quando o
   ditado cita via/transdutor/frequência; onde entram as frases de contexto.
3. Mapear onde a técnica nasce hoje em cada caminho (renderer, writer completo, writers dedicados, catálogo, web) e onde o
   ditado "transvaginal" já muda ou não muda a frase (com exemplos sem dado de paciente).
4. Proposta para o Luiz (HTML local em `tmp-review/`): a tabela + 5–10 exemplos antes/depois; **perguntas** sobre o que não dá
   para deduzir dos finais.

## Fase 2 — só depois do OK do Luiz
- Uma fonte única da tabela (pacote compartilhado), usada por mobile (ditado) e web (preferência/personalização por usuário).
- Mobile: via/transdutor ditados ajustam a frase; contexto clínico ditado entra como frase extra; nada inventado.
- Web: o usuário escolhe/edita a frase padrão por categoria e via.

Status em `tmp-review/haiku-migration/status/W15.md`. Nada de push/deploy/banco.
