# Plano de evolução — web.laudosg.com como Workspace clínico

> Plano de produto e implementação. Nenhuma fase está autorizada a entrar em produção sem validação. Este documento não altera o comportamento atual.

**Data:** 20 de julho de 2026
**Direção recomendada:** web-first
**Produto atual:** permanece funcionando durante toda a evolução
**Objetivo:** transformar o `web.laudosg.com` em uma estação de laudos centrada no documento, combinando controles determinísticos, edição direta, agente de IA, modelos pessoais, histórico e celular como dispositivo de entrada.

## 1. Resultado esperado

O usuário abre o `web.laudosg.com` em qualquer computador, escolhe a categoria na barra superior e recebe um novo laudo baseado em seu modelo pessoal. A auxiliar pode continuar marcando opções determinísticas. O médico pode editar o documento diretamente, conversar ou ditar para o agente e aceitar ou rejeitar cada sugestão.

O celular pode ser pareado uma vez no início do turno e permanecer conectado por 8 a 10 horas. Durante esse período, funciona como microfone, câmera e controle remoto da sessão aberta no computador.

O navegador é a fonte principal do laudo. Um eventual componente para Mac será avaliado depois e servirá apenas como ponte para agentes locais, arquivos ou offline avançado; não duplicará a estação clínica sem necessidade.

## 2. Fundamentos que já existem

| Ativo atual | Estado | Uso no novo produto |
|---|---|---|
| Categoria e órgãos | Funcional | Preservar e compactar |
| `exam_state` determinístico | Funcional | Continuar alimentando alterações objetivas |
| Composição do laudo normal | Funcional | Criar a primeira versão do documento |
| `web_reports` e RLS | Funcional | Evoluir para rascunhos, versões e documento rico |
| Histórico web + IA | Funcional | Integrar à estação principal |
| Sala e pareamento | Funcional para o fluxo atual | Reaproveitar conceitos, não credenciais de escrita |
| Áudio e transcrição mobile | Funcional | Enviar ditado à sessão web |
| Análise de imagens mobile | Funcional | Enviar medidas e achados como sugestão |
| Calculadoras e sanity checks | Funcional em partes diferentes | Expor ao agente e aos controles web |

## 3. Fronteiras do projeto

### Incluído

| Área | Entrega |
|---|---|
| Interface | Rail preservada, painéis arredondados, melhor densidade e coluna de laudo dominante |
| Editor | Rich text contínuo, edição direta, histórico, desfazer e sugestões |
| Modelos | Modelo padrão da casa, modelo pessoal e cópia independente por exame |
| Agente | Texto, ditado, imagem, tools clínicas e sugestões aceitas ou rejeitadas |
| Mobile companion | Pareamento de turno, texto, áudio, imagem e comandos rápidos |
| Persistência | Rascunho, versão, conflitos, histórico e isolamento por usuário |
| Sala | Compatibilidade com o fluxo atual e status de sincronização |

### Fora do primeiro ciclo

O primeiro ciclo não cria um aplicativo completo para Mac, não substitui os aplicativos iOS e Android, não remove o pipeline atual, não migra todos os laudos antigos para um novo formato e não libera alterações automáticas de IA sem revisão do médico.

## 4. Arquitetura funcional

| Camada | Responsabilidade |
|---|---|
| Web Workspace | Interface, editor, controles determinísticos, histórico e estado da sessão |
| Backend LaudoUSG | Auth, persistência, versões, sessão mobile, tools e integração com Sala |
| Agente | Interpretação da linguagem natural e propostas de alteração |
| MCP LaudoUSG | Regras, calculadoras, sanity, modelos e acesso controlado à sessão aberta |
| Mobile companion | Captura de texto, áudio e imagens durante o turno |
| Sala | Visualização compatível e continuidade do fluxo existente |

## 5. Regra central do documento

O produto atual recompõe o texto inteiro a partir de `exam_state`. Isso funciona para um preview determinístico, mas pode apagar mudanças manuais ou da IA quando o documento passar a ser editável.

No Workspace, o fluxo deve mudar:

| Momento | Fonte principal |
|---|---|
| Início do exame | Modelo pessoal + estado normal da categoria |
| Durante o exame | Documento aberto e versionado |
| Seleção determinística | Atualiza apenas o bloco do órgão correspondente |
| Edição manual | Modifica diretamente o bloco selecionado |
| Edição pela IA | Gera sugestão sobre blocos específicos |
| Finalização | Projeta documento rico para texto puro e formato da Sala |

Cada órgão ou seção recebe identidade estável dentro do editor. Alterar “Fígado” não recompõe vesícula, rins ou conclusão inteira. Se um bloco já tiver modificação manual e um controle tentar substituí-lo, o sistema apresenta a mudança como sugestão em vez de sobrescrever silenciosamente.

## 6. Estrutura de dados proposta

Os nomes finais serão definidos durante o desenho técnico, mas os conceitos precisam existir.

| Entidade | Conteúdo |
|---|---|
| Modelo pessoal | Categoria, documento rico, texto puro, versão e usuário |
| Rascunho de laudo | Documento atual, `exam_state`, modelo de origem, status e revisão |
| Revisão | Base usada, alteração, origem manual/formulário/agente/mobile e data |
| Sugestão | Blocos afetados, versão-base, conteúdo proposto e decisão |
| Sessão de turno | Usuário, dispositivo, laudo aberto, permissões, expiração e revogação |
| Entrada mobile | Texto, áudio, imagem ou comando e seu estado de processamento |

`laudo_text` continua existindo como projeção canônica para cópia, exportação e Sala. O documento rico não pode tornar o restante do ecossistema dependente de HTML arbitrário.

## 7. Novo desenho da interface

### Barra superior

A categoria permanece no seletor atual. A barra mostra somente ações funcionais: Novo laudo, Salvar como modelo, estado do celular, estado da Sala e status de salvamento. Cálculos, microfone e imagem passam para o composer do agente ou para a seção correspondente. “Gerar com IA” deixa de ser uma etapa separada.

### Identidade visual

A interface segue os mesmos tokens já usados no aplicativo Swift e no mobile: verde principal `#059669`, verde profundo `#065F46`, fundo `#F2F2F7`, cartões brancos e texto principal preto. O verde indica seleção, conexão, confirmação e progresso; não deve preencher todas as ações. Ações primárias podem usar preto, mantendo o verde como assinatura e estado clínico positivo.

Os três painéis principais ficam integralmente brancos, arredondados e separados pelo fundo cinza muito claro. A rail permanece visualmente leve, sem outro bloco de fundo, integrada ao background. Essa combinação mantém a sensação de aplicativo nativo sem perder contraste entre as áreas.

### Rail

A rail fina permanece com Laudar, Histórico, Analytics, Segurança e Preferências. No hover, o rótulo continua aparecendo. Histórico pode abrir sua página atual no início e, posteriormente, ganhar uma visão integrada sem alterar o contrato de dados.

### Coluna de órgãos

Continua exibindo Fígado, Vesícula, Vias biliares, Pâncreas, Baço, Rim direito e Rim esquerdo. A largura diminui e a lista mostra progresso sem o cartão grande fixo no rodapé.

### Coluna de controles e agente

Os controles determinísticos ficam mais densos. Opções curtas aparecem lado a lado. Achados ausentes permanecem recolhidos. Campos adicionais só aparecem após a seleção do achado.

O agente fica em uma área persistente na parte inferior da coluna. A conversa cresce e rola dentro dela, enquanto o composer permanece fixo. Microfone, imagem e edição aparecem somente como ícones com rótulos acessíveis. O agente nunca ocupa espaço equivalente ao documento durante todo o tempo.

O composer possui uma ação principal inequívoca: **Gerar sugestão**. Não haverá um botão genérico “Aplicar” ao lado de “Gerar com IA”. “Aplicar medidas” ou “Aplicar achados” só aparece em cartões de dados estruturados recebidos do celular, imagem ou calculadora, depois que o usuário conferiu os valores.

### Coluna do laudo

O laudo passa de preview somente leitura para editor contínuo. A barra de formatação é discreta. A página não fica dentro de outra caixa pesada. O modo impressão/PDF permanece acessível quando necessário.

Sugestões da IA aparecem diretamente nos trechos afetados, com Aceitar, Rejeitar e possibilidade de aceitar uma alteração por vez.

O texto anterior aparece riscado e a redação proposta aparece inserida no próprio laudo. Aceitar consolida a proposta como nova versão; rejeitar restaura integralmente o trecho anterior. A sugestão guarda a versão-base para impedir que uma resposta atrasada da IA sobrescreva edições feitas enquanto ela processava.

## 8. Pareamento do celular para o turno

### Experiência

O computador mostra um QR e um código curto. O médico abre o LaudoUSG, escaneia ou digita o código uma vez e escolhe “Conectar a este computador”. A conexão permanece ativa durante 8 a 10 horas, mesmo atravessando dezenas de exames.

Se a rede cair, o celular reconecta sem pedir o código novamente. O médico encerra manualmente em “Finalizar turno” ou a sessão expira automaticamente ao atingir o limite máximo.

### Segurança e duração

| Credencial | Duração | Motivo |
|---|---:|---|
| Código/QR de pareamento | Aproximadamente 10 minutos e uso único | Evita que outra pessoa conecte depois de ver o código |
| Sessão autenticada do dispositivo | 10 horas | Cobre o turno sem novo pareamento |
| Reconexão | Enquanto a sessão estiver ativa | Tolera troca de Wi‑Fi e perda momentânea de internet |

A sessão mobile possui escopo restrito: inserir texto, áudio, imagem e comandos no laudo atual. Não pode listar todo o histórico, excluir laudos, trocar preferências ou controlar outra conta.

### Fluxo de entrada

| Entrada | Processamento | Resultado no computador |
|---|---|---|
| Texto | Envio direto | Comando aguardando aplicação |
| Áudio | Upload e transcrição | Texto revisável no agente |
| Imagem | Upload temporário e análise | Medidas/achados como sugestão |
| Comando rápido | Evento estruturado | Troca de órgão ou ação permitida |

Nenhuma entrada clínica modifica silenciosamente o laudo final. Resultado de transcrição, visão ou agente passa por sugestão ou ação determinística visível.

### Pipeline de imagem e OCR clínico

A foto do aparelho não deve ser tratada como uma página comum de documento. Antes da leitura dos números, o sistema precisa detectar a tela, corrigir perspectiva, reduzir reflexo e moiré e identificar o tipo de exame e o fabricante quando possível. Depois, associa cada rótulo ao valor correto — por exemplo `DBP`, `CC`, `CA`, `CF`, `IP` e `IR` — e executa validações determinísticas de unidade, faixa plausível e coerência entre campos.

O resultado não entra direto no laudo. A estação mostra os valores reconhecidos, a imagem de origem e o grau de confiança. Campo ambíguo permanece vazio ou marcado para revisão; o sistema não adivinha um número clínico.

O MinerU será avaliado como candidato de infraestrutura de OCR e processamento visual, não como solução escolhida para ultrassom. Ele é orientado à conversão de documentos, imagens e layouts complexos em conteúdo estruturado. A associação clínica entre rótulo e medida de uma tela de ultrassom continuará pertencendo a uma camada específica do LaudoUSG.

Antes de integrar qualquer novo motor, será feito um teste comparativo com imagens reais desidentificadas, separadas por aparelho e tipo de exame. O teste compara o extrator atual, MinerU/PP-OCR e um fluxo híbrido com visão. As métricas mínimas são acerto exato do rótulo, acerto do valor, associação rótulo-valor, latência, taxa de abstenção e quantidade de correções humanas.

## 9. Fases de execução

### Fase 0 — Baseline e proteção

Registrar o comportamento atual, criar capturas e testes das categorias já suportadas, catalogar controles funcionais e inertes e garantir que a versão atual permaneça acessível. Introduzir flags independentes para shell visual, editor, agente e mobile companion.

**Saída:** baseline reproduzível e rollback simples.
**Gate:** outputs determinísticos e salvamento atuais continuam iguais com flags desligadas.

### Fase 1 — Redesenho da estação web

Limpar a barra superior, preservar rail e seletor, alterar proporções das colunas e compactar os controles sem mudar a lógica clínica. Remover ou esconder ações sem funcionamento.

**Saída:** interface nova usando o mesmo `exam_state` e o mesmo texto atual.
**Gate:** todas as categorias existentes mantêm comportamento e o espaço útil aumenta de forma observável.

### Fase 2 — Documento editável e modelos pessoais

Escolher o componente rich text após um spike entre BlockNote e alternativas compatíveis. Criar blocos estáveis por seção, autosave versionado, desfazer, modelo pessoal e cópia por exame. Integrar histórico e projeção para texto puro.

**Saída:** laudo editável sem perder o caminho determinístico.
**Gate:** mudanças manuais sobrevivem a novas seleções e conflitos nunca sobrescrevem texto silenciosamente.

### Fase 3 — Sugestões e agente web

Adicionar composer, streaming, tools clínicas, diff por bloco, aceitar/rejeitar e sanity antes da finalização. Começar com uma categoria e casos reais do Luiz.

**Saída:** agente embutido capaz de propor alterações pontuais.
**Gate:** conjunto de casos reais aprovado pelo Luiz, sem alteração fora do escopo pedido e com restauração integral.

### Fase 4 — Celular como dispositivo de entrada

Criar sessão de turno, QR/código, conexão no iOS e Android, envio de texto e áudio, reconexão e revogação. Imagens entram depois que texto e áudio estiverem estáveis.

**Saída:** um pareamento cobre o turno e alimenta o laudo aberto.
**Gate:** sessão de 10 horas, reconexão sem novo código, isolamento entre usuários e nenhum acesso fora do laudo atual.

### Fase 5 — Imagem, Sala e fluxo completo

Executar o benchmark do pipeline de imagem, escolher o motor por evidência e conectar análise de imagem, status da Sala e fluxo completo do primeiro laudo ao arquivamento. Manter compatibilidade com os aplicativos e a Sala atual.

**Saída:** estação web integrada ao ecossistema existente.
**Gate:** exame completo real, incluindo áudio ou imagem, edição, sanity, finalização, Sala e histórico; nenhum valor de baixa confiança é inserido silenciosamente.

### Fase 6 — MCP e companion local opcional

Expor ferramentas para Codex, ChatGPT e Claude modificarem a sessão web. Só depois avaliar uma ponte local para Mac que use o agente instalado e autenticado pelo usuário.

**Saída:** uso opcional da assinatura do usuário sem duplicar o produto web.
**Gate:** benefício comprovado sobre o agente web antes de criar ou distribuir software local.

## 10. Flags e rollout

| Flag conceitual | Proteção |
|---|---|
| `WEB_WORKSPACE_V2` | Novo shell e densidade visual |
| `WEB_RICH_EDITOR` | Documento editável e modelos |
| `WEB_AGENT_SUGGESTIONS` | Alterações assistidas por IA |
| `WEB_MOBILE_COMPANION` | Pareamento e entradas do celular |

O rollout começa apenas na conta do Luiz. Depois passa para poucas contas convidadas e só então para a base geral. Merge com flag desligada não significa prontidão para ativação.

## 11. Validação em loop

Cada fase deve seguir o mesmo ciclo: implementar um recorte pequeno, executar testes automáticos, comparar visualmente, rodar casos clínicos reais, revisar o diff e corrigir até o gate daquela fase passar.

O agente executor não decide sozinho que a experiência clínica está boa. Para editor, agente e mobile companion, o gate final continua sendo o uso real: o Luiz consegue produzir e assinar o laudo sem recuperar manualmente algo que o sistema apagou ou deformou.

## 12. Critérios globais de aceite

| Critério | Resultado exigido |
|---|---|
| Acesso | Funciona nos navegadores dos computadores hospitalares-alvo |
| Velocidade | Abrir categoria e iniciar laudo sem espera perceptível desnecessária |
| Fidelidade | Controles preservam o texto esperado e não apagam edições |
| IA | Toda mudança fica visível, reversível e vinculada a uma versão-base |
| Mobile | Um pareamento atende o turno, com reconexão automática |
| Privacidade | Sem ampliar silenciosamente dados identificáveis armazenados |
| Sala | Fluxo atual continua funcionando durante a migração |
| Rollback | Cada camada nova pode ser desligada sem indisponibilizar a web atual |

## 13. Primeira decisão antes de implementar

O primeiro GO solicitado ao Luiz será apenas para a Fase 0 e o desenho técnico da Fase 1. Editor rico, agente e pareamento mobile não começam ao mesmo tempo. A interface nova precisa provar que melhora a estação atual sem quebrar o gerador determinístico antes de receber as camadas mais complexas.

## 14. Decisão sobre o aplicativo de entrada

A primeira opção será reaproveitar os aplicativos iOS e Android atuais, adicionando um **Modo Companion** mais enxuto. O usuário escolhe entre produzir o laudo integralmente no celular ou conectar o aparelho ao Workspace aberto no computador. O modo conectado mostra somente as ações pertinentes ao turno: ditar, fotografar, enviar medidas, revisar extrações e comandos rápidos.

Criar um segundo aplicativo agora duplicaria autenticação, publicação nas lojas, analytics, suporte e manutenção das rotinas de áudio e imagem que já existem. Um aplicativo separado só será reconsiderado se o uso real mostrar que a interface atual não consegue oferecer um modo conectado simples ou se houver uma distribuição comercial diferente.

Celular, relógio e óculos não terão integrações independentes com o laudo. Todos publicam no mesmo **gateway de entradas do turno**, usando um contrato comum: sessão, dispositivo, tipo da entrada, arquivo ou texto, dados estruturados, confiança e estado de revisão. Cada aparelho ganha apenas o adaptador necessário para capturar e enviar esse evento.

## 15. Uso da assinatura de IA do próprio usuário

Existem dois caminhos diferentes e eles não devem ser confundidos.

No caminho oficial do LaudoUSG, o agente fica dentro da plataforma e usa a API contratada pelo produto. Esse é o fluxo previsível para qualquer usuário e permite auditoria, limites e experiência uniforme.

No caminho avançado, o usuário trabalha na superfície oficial do agente em que já está autenticado — por exemplo, ChatGPT/Codex no celular — e esse agente usa ferramentas remotas do LaudoUSG por MCP. A assinatura continua pertencendo ao usuário e não é incorporada nem revendida pelo aplicativo. O MCP recebe somente ações controladas, como ler o laudo aberto, enviar medidas, propor uma edição ou consultar uma calculadora.

O produto não deve tentar reutilizar silenciosamente a sessão ou os créditos da assinatura ChatGPT dentro de um aplicativo próprio. Quando a experiência acontecer dentro do LaudoUSG, será necessária API do produto ou uma opção explícita de chave própria. Quando acontecer dentro do ChatGPT/Codex, o LaudoUSG entra como ferramenta MCP autenticada.

## 16. Estado da implementação

Em 20 de julho de 2026, a primeira camada da Fase 1 foi implementada atrás de `WEB_WORKSPACE_V2`, desligada por padrão. Ela inclui shell com fundo do sistema, três superfícies brancas arredondadas, rail transparente, navegação de órgãos compacta, controles mais densos, laudo contínuo e seletor discreto com uma cor circular por categoria. A prévia local foi validada em Abdome Total, Obstétrica e MSK; a rota temporária usada no teste não faz parte do produto.

O primeiro recorte da Fase 2 também existe atrás de `WEB_RICH_EDITOR`, igualmente desligada por padrão. Ele torna o texto diretamente editável, mantém um rascunho separado por categoria e impede que mudanças posteriores nos campos determinísticos apaguem silenciosamente a edição manual. Quando há conflito, a tela preserva o texto e avisa; retornar ao modelo atual exige confirmação explícita. O salvamento continua usando a coluna existente de texto do laudo, sem migração de banco.

Esta ainda não é a camada rica com negrito, itálico, sugestões da IA e aceitar ou rejeitar mudanças. Agente, sugestões rastreadas, modelos personalizados e pareamento também continuam fora deste recorte.

A revisão visual seguinte reduziu a altura dos grupos clínicos sem retirar opções, levou o controle de iniciais para o fim do laudo e colocou a cópia discretamente ao lado de salvar. O centro da estação agora reserva um dock fixo com duas superfícies: Agente e Celular. Essa reserva aparece somente com `WEB_AGENT_SUGGESTIONS` ou `WEB_MOBILE_COMPANION`; enquanto os contratos não estiverem prontos, os campos de envio e pareamento permanecem explicitamente desabilitados.

O agente real ainda não foi ligado porque o backend atual não expõe uma rota `/api/edit` utilizável pela web. Existe um schema compartilhado que exige `report_id` persistido, mas isso não resolve a edição segura do rascunho aberto. A próxima implementação precisa criar sugestões vinculadas à versão-base do texto, com aceitar, rejeitar e restauração, antes de habilitar o composer.
