# Cruzamento Laudário × LaudoUSG — Mamas e Axilas

Data: 02/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura de código e testes focados. Nenhum dado clínico real foi usado.

## Síntese

O núcleo clínico do LaudoUSG já cobre estado normal, cistos, nódulos sólidos, descritores mamários, medidas, topografia, Doppler, BI-RADS confirmado e axilas. A Web oferece a entrada estruturada mais completa. Android e iOS usam texto, voz e poucos atalhos, deixando a estruturação para a API.

As lacunas prioritárias não são de vocabulário. Faltam gates para impedir que uma lesão suspeita incompleta chegue ao laudo sem BI-RADS confirmado; o cartograma não compartilha uma identidade estável com cada achado; e há riscos topográficos concretos no iOS. Nos apps móveis, a Sala já liga o arquivo ao laudo por `reportId`, mas não recebe um contrato mamário estruturado por lesão. Na Web, o envio ainda depende de fallback por categoria.

| Cenário sintético | Web | iOS | Android/RN |
| --- | --- | --- | --- |
| Normal bilateral com axilas | Presente | Presente via texto/API | Presente via texto/API |
| Cisto simples com medidas e topografia | Presente, validação parcial | Presente no laudo; cartograma parcial | Presente no laudo; cartograma parcial |
| Nódulo sólido suspeito completo | Presente, exige BI-RADS explícito | Presente via texto/API | Presente via texto/API |
| Lesão incompleta | Tipo e lado bloqueiam; medidas, topografia e BI-RADS suspeito não bloqueiam | Sem formulário clínico estruturado | Sem formulário clínico estruturado |
| Cartograma ligado à lesão e ao laudo | Ausente | Ligado ao laudo; sem identidade por lesão | Ligado ao laudo; desenho manual sem identidade por lesão |
| Entrega estruturada à Sala | Ausente | Imagem/PDF com `reportId`, sem achado estruturado | PNG com `reportId`, sem achado estruturado |

## 1. Estado normal e escopo examinado

### Comportamento observado no Laudário

O estado inicial já descreve mamas, regiões retroareolares, várias cadeias linfonodais e ausência de tecido mamário acessório, além de BI-RADS 1 e rastreamento de rotina.

### LaudoUSG

O renderer diferencia mamas e axilas, somente mamas e somente axilas. No fluxo Web há perfis padrão, masculino e próteses. A categoria está disponível nos dois aplicativos móveis e todos usam o renderer determinístico da API para MAMARIA.

**Cobertura presente:** o exame normal e seus diferentes escopos já são representados.

**Requisito proposto:** nenhum cliente deve afirmar normalidade de uma cadeia ou região apenas pela abertura do modelo. O escopo efetivamente avaliado precisa ser confirmado e conservado até a Sala.

## 2. Cisto simples

O LaudoUSG preserva lado, três medidas, quadrante ou localização livre, relógio e distâncias. A Web pode sugerir BI-RADS 2 para cisto simples, mas a seleção final permanece explícita. O renderer também respeita essa confirmação.

Na Web, medidas e topografia não são obrigatórias para finalizar o achado. No iOS e Android, a entrada principal é o texto; não existe formulário mamário estruturado equivalente ao Web. Os cartogramas móveis não derivam do mesmo objeto clínico utilizado pelo renderer.

**Lacuna confirmada:** falta um conjunto mínimo compartilhado por tipo de lesão. Um cisto ativo pode produzir texto sem medidas ou topografia suficientes para identificar o achado de forma segura.

**Requisito proposto:** o contrato deve distinguir dado obrigatório, opcional e não avaliado. Para lesão focal ativa, ausência de lado ou localização deve bloquear; ausência de medida deve gerar pendência explícita antes da finalização, salvo justificativa confirmada pelo médico.

## 3. Nódulo sólido suspeito e BI-RADS

O contrato do LaudoUSG cobre forma, orientação, margens, ecogenicidade, efeito posterior, calcificações, vascularização, medidas, lado e localização. A Web sinaliza suspeição sem inferir 4A, 4B ou 4C, e a categoria final depende de confirmação médica. Essa decisão é mais segura que publicar automaticamente a classificação do concorrente.

Entretanto, tipo e lateralidade são os principais bloqueios atuais do adaptador. Um nódulo com descritores suspeitos pode chegar ao renderer sem medidas, topografia, BI-RADS ou recomendação. O guard do backend apenas adiciona aviso, vem desligado por padrão no código e não foi verificado em produção. Mesmo ligado, a Sala remove marcadores textuais de revisão antes de exibir o laudo à auxiliar.

**Lacuna confirmada:** falta bloquear a finalização de achado suspeito sem BI-RADS explicitamente confirmado. O alerta atual não acompanha o laudo de forma confiável até a auxiliar.

**Requisito proposto:** descritor suspeito cria uma pendência clínica obrigatória. Enquanto a classificação não for confirmada, o laudo pode ser pré-visualizado, mas não deve ficar com estado “revisado” nem ser liberado para cópia na Sala. O sistema não deve escolher a subcategoria em lugar do médico.

A camada genérica de sanidade também reduz 4A, 4B e 4C ao dígito 4. Isso não altera o renderer mamário, mas impede que essa verificação detecte troca indevida entre subcategorias.

## 4. Recomendações

No concorrente, a categoria automática atualiza o conjunto sugerido de recomendações e existe uma decisão separada para publicar o bloco. No LaudoUSG, o renderer possui condutas ligadas ao BI-RADS, porém a preferência vem desligada por padrão; a Web também oferece recomendação livre.

**Cobertura parcial:** as frases existem, mas a decisão contextual e sua proveniência não percorrem todos os clientes da mesma forma.

**Requisito proposto:** recomendação sugerida, recomendação confirmada e publicação devem ser três estados visíveis. A conduta deve derivar do BI-RADS confirmado, jamais de uma categoria provisória.

## 5. Axilas e linfonodos

O LaudoUSG representa axila normal ou alterada, lado, forma, hilo, espessura cortical, medidas e texto complementar. O estado é agregado: não há lista de múltiplos linfonodos com identidade própria, Doppler individual ou representação axilar no cartograma.

**Lacuna confirmada:** falta modelagem de múltiplos linfonodos axilares e vínculo individual entre morfologia, medidas, Doppler e conclusão.

**Requisito proposto:** cada linfonodo alterado deve ter identificador, lado, nível quando informado, medidas, córtex, hilo e vascularização. A normalidade das demais cadeias deve depender do escopo confirmado.

## 6. Cartograma e topografia

### Web

O esquema mamário representa lado, relógio, quadrante, distância da papila, dimensões e alguns glifos. O tamanho visual usa hoje a primeira medida, não a maior. Cisto complicado, microcistos agrupados e linfonodo intramamário podem cair em glifo genérico. O envio Web à Sala não inclui `reportId`; esse fluxo e registros legados dependem de fallback por categoria. Um desenho de mama pode, portanto, reaparecer junto de outro laudo mamário posterior.

### iOS

O iOS pode extrair achados do texto e permite ajuste manual. O editor grava silenciosamente 2 cm da papila quando o usuário informa lado, relógio e maior eixo, mas não informa distância. Quando não há relógio ou quadrante no texto, o parser cria uma posição aproximada. A deduplicação também pode fundir lesões do mesmo tipo e lado em horas adjacentes porque ignora medida e distância. Achados axilares não entram no mapa.

### Android/RN

O desenho é manual e independente do texto. Ele conserva lado, relógio e distância limitada a 0–6 cm, mas não guarda quadrante nem medidas e não importa o achado estruturado.

**Lacuna confirmada:** os apps móveis ligam o arquivo visual ao laudo por `reportId`, mas texto, lesão e cartograma não compartilham um contrato nem identificador estável por lesão. A Web ainda não leva o `reportId`. Há topografias inventadas ou incompletas nos clientes móveis.

**Correção imediata:** remover o valor fictício de 2 cm e impedir posicionamento aproximado sem confirmação. O sistema deve mostrar “topografia pendente” e solicitar ajuste do médico.

**Requisito estrutural:** criar um contrato mamário compartilhado com `lesionId`, tipo, lado, relógio ou quadrante, distância, medidas, proveniência e estado de confirmação. Texto e desenho devem ser renderizações do mesmo achado. A Web precisa enviar o `reportId`; a Sala deve manter o vínculo móvel já existente e rejeitar fallback por categoria quando o identificador estiver disponível.

## 7. Apps e calculadora BI-RADS

Android e iOS possuem calculadora manual. Nos dois, a ação atualmente retorna o resultado aos achados e inicia nova geração, embora no iOS o botão diga “Inserir no laudo”. Isso cria uma diferença entre rótulo e comportamento.

**Correção proposta:** decidir um único fluxo. Para segurança e coerência com o renderer, a classificação deve ser anexada aos achados como confirmação médica, seguida de nova geração. O rótulo deve dizer “Adicionar aos achados” ou “Confirmar BI-RADS e regerar”, sem prometer edição direta do laudo pronto.

## 8. Sala do Auxiliar

Os aplicativos móveis enviam o esquema com `reportId`; Android envia PNG e iOS pode enviar PNG ou PDF. A API persiste e substitui o arquivo por usuário, laudo e tipo de esquema, e a Sala consulta primeiro pelo `reportId`. Não há `findings` mamários estruturados; essa validação está implementada apenas para miomas.

A Web salva seu texto em `web_reports`, separado de `reports`, e hoje não envia o laudo Web à Sala. Seu cartograma pode ser enviado manualmente, sem `reportId` real.

**Lacuna confirmada:** no fluxo móvel, a Sala sabe a qual laudo o arquivo pertence, mas não consegue validar que cada marcador corresponde à lesão e à classificação descritas. No fluxo Web/legado, o fallback por categoria ainda pode associar o desenho ao exame errado.

**Requisito proposto:** criar vínculo por laudo e lesão, transportar o estado de revisão médica e só mostrar “pronto para copiar” quando as pendências clínicas estiverem fechadas.

## 9. Testes e limites da evidência

Passaram os testes focados existentes: adapter Web 15/15, BI-RADS Web 50/50, BI-RADS compartilhado 8/8, matriz clínica do renderer 6/6, golden do renderer 35/35, guard BI-RADS 17/17, estado dos esquemas RN 3/3, adapter/geometria do cartograma Web, contrato diário/revisão da Sala e sete testes iOS selecionados.

Não foram encontrados testes específicos do parser e editor do cartograma mamário iOS, do uploader mamário ou de um fluxo ponta a ponta app → Sala. O estado da flag `MAMARIA_BIRADS_GUARD` em produção não foi verificado.

## Ordem de implementação proposta

Primeiro, remover a distância fictícia e a topografia aproximada do iOS e alinhar o rótulo da calculadora nos dois apps. Depois, bloquear lesão suspeita sem BI-RADS confirmado e garantir que a Sala conserve essa pendência. Em seguida, criar o contrato compartilhado por lesão, levar `reportId` no fluxo Web e conservar o vínculo móvel já existente. Por último, ampliar linfonodos axilares, Doppler e glifos e liberar em paridade entre Web, iOS e Android.

## Evidências principais no LaudoUSG

- Web: `apps/web/src/lib/deterministic/organs/mamaria.ts`, `apps/web/src/lib/catalog/mamariaParaCatalogo.ts`, `apps/web/src/lib/calculators/mamariaBiradsSugestao.ts`, `apps/web/src/components/laudar/MamariaFormPanel.tsx`, `apps/web/src/components/laudar/MamariaBiradsPanel.tsx`, `apps/web/src/components/visualSchemas/BreastSchema.tsx` e `apps/web/src/lib/visualSchemas/adapters.ts`.
- API: `apps/api/src/server/renderer/categories/MAMARIA.ts`, `apps/api/src/server/pipeline/deterministicSanity/extractor.ts`, `apps/api/src/server/sala/reportContract.ts` e `apps/api/src/app/api/sala/push-schema/route.ts`.
- Android/RN: `apps/mobile/app/generate.tsx`, `apps/mobile/src/shared/calculators/birads.ts`, `apps/mobile/src/features/generate/visualSchemeState.ts` e `apps/mobile/src/features/generate/AnatomicalSchemeView.tsx`.
- iOS: `LaudoUSG/Models/Category.swift`, `LaudoUSG/Features/Generate/GenerateViewModel.swift`, `LaudoUSG/Components/Sheets/BIRADSCalculatorSheet.swift`, `LaudoUSG/Components/BreastSchemaEditor.swift`, `LaudoUSG/Services/BreastFindingsParser.swift` e `LaudoUSG/Services/SalaSchemaUploader.swift` no repositório Swift.
- Sala: `apps/api/src/app/api/sala/push-schema/route.ts`, `apps/api/src/app/sala/[token]/page.tsx` e `apps/api/src/server/sala/reportContract.ts`.
