# Cruzamento Laudário × LaudoUSG — Obstétrico de primeiro trimestre

Data: 02/10/2026. O comportamento do Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi avaliado em leitura de código e testes focados; nenhum dado clínico real foi usado.

## Síntese

Os três clientes do LaudoUSG possuem partes relevantes do fluxo, mas a paridade ainda é parcial. A calculadora de trissomias já tem um motor compartilhado robusto e muitos testes. A datação por CCN, a DPP derivada dessa datação e a confirmação estruturada de inviabilidade ainda não formam um contrato único entre Web, iOS, Android, API e Sala.

| Cenário sintético | Web | iOS | Android/RN |
| --- | --- | --- | --- |
| CCN 45 mm + FCF 160 bpm → IG e DPP | Parcial | Parcial | Parcial |
| CCN 45 mm + atividade cardíaca ausente | Parcial no backend; ausente no formulário combinado | Parcial e dependente da API | Parcial, com inconsistência possível entre embrião e feto |
| TN + marcadores + fatores maternos → T21/T13/T18 | Parcial, protegido por gate | Parcial | Parcial |
| Persistência e revisão na Sala | Texto final disponível | Texto final disponível | Texto final disponível |

## 1. Datação por CCN e frequência cardíaca

### Comportamento observado no Laudário

Com CCN de 45 mm e FCF de 160 bpm, o Laudário exibiu 11 semanas e 1 dia, calculou a DPP e levou datação, vitalidade e frequência cardíaca ao texto final.

### LaudoUSG

Na Web, o Morfológico de primeiro trimestre coleta CCN e FCF e o renderer escreve ambos no laudo, mas idade gestacional e DPP não são derivadas desse CCN. O motor compartilhado de trissomias usa Robinson-Fleming e arredonda 45 mm para 11 semanas e 2 dias. Essa idade fica dentro da calculadora e não alimenta o formulário obstétrico.

No iOS, a calculadora de trissomias também aceita CCN e FCF e mostra a idade calculada. A calculadora geral de idade gestacional depende de DUM ou de idade previamente conhecida; o atalho de biometria usa comprimento do fêmur/Hadlock e não resolve o primeiro trimestre. A DPP não é calculada diretamente do CCN.

No Android/RN, o texto livre e o contrato da API aceitam CCN e FCF. Há regressão clínica para CCN 45 mm, FCF 160 bpm e idade explicitamente informada, mas a calculadora geral de idade gestacional não aceita CCN. O motor de trissomias calcula 11 semanas e 2 dias sem produzir DPP ou atualizar o laudo obstétrico.

**Lacuna confirmada:** falta um serviço compartilhado e explícito de datação por CCN que receba data do exame, devolva idade gestacional e DPP, registre fórmula/versão e alimente os três clientes e o renderer. A diferença de um dia em relação ao concorrente precisa ser investigada antes de escolher qualquer arredondamento.

## 2. Ausência de atividade cardíaca

### Comportamento observado no Laudário

Com CCN de 45 mm, a seleção de atividade cardíaca ausente relacionou o achado ao limiar biométrico, descreveu confirmação por imagem e concluiu inviabilidade. O teste abaixo do limiar ainda está pendente e, portanto, o comportamento completo não deve ser inferido.

### LaudoUSG

A API aceita `bcf_alteracao: "ausente"` e produz texto de ausência de batimentos e conclusão de ausência de vitalidade. A decisão atual não valida o CCN mínimo: o mesmo caminho pode ser acionado com CCN insuficiente ou ausente.

Na Web, o formulário Obstétrica permite atividade ausente, mas fixa o CCN como nulo; o Morfológico coleta CCN, mas força vitalidade normal. Não há uma tela estruturada que reúna biometria e ausência de atividade.

No iOS, existe o atalho “Sem vitalidade”, porém não há validação local do CCN, confirmação estruturada do critério, renderer determinístico ou teste focado desse cenário.

No Android/RN, o atalho também existe. Sem idade gestacional explícita, o renderer pode chamar de “embrião” um concepto com CCN de 45 mm, embora a própria fórmula compartilhada o situe além de 11 semanas. O teste existente evita o problema porque injeta a idade gestacional manualmente.

**Lacuna clínica confirmada:** a conclusão de ausência de vitalidade não está condicionada de forma segura a biometria, idade gestacional, método de confirmação e confirmação médica. O contrato precisa distinguir achado observado, critério preenchido, diagnóstico confirmado e redação final. Até isso existir, o sistema deve impedir conclusão automática quando faltarem dados.

## 3. Rastreio de trissomias

### Cobertura atual

O motor compartilhado recebe idade ou data de nascimento materna, peso, etnia, CCN, TN, FCF, osso nasal, tricúspide e IP do ducto venoso. Calcula riscos para T21, T18 e T13 e possui uma suíte extensa de casos dourados na implementação iOS, além de testes focados na Web e no Android/RN.

O ducto venoso qualitativamente normal não modifica o risco, pois o cálculo exige IP numérico. Esse comportamento coincide com o observado no Laudário e deve continuar explícito na interface.

### Lacunas de apresentação e segurança

Na Web, a calculadora fica atrás de `NEXT_PUBLIC_FMF_TRISOMY_VALIDATION=true` e informa validação clínica pendente. A inclusão no laudo é explícita, mas o formatter descreve “baixo risco” para T21 e não oferece a mesma redação completa para T13/18 quando o resultado é baixo ou intermediário.

No iOS e no Android/RN, idade e/ou etnia começam com valores preenchidos. Isso pode transformar uma ausência de confirmação em um fator clínico silencioso. Os riscos T13 e T18 existem separadamente no motor, mas a apresentação e a inserção ainda privilegiam T13/18 agrupadas.

No Android/RN, o cálculo é anexado como texto ao laudo. Inputs, versão do modelo e resultado estruturado não chegam à API nem à Sala, reduzindo a auditabilidade.

**Lacunas confirmadas:** exigir confirmação consciente de todos os fatores usados; manter estado “não informado” como padrão; apresentar T21, T18 e T13 com número e classe coerentes; persistir entradas, versão, resultado e decisão de inclusão em estrutura auditável.

## 4. Sala do Auxiliar

A Sala recebe o texto final e respeita revisão médica e invalidação da revisão após edição. Isso cobre a entrega operacional, mas não preserva a proveniência clínica dos cálculos. Para este fluxo, a Sala deve continuar exibindo apenas o resultado destinado à auxiliar, enquanto o histórico médico mantém inputs, fórmula, versão, resultado calculado, edição e confirmação.

## 5. Testes e estado dos gates

Passaram os testes focados de calculadora Web, Morfológico, matriz obstétrica, apresentação Android/RN, transição embrião/feto e sanidade de idade gestacional. No iOS, o motor possui 286 casos dourados e recusas focadas.

O gate agregado de trissomias no repositório está vermelho porque o golden ainda declara a versão `v1`, enquanto o motor está em `v3+cal-2026-09-15c`. A falha ocorre antes da execução integral dos casos. Isso deve ser tratado como incompatibilidade de versão, não como aprovação nem reprovação clínica do motor atual.

Não existem testes suficientes para CCN abaixo do critério com ausência de atividade, CCN 45 mm com atividade ausente e idade não informada, cálculo de DPP por CCN e fluxo ponta a ponta dos marcadores até revisão e Sala.

## Próxima implementação proposta

Criar primeiro um contrato compartilhado para datação e vitalidade do primeiro trimestre, com estados incompleto, descritivo e confirmado. Em seguida, conectar os três clientes, o renderer e a persistência. Depois corrigir a proveniência da calculadora de trissomias e atualizar seu golden somente após validar a mudança de versão. A ativação deve ocorrer em paridade entre Web, iOS e Android.

## Evidências principais no LaudoUSG

- Web: `apps/web/src/lib/deterministic/organs/morfologico.ts`, `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`, `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts` e `apps/web/src/components/laudar/TrisomyFmfPanel.tsx`.
- API: `apps/api/src/server/renderer/categories/OBSTETRICA.ts` e `apps/api/src/server/renderer/categories/MORFOLOGICO.ts`.
- Android/RN: `apps/mobile/app/generate.tsx`, `apps/mobile/src/features/generate/IGCalculatorSheet.tsx` e `apps/mobile/src/features/generate/TrisomyCalculatorSheet.tsx`.
- iOS: `LaudoUSG/Services/TrisomyCalculator.swift`, `LaudoUSG/Components/Sheets/TrisomyCalculatorSheet.swift` e `LaudoUSG/ViewModels/GenerateViewModel.swift` no repositório Swift.
- Compartilhado: `packages/shared/src/calculators/fmfTrisomy.ts`, `fmfTrisomyFormatter.ts`, `fmfTrisomyTypes.ts` e `gestationalAge.ts`.
