/**
 * Showcase — catálogo de ditados FICTÍCIOS por categoria/variante.
 *
 * Cada amostra gera um laudo real pelo pipeline de prod (bundle determinístico;
 * ABDOMEN_TOTAL via renderer DET-5) para inspeção visual rápida no /showcase.
 * Dados clínicos inventados — nunca de pacientes reais.
 *
 * Usado por: tests/showcase/generate-samples.ts (bulk) e
 * /api/showcase/regenerate (uma amostra).
 */

export const CLASSICO_COMPLETO = "11111111-1111-4111-8111-111111111111";

export type ShowcaseSample = {
  sampleKey: string;
  categoryCode: string;
  variantLabel: string;
  writingStyleId: string;
  rawInput: string;
};

const s = (
  sampleKey: string,
  categoryCode: string,
  variantLabel: string,
  rawInput: string,
): ShowcaseSample => ({
  sampleKey,
  categoryCode,
  variantLabel,
  writingStyleId: CLASSICO_COMPLETO,
  rawInput,
});

export const SHOWCASE_SAMPLES: ShowcaseSample[] = [
  s(
    "ABDOMEN_TOTAL:padrao",
    "ABDOMEN_TOTAL",
    "padrão (renderer)",
    "Abdome total. Fígado com discreto aumento da ecogenicidade parenquimatosa, esteatose leve. Rim direito com cisto simples, imagem anecoica homogênea de margem regular, medindo 2,3 por 1,9 centímetros, no polo inferior. Demais órgãos sem alterações.",
  ),
  s(
    "ABDOMEN_TOTAL:doppler",
    "ABDOMEN_TOTAL",
    "Doppler esplâncnico (renderer)",
    "Abdome superior com Doppler do sistema esplâncnico. Veia porta de calibre normal com fluxo hepatopetal, velocidades normais. Demais órgãos sem alterações. Inclua a tabela do Doppler esplâncnico.",
  ),
  s(
    "ABDOMEN_SUPERIOR:padrao",
    "ABDOMEN_SUPERIOR",
    "padrão",
    "Abdome superior. Vesícula biliar com múltiplas imagens hiperecoicas móveis, a menor medindo 0,7 centímetros, com sombras acústicas. Demais órgãos sem alterações.",
  ),
  s(
    "VIAS_URINARIAS:padrao",
    "VIAS_URINARIAS",
    "padrão",
    "Vias urinárias. Rim esquerdo com imagem hiperecoica de 0,8 centímetros em cálice inferior, com sombra acústica, sem dilatação pielocalicinal. Bexiga de paredes finas e conteúdo anecoico. Demais estruturas sem alterações.",
  ),
  s(
    "TIREOIDE:padrao",
    "TIREOIDE",
    "padrão",
    "Tireoide. Lobo direito medindo 4,5 por 1,4 por 1,3 centímetros, volume 4,0 ml, com imagem isoecoica de contornos regulares, mais larga do que alta, sem calcificações, medindo 1,2 por 0,9 por 0,8 centímetros, no terço médio, Nota Domingos 3, TI-RADS 3. Lobo esquerdo medindo 4,4 por 1,3 por 1,2, volume 3,5 ml, sem alterações. Istmo de 0,3 centímetros.",
  ),
  s(
    "TIREOIDE:doppler",
    "TIREOIDE",
    "com Doppler",
    "Tireoide com Doppler. Glândula de dimensões normais, ecotextura homogênea, vascularização preservada ao estudo Doppler. Pico sistólico da artéria tireoidiana inferior direita de 22 cm/s e esquerda de 20 cm/s. Sem nódulos.",
  ),
  s(
    "CERVICAL:padrao",
    "CERVICAL",
    "padrão",
    "Cervical. Linfonodo de aspecto habitual na cadeia jugular direita, medindo 1,1 por 0,4 centímetros, com hilo ecogênico preservado. Glândulas salivares sem alterações.",
  ),
  s(
    "GLANDULAS_SALIVARES:padrao",
    "GLANDULAS_SALIVARES",
    "padrão",
    "Glândulas salivares. Parótidas e submandibulares de dimensões normais e ecotextura homogênea, sem imagens nodulares ou cálculos. Sem linfonodomegalias.",
  ),
  s(
    "MAMARIA:padrao",
    "MAMARIA",
    "padrão",
    "Mamas. Mama esquerda com imagem anecoica de margens regulares, medindo 0,9 por 0,7 centímetros, no quadrante superolateral, união dos quadrantes superiores. Na conclusão, cisto simples de mama esquerda, BI-RADS 2.",
  ),
  s(
    "PELVE_FEMININA:tv",
    "PELVE_FEMININA",
    "transvaginal",
    "Pelve feminina por via transvaginal. Útero em anteversoflexão medindo 7,8 por 4,2 por 4,9 centímetros, com nódulo miometrial hipoecoico intramural de 2,1 centímetros na parede anterior do corpo. Endométrio de 6 milímetros. Ovários de aspecto habitual.",
  ),
  s(
    "PELVE_FEMININA:ta-tv",
    "PELVE_FEMININA",
    "TA + TV",
    "Pelve feminina por via transabdominal e transvaginal. Útero e ovários de dimensões e ecotextura normais. Ausência de líquido livre. Exame dentro dos limites da normalidade.",
  ),
  s(
    "OBSTETRICA:padrao",
    "OBSTETRICA",
    "padrão (feto único)",
    "Obstétrica. DUM 10 de fevereiro de 2026. Feto único, cefálico, dorso à esquerda, batimentos de 148 por minuto, movimentos presentes. Placenta anterior grau 1. Líquido amniótico normal, maior bolsão de 4,5 centímetros. BPD 5,2 HC 19,4 AC 17,8 FL 3,6 centímetros.",
  ),
  s(
    "OBSTETRICA:inicial",
    "OBSTETRICA",
    "gestação inicial",
    "Obstétrica inicial. Saco gestacional tópico, regular, com vesícula vitelínica presente. Embrião único com CCN de 1,8 centímetros e batimentos cardíacos presentes de 162 por minuto. Sem descolamentos.",
  ),
  s(
    "OBSTETRICA:gemelar",
    "OBSTETRICA",
    "GEMELAR dicoriônica",
    "Obstétrica gemelar, gestação gemelar dicoriônica e diamniótica. Dois fetos: feto A à direita, cefálico, dorso à direita, batimentos de 144, peso estimado 2400 gramas, maior bolsão 4,2 centímetros. Feto B à esquerda, pélvico, dorso à esquerda, batimentos de 152, peso estimado 2250 gramas, maior bolsão 4 centímetros. Duas placentas, anterior e posterior, ambas grau 1. Idade gestacional 34 semanas e 2 dias.",
  ),
  s(
    "DOPPLER_OBSTETRICO:padrao",
    "DOPPLER_OBSTETRICO",
    "padrão",
    "Doppler obstétrico. DUM 5 de janeiro de 2026. Feto único cefálico, batimentos de 140 por minuto. Artéria umbilical com IP 0,95. Artéria cerebral média com IP 1,8 e PVS de 38 centímetros por segundo. Artérias uterinas com IP médio de 0,75. Líquido amniótico normal.",
  ),
  s(
    "MORFOLOGICO:1t",
    "MORFOLOGICO",
    "1º trimestre",
    "Morfológico de primeiro trimestre. Feto único com CCN de 6,2 centímetros, translucência nucal de 1,4 milímetros, osso nasal presente, ducto venoso com onda A positiva. Batimentos de 158 por minuto. Placenta anterior. Líquido amniótico normal.",
  ),
  s(
    "MORFOLOGICO:2t",
    "MORFOLOGICO",
    "2º trimestre",
    "Morfológico de segundo trimestre. DUM 20 de dezembro de 2025. Feto único cefálico, batimentos de 145 por minuto. BPD 5,4 HC 20,1 AC 18,3 FL 3,8 centímetros. Crânio, coluna, coração com 4 câmaras, estômago, rins e bexiga de aspecto habitual. Placenta posterior grau 1. Maior bolsão de 5 centímetros. Colo uterino de 3,8 centímetros.",
  ),
  s(
    "MORFOLOGICO:3t",
    "MORFOLOGICO",
    "3º trimestre",
    "Morfológico de terceiro trimestre. Feto único cefálico, dorso à direita, batimentos de 138 por minuto. BPD 8,9 HC 31,2 AC 30,5 FL 6,8 centímetros, peso estimado de 2350 gramas. Placenta fúndica grau 2. Maior bolsão de 4,2 centímetros. Movimentos e tônus presentes.",
  ),
  s(
    "MUSCULOESQUELETICO_V2:padrao",
    "MUSCULOESQUELETICO_V2",
    "padrão",
    "Ultrassom do ombro direito. Tendinopatia do supraespinhal, com imagem hiperecoica de calcificação de 0,4 centímetros, ocasionando sombra acústica, sem sinais de ruptura. Demais tendões do manguito íntegros. Bursa subacromial sem distensão.",
  ),
  s(
    "DOPPLER_VENOSO_MMII:completo",
    "DOPPLER_VENOSO_MMII",
    "completo",
    "Doppler venoso do membro inferior direito. Sistema venoso profundo pérvio, compressível, com fluxo fásico, sem sinais de trombose venosa profunda. Safena magna competente. Pequenas varizes de ramos superficiais na perna.",
  ),
  s(
    "DOPPLER_VENOSO_MMII:tvp-only",
    "DOPPLER_VENOSO_MMII",
    "protocolo TVP",
    "Doppler venoso do membro inferior esquerdo, protocolo TVP. Veias femoral comum, femoral, poplítea e tibiais posteriores pérvias e compressíveis, sem trombos. Estudo negativo para trombose venosa profunda.",
  ),
  s(
    "DOPPLER_VENOSO_MMII_MEDIDAS:padrao",
    "DOPPLER_VENOSO_MMII_MEDIDAS",
    "mapeamento",
    "Mapeamento venoso do membro inferior direito. Safena magna pérvia com diâmetros de 0,42 na coxa proximal, 0,38 na coxa distal, 0,31 no joelho e 0,28 centímetros na perna. Safena parva de 0,25 centímetros. Sistema profundo pérvio e competente.",
  ),
  s(
    "DOPPLER_ARTERIAL_MMII:padrao",
    "DOPPLER_ARTERIAL_MMII",
    "padrão",
    "Doppler arterial do membro inferior esquerdo. Ateromatose difusa, com imagens hiperecoicas aderidas às paredes, sem estenoses hemodinamicamente significativas. Fluxo multifásico em femoral comum, femoral e poplítea, velocidades de pico sistólico preservadas. Tibiais e fibular pérvios. Sem oclusões.",
  ),
  s(
    "DOPPLER_RENAL:padrao",
    "DOPPLER_RENAL",
    "padrão",
    "Doppler renal. Rins de dimensões normais. Artérias renais com velocidade de pico sistólico de 95 centímetros por segundo à direita e 102 à esquerda, relação renal aorta de 1,8. Índices de resistividade intrarrenais de 0,62 bilateralmente. Sem sinais de estenose.",
  ),
  s(
    "ESCROTAL:padrao",
    "ESCROTAL",
    "padrão",
    "Bolsa escrotal. Testículos tópicos de dimensões e ecotextura normais. Varicocele à esquerda com veias do plexo pampiniforme de até 3,2 milímetros, com refluxo à manobra de Valsalva. Sem hidrocele.",
  ),
  s(
    "PARTES_MOLES:padrao",
    "PARTES_MOLES",
    "padrão",
    "Partes moles da região dorsal. Imagem nodular sólida, isoecoica, de margens regulares, no subcutâneo, medindo 2,4 por 1,8 por 0,9 centímetros, compressível, sem vascularização ao Doppler, compatível com lipoma. Planos musculares preservados.",
  ),
  s(
    "PROSTATA_SUPRAPUBICA:padrao",
    "PROSTATA_SUPRAPUBICA",
    "padrão",
    "Próstata transabdominal. Próstata de contornos regulares medindo 5,1 por 4,4 por 3,9 centímetros, calcule o peso. Protrusão prostática intravesical, IPP de 0,8 centímetros. Bexiga de paredes finas. Volume pré-miccional de 280 ml. Resíduo pós-miccional de 35 mililitros.",
  ),
];
