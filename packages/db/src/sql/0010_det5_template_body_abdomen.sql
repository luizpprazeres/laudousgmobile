-- DET-5 — template_body com slots p/ as variantes de ABDOMEN_TOTAL (piloto
-- do renderer), estilo CLASSICO_COMPLETO. template_body vira fonte primária
-- da ESTRUTURA no caminho renderer (previsto desde o DET-3); o conteúdo vem
-- da máscara curada (fonte viva), idêntico ao modelo do bundle.
-- Idempotente (UPDATE).

UPDATE report_template_variants
SET template_body = $tpl$ULTRASSONOGRAFIA DO ABDOME TOTAL

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz, inicialmente do abdome superior com paciente em jejum e posteriormente com a bexiga repleta do abdome inferior. Foram realizados múltiplos cortes, abrangendo todo o abdome, em decúbito dorsal como também em ortostase. A documentação fotográfica foi obtida em 12 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
{{orgao:figado|Fígado de dimensões normais, contornos regulares e ecotextura homogênea.
Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.}}
{{orgao:veia_porta|Veia porta de calibre normal.}}
{{orgao:vesicula|Vesícula biliar de topografia usual e de parede fina, sem cálculo.}}
{{orgao:vias_biliares|Canal hepático e canal colédoco de calibre normal.}}
{{orgao:baco|Baço de dimensões normais e ecotextura sólida e homogênea.}}
{{orgao:pancreas|Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam dimensões normais.}}
{{orgao:rim_direito|Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.}}
{{orgao:rim_esquerdo|Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.}}
{{orgao:veia_cava|Veia cava inferior de calibre e contornos normais.}}
{{orgao:aorta|Aorta abdominal de calibre e contornos normais.}}
{{orgao:bexiga|Bexiga de forma, contorno e ecotextura normais.}}
{{extra_abdominais}}
CONCLUSÃO:
{{conclusao}}$tpl$
WHERE category_code = 'ABDOMEN_TOTAL'
  AND variant_key = 'padrao'
  AND writing_style_id = '11111111-1111-4111-8111-111111111111';

UPDATE report_template_variants
SET template_body = $tpl$COMENTÁRIOS:
Exame realizado com transdutor convexo multifrequencial, abrangendo todo o abdome superior com paciente em jejum. Foram realizados múltiplos cortes, abrangendo todo o abdome, em decúbito dorsal, em decúbitos laterais, como também em ortostase. A documentação fotográfica foi obtida em 16 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
{{orgao:figado|Fígado de margem regular, dimensões e ecotextura normais. Os vasos intra-hepáticos são bem visíveis e de calibre anatômico. Ausência de sinais evidentes de processo expansivo hepático.}}
{{orgao:veia_porta|Veia porta de calibre normal e com fluxo hepatopetal. Veias hepáticas de calibre e fluxo normais.}}
{{orgao:vesicula|Vesícula biliar de topografia usual e de parede fina, sem sinais evidentes de cálculo.}}
{{orgao:vias_biliares|Canal hepático e canal colédoco de calibre normal.}}
{{orgao:pancreas|Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam espessuras normais.}}
{{orgao:baco|Baço de dimensões normais e ecotextura sólida homogênea.}}
{{orgao:rim_direito|Rim direito com diâmetros longitudinais e ântero-posterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.}}
{{orgao:rim_esquerdo|Rim esquerdo com diâmetros longitudinais e ântero-posterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.}}
{{orgao:veia_cava|Veia cava inferior de calibre e contornos normais.}}
{{orgao:aorta|Aorta abdominal de calibre e contornos normais.}}
Alças intestinais de aspecto ecográfico e peristaltismo habituais.
{{orgao:bexiga|Bexiga de contornos regulares, parede fina e ecotextura anecoica homogênea.}}
Ausência de linfonodomegalias detectáveis ao método.
{{extra_abdominais}}
DOPPLER DO SISTEMA ESPLÂNCNICO
| VASO | ESPESSURA (cm) | VELOCIDADE (cm/s) | SENTIDO DO FLUXO |
|---|---:|---:|---|
| Tronco da veia porta |  |  | Hepatopetal |
| Veia porta direita |  |  | Hepatopetal |
| Veia porta esquerda |  |  | Hepatopetal |
| Veia esplênica |  |  | Hepatopetal |
| Veia mesentérica superior |  |  | Hepatopetal |
| Artéria hepática comum (VPS) |  |  |  |

CONCLUSÃO:
{{conclusao}}$tpl$
WHERE category_code = 'ABDOMEN_TOTAL'
  AND variant_key = 'doppler'
  AND writing_style_id = '11111111-1111-4111-8111-111111111111';
