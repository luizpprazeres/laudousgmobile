# Rascunhos clínicos pendentes — revisão do Luiz

Data: 30/09/2026. Estado: **rascunho; não ativado em nenhuma plataforma**.

Estes textos foram reorganizados a partir dos modelos e regras já extraídos do LaudoUSG original em `_extraction/from-laudousg-original/03-models-by-category/` e `04-rules-by-category/`. A redação segue o padrão da casa: título, comentários técnicos, descrição objetiva e conclusão. Nenhuma classificação ou conduta abaixo deve entrar em produção sem revisão clínica.

## 1. Abdome total com Doppler colorido

Decisão de produto sugerida: tratar como complemento de `ABDOMEN_TOTAL`, evitando uma segunda categoria que duplica todo o exame.

```text
ULTRASSONOGRAFIA DO ABDOME TOTAL COM DOPPLER COLORIDO

COMENTÁRIOS:
Exame realizado com transdutor convexo multifrequencial, abrangendo todo o abdome superior com paciente em jejum. Foram realizados múltiplos cortes do abdome em decúbito dorsal, decúbitos laterais e ortostase.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fígado de margens regulares, dimensões e ecotextura normais. Vasos intra-hepáticos bem visíveis e de calibre anatômico. Ausência de sinais evidentes de processo expansivo hepático.
Veia porta de calibre normal e com fluxo hepatopetal. Veias hepáticas de calibre e fluxo normais.
Vesícula biliar de topografia usual e parede fina, sem sinais evidentes de cálculo.
Canal hepático e canal colédoco de calibre normal.
Pâncreas de ecotextura habitual para a faixa etária. Cabeça, corpo e cauda com espessuras normais.
Baço de dimensões normais e ecotextura sólida homogênea.
Rins tópicos, de dimensões normais, contornos regulares e diferenciação corticomedular preservada.
Veia cava inferior e aorta abdominal de calibres e contornos normais.
Bexiga de contornos regulares, parede fina e conteúdo anecoico homogêneo.

DOPPLER DO SISTEMA ESPLÂNCNICO:
Tronco da veia porta com calibre de ____ cm, velocidade de ____ cm/s e fluxo hepatopetal.
Veia porta direita com calibre de ____ cm, velocidade de ____ cm/s e fluxo hepatopetal.
Veia porta esquerda com calibre de ____ cm, velocidade de ____ cm/s e fluxo hepatopetal.
Veia esplênica com calibre de ____ cm, velocidade de ____ cm/s e fluxo hepatopetal.
Veia mesentérica superior com calibre de ____ cm, velocidade de ____ cm/s e fluxo hepatopetal.

CONCLUSÃO:
Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.
Estudo Doppler do sistema esplâncnico dentro dos limites da normalidade.
```

Pontos para aprovação: vasos realmente obrigatórios; uso de “calibre” em vez de “espessura”; manutenção da frase de documentação fotográfica; inclusão opcional da artéria hepática comum; limiares e texto de hipertensão/trombose portal.

## 2. Doppler venoso do membro superior

O modelo deve gerar um laudo por lado. Exame bilateral produz dois documentos separados.

```text
DOPPLER VENOSO DO MEMBRO SUPERIOR DIREITO / ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência, com análise espectral, mapeamento com Doppler colorido e manobras de compressão seriada.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Sistema venoso profundo:
Veia subclávia pérvia, com fluxo espontâneo e fásico com a respiração.
Veia axilar pérvia, compressível ao transdutor, com fluxo espontâneo e fásico com a respiração.
Veias braquiais pérvias e compressíveis ao transdutor, com fluxo espontâneo.
Veias radiais e ulnares pérvias e compressíveis ao transdutor.

Sistema venoso superficial:
Veia cefálica de calibre normal, pérvia e compressível.
Veia basílica de calibre normal, pérvia e compressível.

CONCLUSÃO:
Não foram observados sinais de trombose venosa profunda no membro superior direito / esquerdo nos segmentos avaliados.
Sistema venoso superficial do membro superior direito / esquerdo sem alterações.
```

Pontos para aprovação: modelo eletivo versus pesquisa urgente de trombose; conclusão “pérvio e competente” para membro superior; descrição de jugular interna quando indicada; trombose relacionada a cateter; terminologia de fase aguda/subaguda/crônica somente quando sustentada pelos achados ditados.

## 3. Doppler arterial do membro superior

O modelo deve gerar um laudo por lado. Exame bilateral produz dois documentos separados.

```text
DOPPLER ARTERIAL DO MEMBRO SUPERIOR DIREITO / ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência, com análise espectral e mapeamento com Doppler colorido.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Artéria subclávia pérvia, de trajeto e calibre preservados.
Artéria axilar pérvia, de trajeto e calibre preservados.
Artéria braquial pérvia, de trajeto e calibre preservados.
Artéria radial pérvia, de trajeto e calibre preservados.
Artéria ulnar pérvia, de trajeto e calibre preservados.
Ausência de placas ateromatosas ou espessamentos parietais nos segmentos avaliados.
Não há sinais de estenose hemodinamicamente significativa.
A análise espectral evidencia padrão trifásico nos vasos estudados.

CONCLUSÃO:
Doppler arterial do membro superior direito / esquerdo dentro dos limites da normalidade.
```

Pontos para aprovação: necessidade de registrar velocidades de pico sistólico em todos os vasos; critérios para graduar estenose; uso de porcentagem apenas quando ditada; protocolo para síndrome do desfiladeiro torácico; redação do padrão distal em estenose ou oclusão.

## 4. Ultrassonografia de tórax

```text
ULTRASSONOGRAFIA DE TÓRAX

COMENTÁRIOS:
Exame realizado com transdutores convexo e linear, com avaliação bilateral das regiões anterior, lateral e posterior do tórax.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Hemitórax direito:
Linha pleural fina e regular, com deslizamento pleural presente.
Artefatos horizontais de reverberação (linhas A) presentes.
Não se identifica derrame pleural.

Hemitórax esquerdo:
Linha pleural fina e regular, com deslizamento pleural presente.
Artefatos horizontais de reverberação (linhas A) presentes.
Não se identifica derrame pleural.

CONCLUSÃO:
Ultrassonografia de tórax sem alterações ecográficas significativas bilateralmente.
```

Pontos para aprovação: fórmula de estimativa do derrame pleural e população em que será usada; limites pequeno/moderado/volumoso; significado de três ou mais linhas B por espaço intercostal; conclusão de consolidação, atelectasia e pneumotórax; quando sugerir correlação ou investigação adicional.

## 5. Ultrassonografia dos quadris do lactente

```text
ULTRASSONOGRAFIA DOS QUADRIS DO LACTENTE

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência, com a criança em decúbito lateral, utilizando cortes coronais padronizados segundo a técnica de Graf.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Quadril direito:
Teto acetabular ósseo bem formado, com ângulo alfa de ____°.
Teto cartilaginoso de morfologia preservada, com ângulo beta de ____°.
Cabeça femoral centrada, com cobertura adequada pelo teto ósseo.

Quadril esquerdo:
Teto acetabular ósseo bem formado, com ângulo alfa de ____°.
Teto cartilaginoso de morfologia preservada, com ângulo beta de ____°.
Cabeça femoral centrada, com cobertura adequada pelo teto ósseo.

CONCLUSÃO:
Quadris ecograficamente normais bilateralmente, classificados como tipo I de Graf.
```

Pontos para aprovação: nome da categoria; idade mínima/máxima; critérios completos de Graf e distinção IIa/IIb; uso da cobertura femoral; quando emitir recomendação de controle ou encaminhamento; comportamento quando ângulos, idade ou corte padrão não forem informados. A classificação não será calculada pelo texto livre sem schema e validação determinística.

## Cervicometria

Não é modelo clínico pendente. O banco ainda não possui `knowledge_blocks` para `CERVICOMETRIA`, mas o repositório já tem schema, extração, renderer programático, modelo normal do catálogo e gates próprios. A lacuna atual é de exposição consistente nos clientes e de representação no catálogo antigo, não de redação do laudo.
