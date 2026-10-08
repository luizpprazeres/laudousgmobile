# Plano Web e mobile — feedback clínico de 07/10/2026

## Objetivo

Reduzir digitação e repetição sem transferir decisão clínica para a automação. A Web é a primeira entrega; iOS e Android recebem os mesmos contratos somente depois que estado, renderer e testes estiverem estáveis.

## Arquitetura auditada e peças reaproveitáveis

A Web já separa estado determinístico, adaptação para o catálogo e renderer canônico. A integração celular–Web já recebe achados estruturados em `companionStructured.ts`; ela deve evoluir sobre esse contrato, mantendo origem, confiança, conflitos e revisão médica antes da composição do laudo. Campos importados nunca podem apagar silenciosamente o que foi digitado.

Os formulários de pelve já compartilham módulos e adaptadores entre as vias. A unificação deve acontecer sobre esse núcleo, com uma escolha explícita de via, em vez de criar um terceiro renderer. Miomas precisam de uma coleção dinâmica única e de um contrato anatômico que sustente a FIGO; a classificação não pode ser deduzida quando faltarem relação com endométrio, serosa ou componente intramural.

Os esquemas visuais já usam o estado clínico como fonte e exportam a mesma composição mostrada na tela. Carótidas/vertebrais e a nova pelve devem seguir esse padrão: ilustração anatômica própria, marcadores derivados do formulário e inclusão manual no laudo.

Tireoide possui renderer canônico para ACR e Domingos, adaptador Web e esquema visual. A prévia local serve apenas para resposta imediata; a categoria impressa continua sendo calculada no renderer e é coberta por testes de paridade.

## Entrega 1 — tireoide Web

Status: implementada e validada localmente. A preferência salva de incluir a recomendação ACR agora atravessa o proxy Web e chega ao renderer canônico; falta apenas confirmar o deploy após o push.

O ACR TI-RADS passa a ser o fluxo principal do nódulo. Os cinco grupos ficam lado a lado em telas amplas e se reorganizam no celular, com pontos visíveis, categoria por cor e recomendação dimensional imediata. Localização é selecionável. Domingos fica recolhido e opcional, sem conversão para ACR.

Císticos e espongiformes encerram a pontuação como TR1. Demais nódulos só recebem categoria quando os cinco grupos foram respondidos. Em múltiplos nódulos, cada recomendação é vinculada ao achado e as indicações de PAAF ficam limitadas aos dois nódulos de maior categoria. A recomendação no laudo continua desligada por padrão e pode ser habilitada nas preferências.

A auditoria detalhada de resíduos e próximos ajustes está em [2026-10-07-tireoide-tirads-web-gap-map.md](../reviews/2026-10-07-tireoide-tirads-web-gap-map.md). Ela separa o que já está entregue das divergências ainda abertas entre Web, mobile, prompts e renderer.

## Entrega 2 — integração celular–Web

Primeiro será criado um envelope único de extração com categoria do exame, campo-alvo, valor normalizado, texto de origem, confiança e estado de revisão. Texto, ditado e imagem entram pelo mesmo envelope. O merge deve distinguir campo vazio, confirmação automática permitida, conflito com dado manual e informação sem destino conhecido.

O piloto deve usar tireoide e pelve, porque já possuem formulários estruturados e expõem medidas, seleções e achados repetíveis. O aceite exige preencher campos sem gerar o laudo, destacar o que veio do celular, preservar edições locais e listar ambiguidades sem inventar dados.

JEV/TypeSafe e alternativas entram como prova isolada. A escolha depende de precisão por campo, latência, custo, capacidade de manter evidência de origem e comportamento quando o schema muda. Nenhuma biblioteca será ligada ao atendimento antes de um conjunto sintético e anonimizado superar o contrato atual.

## Entrega 3 — pelve unificada e miomas

Criar uma categoria clínica única “Ultrassonografia da pelve”, com via transabdominal, transvaginal ou ambas. Os cards antigos devem continuar abrindo por compatibilidade e migrar para o mesmo estado interno.

O formulário terá ovários lado a lado, medidas uterinas compactas, espessura endometrial curta e seções condicionais pela via. “Achado estruturado” passa a “Alteração”. Líquido livre recebe presença, localização e quantidade por seleção. A correlação endometrial separa fase do ciclo, pós-menopausa, reposição, impossibilidade de correlação e texto livre justificado, sem concluir adequação quando faltarem dados.

Miomas passam a uma lista dinâmica sem limite artificial de três. Cada item preserva medidas, parede, topografia, relação com endométrio e serosa, pedículo, volume elipsoide e opção de mostrar o volume. A FIGO será bidirecional somente quando os dados forem suficientes e compatíveis; qualquer combinação contraditória bloqueia a conclusão. A revisão clínica da classificação vigente precede a ativação.

## Entrega 4 — esquemas visuais

O esquema de pelve será reconstruído em módulos longitudinal e transversal, com orientação anatômica compatível com a ultrassonografia. Alterações uterinas serão camadas independentes, começando por miomas, calcificações e adenomiose. Endometriose só entra onde a representação puder ser ligada a um achado estruturado real.

Carótidas e vertebrais usarão o mesmo contrato dos esquemas atuais: lados e segmentos do formulário alimentam os marcadores; exportação e tela usam a mesma composição; incluir no laudo é uma ação explícita.

## Entrega 5 — recomendações BI-RADS 2025

O estudo deve separar categoria global do exame, avaliação de cada achado e recomendação final. A categoria ou o tamanho de um nódulo isolado não poderá determinar a conduta sem o contexto exigido. As frases e regras só serão ativadas depois de validação contra a referência oficial e testes de combinações com múltiplos achados.

## Entrega 6 — iOS e Android

Depois da estabilização Web, os apps reutilizam os contratos aprovados para extração das calculadoras, inserção direta do resultado de pré-eclâmpsia após o laudo existir, atalhos obstétricos mais curtos e paridade das regras de tireoide. O resultado calculado deve entrar como bloco estruturado, sem voltar aos achados brutos para uma segunda interpretação.

CCN mínimo e estimativa de comprimento fetal permanecem dormentes até revisão científica. Se a estimativa de comprimento não tiver uso clínico bem sustentado, ela não será exibida apenas por ser calculável.

## Frente paralela — gráficos obstétricos

O gráfico INTERGROWTH atual é seguro para um ponto e pode ser anexado opcionalmente. Antes do histórico longitudinal, é preciso fixar a autoridade entre peso manual, Hadlock 3/Hadlock 4 e percentil manual, preservar a âncora completa da datação e garantir que uma figura antiga seja removida quando os dados deixam de ser válidos. A primeira expansão recomendada é histórico de PFE; curvas separadas de DBP, CC, CA e CF aguardam decisão sobre referência e janela gestacional.

## Gates comuns

Cada pacote clínico deve conter estado, opções Web, adaptação, renderer, frases normais e alteradas, persistência e testes sintéticos. Ausência de dado deve falhar de forma visível; zero válido deve ser preservado; manual/importado nunca pode ser sobrescrito silenciosamente. Testes de navegador precisam cobrir 390 px e 1440 px, geometria, alvo de toque, ida e volta pelo renderer e ausência de rolagem horizontal.

## Ordem de execução

Após publicar tireoide, a próxima frente é o envelope de integração celular–Web junto do primeiro piloto em pelve. Em seguida vêm pelve unificada/miomas/FIGO, esquemas visuais e BI-RADS. Gráficos obstétricos avançam em paralelo apenas nas correções sem decisão clínica. iOS e Android entram quando cada contrato Web correspondente estiver fechado.
