/**
 * Few-shots do DOPPLER_VENOSO_MMII writer_guarded.
 *
 * ⚠️ PROCEDÊNCIA: 0 laudos ASSINADOS. Ditados (raw) 1-4 são REAIS; as saídas ideais
 * seguem os snippets curados (protocolo TVP-only vs completo). O caso 5 (TVP POSITIVA)
 * é SINTÉTICO — o corpus não tem trombose achada, e é o cenário crítico a ensinar.
 * **ESTILO A VALIDAR com o Dr. Luiz antes de ligar.** A regra de SEGURANÇA (não
 * afirmar competência superficial em exame TVP-only) está nos casos 1 e 2.
 */
export const DOPPLER_VENOSO_MMII_FEWSHOTS: ReadonlyArray<{ raw: string; laudo: string }> = [
  // 1) TVP-only, segmentos listados — conclusão RESTRITA ao profundo (não afirma superficial).
  {
    raw: "Doppler venoso do membro inferior esquerdo, protocolo TVP. Veias femoral comum, femoral, poplítea e tibiais posteriores pérvias e compressíveis, sem trombos. Estudo negativo para trombose venosa profunda.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR ESQUERDO — INVESTIGAÇÃO DE TROMBOSE VENOSA PROFUNDA\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear (5-12 MHz) em decúbito dorsal para avaliação do sistema venoso profundo. Foram aplicadas manobras de compressibilidade ao longo de cada segmento avaliado. NÃO foi realizado mapeamento do sistema venoso superficial (safenas, perfurantes, tributárias) — escopo restrito à investigação de TVP conforme solicitação.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nSistema venoso profundo:\nVeias femoral comum, femoral, poplítea e tibiais posteriores pérvias e compressíveis, sem trombos.\n\nCONCLUSÃO:\nSistema venoso profundo do membro inferior esquerdo pérvio e compressível, sem evidência ecográfica de trombose venosa.",
  },
  // 2) TVP-only genérico.
  {
    raw: "Doppler venoso membro inferior direito para investigar TVP, suspeita de trombose, paciente com edema agudo. Sistema profundo pérvio e compressível, sem trombose.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR DIREITO — INVESTIGAÇÃO DE TROMBOSE VENOSA PROFUNDA\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear (5-12 MHz) em decúbito dorsal para avaliação do sistema venoso profundo. Foram aplicadas manobras de compressibilidade ao longo de cada segmento avaliado. NÃO foi realizado mapeamento do sistema venoso superficial (safenas, perfurantes, tributárias) — escopo restrito à investigação de TVP conforme solicitação.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nSistema venoso profundo:\nVeias profundas pérvias, calibres normais, paredes finas, compressíveis e com fluxo modulado pelos movimentos respiratórios. Observam-se respostas fisiológicas às manobras de compressão e descompressão das massas musculares subjacentes e à manobra de Valsalva.\n\nCONCLUSÃO:\nSistema venoso profundo do membro inferior direito pérvio e compressível, sem evidência ecográfica de trombose venosa.",
  },
  // 3) COMPLETO — mapeamento de varizes com refluxo da safena magna.
  {
    raw: "Doppler venoso do membro inferior esquerdo, mapeamento de varizes. Sistema profundo pérvio. Safena magna com refluxo patológico à manobra de Valsalva. Presença de varicosidades.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR ESQUERDO\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear (5-12 MHz) em decúbito dorsal (sistema profundo) e ortostase ou Trendelenburg (sistema superficial). Manobras de compressibilidade, Valsalva e compressão distal manual aplicadas.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nSistema venoso profundo:\nVeias profundas pérvias, calibres normais, paredes finas, compressíveis e com fluxo modulado pelos movimentos respiratórios.\n\nSistema venoso superficial:\nVeia safena magna com refluxo patológico à manobra de Valsalva. Presença de varicosidades.\n\nCONCLUSÃO:\n1) Sistema venoso profundo do membro inferior esquerdo pérvio e compressível, sem evidência ecográfica de trombose venosa.\n2) Sinais ecográficos de insuficiência venosa superficial (refluxo da veia safena magna), com varicosidades.",
  },
  // 4) COMPLETO normal + pequenas varizes; safena competente.
  {
    raw: "Doppler venoso do membro inferior direito. Sistema venoso profundo pérvio, compressível, com fluxo fásico, sem sinais de trombose venosa profunda. Safena magna competente. Pequenas varizes de ramos superficiais na perna.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR DIREITO\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear (5-12 MHz) em decúbito dorsal (sistema profundo) e ortostase ou Trendelenburg (sistema superficial). Manobras de compressibilidade, Valsalva e compressão distal manual aplicadas.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nSistema venoso profundo:\nVeias profundas pérvias, calibres normais, paredes finas, compressíveis e com fluxo fásico modulado pelos movimentos respiratórios.\n\nSistema venoso superficial:\nVeia safena magna competente, sem refluxo. Pequenas varizes de ramos superficiais na perna.\n\nCONCLUSÃO:\n1) Sistema venoso profundo do membro inferior direito pérvio e compressível, sem evidência ecográfica de trombose venosa.\n2) Veia safena magna competente. Pequenas varizes de ramos tributários superficiais na perna.",
  },
  // 5) TVP POSITIVA (sintético) — trombose achada; ensina o cenário crítico.
  {
    raw: "Doppler venoso do membro inferior direito, investigar TVP. Veia poplítea com material trombótico intraluminal, incompressível, de aspecto agudo. Femoral comum e femoral pérvias e compressíveis.",
    laudo:
      "ULTRASSONOGRAFIA COM DOPPLER COLORIDO VENOSO DE MEMBRO INFERIOR DIREITO — INVESTIGAÇÃO DE TROMBOSE VENOSA PROFUNDA\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear (5-12 MHz) em decúbito dorsal para avaliação do sistema venoso profundo. Foram aplicadas manobras de compressibilidade ao longo de cada segmento avaliado. NÃO foi realizado mapeamento do sistema venoso superficial (safenas, perfurantes, tributárias) — escopo restrito à investigação de TVP conforme solicitação.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nSistema venoso profundo:\nVeias femoral comum e femoral pérvias e compressíveis.\nVeia poplítea com material trombótico intraluminal e incompressibilidade ao toque do transdutor, de aspecto agudo.\n\nCONCLUSÃO:\nTrombose venosa profunda da veia poplítea do membro inferior direito, de aspecto agudo.",
  },
];
