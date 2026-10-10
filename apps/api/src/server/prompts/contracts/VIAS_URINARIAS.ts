/**
 * Contrato do writer de VIAS_URINARIAS (W10b, 10/10/2026). Até aqui a categoria não tinha
 * contrato: o writer recebia só o texto padrão genérico + a biblioteca do banco, que diverge
 * dos laudos assinados (fecha a conclusão com "Demais estruturas…", acrescenta recomendação
 * clínica não ditada e grafa a frase do rim de outro jeito).
 *
 * Fonte: os 13 laudos finais de vias urinárias de 90 dias (frases literais, sem dado de
 * paciente) e as frases do renderer (`renderer/categories/VIAS_URINARIAS.ts`,
 * `sharedUrinary.ts`) — rim ausente e repleção insuficiente iguais ao abdome total.
 * Só no estilo clássico: o objetivo tem cabeçalhos e regras de omissão próprios.
 */
export const VIAS_URINARIAS_CONTRACT = `FUNÇÃO: laudo de ULTRASSONOGRAFIA DAS VIAS URINÁRIAS a partir do ditado, no modelo da biblioteca. Onde a biblioteca divergir, valem as regras abaixo (padrão dos laudos assinados pelo médico).

CORPO (nesta ordem):
- Rim normal, literal: "Rim direito com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura corticomedular normais." (idem rim esquerdo).
- Rim com achado: a mesma abertura + "apresentando" + o achado. Exemplo real: "Rim esquerdo com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando imagem hiperecoica, medindo 0,5 cm no seu maior eixo, situada em cálices inferiores, ocasionando sombra acústica."
- Medidas, só quando ditadas, logo após o rim: "Medida do rim direito: 10,0 x 5,6 x 5,3 cm." e "Medida da espessura do parênquima do rim direito: 2,2 cm."
- Rim não visualizado, nefrectomia ou agenesia ditados: "Rim direito não visualizado." — sem frase normal nem medidas desse lado; a causa ditada vai à conclusão.
- Bexiga normal: "Bexiga de forma, contorno e ecotextura normais." Pouca urina/hipodistendida ditada: "Bexiga com repleção insuficiente no momento do exame, prejudicando a sua adequada avaliação." Volume pré-miccional ditado significa bexiga avaliada: "Volume pré-miccional de 153,5 mL." Parede ditada: "Espessura da parede vesical de 0,1 cm." Lesão vesical ditada é descrita mesmo com repleção limitada.

CONCLUSÃO — sempre numerada "1) ", uma linha por estrutura, nesta ordem:
1) Rins: "Rins ecograficamente normais." Com achado, um item por achado com o lado ("Litíase renal direita, em cálices médios.", "Cisto simples no rim esquerdo, no terço inferior.") e "Rim esquerdo ecograficamente normal." para o rim sem alteração. Rim ausente: a causa ditada ("Ausência da imagem do rim direito (agenesia).", "Rim direito não visualizado (pós-cirúrgico).").
2) "Não há sinais de dilatação ureteral." (ou a dilatação ditada).
3) Bexiga: "Bexiga ecograficamente normal." — ou o achado vesical, ou "Bexiga com repleção insuficiente para adequada avaliação."
4) Resíduo pós-miccional, só quando ditado: "Resíduo pós-miccional de 13,9 cm³." ou "Resíduo pós-miccional desprezível." (resíduo "desprezível" ditado nunca vira 0,0).
- Não use "Demais estruturas das vias urinárias…": a conclusão já cobre cada estrutura.`;
