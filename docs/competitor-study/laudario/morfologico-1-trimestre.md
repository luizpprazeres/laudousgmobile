# Morfológico 1º trimestre

## Concorrente

**Não observado** como card próprio (catálogo: "Morfológico 1º Trimestre" e variante gemelar).
Os marcadores do 1º trimestre foram observados dentro do obstétrico 1º trimestre em 02/10/2026
(ver `obstetrico-1-trimestre.md`): descrição, cálculo e publicação dos números são estados distintos.

## LaudoUSG (repo)

- Seção do card `MORFOLOGICO` com controle "Trimestre" (`apps/web/src/lib/deterministic/organs/morfologico.ts`,
  `primeiroTrimestreModule`); adaptador em `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`.
- Sem nenhuma estrutura anatômica no formulário; a conclusão pode afirmar morfologia normal.
- Defeitos P0 provados (`competitor-research/laudario/audits/lote3/morfologico-1-trimestre-2026-10-05.md`):
  osso nasal e ducto venoso pré-marcados e "não avaliado" impresso como normal; TN aumentada sem item
  de conclusão e sem retirar a síntese normal; limitação técnica sem item e com marcadores afirmados.

## Backlog (sugestão)

**Modelo basal necessário:** anatomia precoce por estrutura (crânio/calota, foice e plexos, face,
coluna, parede abdominal, estômago, bexiga, membros, coração com quatro câmaras quando visível) +
marcadores — normal só por escolha explícita, estrutura a estrutura.

**Alterações essenciais (v1):**
1. TN aumentada com valor (corte como candidato, a aprovar) → item próprio e retirada da síntese.
2. Osso nasal ausente/hipoplásico; regurgitação tricúspide; ducto venoso alterado (IP numérico opcional).
3. Defeito de parede abdominal, acrania/anencefalia e megabexiga como achados tipados.
4. Avaliação limitada por estrutura (com motivo).
5. CCN fora da janela do rastreio → aviso e bloqueio do cálculo.

**Campos obrigatórios:** CCN (mm); BCF (valor); TN (mm) ou "não medida"; estado de cada estrutura
(normal / alterada / não avaliada / limitada). **Opcionais:** osso nasal, tricúspide, ducto venoso,
uterinas com IP, risco de trissomias e pré-eclâmpsia com inclusão explícita.

**Riscos fail-closed:**
- "Não avaliado" nunca vira presença ou normalidade; nenhum marcador pré-marcado.
- Síntese "morfologia normal" só com todas as estruturas obrigatórias avaliadas e normais.
- Uterinas no 1º trimestre sem frases de incisura ou centralização (que são do 2º/3º trimestre).
- IPs não duplicados entre o bloco do 1º trimestre e o bloco de Doppler.

## Perguntas para a rodada manual (não observado)

Quais estruturas o concorrente lista no 1º trimestre; se há "não avaliado" por estrutura; como a TN
elevada muda a conclusão; se a limitação reduz o escopo da normalidade.
