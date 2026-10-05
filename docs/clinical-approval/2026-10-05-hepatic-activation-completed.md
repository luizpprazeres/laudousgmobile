# Ativação dos modelos hepáticos aprovados

Implementação: 05/10/2026. Este documento complementa a auditoria da mesma data; não substitui nem altera seu registro original.

## Comportamento entregue

Elastografia hepática e avaliação multiparamétrica hepática passam a ter gates Web/API/Android ativos por padrão. A migração 0033 ativa as duas categorias de maneira idempotente. O servidor usa o renderer estruturado existente, com interpretação expressamente confirmada pelo médico, sem writer livre de fallback e sem classificar fibrose ou esteatose por limiar inventado.

O registro de qualidade deixou de estar vazio. Fonte única: `packages/shared/src/hepatic/qualityProfiles.ts`, versão imutável `laudousg-quality/2026-10-05-v1`. Web e Android derivam as configurações desse registro; a API verifica unidade, referência/versionamento, fabricante quando necessário, contagem, jejum e IQR/mediana calculado a partir das medidas nativas. O valor calculado aparece como leitura, sem pedir redigitação. As pendências de aquisição aparecem antes da confirmação de qualidade.

O protocolo que depende da execução do exame e da observação no aparelho é confirmado explicitamente pelo médico, incluindo critérios do fabricante e CV por aquisição na 2D-SWE. Essa confirmação não equivale a medição automática desses itens pelo software.

## Perfis técnicos iniciais

2D-SWE: mínimo de três aquisições; pSWE/ARFI: mínimo de cinco. Os dois preservam a unidade nativa e usam IQR/M até 30% em kPa ou até 15% em m/s. Jejum mínimo de quatro horas e confirmação de repouso/protocolo.

TE/FibroScan: perfil Echosens, dez aquisições, jejum mínimo de três horas. IQR/M até 30% é exigido somente quando a mediana supera 7,1 kPa. O valor abaixo disso não é usado como diagnóstico: apenas determina a aplicabilidade da regra de qualidade. O campo de fabricante aceita diferenças de maiúsculas/minúsculas, mantendo identidade do fabricante.

ATI e UGAP: três aquisições, IQR/M até 15%, unidade nativa dB/cm/MHz. A via multiparamétrica adotada exige jejum e segue a preparação da avaliação da rigidez. Critérios específicos de qualidade/ROI do fabricante exigem confirmação médica.

CAP, UDFF e USFF continuam representáveis no contrato para compatibilidade, mas não são oferecidos no seletor inicial: CAP precisa vincular sua aquisição à TE válida no mesmo exame; UDFF exige perfil específico de versão/sonda e agregação apropriada; USFF ainda não tem fonte suficiente. Isso não mantém as categorias dormentes: os métodos listados acima funcionam de ponta a ponta.

## Fontes primárias reconferidas

WFUMB 2024, parte 1, tabela 1: https://doi.org/10.1016/j.ultrasmedbio.2024.03.013

WFUMB 2024, parte 2, tabela 5: https://doi.org/10.1016/j.ultrasmedbio.2024.03.014

Echosens, procedimento FibroScan: https://www.echosens.com/fibroscanprocedure/

Os números são critérios de aquisição, nunca limites diagnósticos. O perfil preserva a conclusão aprovada: “Rigidez hepática dentro dos parâmetros de referência adotados para o método empregado.” quando ela é informada e confirmada pelo médico, sem inserir normalidade por padrão.

## Validação

`hepatic-quality-profiles.manual.ts`: sete combinações de método/unidade exercitam configuração Web, montagem do contrato Android e `prepareHepaticReport` real com registro de produção. Cobre geração de ambas as categorias, preservação da conclusão, limites por unidade, condição TE em 7,1/7,2 kPa, fraude em valor derivado, confirmação ausente, jejum insuficiente, fabricante incompatível e versão não aprovada.

Gates complementares: API hepática v1 e métrica derivada, quatro suítes Web, 24 testes Android e typecheck do monorepo. Não houve escrita em produção por este agente; migração e publicação ficam sob a revisão do orquestrador. Não houve teste de hardware real nesta frente.
