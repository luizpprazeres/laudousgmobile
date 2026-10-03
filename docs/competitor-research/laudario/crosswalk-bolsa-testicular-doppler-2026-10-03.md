# Cruzamento Laudário × LaudoUSG — Bolsa testicular com Doppler

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi buscado no monorepo e no cliente iOS.

## Resultado

O exame não é uma categoria ausente no LaudoUSG. `ESCROTAL` já aparece na Web, no Android/RN, no iOS e no seed do banco. O checkout contém 21 blocos clínicos sobre testículos, epidídimos, líquido escrotal, varicocele, orquiepididimite, microlitíase, nódulos e torção. A ingestão e a ativação desses blocos no banco atual não foram comprovadas. A lacuna está na estrutura: não há contrato clínico nem renderer específico para transportar os fatos do Doppler, aplicar critérios determinísticos e manter paridade entre os clientes.

| Camada | Estado atual |
| --- | --- |
| Web | categoria `ESCROTAL` exposta; geração baseada em ditado e writer genérico |
| Android/RN | categoria exposta; sem formulário escrotal estruturado |
| iOS | categoria exposta; sem contrato próprio de Doppler escrotal |
| API | normalização, glossário e corpus em arquivo existem; renderer, contrato e checker específicos ausentes |
| Banco | código `ESCROTAL` presente |
| Sanidade determinística | extrai volumes testiculares, calibre de varicocele e menções; não valida torção, refluxo, lateralidade nem coerência entre sinais |
| Sala | recebe o texto final; não há bloco estruturado de urgência ou revisão dos critérios |

O seed comum não popula o conteúdo clínico. A API carrega apenas blocos previamente ingeridos e validados; portanto, a presença dos arquivos não prova seu uso em produção. Há também uma tensão que hoje fica a cargo do modelo generativo: a regra global proíbe conduta e recomendação, enquanto blocos escrotais instruem encaminhamento urgente e correlação clínica. O contrato novo precisa resolver explicitamente o que pertence ao laudo, ao alerta de interface e à recomendação opt-in.

## Regra de segurança prioritária

Ausência ou redução de fluxo é um achado de alto risco, mas o contrato não deve transformar automaticamente um único controle em diagnóstico fechado. O estado mínimo precisa separar fluxo colorido e espectral, comparação contralateral, qualidade técnica, sintomas informados, morfologia, posição, volume, ecotextura, cordão espermático, sinal do redemoinho, hidrocele reacional e espessamento da parede.

A conclusão de forte suspeita de torção só pode ser publicada após confirmação médica explícita. A ausência isolada de fluxo deve gerar alerta bloqueante para revisão, não uma inferência silenciosa. Uma limitação técnica também deve impedir normalidade presumida.

## Varicocele

O corpus atual do LaudoUSG contém valores e uma versão resumida da classificação de Sarteschi, porém esses dados não são governados por um contrato executável. O modelo compartilhado deve guardar cada lado separadamente, calibre em repouso, calibre à Valsalva, presença e duração do refluxo, extensão/topografia, posição do exame e eventual diferença volumétrica testicular.

Calibre e refluxo não são intercambiáveis. A classificação deve ser derivada somente quando os dados exigidos pela regra versionada estiverem completos, e o médico precisa confirmar o resultado. Varicocele isolada à direita pode sugerir revisão ou correlação, mas a recomendação deve permanecer opt-in.

## Contrato dormente proposto

O código canônico continua sendo `ESCROTAL`; não há motivo para criar `BOLSA_TESTICULAR_DOPPLER`. O contrato deve permitir modo B e Doppler no mesmo exame, com objetos bilaterais para testículo, epidídimo e plexo pampiniforme. Deve incluir técnica e limitações, medidas e volume, ecotextura, vascularização, Doppler espectral, sinais de torção, lesões focais, líquido escrotal, pele/parede, varicocele, conclusão confirmada e recomendações opt-in.

A primeira versão segura deve cobrir exame normal, ausência de fluxo isolada, torção com critérios combinados, limitação técnica unilateral, orquiepididimite, varicocele unilateral e bilateral e lesão focal. A ativação exige goldens sintéticos, auditoria fail-closed da lateralidade e paridade Web/iOS/Android/Sala.

O caso funcional está em [cases/bolsa-testicular-doppler-2026-10-03.md](cases/bolsa-testicular-doppler-2026-10-03.md).
