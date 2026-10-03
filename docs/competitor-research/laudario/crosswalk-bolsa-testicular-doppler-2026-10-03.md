# Cruzamento Laudário × LaudoUSG — Bolsa testicular com Doppler

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi buscado no monorepo e no cliente iOS.

## Resultado

O exame não é uma categoria ausente no LaudoUSG. `ESCROTAL` já aparece na Web, no Android/RN, no iOS e no seed do banco. O checkout contém 21 blocos clínicos sobre testículos, epidídimos, líquido escrotal, varicocele, orquiepididimite, microlitíase, nódulos e torção. A ingestão e a ativação desses blocos no banco atual não foram comprovadas. A lacuna está na estrutura: não há contrato clínico nem renderer específico para transportar os fatos do Doppler, aplicar critérios determinísticos e manter paridade entre os clientes.

| Camada | Estado atual |
| --- | --- |
| Web | categoria `ESCROTAL` exposta; geração baseada em ditado e writer genérico |
| Android/RN | categoria exposta; sem formulário escrotal estruturado |
| iOS | categoria exposta; sem contrato próprio de Doppler escrotal |
| API | normalização, glossário e corpus em arquivo existem; renderer, contrato e checker específicos ausentes |
| Banco | código `ESCROTAL` presente |
| Sanidade determinística | extrai volumes testiculares, calibre de varicocele e menções; não valida torção, refluxo, lateralidade nem coerência entre sinais |
| Sala | recebe o texto final; não há bloco estruturado de urgência ou revisão dos critérios |

O seed comum não popula o conteúdo clínico. A API carrega apenas blocos previamente ingeridos e validados; portanto, a presença dos arquivos não prova seu uso em produção. Há também uma tensão que hoje fica a cargo do modelo generativo: a regra global proíbe conduta e recomendação, enquanto blocos escrotais instruem encaminhamento urgente e correlação clínica. O contrato novo precisa resolver explicitamente o que pertence ao laudo, ao alerta de interface e à recomendação opt-in.

## Regra de segurança prioritária

Ausência ou redução de fluxo é um achado de alto risco, mas o contrato não deve transformar automaticamente um único controle em diagnóstico fechado. O estado mínimo precisa separar fluxo colorido e espectral, comparação contralateral, qualidade técnica, sintomas informados, morfologia, posição, volume, ecotextura, cordão espermático, sinal do redemoinho, hidrocele reacional e espessamento da parede.

A conclusão de forte suspeita de torção só pode ser publicada após confirmação médica explícita. A ausência isolada de fluxo deve gerar alerta bloqueante para revisão, não uma inferência silenciosa. Uma limitação técnica também deve impedir normalidade presumida.

## Varicocele

O corpus atual do LaudoUSG contém valores e uma versão resumida da classificação de Sarteschi, porém esses dados não são governados por um contrato executável. O modelo compartilhado deve guardar cada lado separadamente, calibre em repouso, calibre à Valsalva, presença e duração do refluxo, extensão/topografia, posição do exame e eventual diferença volumétrica testicular.

Calibre e refluxo não são intercambiáveis. A classificação deve ser derivada somente quando os dados exigidos pela regra versionada estiverem completos, e o médico precisa confirmar o resultado. Varicocele isolada à direita pode sugerir revisão ou correlação, mas a recomendação deve permanecer opt-in.

## Contrato dormente proposto

O código canônico continua sendo `ESCROTAL`; não há motivo para criar `BOLSA_TESTICULAR_DOPPLER`. O contrato deve permitir modo B e Doppler no mesmo exame, com objetos bilaterais para testículo, epidídimo e plexo pampiniforme. Deve incluir técnica e limitações, medidas e volume, ecotextura, vascularização, Doppler espectral, sinais de torção, lesões focais, líquido escrotal, pele/parede, varicocele, conclusão confirmada e recomendações opt-in.

A primeira versão segura deve cobrir exame normal, ausência de fluxo isolada, torção com critérios combinados, limitação técnica unilateral, orquiepididimite, varicocele unilateral e bilateral e lesão focal. A ativação exige goldens sintéticos, auditoria fail-closed da lateralidade e paridade Web/iOS/Android/Sala.

## Melhorias sugeridas ao LaudoUSG

As propostas abaixo partem dos gaps confirmados no próprio LaudoUSG. O estudo do concorrente serviu apenas para revelar cobertura e comportamentos de risco; nomes de campos, regras de composição e redação clínica devem ser próprios, aprovados pelo Luiz e sustentados por fonte médica antes da ativação.

### 1. Contrato compartilhado bilateral e estado de avaliação

**Gap confirmado.** Web, Android/RN e iOS expõem `ESCROTAL`, mas enviam texto livre. Não há contrato clínico, renderer ou estado compartilhado capaz de distinguir estrutura normal, alterada, limitada e não avaliada.

**Contrato e controles.** Criar `EscrotalFindingsV1` dormente, mantendo o código `ESCROTAL`. O objeto raiz deve registrar indicação opcional, técnica, posição do exame, uso de modo B, Doppler colorido e Doppler espectral, qualidade e limitações. Deve haver objetos separados para direita e esquerda contendo testículo, epidídimo, plexo pampiniforme, líquido escrotal e parede. Cada estrutura deve usar estado explícito `not_assessed | normal | abnormal | limited`, sem converter campo vazio em normalidade. Medidas devem guardar valor, unidade, lado, origem e autoria; volume calculado deve permanecer separado das medidas informadas.

**Efeito no laudo.** O corpo publica somente estruturas efetivamente avaliadas e preserva a lateralidade. A conclusão normal só pode ser emitida quando o conjunto mínimo aprovado estiver avaliado bilateralmente e sem limitação relevante. Estruturas não avaliadas não entram como normais; limitação relevante produz uma frase descritiva própria e impede conclusão global de normalidade.

**Validações determinísticas.** Rejeitar lado ausente em qualquer achado unilateral; bloquear medida sem unidade; impedir volume calculado quando faltar um dos três eixos ou a fórmula versionada; impedir `normal` e `abnormal` simultâneos na mesma estrutura; limpar derivados quando o achado ou uma medida for removido; bloquear conclusão global normal quando houver alteração, limitação relevante ou estrutura mínima não avaliada.

**Web.** Usar formulário compacto em duas colunas espelhadas, direita e esquerda, com um resumo fixo das pendências. O estado basal pode ser aplicado por estrutura, nunca como preset irreversível do exame inteiro. A prévia deve atualizar por bloco, destacando a frase alterada sem deslocar o restante do formulário.

**Prompts mobile.** O interpretador deve converter o ditado em patch do contrato, não em laudo final. Exemplos precisam ensinar lado, estrutura, estado, medidas e negações. Se o médico disser “restante normal”, o prompt só pode completar o conjunto previamente definido e deve preservar qualquer alteração já registrada. Ambiguidade de lado, unidade ou estrutura deve gerar pendência objetiva.

**Prioridade clínica.** P0, porque é a base para todas as regras de segurança e para a paridade entre plataformas.

**Casos sintéticos mínimos.** Normal bilateral completo; exame normal com epidídimo não avaliado; limitação unilateral; medida sem unidade; lado ausente; remoção de uma medida que invalida o volume; alteração direita coexistindo indevidamente com conclusão normal.

### 2. Perfusão e suspeita de torção

**Gap confirmado.** A biblioteca possui conteúdo de torção, mas a API não tem checker escrotal. Ausência ou redução de fluxo permanece texto interpretado pelo modelo, sem provar comparação contralateral, qualidade técnica, contexto clínico ou sinais morfológicos.

**Contrato e controles.** Por lado, registrar fluxo colorido (`present | increased | reduced | absent | indeterminate`), sinais arteriais e venosos no espectral, comparação contralateral, posição e eixo, ecotextura, aumento ou redução volumétrica, cordão espermático, sinal do redemoinho, hidrocele reacional e espessamento da parede. Sintomas informados pelo médico devem ser dados contextuais opcionais e separados: dor aguda, duração e lado. Incluir `torsion_assessment` com `insufficient_data | alert | physician_confirmed | physician_rejected`; a aplicação não define diagnóstico sozinha.

**Efeito no laudo.** O corpo descreve apenas os sinais observados e sua lateralidade. Redução ou ausência de fluxo isolada pode ser publicada como achado, porém não gera automaticamente “torção” na conclusão. A conclusão de forte suspeita entra somente após confirmação médica explícita. A orientação urgente deve aparecer primeiro como alerta da interface; sua publicação no texto segue decisão explícita e política clínica aprovada.

**Validações determinísticas.** Ausência/redução de fluxo dispara alerta P0 e exige qualidade técnica, lado, comparação contralateral e confirmação médica antes da conclusão diagnóstica. Fluxo `indeterminate` ou exame limitado bloqueia normalidade e diagnóstico fechado. Sinal do redemoinho sem lado é inválido. `physician_confirmed` sem pelo menos um achado vascular ou morfológico aprovado deve gerar pendência. O checker deve detectar conclusão de torção sem confirmação e qualquer troca de lateralidade entre corpo e conclusão.

**Web.** Exibir um bloco “Perfusão e torção” com comparação lado a lado. Achado crítico abre um painel persistente de revisão com os fatos presentes, os dados ausentes e dois comandos separados: confirmar impressão ou manter apenas descrição. A recomendação de urgência deve ter controle próprio e nunca vir marcada por padrão.

**Prompts mobile.** O prompt deve reconhecer frases como ausência de fluxo, fluxo reduzido, fluxo preservado, redemoinho e dor, mas produzir somente fatos estruturados. Diante de “sem fluxo à direita”, deve registrar o achado e solicitar confirmação na interface, sem completar dor, duração, redemoinho ou diagnóstico. Negação posterior deve remover o fato e seus derivados.

**Prioridade clínica.** P0 crítico.

**Casos sintéticos mínimos.** Ausência isolada de fluxo; redução de fluxo com técnica limitada; ausência de fluxo com redemoinho e dor aguda; redemoinho sem lado; fluxo preservado bilateral; confirmação e rejeição médica da suspeita; remoção do achado crítico; corpo direito com conclusão esquerda.

### 3. Varicocele e refluxo venoso

**Gap confirmado.** O corpus descreve varicocele e classificação, mas não há campos executáveis para calibre, posição, Valsalva, refluxo, extensão ou lado. O extrator atual possui uma única medida genérica e não há validação específica.

**Contrato e controles.** Criar um objeto de plexo por lado com estado, maior calibre em repouso, maior calibre à Valsalva, posição da medida, refluxo (`not_tested | absent | present | indeterminate`), duração e topografia/extensão quando observadas. Guardar classificação derivada, regra e versão separadamente da confirmação médica. Não usar calibre como substituto de refluxo e não presumir que Valsalva foi realizada.

**Efeito no laudo.** O corpo descreve cada lado de forma independente, incluindo somente medidas e manobras realizadas. A conclusão pode registrar varicocele unilateral ou bilateral após confirmação médica. Grau ou classificação só entra quando os dados exigidos pela regra aprovada estiverem completos e o médico confirmar. Uma sugestão por achado isolado à direita deve permanecer fora do laudo até publicação opt-in.

**Validações determinísticas.** Bloquear refluxo sem lado; bloquear duração sem refluxo presente; impedir “sem varicocele” quando um lado estiver alterado ou não avaliado; impedir classificação com dados incompletos; detectar lado ou grau divergente entre corpo e conclusão; limpar classificação quando calibre, refluxo, posição ou extensão forem removidos; exigir unidade para calibre e duração.

**Web.** Mostrar direita e esquerda na mesma linha, com controles progressivos. Selecionar refluxo revela duração e extensão; selecionar medida revela unidade e condição da medida. A classificação calculada aparece como sugestão revisável, acompanhada da regra versionada, sem entrar automaticamente no laudo.

**Prompts mobile.** O prompt deve separar “veias de 3,2 mm à esquerda” de “refluxo à Valsalva à esquerda”. Se apenas um dos fatos for ditado, o outro continua `not_assessed`. Expressões como “bilateral, maior à esquerda” devem gerar dois objetos e nunca uma medida compartilhada entre os lados.

**Prioridade clínica.** P0 para lateralidade e coerência; P1 para classificação automática.

**Casos sintéticos mínimos.** Plexos normais bilaterais; dilatação sem refluxo testado; refluxo sem medida; varicocele esquerda completa; varicocele bilateral assimétrica; achado isolado à direita; classificação com dado ausente; remoção do refluxo limpando classificação; lado trocado na conclusão.

### 4. Orquite, epididimite e orquiepididimite

**Gap confirmado.** Há conteúdo textual sobre inflamação e hiperemia, mas não há controles por estrutura e lado, nem regra capaz de diferenciar descrição inflamatória de conclusão confirmada ou de impedir conflito com uma avaliação vascular incompleta.

**Contrato e controles.** Testículo e epidídimo devem guardar lado, volume/dimensões, ecotextura, ecogenicidade, heterogeneidade, hiperemia, segmento epididimário acometido, dor à compressão somente se informada, parede e líquido reacional. Criar `inflammatory_assessment` com alvos possíveis `testis | epididymis | both`, lado e confirmação médica. Perfusão testicular precisa continuar representada separadamente da hiperemia inflamatória.

**Efeito no laudo.** O corpo descreve individualmente testículo, cabeça/corpo/cauda do epidídimo quando avaliados, hiperemia e achados associados. A conclusão usa orquite, epididimite ou orquiepididimite apenas após confirmação do médico; dados parciais permanecem descritivos. Correlação clínico-laboratorial é recomendação opt-in e não parte automática do achado.

**Validações determinísticas.** Impedir hiperemia sem estrutura e lado; impedir epididimite quando nenhum segmento epididimário estiver alterado; impedir orquite quando o testículo estiver marcado normal; bloquear conclusão inflamatória se a perfusão estiver indeterminada diante de quadro agudo até revisão; detectar “fluxo preservado” usado indevidamente como prova isolada contra torção; limpar conclusão quando os fatos inflamatórios forem removidos.

**Web.** Um bloco “Processo inflamatório” deve abrir os controles da estrutura selecionada e manter os achados associados como opções independentes. A comparação dos lados precisa permanecer visível. O alerta de diagnóstico diferencial é informativo na interface e não deve ser copiado automaticamente para o laudo.

**Prompts mobile.** O interpretador deve diferenciar “hiperemia do epidídimo direito” de “hiperemia testicular direita” e pedir esclarecimento quando o médico disser apenas “hiperemia à direita”. O termo “orquiepididimite” pode preencher a hipótese confirmada somente quando acompanhado dos fatos ou de confirmação explícita; nunca deve inventar segmento, medida ou líquido reacional.

**Prioridade clínica.** P0 para estrutura, lado e conflito vascular; P1 para recomendações.

**Casos sintéticos mínimos.** Epididimite direita isolada; orquite esquerda; orquiepididimite com hidrocele reacional; hiperemia sem estrutura; quadro inflamatório com perfusão indeterminada; remoção da hiperemia; corpo e conclusão com estruturas divergentes.

### 5. Lesões focais, microlitíase, líquido e parede

**Gap confirmado.** Nódulo, microlitíase e hidrocele possuem frases no corpus, porém não há entidades estruturadas, lista de lesões, vínculo por lado ou coerência determinística. O writer pode transformar achado parcial em conclusão excessiva ou manter normalidade residual.

**Contrato e controles.** Permitir múltiplas lesões testiculares e extratesticulares com identificador estável, lado, estrutura de origem, localização, três dimensões, composição, ecogenicidade, margens, vascularização e observações. Microlitíase deve guardar lado e distribuição descrita, sem gerar recomendação automática. Líquido escrotal precisa separar lado, quantidade qualitativa, ecos internos e septações. Parede deve guardar espessamento e outras alterações sem presumir causa.

**Efeito no laudo.** Cada lesão aparece no corpo com seu identificador e lado; a conclusão usa descrição diagnóstica somente quando os critérios e a confirmação médica permitirem. Hidrocele, microlitíase e espessamento da parede entram como itens próprios, sem apagar os demais achados. Recomendações ficam em estado separado `suggested | confirmed | published`.

**Validações determinísticas.** Exigir lado, estrutura e ao menos uma dimensão para lesão mensurável; preservar unidade; impedir “testículos sem lesões focais” quando houver lesão ativa; impedir “sem hidrocele” no lado alterado ou não avaliado; detectar duplicidade de identificadores; limpar texto e conclusão ao remover uma lesão; bloquear recomendação publicada sem confirmação explícita.

**Web.** Oferecer ação “Adicionar lesão” por lado, com cartões compactos e reordenáveis. Líquido e parede ficam fora do cartão da lesão para evitar mistura anatômica. A prévia realça apenas a entidade editada.

**Prompts mobile.** O prompt deve criar uma entidade por lesão ditada e manter referências posteriores, como “o segundo nódulo”, vinculadas ao identificador correto. Se o médico disser “microlitíase bilateral” ou “hidrocele discreta à esquerda”, o patch deve ser bilateral ou unilateral conforme o ditado, sem completar medidas ou recomendações.

**Prioridade clínica.** P1; sobe para P0 quando houver lesão sólida intratesticular ou conflito de lateralidade.

**Casos sintéticos mínimos.** Cisto epididimário esquerdo; duas lesões no mesmo testículo; nódulo sólido intratesticular; microlitíase bilateral; hidrocele simples unilateral; líquido com ecos internos; lesão sem lado; remoção de uma entre duas lesões; negativa residual incompatível.

### 6. Renderer, sanidade determinística e governança do banco

**Gap confirmado.** O corpus versionado não comprova ingestão no banco, o renderer não suporta `ESCROTAL`, os valores extraídos não alimentam checker próprio e as regras de recomendação entram em tensão com as proibições globais.

**Contrato e controles.** O renderer deve consumir somente `EscrotalFindingsV1`, sem reconstruir fatos a partir de prosa. O banco precisa registrar versão do contrato, versão das regras, origem e status validado dos blocos. A recomendação deve ser uma entidade separada do achado e da conclusão, com autoria e decisão de publicação. O writer genérico permanece como fallback controlado até a ativação conjunta.

**Efeito no laudo.** Corpo e conclusão devem ser composição determinística do mesmo estado. O renderer não publica placeholders, medidas de exemplo, frequência fixa de transdutor ou manobras não registradas. Alertas críticos e recomendações não entram silenciosamente no documento final.

**Validações determinísticas.** Criar checker `ESCROTAL` com invariantes de lateralidade, medida/unidade, normalidade versus alteração, perfusão/torção, refluxo/classificação, inflamação e limpeza de derivados. A geração deve falhar de forma explícita quando faltar bundle validado, contrato compatível ou versão de renderer. A ativação precisa provar que existe exatamente um modelo basal validado por estilo e que todas as regras referenciadas estão disponíveis.

**Web.** Mostrar erro recuperável e preservar o estado do formulário se renderer ou bundle falhar. Não retornar silenciosamente ao writer genérico quando a sessão já estiver usando o contrato estruturado.

**Prompts mobile.** O prompt devolve JSON validado e versionado. Patch inválido, desconhecido ou incompatível não substitui o estado anterior; volta como pendência ao médico. O modelo não pode escrever diretamente a conclusão fora dos campos permitidos pelo contrato.

**Prioridade clínica.** P0.

**Casos sintéticos mínimos.** Bundle vazio; mais de um modelo basal; versão de contrato incompatível; placeholder residual; frequência de transdutor ausente; recomendação sugerida não publicada; falha do renderer com retomada do estado; tentativa de fallback silencioso.

### 7. Paridade de experiência e ativação

**Gap confirmado.** A categoria aparece nas três plataformas, mas isso representa apenas paridade de navegação. Não há paridade de contrato, controles, revisão ou testes clínicos.

**Contrato e controles.** Web, Android/RN e iOS devem serializar o mesmo `EscrotalFindingsV1`. Campos temporariamente indisponíveis em um cliente precisam continuar preservados na leitura e gravação. Sala do Auxiliar recebe somente o laudo renderizado e um estado simples de revisão; não deve interpretar critérios clínicos.

**Efeito no laudo.** O mesmo estado clínico deve produzir corpo e conclusão equivalentes em todos os clientes. Diferenças visuais são permitidas; diferenças de fatos, medidas, lado ou decisão de publicação não são.

**Validações determinísticas.** Executar round-trip Web → API → mobile e mobile → API → Web; comparar saída normalizada dos renderers; provar que campos desconhecidos são preservados; impedir ativação parcial por cliente; verificar retomada, edição, remoção e reenvio para a Sala.

**Web.** Será a primeira superfície de revisão clínica do formulário, mas deve permanecer atrás de flag dormente até os clientes móveis consumirem o contrato.

**Prompts mobile.** Android/RN e iOS devem compartilhar exemplos clínicos e regras de patch equivalentes, com testes que usam os mesmos casos e o mesmo resultado esperado.

**Prioridade clínica.** P0 para ativação; a construção visual pode seguir como P1 após contrato e renderer.

**Casos sintéticos mínimos.** Criar no Web e editar no iOS; criar no Android e editar no Web; remoção de achado em cada cliente; campo novo lido por cliente antigo; laudo revisado enviado à Sala; comparação byte a byte do estado normalizado e comparação semântica do texto final.

## Sequência recomendada

Primeiro aprovar o contrato dormente e as regras de publicação para torção, varicocele e inflamação. Depois implementar renderer e checker específicos, ainda sem ativação pública. Em seguida, construir o formulário Web para revisão médica e ligar o interpretador mobile ao mesmo contrato. A última etapa é executar os goldens compartilhados, validar a ingestão do bundle no ambiente de destino e ativar Web, Android/RN e iOS na mesma versão.

O primeiro gate de aprovação deve conter, no mínimo, o modelo normal, torção com dados insuficientes, torção confirmada, varicocele unilateral e bilateral, orquiepididimite, lesão focal, limitação técnica, remoção de achado e conflito de lateralidade. Nenhum diagnóstico crítico, classificação ou recomendação deve ser publicado a partir de um único controle implícito.

O caso funcional está em [cases/bolsa-testicular-doppler-2026-10-03.md](cases/bolsa-testicular-doppler-2026-10-03.md).
