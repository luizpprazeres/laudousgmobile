# Plano de produto web — sprints 15 a 22

Data: 31 de agosto de 2026

## Direção

O próximo ciclo deve transformar a web em uma estação estruturada de laudo, não em um formulário acompanhado de recursos soltos. O mesmo achado precisa alimentar a redação, a conclusão, o esquema visual, a entrada pelo celular e o histórico. Se cada uma dessas saídas tiver uma fonte diferente, o produto ficará visualmente rico e clinicamente inconsistente.

A ordem abaixo prioriza correção clínica e coerência entre plataformas antes de expansão visual. O código interno das categorias permanece estável para não quebrar histórico e sincronização; nomes exibidos ao usuário podem ser melhorados.

## Diagnóstico confirmado

### Mamas e axilas

O texto incompleto da ecotextura não é um problema de CSS. A web envia apenas `heterogênea`, `fibroglandular densa` ou `predominantemente adiposa`, enquanto o renderer interpreta esse conteúdo como uma frase completa. Por isso o laudo mostra somente uma palavra ou expressão.

A categoria atual também não representa os três escopos solicitados. Ela sempre produz a parte das mamas e usa um booleano para acrescentar axilas. Isso permite `mamas` e `mamas + axilas`, mas não `axilas` isoladamente.

Os descritores da massa já existem, mas aparecem como fileiras sem título. A hierarquia precisa seguir o raciocínio do léxico ultrassonográfico do BI-RADS: padrão ecográfico de fundo; forma; orientação; margem; padrão ecogênico; fenômeno acústico posterior e achados associados. Em margem, `não circunscrita` deve revelar as subclasses pertinentes. Em fenômeno posterior, também falta a opção combinada presente na referência do ACR.

Há ainda um risco clínico: o renderer atual calcula categorias 4A, 4B e 4C com uma heurística local que o próprio código marca como pendente de validação. A interface não deve apresentar essa estimativa como classificação definitiva. A classificação final será confirmada pelo médico; uma sugestão automática, quando existir, deve ficar claramente separada.

Referências de produto e terminologia: [ACR BI-RADS Quick Reference](https://cs.acr.org/-/media/ACR/Files/RADS/BI-RADS/BIRADS-Reference-Card.pdf), [ACR BI-RADS Ultrasound FAQ](https://cs.acr.org/-/media/ACR/Files/RADS/BI-RADS/US-FAQ.pdf) e [ACR BI-RADS](https://develop.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/BI-RADS). Antes de comercializar lógica ou materiais identificados como BI-RADS, deve ser confirmada com o ACR a necessidade de licença para uso em software.

### Editor da prévia

Os botões de negrito, itálico, sublinhado e destaque não têm ação ligada a eles. A prévia é texto renderizado, não um editor. Além disso, `Copiar` e `Texto puro` enviam hoje o mesmo texto sem formatação. O produto deve implementar edição de verdade ou remover controles que prometem algo inexistente.

A redação clínica canônica continuará sendo texto estruturado. A formatação manual deve ser uma camada de apresentação separada para não alterar cálculos, frases automáticas ou sincronização dos modelos.

### Esquemas visuais

Já existe uma base madura no iOS para mamas, tireoide e cartografia venosa: desenho vetorial, posicionamento, exportação PNG/PDF e envio para a Sala. Também existem componentes TypeScript anteriores que podem servir como ponto de partida, mas o comportamento atual do iOS é a referência.

O banco atual já recebe os esquemas na tabela `sala_schemas`, com RLS habilitada, por meio das rotas autenticadas do servidor. Não será criado um segundo armazenamento. O modelo de dados visual precisa ser estruturado e compartilhado; PNG e PDF são saídas, não a fonte de verdade.

### Segurança e privacidade

A página atual esconde Política de Privacidade e Termos de Uso em dois blocos fechados. A nova composição terá os dois documentos visíveis lado a lado em desktop e empilhados no celular.

Antes da mudança visual, o texto precisa ser reconciliado com o sistema real. Esquemas que mostram localização de nódulo, lesão ou vaso podem conter informação clínica mesmo sem identificação direta. A página não deve descrevê-los genericamente como “sem dados de saúde”. Também precisam ser explicitados retenção, exclusão, envio de imagens, fornecedores de IA e fluxo entre médico, celular, web e Sala.

## Sequência de execução

### Sprint 15 — Mamas e axilas: correção clínica e reorganização

Resultado: a categoria passa a se chamar `Mamas e axilas` na web, iOS e Android, mantendo internamente o código `MAMARIA`. O usuário escolhe `Mamas`, `Axilas` ou `Mamas e axilas`, e o laudo inclui somente o escopo selecionado.

O sprint corrige a frase completa da ecotextura, reorganiza os descritores com títulos e dependências, inclui o fenômeno posterior combinado e troca `BI-RADS (forçar)` por uma escolha médica clara. A sugestão automática não será confundida com a categoria final. Clássico e Objetivo terão casos golden para mamas isoladas, axilas isoladas e exame combinado.

### Sprint 16 — Paridade do renderer nas categorias restantes

Resultado: Clássico e Objetivo funcionam de verdade nas sete categorias que ainda usam o compositor local.

A execução será dividida em três entregas curtas: `16A` para Abdome superior, Vias urinárias e Próstata suprapúbica; `16B` para Cervical e Cervicometria; `16C` para Partes moles e Musculoesquelético. Cada categoria só migra após comparar o mesmo conjunto de achados nos dois estilos. Musculoesquelético permanece separado porque exige mais texto livre e não pode receber frases estruturadas inventadas.

Status em 31/08: `16A` concluída e validada. `16B` é a próxima entrega.

### Sprint 17 — Editor real e cópia com formatação

Resultado: os controles acima do laudo passam a executar exatamente o que dizem.

Negrito, itálico, sublinhado e destaque serão aplicados à seleção do usuário e persistidos como uma camada de apresentação, com desfazer e refazer. Alterações automáticas do motor clínico não devem apagar uma formatação manual fora do trecho atualizado. `Copiar` enviará HTML e texto simples para a área de transferência; `Texto puro` enviará apenas texto. Até esse editor estar funcional, nenhum controle sem ação deve aparecer em produção.

### Sprint 18 — Esquemas de mamas e tireoide na web

Resultado: nas categorias pertinentes aparece no topo o botão condicional `Esquema visual`, ao lado da conexão com o celular.

O esquema abre em painel próprio sem cobrir o formulário. Um achado criado no formulário aparece no desenho; mover o marcador no desenho atualiza lateralidade, quadrante/posição e distância quando aplicável. A saída deve ser legível em impressão preto e branco, exportável em PNG/PDF e visível na Sala pelo fluxo já existente. O primeiro aceite cobre mamas e tireoide por serem vetoriais e terem modelos mais maduros no iOS.

### Sprint 19 — Posição fetal obstétrica

Resultado: exames obstétricos podem incluir um desenho simples e coerente com situação, apresentação, polo cefálico e dorso informados no formulário.

Será criada uma matriz clínica fechada antes das imagens: longitudinal cefálica, longitudinal pélvica e transversa/córmica com polo cefálico à direita ou à esquerda; dorso permanece opcional. Os desenhos serão pré-gerados, revisados e versionados. GPT Image 2 pode produzir as bases, mas nenhuma imagem será criada em tempo real no atendimento. A seleção final será determinística e deverá funcionar em preto e branco.

### Sprint 20 — Cartografia vascular

Resultado: a cartografia venosa já madura no iOS é portada para a web e integrada ao mesmo contrato de esquemas.

Não serão adicionados desenhos decorativos a categorias que ainda não tenham campos estruturados correspondentes. Doppler de carótidas e vertebrais terá primeiro um mapa de dados e lateralidade; membros inferiores só entra quando a categoria e o renderer correspondentes estiverem oficialmente disponíveis na web.

### Sprint 21 — Segurança e documentos legais

Resultado: Política de Privacidade e Termos de Uso ficam abertos em duas colunas no desktop, empilhados em telas menores, com navegação interna e resumo inicial em linguagem comum.

O texto completo continuará acessível e não será substituído por ilustrações. Elementos visuais só entram quando explicarem um fluxo real, como celular → web → Sala. Antes de publicar, haverá uma matriz entre afirmações da página e comportamento comprovado do sistema, seguida de revisão jurídica/LGPD.

### Sprint 22 — revisão final de experiência e confiabilidade

Resultado: os principais fluxos são rápidos, claros e utilizáveis por médicos e auxiliares sem conhecimento técnico.

O sprint cobre responsividade em notebooks menores, nomes específicos por categoria (`Órgãos`, `Estruturas`, `Etapas do exame`), navegação por teclado, foco visível, estados de erro/carregamento/vazio e prevenção de perda de dados. Os testes ponta a ponta devem atravessar os fluxos reais: iniciar exame, receber dados do celular, preencher lacunas, alterar achado, editar apresentação, acrescentar esquema e salvar o laudo.

Também serão medidos quatro resultados de produto: tempo até laudo pronto, número de interações por exame, percentual de dados do celular aceitos sem correção e quantidade de alterações manuais após a geração. Esses indicadores ajudam a decidir as próximas categorias sem copiar funções de concorrentes apenas porque existem.

## Critérios permanentes do ciclo

Toda mudança clínica precisa de casos golden em Clássico e Objetivo. O relatório e o desenho devem nascer do mesmo estado estruturado. Imagens geradas precisam de revisão médica antes de entrar no produto. Nenhum botão sem função deve aparecer. Nenhuma promessa de segurança deve ser publicada sem correspondência demonstrável no código e no banco.

Como referência de mercado, o Laudário anuncia laudos estruturados, cálculos e cartogramas para mamas, tireoide, pelve e vascular. Isso reforça a importância do módulo visual, mas a vantagem do LaudoUSG deve vir da integração em tempo real com o celular e a Sala, não da mera quantidade de botões ou desenhos. Fonte: [site institucional do Laudário](https://laudario.com.br/index.php).

## Próxima ação

Executar a Sprint 16B: migrar Cervical e Cervicometria para o renderer canônico, comparando os mesmos achados nos estilos Clássico e Objetivo e preservando a cervicometria isolada e complementar aos exames obstétricos.
