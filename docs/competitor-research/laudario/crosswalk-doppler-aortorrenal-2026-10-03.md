# Cruzamento Laudário × LaudoUSG — Doppler Aortorrenal

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi verificado no monorepo, no cliente iOS e nos testes focados existentes.

## Síntese

O LaudoUSG já expõe `DOPPLER_RENAL` na Web, Android/RN e iOS, usa o mesmo código de categoria, possui asset compartilhado e envia o exame ao mesmo backend. A API tem writer dedicado, quatro exemplos orientadores e auditoria numérica. A paridade de catálogo está boa. Nesta rodada, os riscos imediatos do writer foram endurecidos; a cobertura continua parcial porque ainda não existe contrato renal compartilhado.

| Camada | Estado atual |
| --- | --- |
| Web | Categoria disponível no grupo vascular; entrada por texto ou ditado |
| Android/RN | Categoria liberada, asset próprio e `category_hint` enviado à API |
| iOS | Categoria selecionável, asset próprio e `categoryHint` enviado à API |
| API | Writer dedicado condicionado a `RENDERER_CATEGORIES`; fallback genérico fora do gate |
| Banco | Categoria registrada; entrada, saída, revisão e metadados persistidos no laudo genérico |
| Contrato compartilhado | Ausente para Doppler renal |
| Produção | Verificada em 03/10/2026: `RENDERER_CATEGORIES` estava vazio e `DOPPLER_RENAL` desligado |

## O que já existe

O writer preserva VPS, RAR e IR ditados, usa critérios clínicos próprios do LaudoUSG e proíbe classificar percentual de estenose. A biblioteca de conhecimento já contém modelo normal, estenose significativa, medidas, limitação técnica e nefroesclerose. O material de transplante renal permanece em `__rev__`, corretamente fora da ingestão ativa.

Os clientes usam o mesmo código e a mesma imagem. O banco registra a categoria e o ciclo genérico do laudo. Essa base permite evoluir sem criar uma segunda categoria incompatível: “Doppler Aortorrenal” é o nome observado no concorrente; `DOPPLER_RENAL` e “Doppler renal” permanecem o nome e o código canônicos do LaudoUSG.

A configuração da Vercel foi conferida sem expor valores de ambiente. O writer renal dedicado está desligado em produção; portanto as proteções deste lote permanecem dormentes até a validação clínica e a ativação deliberada da categoria. O exame hoje continua pelo caminho genérico quando usado no ambiente produtivo.

## Problemas confirmados e corrigidos nesta rodada

O prompt anterior contradizia sua própria regra de emitir somente o que foi ditado. Quando a VPS aórtica não era informada, ele ordenava afirmar que a aorta tinha calibre e contornos preservados. Na ausência de critério de estenose, também ordenava concluir fluxo bilateral e índices de resistência normais, mesmo que esses itens não tivessem sido medidos.

**Correção aplicada:** o prompt e os quatro exemplos agora omitem aorta não mencionada, restringem normalidade ao lado avaliado e só chamam IR de normal quando o ditado sustenta essa afirmação.

A auditoria reunia números de VPS, RAR e IR e procurava cada número em qualquer ponto do laudo. Ela não preservava tipo ou lado. Uma troca entre direita e esquerda ou entre RAR e IR podia passar como correta.

**Correção aplicada:** a auditoria passou a ligar VPS, RAR e IR ao lado correspondente, bloqueia troca de parâmetro/lateralidade e rejeita IR fora da faixa adotada quando o texto o conclui como normal. Segmento, unidade e origem ainda dependem do contrato futuro.

Quando a auditoria encontrava um problema, o writer apenas acrescentava um aviso ao fim do laudo e a rota podia cair no writer genérico.

**Correção aplicada:** a resposta agora fica retida até a auditoria terminar. Troca de lado/parâmetro, perda de medida, percentual indevido, normalidade presumida e estenose sem sustentação geram erro fechado; a rota reconhece esse erro e não usa o fallback genérico. Como consequência, a resposta válida chega inteira após a auditoria, em vez de aparecer token a token.

Menção isolada a tardus-parvus ou suspeita de estenose também deixou de autorizar conclusão de estenose hemodinamicamente significativa. Continua possível registrar o achado como sugestivo.

O glossário de transcrição passou a incluir artéria renal, aortorrenal, relação aorto-renal, RAR, VPS, índice de resistência, intrarrenal e tardus-parvus somente nessa categoria.

## Lacunas restantes

Assimetria renal, faixa limítrofe de VPS e limitação técnica estão na biblioteca, mas não são carregadas de forma estruturada pelo writer dedicado. O bloqueio de IR contraditório foi acrescentado, porém o extrator do sanity geral ainda guarda apenas um valor por tipo, procura principalmente `PSV` e descarta lateralidade e segmento.

**Gap confirmado:** o conhecimento curado não governa o caminho ativo. As regras aprovadas precisam entrar no contrato/auditor e ganhar casos de teste, sem depender de recuperação textual opcional.

## Diferenças úteis observadas no concorrente

O concorrente separa qualidade técnica, perviedade, padrão hemodinâmico, critérios diretos, critérios indiretos e recomendações. No cenário direto, uma medida disparou alerta, mas a conclusão só mudou após confirmação do padrão anormal. Na limitação técnica, o lado não avaliado deixou de ser tratado como normal.

O ponto que não deve ser reproduzido é a conclusão positiva a partir da seleção qualitativa isolada de tardus-parvus. O LaudoUSG deve permitir registrar o achado, mas exigir o conjunto de dados aprovado e confirmação médica antes de transformar isso em diagnóstico de estenose significativa.

## Contrato mínimo proposto

O contrato futuro deve separar escopo técnico por lado; aorta; artéria renal principal por segmento; artérias intrarrenais; dimensões renais; artérias acessórias; limitações; medidas e derivações. Cada estrutura precisa admitir `não avaliada`, `avaliação parcial`, `avaliada normal` e `alterada`.

RAR deve ser derivada somente quando as medidas de origem compatíveis estiverem presentes e preservar os valores usados. Tardus-parvus deve ser um achado espectral com lado e território, não um atalho de diagnóstico. Recomendações permanecem sugestões separadas do texto. Transplante renal continua fora do primeiro contrato até revisão clínica específica.

## Ordem segura de implementação

As proteções imediatas do writer, o bloqueio de falhas críticas e o glossário já foram concluídos. A próxima fase é integrar faixa limítrofe, assimetria e limitação técnica, alinhar estilo/personalização e decidir se a verificação renal específica será incorporada ao sanity geral ou substituída pelo contrato tipado. Só então vale promover o schema da API para contrato compartilhado entre Web, Android/RN e iOS.

## Provas necessárias antes de ativar

O lote mínimo precisa cobrir normal bilateral explicitamente completo; estenose unilateral por critério direto; tardus-parvus com e sem critérios completos; IR elevado unilateral e bilateral; assimetria renal; VPS limítrofe; limitação por segmento; troca direita/esquerda; troca RAR/IR; limites exatos dos critérios adotados; ausência do gate de servidor; estilos clássico e objetivo; e serialização dos três clientes até a API.

O caso funcional está em [cases/doppler-aortorrenal-2026-10-03.md](cases/doppler-aortorrenal-2026-10-03.md).
