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

## Respostas do Luiz à fase 1 (10/10/2026) — liberam a fase 2

1. Obstétrica sem via ditada = **transabdominal**; quando fizer TV ou TA+TV, ele dita.
2. Obstétrica TV: frase **"com a finalidade de realizar a técnica transvaginal"**; o título **não muda** (fica "ULTRASSONOGRAFIA OBSTÉTRICA").
3. Obstétrica TA+TV: **texto da pelve** ("inicialmente… Após a micção…").
4. Cervicometria no morfológico/Doppler: **"Foi realizada avaliação complementar do colo uterino pela via transvaginal."**
5. Contexto clínico: **no fim da seção**; idade **só quando ditada** (nunca do cadastro).
6. Documentação: **"que possuem várias metodologias"** em todas (unificar).
7. MSK: padrão = "transdutor linear de alta frequência 12 MHz… Avaliação dinâmica quando aplicável."; "abrangendo a avaliação do
   {segmento}" é **variante antiga** (sai).
8. Parede abdominal: **sempre** "linear… com avaliação dinâmica… e manobra de Valsalva".
9. Próstata: pendente — o Luiz pediu para ver as duas frases (curta do banco × longa dos finais) antes de trocar no banco.
10. Pelve: "transvaginal" ditado sem "transabdominal" = **só TV**; sem via ditada = **TA+TV** (padrão).
11. Web: frase padrão editável **por usuário e por categoria**.
Fotos: "em NN fotos" sai sempre (decisão anterior).
