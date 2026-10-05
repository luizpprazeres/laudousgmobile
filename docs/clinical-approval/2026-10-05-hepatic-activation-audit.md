# Auditoria de ativação — elastografia e avaliação multiparamétrica hepática

Data: 05/10/2026

Escopo: `ELASTOGRAFIA_HEPATICA` e `AVALIACAO_MULTIPARAMETRICA_HEPATICA`.

## Resultado

Os formulários, o contrato compartilhado, o renderer determinístico e o endpoint dedicado já existem. As categorias permanecem dormentes por três gates intencionais e independentes:

1. `NEXT_PUBLIC_HEPATIC_MODELS_V1` mantém as categorias fora do seletor Web;
2. `HEPATIC_REPORTS_V1_ENABLED` mantém o endpoint dedicado indisponível;
3. as linhas do banco permanecem com `active = false`.

Mesmo que os três sejam ligados, a geração continua bloqueada com 422 porque `APPROVED_HEPATIC_QUALITY_CRITERIA` está vazio e os clientes não oferecem nenhuma configuração de qualidade. Portanto, ligar apenas os gates publicaria um formulário que não consegue concluir nenhum exame.

## Por que o registro não pode ser preenchido como está

O bloqueio não envolve limiar diagnóstico. O registro atual ainda não consegue representar de forma segura os próprios critérios técnicos:

- IQR/mediana é recebido como métrica livre; não é obrigatoriamente derivado das medidas do exame;
- versão do software e transdutor não participam do casamento do perfil;
- não existe ID estável nem vigência do perfil técnico;
- métricas por aquisição, desigualdade estrita e regras condicionais não são representáveis;
- CAP calculado junto com TE não possui dependência estruturada;
- jejum, repouso e geometria da ROI não são validados pelo perfil;
- média/desvio-padrão, usados por algumas tecnologias, não cabem no modelo centrado em mediana/IQR;
- UGAP aceita somente `dB/cm/MHz`, embora alguns equipamentos também forneçam `dB/m`.

Publicar perfis reais antes desses ajustes criaria aprovação falsa em casos que a fonte oficial não cobre.

## Matriz inicial recomendada

Esta matriz contém apenas qualidade de aquisição. Não classifica fibrose ou esteatose e não deve gerar estágio automaticamente.

| Método | Fonte oficial | Regra técnica candidata | Situação |
|---|---|---|---|
| 2D-SWE | WFUMB 2024, parte 1, tabela 1 | 3–5 aquisições; IQR/M até 30% em kPa ou 15% em m/s; CV por aquisição nas faixas descritas pela diretriz | Implementar após métricas derivadas e por aquisição |
| pSWE | WFUMB 2024, parte 1, tabela 1 | 5–10 aquisições; IQR/M até 30% em kPa ou 15% em m/s | Implementar após métricas derivadas |
| TE | WFUMB 2024 + Echosens | 10 aquisições; a regra Echosens de IQR/M é condicional quando a mediana excede 7,1 kPa | Exige regra condicional; não reduzir a um corte universal sem decisão explícita |
| CAP | Echosens | 10 aquisições; sem limiar oficial atual de dispersão do CAP | Perfil específico de FibroScan; CAP depende de TE válida no mesmo exame |
| ATI / UGAP | WFUMB 2024, parte 2, tabela 5 | coeficiente de atenuação com 3–5 aquisições e IQR/M até 15%, seguindo critério do fabricante quando disponível | Implementar como base comum, com override por equipamento |
| UDFF | Siemens Sequoia VA50 | cinco medidas no mesmo local; sem limiar de dispersão publicado no cartão oficial | Perfil exato por software/transdutor |
| USFF | — | nenhuma regra oficial suficiente encontrada | Manter indisponível |

## Sequência implementável

1. Vincular IQR/M às medidas nativas e recusar qualquer valor enviado divergente.
2. Criar IDs imutáveis e vigência para os perfis técnicos.
3. Incluir fabricante, modelo, versão de software e transdutor no casamento quando a fonte exigir.
4. Estruturar jejum, repouso, posição e ROI que o perfil precisa validar.
5. Representar regras condicionais, desigualdade estrita e métricas por aquisição.
6. Modelar a dependência CAP–TE sem estendê-la a ATI, UGAP ou UDFF.
7. Publicar primeiro 2D-SWE/pSWE, ATI/UGAP e os perfis exatos de TE/CAP e UDFF que tiverem documentação completa.
8. Só então alterar os gates Web/API e criar migração idempotente com `active = true` para as duas categorias.

## Arquivos da ativação final

- `packages/shared/src/hepatic/contracts.ts`: contrato de qualidade e aquisição;
- `apps/api/src/server/hepaticReports/qualityRegistry.ts`: perfis aprovados e validação;
- `apps/web/src/lib/hepaticModels.ts` e `apps/mobile/src/features/generate/hepaticModels.ts`: configurações derivadas do mesmo registro;
- `apps/api/src/server/env.ts`: `HEPATIC_REPORTS_V1_ENABLED` ativo por padrão, com rollback explícito;
- `apps/web/src/lib/hepaticModels.ts`: gate Web ativo por padrão, com rollback explícito;
- `packages/db/src/sql/`: migração idempotente de ativação;
- `packages/db/src/seeds/data.ts`: seed que preserva ativação posterior.

## Fontes primárias reconferidas

- WFUMB 2024, parte 1: https://wfumb.info/wp-content/uploads/2024/05/WFUMB_LiverMultiparametric-Part-1.pdf
- QIBA/RSNA SWS Profile, Stage 3, 15/01/2024: https://qibawiki.rsna.org/index.php/Ultrasound_Measurement_of_Shear_Wave_Speed_for_Estimation_Liver_Fibrosis%2C_Clinically_Feasible_Profile
- EASL 2021: https://easl.eu/wp-content/uploads/2021/06/EASL-Clinical-Practice-Guidelines-on-non-invasive-tests-for-evaluation-of-liver-disease-severity-and-prognosis-%E2%80%93-2021-update.pdf
- Echosens, procedimento FibroScan: https://www.echosens.com/fibroscanprocedure/
- Siemens Sequoia VA50 UDFF: https://academy.siemens-healthineers.com/_/en-us/sequoia-va50-udff/
- GE UGAP: https://www.gehealthcare.com/-/jssmedia/GEHC/US/Files/Products/Ultrasound/whitepaper-ugap-giu-logiq-may-2024-jb29271xx.Last
