# Tireoide — Laudário × LaudoUSG

Data da revisão: 02/10/2026. Este cruzamento compara o comportamento observado na interface do Laudário com o código atual da Web, iOS e Android/RN. Não compara redação integral e não transforma automaticamente uma diferença em requisito clínico.

## Síntese

O LaudoUSG já possui cálculo ACR TI-RADS, limiares de PAAF/seguimento, preset de Hashimoto e cartograma nas três plataformas. A principal diferença de produto não é a ausência dessas peças, mas a integração: no Laudário, o nódulo, a classificação e a recomendação pertencem ao mesmo fluxo; no LaudoUSG, partes desse percurso ainda vivem em formulários, calculadoras, texto livre e esquemas independentes.

Há três problemas que merecem correção antes de ampliar o modelo: o TI-RADS do Android/RN pode ser calculado a partir de descritores pré-preenchidos; a Web não oferece a decisão explícita de incluir a recomendação de PAAF/seguimento no laudo; e o adaptador do cartograma Web possui projeções incorretas para calcificação, forma e campos não informados.

## Web

**Estado: parcial, com núcleo clínico forte.** O formulário contém medidas, ecotextura, volume, tireoidites, nódulos, linfonodos, Doppler e os cinco grupos do ACR TI-RADS em `apps/web/src/components/laudar/TireoideFormPanel.tsx:148` e `:338`. O adaptador envia os descritores ao renderer em `apps/web/src/lib/catalog/tireoideParaCatalogo.ts:187`, e o servidor só calcula a classificação quando os grupos essenciais estão completos em `apps/api/src/server/renderer/categories/TIREOIDE.ts:1222`.

O renderer conhece os limiares de PAAF e seguimento em `apps/api/src/server/renderer/categories/TIREOIDE.ts:1259`, mas o fluxo Web não expõe a preferência que os libera no laudo. A calculadora avulsa também não reaproveita o nódulo já preenchido e oferece somente copiar o resultado em `apps/web/src/components/laudar/LaudarWebExperience.tsx:1123` e `apps/web/src/components/laudar/CalcPanel.tsx:91`.

Hashimoto e outras tireoidites existem como seleção diagnóstica em `apps/web/src/lib/deterministic/organs/tireoide.ts:109`. O cartograma acompanha os nódulos, exporta e envia imagem à Sala, mas o adaptador atual projeta localização vazia como terço médio, ecogenicidade ausente como sólido, interpreta incorretamente a opção sem calcificações e não alcança a forma oval em `apps/web/src/lib/visualSchemas/adapters.ts:208`. A Sala recebe somente PNG/PDF; não há contrato estruturado de tireoide em `apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx:65`.

## Android/RN

**Estado: parcial e fragmentado.** A experiência principal usa editor livre e atalhos Normal/Hashimoto em `apps/mobile/app/generate.tsx:1145` e `:1284`. TI-RADS e volume estão em calculadoras separadas e são inseridos como texto no laudo por `apps/mobile/app/generate.tsx:1063`.

As cinco famílias do ACR e os limiares por tamanho existem em `apps/mobile/src/shared/calculators/tirads.ts:11` e `:159`. Contudo, composição, ecogenicidade, forma, margem e focos já começam preenchidos em `apps/mobile/src/features/generate/TIRADSCalculatorSheet.tsx:45`; informar apenas o tamanho permite gerar categoria e recomendação. O fluxo precisa exigir confirmação real dos cinco grupos antes de classificar.

O cartograma v2 permite marcador manual por lobo, terço e tipo em `apps/mobile/src/features/generate/AnatomicalSchemeView.tsx:113`, mas não se vincula a um nódulo ou à calculadora, declara que o desenho não altera o texto e envia à Sala somente PNG. Os assets e a geometria básica têm teste em `apps/mobile/src/features/generate/visualSchemeState.manual.ts:8`.

## iOS

**Estado: parcial, com componentes maduros isolados.** A tela principal trabalha com editor livre e atalhos Normal/Hashimoto em `LaudoUSG/Features/Generate/GenerateView.swift:435` e `GenerateViewModel.swift:37`. A calculadora TI-RADS coleta as cinco características e tamanho, classifica e insere o resultado no texto em `LaudoUSG/Components/Sheets/TIRADSCalculatorSheet.swift:8` e `LaudoUSG/Services/TIRADSCalculator.swift:114`. Os limiares principais possuem testes em `LaudoUSGTests/TIRADSCalculatorTests.swift:21`.

O cartograma tem duas vistas, arraste, importação a partir do texto, exportação e envio raster à Sala. O modelo guarda forma, margens, ecogenicidade e TI-RADS em `LaudoUSG/Models/ThyroidFinding.swift:136`, mas o editor manual não oferece esses campos, e a calculadora não atualiza diretamente o nódulo do esquema. A recomendação permanece como texto, sem estado estruturado ligado ao finding ou ao payload da Sala.

## Requisitos originais candidatos

Antes de gerar novas frases, o próximo passo de produto deve especificar um estado canônico de nódulo tireoidiano compartilhável: identificação, localização, três medidas, composição, ecogenicidade, forma, margens, focos, categoria ACR, conduta sugerida, confirmação médica e vínculo com o marcador do cartograma. A recomendação deve ser calculada, mas só entrar no laudo após decisão explícita do médico.

Na Web, a correção do adaptador do cartograma e a exposição da decisão de incluir recomendação são problemas confirmados. No Android/RN, o cálculo deve falhar fechado até todos os descritores serem confirmados. Em iOS e Android, o vínculo entre calculadora, nódulo e esquema é uma lacuna de integração. Um contrato estruturado do esquema para a Sala continua candidato a requisito transversal.

Esses requisitos descrevem comportamento original do LaudoUSG. A redação clínica será produzida separadamente no estilo Domingos e submetida à revisão médica antes de ativação.
