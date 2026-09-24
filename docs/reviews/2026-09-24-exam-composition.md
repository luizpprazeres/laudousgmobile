# Associação rápida de exames — desenho proposto

O pedido desta etapa é explorar uma estrutura para associações rotineiras. Bilateralidade MSK pode usar o contrato multiarticular existente; combinações de categorias independentes precisam de um contrato de documento composto. Não vamos simular esse contrato concatenando rascunhos no navegador.

## Modelo

Uma sessão mantém componentes explícitos: categoria, escopo/via, identificador estável, estado dos órgãos, indicação de estruturas efetivamente avaliadas e revisão do texto. Os órgãos compartilhados têm identidade clínica única por sessão e contexto de aquisição: bexiga transabdominal não é a avaliação transvaginal; rim direito nunca recebe estado do esquerdo por troca de opção.

Uma escolha como “Adicionar próstata” ao abdome acrescenta próstata e vesículas seminais. A bexiga já existente é compartilhada quando o contexto de aquisição coincide. “Mamas e axilas + pelve” mantém ambos os conjuntos anatômicos e não compartilha classificações. Um componente pode ser removido sem apagar silenciosamente achados de outro.

## Interface

No topo, “Associar exame” oferece apenas combinações com contrato suportado. Cada componente aparece como grupo na grade atual. Nenhum menu de órgão lateral. Controles de via/escopo ficam no respectivo grupo, e órgãos realmente compartilhados aparecem uma vez. O laudo possui um título composto e seções com origem rastreável. Recomendações podem ser gerais ou de um componente.

## Backend e persistência necessários

Um endpoint de composição deve validar componentes, selecionar os renderers canônicos, montar título/técnica/corpo/conclusão e devolver também sua origem por bloco. O estado salvo deve carregar a sessão completa, não apenas a categoria que estava visível. Erro ou atraso em qualquer componente bloqueia o salvamento de uma versão parcial como completa. Edições manuais seguem o modelo de proposta/diff já existente.

Não é necessário duplicar engines clínicos nem criar uma categoria gigante. O contrato de composição deve ser versionado e aceito por histórico, exportação e Sala. Não houve alteração de banco ou endpoint nesta etapa exploratória.

## Gate de implementação futura

Abdome + próstata: uma bexiga, rins preservados, próstata incluída, resíduo opcional, nenhum título/técnica contraditório. Mamas + axilas + pelve: BI-RADS restrito à mama, via pélvica mantida, nenhuma conclusão indevidamente global. Remover/reincluir componente: dados preservados somente quando explicitamente reutilizados. Salvar/reabrir: mesma sessão, estados e texto. Conflitos, erro parcial e respostas fora de ordem: falha visível sem laudo aparentemente completo.

A associação contralateral MSK desta etapa usa `laudos[]` já existente e é validada separadamente; não prova a composição geral.
