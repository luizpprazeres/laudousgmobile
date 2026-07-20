# Visão de produto — LaudoUSG Workspace

> Documento vivo de contexto e decisões. Não é um plano de implementação e não autoriza mudanças no produto atual.

**Estado:** descoberta e estruturação da ideia
**Atualizado em:** 20 de julho de 2026
**Objetivo deste arquivo:** permitir que uma nova conversa ou outra IA retome o raciocínio sem depender do histórico do chat.

## 1. Contexto atual

O LaudoUSG atual funciona e já atende o fluxo de geração de laudos pelo celular, comunicação com a auxiliar de sala e uso do backend clínico existente. O produto atual continua sendo a plataforma de produção e não deve ser interrompido ou refeito enquanto a nova proposta ainda estiver sendo validada.

A nova proposta nasce de duas limitações percebidas no produto atual. A primeira é depender de modelos de IA contratados e escolhidos pela própria plataforma, enquanto parte dos usuários já possui acesso a agentes mais atuais por meio de Codex, ChatGPT ou Claude Code. A segunda é o médico ficar limitado aos modelos e estilos previamente cadastrados, sem conseguir transformar rapidamente o próprio laudo em centro permanente do trabalho.

O objetivo futuro é criar uma nova superfície do LaudoUSG que possa, depois de validada, assumir progressivamente parte ou todo o trabalho hoje realizado no aplicativo. A substituição não é uma decisão tomada neste momento.

## 2. Definição simples do novo produto

O novo produto não é uma IDE tradicional e não é apenas um MCP. Ele é um editor clínico centrado no laudo, com um agente de IA trabalhando ao lado do texto.

Sua experiência combina quatro ideias: a organização local de documentos do Joplin ou Obsidian, a edição simples de um bloco de notas, a conversa em linguagem natural do ChatGPT e a capacidade operacional de agentes como Codex e Claude Code.

O médico deve conseguir abrir uma categoria, receber imediatamente seu modelo habitual, editar qualquer parte diretamente, conversar com a IA sobre aquele texto e acompanhar a alteração no laudo em tempo real.

## 3. Princípio central

O laudo do próprio usuário é a fonte principal. A IA não deve obrigar o médico a adaptar sua escrita a um pequeno conjunto de modelos fechados.

Cada categoria recebe um modelo inicial do LaudoUSG para evitar uma tela vazia. Esse modelo pode ser normal ou conter placeholders. O usuário pode mantê-lo, fazer alterações pontuais ou substituir todo o conteúdo por um modelo próprio. Depois de salvo como preferência, o modelo do usuário passa a ser o ponto de partida daquela categoria.

O MCP, as regras, as calculadoras e os exemplos clínicos orientam e protegem o trabalho, mas não retiram do médico o domínio sobre o texto.

## 4. Separação indispensável: modelo e laudo do paciente

O sistema precisa distinguir claramente dois tipos de documento. Essa separação evita que um achado de um paciente altere acidentalmente o modelo usado nos exames seguintes.

| Objeto | Função | Comportamento esperado |
|---|---|---|
| Modelo pessoal da categoria | Ponto de partida habitual do médico | Só muda quando o usuário escolhe explicitamente “Salvar como meu modelo” |
| Laudo de exame | Cópia de trabalho usada para um paciente | Pode ser editado livremente, salvo, enviado para a Sala e arquivado sem alterar o modelo pessoal |

Ao selecionar “Abdômen total”, o sistema cria um novo laudo a partir do modelo pessoal de abdômen. Durante o exame, o médico e a IA modificam apenas aquela cópia. Se o médico gostar de uma mudança estrutural e quiser reaproveitá-la no futuro, poderá promovê-la conscientemente para o modelo da categoria.

## 5. Organização visual proposta

A interface principal terá três colunas.

| Coluna | Tamanho relativo | Conteúdo |
|---|---:|---|
| Categorias | Pequena | Categorias de exame, busca e acesso aos modelos pessoais |
| Agente de IA | Média | Conversa, ditado, comandos rápidos, calculadoras acionadas e avisos |
| Laudo | Grande | Texto do laudo atual, editável como um documento simples e salvo continuamente |

A coluna do laudo é a área dominante. A conversa deve auxiliar o documento, não competir com ele. O usuário pode escrever diretamente no texto ou pedir mudanças em linguagem natural.

As três colunas usam a mesma linguagem visual: superfícies arredondadas, proporções diferentes e componentes que podem mudar de função sem reorganizar toda a tela. Categorias longas recebem nomes curtos quando necessário; “Musculoesquelético”, por exemplo, aparece como “MSK”.

O campo “Comando ou ditado” possui ação de microfone. A transcrição entra no mesmo campo antes de ser aplicada, permitindo ao médico conferir ou complementar a instrução.

O laudo não fica dentro de uma segunda caixa branca com bordas. A própria coluna direita funciona como uma página contínua: o médico clica diretamente no texto e edita. Antes do conteúdo existe uma barra discreta de formatação com negrito, itálico, sublinhado, listas e alinhamento.

Exemplo de comando: “Substitua a descrição do fígado por esteatose leve, mantenha o restante e acrescente a conclusão correspondente.” O agente deve alterar apenas os trechos necessários, preservar o restante e deixar visível o que mudou.

## 6. Fluxo diário imaginado

O médico abre a categoria, inicia um novo exame e recebe uma cópia do seu modelo pessoal. Ele dita achados, medidas ou instruções livres. O agente interpreta a intenção, chama calculadoras determinísticas quando necessário, modifica o laudo aberto e executa verificações clínicas antes de considerá-lo pronto.

O médico também pode editar diretamente o texto a qualquer momento. As duas formas de edição — manual e por IA — trabalham sobre o mesmo documento e precisam permanecer sincronizadas.

Ao finalizar, o laudo pode ser enviado à Sala pelo backend existente. A auxiliar visualiza a versão atual por uma superfície compatível com computadores hospitalares. O exame é armazenado localmente e, quando permitido, sincronizado com a conta do usuário.

### Acesso aos laudos anteriores

“Laudos anteriores” será uma ação global visível na barra superior, próxima de “Novo laudo”. Ao acioná-la, a coluna central se transforma: sai temporariamente o chat do agente e entra a lista pesquisável de exames anteriores. A coluna esquerda continua mostrando as categorias e a direita passa a exibir o laudo selecionado.

Esse comportamento reaproveita a lógica visual do Joplin sem criar uma quarta coluna permanente. Para retornar à conversa, o usuário toca em “Voltar ao agente”. Um laudo anterior abre inicialmente como leitura; o usuário poderá criar uma cópia para novo exame, sem modificar silenciosamente o documento arquivado.

## 7. Componentes conceituais

| Componente | Responsabilidade |
|---|---|
| Aplicativo desktop | Interface, documentos, histórico, edição e operação local |
| Agente | Interpretação da linguagem natural e transformação inteligente do texto |
| MCP LaudoUSG | Acesso padronizado a regras, modelos, calculadoras, sanity checks, salvamento e Sala |
| Backend atual | Autenticação, sincronização autorizada, dados da conta e comunicação com a Sala |
| Armazenamento local | Modelos pessoais, laudos em andamento, histórico e funcionamento offline |

Codex e Claude Code devem ser tratados como motores substituíveis. A interface clínica e os documentos não podem ficar presos a um único fornecedor de IA.

## 8. Segurança da edição

Um modelo mais inteligente melhora a compreensão, mas não elimina erros. Por isso, toda alteração feita pela IA precisa manter versão anterior, permitir desfazer e registrar o texto usado como base.

A edição assistida deve trabalhar com sugestões aplicadas visualmente ao documento. Em vez de apenas avisar que um trecho está errado, o agente apresenta a redação proposta no lugar correspondente e oferece “Aceitar” ou “Rejeitar”. Enquanto a decisão estiver pendente, o trecho fica marcado como sugestão e a versão definitiva não é enviada à Sala.

Se o usuário editar o documento enquanto o agente está trabalhando, o sistema não pode sobrescrever silenciosamente a versão mais nova. A gravação precisa comparar versão ou hash e, em caso de conflito, mostrar a diferença ou reaplicar a mudança sobre o texto atual.

Calculadoras, pontos de corte e validações objetivas continuam determinísticos. A IA interpreta e escreve; não deve improvisar cálculos clínicos que já possuem regra formal.

## 9. Armazenamento e privacidade

A hipótese atual é local-first: modelos pessoais, laudos em andamento e histórico ficam primeiro no computador, provavelmente em SQLite e/ou arquivos de texto estruturados. A sincronização é uma camada posterior e controlada.

O desenho atual do LaudoUSG proíbe armazenar nome, CPF, RG e imagens identificáveis. A nova plataforma não deve ampliar silenciosamente essa coleta. Antes de guardar laudos de múltiplos pacientes, será necessário decidir se eles permanecerão desidentificados, quais metadados mínimos existirão, por quanto tempo serão mantidos e quais dados poderão sincronizar.

## 10. O que pode ser reaproveitado do LaudoUSG atual

| Ativo existente | Possível uso na nova plataforma |
|---|---|
| Categorias e contratos clínicos | Biblioteca inicial de exames |
| Modelos, regras e few-shots | Contexto especializado para o agente |
| Calculadoras | Tools determinísticas do MCP |
| Sanity checks e guards | Verificação anterior à finalização |
| Backend, autenticação e banco | Identidade, permissões e sincronização selecionada |
| Sala | Destino do laudo finalizado |
| Aplicativos iOS e Android | Referência e possível reaproveitamento de voz, autenticação e comunicação |

O novo produto não deve duplicar regras clínicas sem necessidade. A direção desejada é embrulhar e reaproveitar as peças confiáveis existentes.

## 11. Papel possível do Joplin

O Joplin é uma referência forte porque já possui documentos como centro, cadernos, editor, SQLite local, histórico, sincronização, desktop, mobile, terminal e sistema de plugins.

Uma hipótese de validação é criar um plugin experimental que transforme cadernos em categorias, notas em laudos e um painel lateral em conversa com o agente. Isso permitiria testar o fluxo real antes de construir toda a infraestrutura de documentos.

Ainda não foi decidido se o produto final será um fork do Joplin, um plugin, uma aplicação inspirada nele ou uma aplicação própria que reutilize apenas conceitos. O repositório principal do Joplin usa AGPL-3.0-or-later e o Joplin Server possui licença própria. Trocar nome, ícone ou adicionar muitos recursos não elimina automaticamente as obrigações da licença. Qualquer fork comercial precisa de avaliação específica antes de se tornar decisão de arquitetura.

## 12. O que não está decidido

| Questão | Estado atual |
|---|---|
| Joplin como protótipo ou base definitiva | Aberto |
| Electron/React, Tauri/React ou SwiftUI/AppKit | Aberto |
| Terminal literal ou painel de conversa com aparência própria | Aberto |
| Integração local com Codex e Claude Code | Conceito definido; contrato técnico ainda não validado |
| Controle remoto pelo celular | Desejado; não faz parte da primeira validação |
| Uso de assinatura do próprio usuário ou API da plataforma | Possibilidade de modo híbrido |
| Identificação e retenção dos exames arquivados | Aberto; depende de privacidade e fluxo clínico |
| Regra para promover um laudo a modelo pessoal | Conceito definido; UX ainda aberta |
| Editor próprio, BlockNote ou outro componente rich text | BlockNote é referência forte; decisão técnica aberta |

## 13. Critério de qualidade do produto

O produto será considerado promissor quando o médico conseguir iniciar um exame em poucos segundos, usar o próprio modelo, ditar ou escrever livremente, pedir mudanças pontuais sem destruir outras seções, confiar nos cálculos, desfazer qualquer alteração e enviar o resultado para a Sala com menos atrito que no fluxo atual.

O critério principal não é parecer moderno nem demonstrar uma IA poderosa. É permitir que Luiz e outros ultrassonografistas produzam laudos melhores, mais rapidamente e com domínio completo do texto.

## 14. Resumo para retomada por outra IA

O LaudoUSG atual permanece funcionando. Está sendo estudada uma nova plataforma desktop centrada no laudo do próprio médico. A interface imaginada possui categorias na coluna esquerda, agente no centro e editor de laudo dominante à direita. A coluna central se transforma em lista quando o usuário acessa “Laudos anteriores”. O editor é contínuo e sem uma caixa interna delimitada, possui formatação rich text e mostra alterações da IA como sugestões que podem ser aceitas ou rejeitadas. Cada categoria tem um modelo pessoal, mas cada exame cria uma cópia independente para não contaminar o modelo. O agente pode ser Codex ou Claude Code; o MCP fornece regras, calculadoras, validações, armazenamento e integração com a Sala. O sistema deve ser local-first, versionado, capaz de desfazer e seguro contra sobrescrita concorrente. Joplin é candidato para protótipo e referência, mas não foi aprovado como base comercial definitiva por causa de adequação clínica, complexidade e licença.

## 15. Próximo assunto da descoberta

Antes de escrever um plano de implementação, a próxima conversa deve detalhar um único exame completo: desde a escolha da categoria até o envio para a Sala. Esse percurso permitirá definir corretamente a diferença entre modelo pessoal, laudo em andamento, laudo finalizado, histórico, conversa e arquivamento.

## 16. Reavaliação: evoluir a web ou criar um aplicativo Mac

### O que foi descoberto

O `web.laudosg.com` já contém parte importante do produto imaginado. Ele possui seleção de categoria, navegação por órgãos ou seções, formulário determinístico, laudo normal pré-carregado, composição instantânea do texto, salvamento no Supabase, histórico e isolamento dos laudos por usuário.

Portanto, a nova proposta não começa necessariamente do zero. A diferença principal entre a web atual e o conceito novo está menos na infraestrutura e mais na experiência: aproveitamento de espaço, editor realmente editável, agente integrado, modelos pessoais e comunicação reversa com o celular.

### Recomendação atual

A direção recomendada passa a ser **web-first**. A primeira hipótese a validar é transformar o `web.laudosg.com` na estação principal de laudo, mantendo o aplicativo Mac apenas como complemento futuro para recursos estritamente locais.

| Necessidade | Navegador | Aplicativo Mac |
|---|---|---|
| Acessar em qualquer computador hospitalar | Melhor opção | Limitado aos Macs instalados |
| Editor rico, sugestões e histórico | Suportado | Suportado |
| Microfone, imagem e upload | Suportado | Suportado |
| Modelos pessoais sincronizados | Suportado pelo backend | Suportado localmente e pelo backend |
| Funcionamento offline robusto e arquivos locais | Possível com limitações | Melhor opção |
| Usar diretamente Codex/Claude Code instalado e a assinatura do usuário | Não diretamente | Melhor opção |

Quase toda a experiência clínica pode existir na web. A principal exceção é incorporar diretamente um agente local autenticado pela assinatura pessoal do usuário. Uma página web não deve abrir e controlar livremente o terminal do computador.

### Arquitetura híbrida possível

O núcleo continua na web. O usuário pode utilizar IA de duas formas.

| Modo de agente | Experiência |
|---|---|
| Agente embutido | A conversa acontece dentro da web e usa uma API contratada pela plataforma |
| Agente conectado | Codex, ChatGPT ou Claude conversa fora da web e usa o MCP LaudoUSG para modificar a sessão aberta |

Se no futuro for indispensável colocar o agente local dentro da própria interface web, pode existir um pequeno companion para Mac. Ele seria uma ponte local ou item de barra de menu, não necessariamente outro aplicativo completo de laudos.

### Nova organização visual sugerida para a web

A barra lateral fina atual é preservada para Laudar, Histórico, Analytics, Segurança e Preferências. A categoria do exame permanece como seletor na barra superior, eliminando a necessidade de uma coluna exclusiva para Abdômen, Tireoide, Obstétrica e outras categorias.

A área de trabalho fica organizada assim:

| Área | Conteúdo proposto |
|---|---|
| Rail fino | Navegação global existente |
| Coluna estreita | Órgãos ou seções do exame atual |
| Coluna média | Opções determinísticas compactas e comando do agente |
| Coluna ampla | Editor contínuo do laudo, sugestões e ações finais |

Os controles determinísticos continuam valiosos para a auxiliar. O objetivo não é removê-los, mas comprimi-los: opções na mesma linha, cartões menores, menos margens e detalhes raros recolhidos. O agente pode ficar como composer persistente na parte inferior da coluna média, com texto, microfone e imagem. A conversa completa expande apenas quando necessária.

A coluna direita deixa de ser apenas uma pré-visualização de papel. Ela se torna o documento editável, sem uma segunda caixa interna visualmente pesada. A visualização de impressão ou PDF permanece como modo opcional.

A barra superior deve retirar ações sem funcionamento e mostrar apenas ações reais. “Gerar com IA” deixa de existir como etapa separada: o laudo já é atualizado pelo formulário, pela edição direta e pelo agente. “Enviar para Sala” também pode desaparecer no modo web quando a Sala estiver vendo a mesma sessão sincronizada.

### Celular como dispositivo de entrada

A hipótese é inverter o fluxo atual da Sala. O computador abre um laudo e gera um código curto ou QR daquela sessão. O médico abre o LaudoUSG no celular, escaneia ou digita o código e passa a enviar texto, ditado, imagens e comandos para o laudo aberto no navegador.

O celular funciona como microfone, câmera e controle remoto; o computador permanece como fonte principal do documento. Isso reaproveita recursos já existentes nos aplicativos móveis, como gravação, transcrição, análise de imagem e autenticação.

Essa sessão não deve reutilizar literalmente o token atual da Sala. O código ou QR pode ficar disponível por poucos minutos apenas para realizar o primeiro pareamento; depois de resgatado, a sessão autenticada do celular dura o turno inteiro, com alvo de 8 a 10 horas. Quedas de internet não exigem novo pareamento: o celular reconecta enquanto a sessão do turno estiver ativa. O médico pode encerrar o turno manualmente e o sistema revoga a sessão automaticamente ao atingir o limite máximo.

Depois do pareamento, o celular recebe somente permissões para inserir dados na sessão atual, sem acesso geral ao histórico, exclusão ou configurações. Código de entrada e duração da sessão são conceitos separados: o primeiro é curto e de uso único; a conexão resultante é longa o suficiente para 40 ou 50 exames no mesmo dia.

### Decisão ainda pendente

Ainda não está decidido abandonar o aplicativo Mac. A decisão recomendada é validar primeiro a web redesenhada e o celular como dispositivo de entrada. O aplicativo Mac só se justifica se, depois dessa validação, o uso direto do agente local, o funcionamento offline ou o armazenamento em arquivos do computador forem diferenciais indispensáveis.
