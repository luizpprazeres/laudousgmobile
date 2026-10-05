# Morfológico 3º trimestre

## Concorrente

**Não observado.** Só existe no catálogo ("Morfológico 3º Trimestre"; o grupo gemelar não lista o 3º trimestre).

## LaudoUSG (repo)

- Variante do card `MORFOLOGICO` (controle "Trimestre = 3º"), com as mesmas seções do 2º trimestre
  (`apps/web/src/lib/deterministic/organs/morfologico.ts`); renderer `render2t3t` na API com três
  diferenças de texto (título, sem distância binocular, sem frase do orifício interno).
- Doppler e crescimento já compostos por referência (`dopplerParaCatalogo.ts`, `fetalGrowthParaCatalogo.ts`).
- Defeitos P0 herdados do 2º trimestre (`competitor-research/laudario/audits/lote3/morfologico-3-trimestre-2026-10-05.md`):
  normalidade sem dado (cordão com três vasos, sistemas normais); achado em texto livre sem item na
  conclusão; limitação técnica sem item e com estruturas afirmadas.

## Backlog (sugestão)

**Modelo basal necessário:** o mesmo contrato do 2º trimestre corrigido (anatomia por estrutura,
estado explícito), com a seleção de trimestre definindo título e frases próprias.

**Alterações essenciais (v1, achados de aparecimento tardio):**
1. Ventriculomegalia com átrio (mm) por lado.
2. Dilatação do trato urinário com diâmetro AP da pelve por lado.
3. Microcefalia/macrocrania com CC e percentil (sem rotular só pelo número).
4. Cistos abdominais e derrames (pleural, pericárdico, ascite) tipados.
5. Encurtamento de ossos longos por osso e lado.

**Campos obrigatórios:** estado de cada estrutura (normal / alterada / não avaliada / limitada);
biometria; líquido; lado e medida em todo achado lateralizado. **Opcionais:** Doppler (addon),
crescimento com percentil e curva, placenta (grau só quando informado).

**Riscos fail-closed:**
- Corrigir no contrato comum do morfológico corrige 2º e 3º trimestres; não duplicar motor.
- Achado só em texto livre bloqueia ou exige item de conclusão confirmado.
- Limitação por estrutura apaga a frase normal daquela estrutura e entra na conclusão.
- Incisura e centralização só com campo preenchido; nada afirmado por padrão.
- Frases de maturidade sem dado (divergência do writer) ficam fora até decisão do Luiz.

## Perguntas para a rodada manual (não observado)

Se o 3º trimestre do concorrente tem achados tardios tipados; se o Doppler entra no mesmo card;
como a limitação por posição/oligoâmnio aparece por estrutura.
