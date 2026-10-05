# Obstétrico gemelar 2º/3º trimestre (com e sem Doppler)

## Concorrente

**Não observado.** Só existe no catálogo (`competitor-research/laudario/catalogo-ultrassonografia-2026-10-02.json`,
grupo `obstetrica_gemelar`: obstétrico 2º/3º gemelar, com Doppler, e combinados com perfil biofísico).

## LaudoUSG (repo)

- Sem card Web; o formulário `OBSTETRICA` é de feto único (`apps/web/src/lib/deterministic/organs/obstetrica.ts:8`).
- O renderer da API já tem `numero_fetos`, `corionicidade`, `fetos[]` e MBV por feto
  (`apps/api/src/server/renderer/categories/OBSTETRICA.ts:24-41`).
- Defeitos P0 já provados no renderer (`competitor-research/laudario/audits/lote3/obstetrico-gemelar-2026-10-05.md`):
  normalidade "para ambos" sem avaliar cada feto (G-1); placentas que não derivam da corionicidade (G-2);
  BCF presente sem valor (G-3); rótulos duplicados ou ausentes sem bloqueio (G-4).
- Decisão do lote 3: variante do contrato `OBSTETRICA`, não formulário novo.

## Backlog (sugestão)

**Modelo basal necessário:** cabeçalho de gestação múltipla (número de fetos, corionicidade e
amnionicidade com origem) + bloco por feto (rótulo, posição, BCF, biometria, PFE, líquido) — normal
só por escolha explícita, aplicada feto a feto.

**Alterações essenciais (v1):**
1. Divergência ponderal entre fetos (calculada, exibida, sem rótulo diagnóstico automático).
2. Feto sem atividade cardíaca, com confirmação e exclusão do peso médio.
3. Líquido alterado por feto (MBV por bolsão).
4. Discordância de apresentação/posição entre fetos.
5. Doppler por feto (umbilical/ACM) no card com Doppler.

**Campos obrigatórios:** número de fetos; corionicidade e amnionicidade (ou "não determinada");
rótulo único por feto; BCF por feto (valor ou estado); biometria mínima por feto; líquido por feto.
**Opcionais:** placenta por feto quando DC; percentil de PFE; colo; Doppler por feto; comparação com exame anterior.

**Riscos fail-closed:**
- Número de blocos diferente do número de fetos bloqueia; rótulo repetido ou vazio bloqueia.
- Placentas derivam da corionicidade ou ficam pendentes; nunca duas placentas por padrão.
- "Ambos normais" só quando cada feto teve o dado avaliado.
- Feto sem vitalidade não entra em médias; na monocoriônica, alerta ao cogêmeo para confirmação.
- Trigemelar não herda texto de gemelar ("ambos", "par").

## Perguntas para a rodada manual (não observado)

Como o concorrente identifica cada feto; se corionicidade muda placentas e textos; se há bloco por
feto para Doppler; o que acontece ao remover um feto; se existe "não determinada" para corionicidade.
