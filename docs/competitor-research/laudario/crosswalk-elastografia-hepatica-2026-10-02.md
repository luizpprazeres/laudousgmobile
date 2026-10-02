# Cruzamento Laudário × LaudoUSG — Elastografia Hepática

Data: 02/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura de código e testes focados. Nenhum dado clínico real foi usado.

## Síntese

O LaudoUSG Web já documenta rigidez hepática por 2D-SWE, pSWE/ARFI ou elastografia transitória, preserva kPa ou m/s e calcula apenas IQR/mediana. Essa base evita a conversão e a classificação universal vistas no concorrente.

Ainda não existe um exame independente de Elastografia Hepática. Rigidez esplênica, comparação longitudinal, gates de qualidade por método, schema versionado, paridade móvel e travessia Web para a Sala estão ausentes. O módulo Web também conserva uma interpretação médica livre quando a aquisição muda, criando risco de texto antigo ser reincluído sobre uma nova medida.

| Capacidade | Web | iOS | Android/RN |
| --- | --- | --- | --- |
| Categoria Elastografia Hepática | Ausente | Ausente | Ausente |
| Rigidez hepática estruturada | Parcial, dentro de Abdome | Texto ou voz livre | Texto ou voz livre |
| Gate de qualidade por método | Ausente | Ausente | Ausente |
| Rigidez esplênica | Ausente | Ausente | Ausente |
| Comparação longitudinal e delta | Ausente | Ausente | Ausente |
| Validação compartilhada no servidor | Ausente | Ausente | Ausente |

## 1. Categoria própria e contrato

Na Web, o painel aparece apenas em Abdome total e Abdome superior. O seletor, o seed do banco e os contratos compartilhados não contêm Elastografia Hepática. Android e iOS também não expõem a categoria.

**Lacuna confirmada:** não existe uma identidade própria de exame nem um contrato que possa ser consumido pelas três plataformas.

**Requisito proposto:** criar um contrato hepático versionado e reutilizável. A mesma estrutura deve sustentar o exame independente e os módulos de Abdome, conservando o contexto de cada composição.

## 2. Rigidez hepática e qualidade

O módulo Web exige modalidade, unidade e mediana. Número de medições, IQR, equipamento, jejum e qualidade são opcionais. O estado `não realizável` bloqueia a medida, mas qualidade limitada apenas acrescenta texto. Não há mínimos por método, fabricante ou etiologia.

No cenário do concorrente, 4,0 kPa gerou classificação normal antes do IQR/mediana. O LaudoUSG não classifica automaticamente, o que evita esse resultado específico, porém ainda permite publicar a medida sem um protocolo de qualidade completo.

**Requisito de segurança:** definir dados mínimos por técnica e diferenciar medida documentável de medida apta a interpretação. Qualidade ausente ou insuficiente deve permanecer como pendência clínica, sem receber conclusão automática.

## 3. Dependências e estado residual

O LaudoUSG não converte kPa em m/s. Trocar modalidade ou unidade apaga mediana e IQR, e a razão IQR/mediana é calculada apenas em memória. Portanto o defeito do concorrente, em que m/s residual sustenta a conclusão após apagar kPa, não está presente hoje.

Há outro risco: `interpretacaoMedica` não é apagada ao trocar modalidade, unidade ou medida e é reutilizada nos blocos de rigidez e gordura. Desligar e religar o módulo também conserva valores. Qualquer mudança invalida a inclusão no laudo, mas o médico ainda pode reincluir uma interpretação antiga.

**Correção necessária:** separar interpretações por submódulo e registrar sua dependência da aquisição. Alterar ou apagar método, unidade, medida ou qualidade deve invalidar classificações e derivações geradas. O texto manual pode permanecer como rascunho, marcado como desvinculado da aquisição atual e bloqueado até nova confirmação médica.

## 4. Elastografia esplênica

O Laudário oferece estados de não realizada, realizada com qualidade adequada, limitada e não realizável, além de número de medidas, kPa, m/s, IQR e IQR/mediana. No cenário sintético, combinou fígado abaixo de 16 kPa e baço abaixo de 26,6 kPa em 2D-SWE para considerar HPCS improvável.

O LaudoUSG não possui campos, cálculo, interpretação, confirmação ou testes esplênicos.

**Lacuna confirmada:** a avaliação complementar do baço está ausente em todas as plataformas.

**Requisito proposto:** modelar fígado e baço como aquisições separadas, com método e qualidade próprios. Qualquer algoritmo combinado deve declarar pré-condições, fonte e versão. pSWE, elastografia transitória e 2D-SWE não podem compartilhar limiar silenciosamente.

## 5. Seguimento longitudinal

O concorrente expõe exame anterior, data, mesmo equipamento, delta absoluto, delta relativo, contexto clínico e tabela evolutiva. Esses controles foram inventariados, sem validação dos limiares em cenário próprio.

O LaudoUSG persiste o estado atual em JSON genérico, mas não modela aquisição anterior, comparabilidade técnica, delta ou série temporal.

**Lacuna confirmada:** armazenar rascunhos anteriores não equivale a seguimento longitudinal.

**Requisito proposto:** uma comparação precisa vincular exames identificados, preservar método, equipamento e qualidade e declarar quando os dados não são comparáveis. O cálculo pode ser determinístico; a interpretação continua dependente de revisão clínica e fonte versionada.

## 6. Validação, persistência e Sala

A validação hepática atual existe somente no navegador. `examState` chega à persistência como `unknown`, sem schema equivalente no servidor. A Web salva em `web_reports`, enquanto a Sala consulta `reports`.

**Lacuna confirmada:** o laudo Web não chega à Sala, e nenhum cliente conserva o contrato de elastografia até a auxiliar.

No Android, o resultado recém-gerado é transmitido como rascunho pendente antes da revisão. A Sala só exibe o estado revisado quando a revisão médica está vinculada à mesma versão do conteúdo. Essa diferença deve ser descrita como transporte antecipado do rascunho, não como liberação para cópia.

**Requisito proposto:** validar no servidor, versionar o payload e transportar o mesmo `reportId` e estado de revisão nas três plataformas. A auxiliar deve receber texto revisado; os dados estruturados permanecem disponíveis para auditoria e reabertura pelo médico.

## 7. Testes e limites

Os 21 testes do construtor Web passaram. Há prova de inclusão explícita e invalidação do bloco quando a medida muda. Não existem testes de rigidez esplênica, evolução, qualidade ausente ou limitada, mínimo de aquisições, interpretação residual, validação no servidor ou fluxo até a Sala.

Os cortes hepatoesplênicos e longitudinais observados no concorrente são evidência funcional, não decisão clínica aprovada para o LaudoUSG. Equipamentos físicos, produção e interoperabilidade não foram verificados.

## Ordem de implementação proposta

Primeiro, consolidar o contrato compartilhado de aquisição hepática e corrigir a interpretação residual. Depois, acrescentar aquisição esplênica e comparação longitudinal como módulos independentes, ainda sem interpretação automática. Em seguida, criar a categoria, adaptar a Web e validar no servidor. Por último, levar a interface aos apps e unificar o envio revisado à Sala. Os algoritmos clínicos entram somente após aprovação das fontes, métodos e gates.

## Evidências principais no LaudoUSG

- Web: `apps/web/src/components/laudar/LiverQuantificationPanel.tsx`, `apps/web/src/lib/deterministic/liverQuantification.ts`, `apps/web/src/components/laudar/LaudarWebExperience.tsx` e `apps/web/src/lib/webReports.ts`.
- Contratos e banco: `packages/shared/src/clinicalModels/contracts.ts`, `packages/db/src/seeds/data.ts` e `packages/db/src/sql/0018_web_reports.sql`.
- API e Sala: `apps/api/src/app/api/sala/latest/route.ts` e `apps/api/src/server/sala/reportContract.ts`.
- Android/RN: `apps/mobile/src/ui/tokens.ts` e `apps/mobile/app/generate.tsx`.
- iOS: `LaudoUSG/LaudoUSG/Models/Category.swift` no repositório Swift.
