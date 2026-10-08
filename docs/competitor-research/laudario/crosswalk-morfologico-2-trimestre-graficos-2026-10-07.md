# Cruzamento Laudário × LaudoUSG — gráficos do morfológico 2º trimestre

Data: 07/10/2026. Observação em conta autorizada, pela interface normal, com estado restaurado ao final.

| Capacidade | Laudário observado | LaudoUSG atual | Estado |
| --- | --- | --- | --- |
| PFE por idade gestacional | gráfico separado, publicável | gráfico INTERGROWTH publicável e persistido | presente |
| Histórico do PFE | IG e peso preenchidos manualmente no próprio gráfico | data e peso; IG derivada; origem identificada | presente com menos redundância |
| Trajetória | pontos atual e anterior | pontos ligados e diferenciados | presente |
| DBP, CC, CA e CF | quatro gráficos independentes | prévias numéricas, sem curvas publicáveis | lacuna confirmada na Web |
| Publicação | individual ou todos | PFE opt-in | parcial |
| Configuração visual | tamanho global e aproximação no ponto | layout responsivo e foco nos pontos | abordagens diferentes |
| Acessibilidade dos pontos | não comprovada nesta rodada | descrição acessível e distinção atual/histórico | presente no LaudoUSG |

## Requisito original para o LaudoUSG

Manter um único contrato versionado de crescimento. Cada série deve registrar medida, unidade, curva, versão, IG, valor, origem do ponto e decisão de publicar. A tela pode oferecer escolhas compactas entre PFE, medidas relevantes e todas. A figura deve continuar derivada do estado estruturado; apagar um dado mínimo deve retirar ponto e publicação associados.

O histórico não deve pedir data e IG simultaneamente quando uma pode ser derivada da outra. Valores anteriores precisam indicar se foram informados ou calculados e nunca alterar automaticamente o corpo ou a conclusão.

O caso observado está em [cases/morfologico-2-trimestre-graficos-2026-10-07.md](cases/morfologico-2-trimestre-graficos-2026-10-07.md).
