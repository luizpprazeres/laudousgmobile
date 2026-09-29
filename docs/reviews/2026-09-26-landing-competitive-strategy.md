# LaudoUSG — pesquisa de concorrentes e estratégia da landing

Pesquisa em 26/09/2026. Escopo: comunicação pública, oferta e documentação dos produtos; comparação com o código e as auditorias atuais do LaudoUSG. Não houve contratação, uso autenticado dos concorrentes, medição comparativa de desempenho ou auditoria de qualidade clínica. Recursos e resultados anunciados por terceiros são declarações deles, não resultados verificados por nós.

## Recomendação

Apresentar o LaudoUSG como uma forma prática de transformar os achados do ultrassom em um laudo que o médico consegue acompanhar e ajustar. A promessa comercial deve ser menos trabalho de redação, sustentada por uma demonstração clara do produto. A especialização em USG situa o público; a experiência precisa mostrar por que ele escolheria este produto.

O posicionamento sugerido é uma hipótese estratégica, não uma vantagem competitiva medida. Não encontramos base para chamar ditado por celular, formulários por achados, personalização ou esquemas de exclusivos. A diferenciação pode vir da combinação e da execução desses recursos, comprovadas pelo uso, mesmo quando cada recurso também existe em outros produtos.

## Leitura dos concorrentes

| Produto | Comunicação e mecanismo observados | Aprendizado para o LaudoUSG |
| --- | --- | --- |
| Laudos.AI | Segmenta radiologista e gestor. Apresenta ditado estruturado, integração com RIS/PACS e controles operacionais; inclui métricas próprias com metodologia e identifica diferentes estágios de maturidade dos módulos. | Explicar o resultado e mostrar evidência dá mais substância que apenas destacar IA. Uma landing individual não precisa carregar todo o discurso institucional. |
| Laudário | Posiciona-se diretamente em ultrassom. Mostra preenchimento por achados, cálculos, cartogramas, exemplos de telas e expansão para gestão do consultório. | É a comparação mais próxima da Web atual. Especialização em USG e mapas anatômicos não bastam como diferenciação. Evitar uma disputa baseada só em quantidade de modelos. |
| Laudite | A home enfatiza reconhecimento de voz, máscaras e mobilidade dos documentos. A documentação do Copiloto USG descreve áudio por smartphone via Telegram e múltiplos laudos separados no computador. | O médico já pode conhecer soluções de ditado móvel. Precisamos demonstrar o fluxo específico e a facilidade de revisão, sem alegar pioneirismo. |
| nReport | Apresenta construção de frases, personalização, cálculos, integração e contingência de conexão. A página de login consultada informa limitação para redação em telas móveis pequenas. | Organização por achados também tem concorrência estabelecida. A experiência compacta merece demonstração, sem transformar uma limitação publicada em prova de superioridade geral. |
| IARA Health | Combina voz e IA, enfatiza uso em editores externos e exibe marcas de instituições e sistemas. | Continuidade com a ferramenta que o médico já usa é uma objeção relevante. Demonstrar a saída do laudo, incluindo a cópia real, antes de prometer integração. |

Fontes por linha: [Laudos.AI](https://www.laudos.ai/) e [maturidade dos módulos](https://www.laudos.ai/produto); [Laudário](https://laudario.com.br/); [Laudite](https://laudite.com.br/) e [Copiloto USG](https://laudite.com.br/docs/copiloto-para-ultrassom-copiloto-usg/); [nReport](https://www.ionic.health/nreport) e [login nReport](https://app-nreport.ionic.health/); [IARA Health](https://www.iarahealth.com/).

**Rgen:** nome ainda não identificado com segurança. Foi solicitado o link ao Luiz. Resultados homônimos e domínios supostos não foram tratados como o concorrente. **UltraLaudo:** apareceu como referência adicional, mas a página não entregou conteúdo suficiente na abertura; não foi incluído como produto analisado. O domínio ultralaudos.com.br retornou conteúdo do Laudário na pesquisa, por isso não foi contado como outra empresa.

## Oferta observada: comparação comercial, não equivalência de produto

| Produto | Entrada e valor publicados | Limite de interpretação |
| --- | --- | --- |
| Laudos.AI | 14 dias ou 30 laudos, o que vier primeiro, sem cartão. Individual R$ 299/mês, até 1.000 laudos. | Integrações e módulos institucionais dependem do contrato. [Preços oficiais](https://www.laudos.ai/precos). |
| Laudário | 15 dias sem cartão; Premium R$ 119,90/mês. Planos de gestão e imagens acima desse valor. | Escopos distintos; não equivale automaticamente ao Essencial do LaudoUSG. [Oferta oficial](https://laudario.com.br/). |
| Laudite | 15 dias; Básico R$ 139/mês e Plus R$ 159/mês. Valores menores na cobrança anual. | A tabela consultada não esclarece toda a cobrança do Copiloto IA; não assumir que todos os recursos estão incluídos nesses valores. [Planos oficiais](https://laudite.com.br/nossos-planos/). |
| nReport | Teste gratuito; individual anunciado por R$ 120/mês. | A página mistura conteúdo antigo e oferece anual de R$ 1.440 junto de menção a dois meses grátis. Confirmar comercialmente antes de usar preço em comparação pública. [Página oficial](https://www.ionic.health/nreport). |
| IARA Health | Teste gratuito; individual R$ 249/mês. | Duração e condições completas do teste não foram confirmadas. [Página oficial](https://www.iarahealth.com/). |
| LaudoUSG | Na oferta local: 10 laudos no total, Essencial R$ 99/mês e Profissional R$ 169,90/mês. | Leitura de `Pricing.tsx` e `lib/planos.ts`; não foi auditada a cobrança ou a aplicação dos limites em produção nesta pesquisa. |

Recomendação: preservar a oferta atual e tornar a experiência gratuita mais fácil de entender. Preço ajuda a decisão, mas não deve sustentar a promessa principal. Não publicar uma tabela de superioridade ou economia percentual com esses valores: limites, modalidade de cobrança e escopos não são iguais.

## O que a pesquisa permite concluir

A comunicação consultada repete velocidade, qualidade, IA, personalização e economia de tempo. Minha leitura é que esses termos, sozinhos, oferecem pouca distinção. Isso é análise das páginas, não pesquisa quantitativa de percepção do mercado.

Oportunidade recomendada: mostrar o trabalho concreto que o médico deixa de executar manualmente, com os achados selecionados e o texto correspondente visíveis. A landing deve responder rapidamente se o produto atende seus exames, como fica a redação, quanto ele pode editar e como leva o resultado ao sistema da clínica.

O concorrente cotidiano também pode ser a rotina atual: modelos salvos, digitação própria, ditado e auxílio de uma pessoa da equipe. Não assumir que todo visitante começa cada laudo do zero. A mensagem precisa fazer sentido para quem já tem um processo razoavelmente eficiente e não quer reaprender tudo.

## Público e promessa prioritários

Priorizar o ultrassonografista que participa da elaboração e revisão dos próprios laudos e quer diminuir o trabalho repetitivo. É uma escolha estratégica inicial; não foi extraída de entrevistas ou dados de conversão. Médicos com auxiliar entram como segundo percurso. Gestores que procuram PACS, financeiro, agenda ou gestão de redes não devem dominar a primeira dobra da oferta atual.

**Posicionamento interno:** LaudoUSG organiza a elaboração do laudo em torno dos achados do ultrassom, com texto à vista e espaço para a redação do médico.

**Benefício principal:** menos trabalho para passar dos achados ao texto.

**Como demonstrar:** marcar um achado, mostrar a frase correspondente, ajustar a redação e copiar o resultado. A simulação da landing deve permanecer identificada; a comprovação de uso vem da experiência real após o cadastro.

**Continuidade de marca:** celular e equipe podem ampliar essa história quando a disponibilidade do fluxo estiver confirmada para o público. Não colocar um recurso em preparação como principal razão para assinar agora.

## Crítica da copy atual

O hero atual, “O laudo se escreve enquanto você examina”, transmite fluidez, mas pode sugerir escuta contínua ou automação durante o exame. O produto exibido é seleção manual de achados. A relação entre ação e resultado deve ficar explícita.

“Cards por órgão” descreve uma escolha de interface; “achados organizados por órgão” fala a linguagem do trabalho. “No seu estilo” precisa de uma demonstração da configuração e das frases pessoais; não deve sugerir aprendizado automático pelo uso.

A quantidade de exames deve ajudar o visitante a encontrar os seus, não ser a principal prova de qualidade. Não comparar categorias do LaudoUSG com modelos ou patologias dos concorrentes como se fossem a mesma unidade.

O bloco dos esquemas já tem força visual. O texto pode explicar o que a imagem torna mais fácil de localizar, sem gastar a mensagem principal explicando que o mockup é um recorte. A indicação de exemplo deve continuar próxima da imagem.

O cadastro precisa estar associado ao primeiro uso. A oferta de dez laudos hoje aparece no fechamento; levá-la também à primeira dobra ajuda o médico a entender o compromisso antes de clicar. Não mudar a franquia nem prometer gratuidade ilimitada.

## Sequência recomendada para a página

| Momento | Pergunta do visitante | Conteúdo proposto |
| --- | --- | --- |
| Primeira dobra | Isso facilita meu laudo? | Benefício claro, mecanismo em uma frase, interação achado → texto e oferta gratuita próxima do CTA. |
| Demonstração | O texto realmente corresponde ao que informei? | Um exemplo de seleção e alteração; em seguida, evidência real de edição e cópia. Não acelerar artificialmente uma medição. |
| Exames | Atende minha rotina? | Categorias reais e exemplos, sem campeonato de números. |
| Personalização e revisão | Vou conseguir manter minha redação? | Mostrar uma frase pessoal ou ajuste real, com limites claros. |
| Esquemas | O que isso acrescenta ao documento? | Achado localizado e representação visual correspondente, somente nas categorias suportadas. |
| Celular e equipe | Como funciona na sala? | Explicar o sentido celular → computador e a disponibilidade dos apps. Não sugerir sincronização bidirecional de qualquer laudo. |
| Confiança | Posso experimentar sem desmontar minha rotina? | Processo visível, revisão médica, canais de suporte e depoimento somente se real e autorizado. |
| Oferta e dúvidas | O que recebo e qual é o próximo passo? | Planos atuais, franquia clara, compatibilidade e saída do texto; CTA voltado ao primeiro laudo. |

## Provas que precisamos construir

O melhor próximo material é uma demonstração curta, com dados fictícios, que mostre a experiência real até revisar e copiar. Uma comparação de fluxo deve manter o mesmo caso, as mesmas informações e o mesmo critério de conclusão. Tempo de processamento não equivale ao tempo do exame ou ao tempo total do laudo.

Para mensurar economia, separar preenchimento, geração, revisão e exportação. Informar casos, participantes e condições. Uma pequena rodada exploratória ajuda a encontrar dificuldades; não valida porcentagens para publicidade. Não transformar testes de software em comprovação de precisão clínica.

Depoimentos devem relatar uma situação concreta e ser autorizados. É melhor um relato identificável sobre um fluxo que a pessoa realmente usou do que uma frase genérica de aprovação. Nenhum depoimento foi criado ou solicitado a terceiros nesta tarefa.

Há também uma prova humana disponível para construir: Luiz é médico ultrassonografista e responsável pelo produto, conforme o próprio briefing. Uma apresentação breve dele, demonstrando um problema real de sua rotina e como usa a plataforma, pode dar contexto à marca. Usar foto real e dados profissionais confirmados; não inventar tempo de carreira, validação de sociedades médicas ou uma história de origem. Autoria médica inspira confiança, mas não comprova por si só eficácia ou superioridade clínica.

Como material de aquisição, a demonstração de um exame específico pode funcionar melhor que um anúncio genérico sobre IA. Exemplos de temas a testar: redação de achados de abdome, localização de nódulos no esquema mamário e personalização de uma frase recorrente. Cada peça deve levar ao trecho correspondente da experiência e manter as mesmas promessas da landing. A eficácia desses ângulos ainda precisa ser medida.

## Experimentos de conversão propostos

| Experimento | Hipótese | Medida principal |
| --- | --- | --- |
| Benefício “menos trabalho” versus mecanismo “achados → laudo” | Uma das abordagens esclarece melhor o valor para médicos que já conhecem ferramentas de laudo. | Primeiro laudo salvo por novo visitante; cadastro como etapa intermediária. |
| Oferta gratuita junto do primeiro CTA | Clareza sobre o teste reduz hesitação sem precisar baixar preço. | Cadastro concluído e primeiro uso, segmentados por origem e dispositivo. |
| Demonstração de edição após seleção | Mostrar controle sobre a redação resolve uma objeção relevante. | Uso da demonstração seguido de ativação; cliques isolados não bastam. |

Esses eventos são propostas de medição, não instrumentação já implementada. Excluir contas internas e testes; não capturar texto clínico, áudio ou dados de pacientes em analytics de marketing. Não atribuir “revisado pelo médico” a um simples clique em copiar. Definir antes o volume e a duração mínimos; tráfego insuficiente pede observação qualitativa, não uma declaração de vencedor.

Acompanhar também retorno ao produto e conversão para assinatura. Uma promessa que aumenta cadastros e decepciona no primeiro uso pode piorar o negócio. Separar a análise de quem chega buscando um sistema Web da de quem espera ditado pelo celular, principalmente enquanto os apps não têm disponibilidade pública confirmada.

## Ajustes de coerência antes de publicar nova copy

Há divergência real de oferta: `Pricing.tsx` inclui link de auxiliar no plano gratuito, enquanto `lib/planos.ts` marca esse item como indisponível no gratuito. A exportação `.docx` já estava registrada como sem evidência na Web na auditoria anterior. Esquemas também precisam de revisão de escopo: a tabela cita miomas, enquanto a experiência Web consultada habilita mama, tireoide e posição fetal. A copy pública deve refletir o contrato e o canal corretos; não alterar preço ou benefício por inferência.

O fluxo Web não envia seus laudos à Sala nem aos históricos nativos. A existência de um banco compartilhado não prova essa experiência. A publicação nas lojas continua não confirmada nesta pesquisa. Fonte: auditoria de compatibilidade de 26/09 e componentes atuais. A nova proposta usa a Web como entrada disponível e trata mobile/Sala com essa delimitação.

Conferência direta de sustentação: `LaudoPreview.tsx` tem edição de texto (`contentEditable`, rótulo “Editar texto do laudo”) e cópia para clipboard; `FrasesPessoais.tsx` implementa cadastro e edição de frases; `LaudarWebExperience.tsx` restringe `supportsVisualSchema` às categorias suportadas e desabilita o esquema na composição. Essa leitura confirma os mecanismos no código, não substitui teste de cada benefício comercial em produção.

## Entregáveis e método

Diagnóstico curto em [`../../diagnostico.md`](../../diagnostico.md). Texto proposto e variantes em [`../../copy/landing-estrategia.md`](../../copy/landing-estrategia.md). Auditoria de produto anterior em [`2026-09-26-landing-copy.md`](2026-09-26-landing-copy.md). Revisão independente de posicionamento em [`2026-09-26-landing-positioning-options.md`](2026-09-26-landing-positioning-options.md).

Revisão central do parecer independente: a direção A e a variante B foram mantidas como hipóteses. O item 2 do parecer sobre cartografia não é uma pendência atual: `Pricing.tsx` já usa `<PlanFeature soon>` no Doppler. O cadastro de frases pessoais está confirmado, mas sua reutilização no fluxo Web exige demonstração antes de integrar a promessa publicada. A ausência de prova de publicação dos apps justifica preservar o status conservador; não é uma consulta atual às lojas.

Método: pesquisa em fontes oficiais, leitura de produto, diagnóstico de consciência/sofisticação e revisão factual, com a skill local [brix-copy](/Users/luizprazeres/.codex/skills/brix-copy/SKILL.md). A base padronizada `product.md`/`publico.md`/`marca.md` não existe neste checkout; foram usados o briefing de Luiz, o README atualizado, código, oferta e auditorias. Nenhuma copy foi aplicada à landing nesta etapa e nenhum preço foi alterado.
