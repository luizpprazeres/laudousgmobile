# Laudário — Morfológico 2º trimestre — gráficos

```yaml
competitor: Laudário
observed_at: 2026-10-07T21:15:00-03:00
exam: Morfológico 2º Trimestre
surface: Gráficos
baseline:
  controls: inclusão global desligada; inclusão individual desligada; tamanho 120%; aproximação no ponto ligada; barra de percentil desligada
  report_structure: o laudo permanece textual enquanto nenhum gráfico é publicado
scenarios:
  - id: historico-pfe
    input: abrir um exame anterior sintético apenas no gráfico de PFE, sem preencher valores
    cascades: surgem campos separados de IG em semanas, dias e peso em gramas; o controle é próprio do gráfico
    output: nenhuma mudança no laudo porque a publicação continuou desligada
    reset_verified: true
evidence:
  observed: cinco gráficos independentes para DBP, CC, CA, CF e PFE; inclusão individual e conjunta; tamanho global; aproximação no ponto; barra de percentil na tabela; histórico repetido por gráfico
  inferred: o controle de tamanho altera somente apresentação, ainda sem teste de fronteira nesta rodada
crosswalk:
  laudousg_paths_checked: apps/web/src/components/laudar/IntergrowthPreview.tsx; apps/web/src/components/laudar/BiometryGrowthPanel.tsx; apps/web/src/lib/calculators/growthChartPersistence.ts
  status: partial
  notes: o LaudoUSG já tem PFE longitudinal publicável, com data e peso anteriores e IG derivada; faltam curvas individuais de DBP, CC, CA e CF
next_probe: validar curvas biométricas próprias e a seleção compacta entre PFE, medidas relevantes e todas
```

## Observações

O painel reúne DBP, CC, CA e CF por idade gestacional com referência Hadlock 1984 e PFE com referência Hadlock 1991. Cada figura pode ser incluída separadamente, e existe uma ação para incluir todas. O tamanho é ajustado em um controle global e a aproximação no ponto atual começa ligada.

Ao adicionar um exame anterior no PFE, a interface abriu três entradas: semanas, dias e peso em gramas. Não apareceu campo de data. O mesmo par de botões existe em cada gráfico, o que indica históricos separados por parâmetro. O teste foi revertido sem preencher, publicar, imprimir ou finalizar.

O LaudoUSG já segue uma solução mais compacta para PFE: data e peso anterior são informados uma vez, a IG anterior é derivada da datação atual, o ponto tem origem explícita e a publicação continua opcional. A oportunidade restante é ampliar a mesma arquitetura versionada para medidas biométricas individuais após validar curvas e referências próprias.
