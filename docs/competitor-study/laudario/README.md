# Estudo Laudário — backlog Web das categorias sem formulário útil (06/10/2026)

Rodada econômica e manual sobre quatro frentes: obstétrico 1º trimestre, gemelar 2º/3º trimestre,
morfológico 1º e 3º trimestre e transfontanelar.

## Método e limite desta rodada

- **Observação do concorrente nesta rodada: não realizada.** A sessão não tinha navegador
  disponível; a regra do estudo proíbe scraping, API privada e qualquer alteração no concorrente.
  Nada foi aberto, clicado ou salvo no Laudário.
- **O que foi usado como observação:** apenas registros autorizados já versionados, com a data da
  observação original — `docs/competitor-research/laudario/cases/obstetrico-1t-2026-10-02.md` e
  `cases/transfontanelar-2026-10-03.md`. Para gemelar e morfológico 1º/3º, os relatórios do lote 3
  declaram "não observado"; aqui também.
- **Repositório:** leitura do código na main `c5e5393` (branch `audit/web-next-gaps`), sem edição.
- **Sem cópia de redação:** controles, estados e efeitos são descritos com palavras próprias.

Rótulos usados nos arquivos: **observado (data)** = registro autorizado anterior; **repo** = fato
no código com caminho; **sugestão** = proposta deste backlog; **não observado** = pergunta para a
próxima rodada manual.

## Arquivos

| Categoria | Arquivo | Situação Web hoje (repo) |
|---|---|---|
| Obstétrico 1º trimestre | [obstetrico-1-trimestre.md](obstetrico-1-trimestre.md) | sem card; `OBSTETRICA` cobre >14 semanas |
| Gemelar 2º/3º trimestre | [obstetrico-gemelar-2-3-trimestre.md](obstetrico-gemelar-2-3-trimestre.md) | sem card; renderer da API já aceita N fetos |
| Morfológico 1º trimestre | [morfologico-1-trimestre.md](morfologico-1-trimestre.md) | seção do `MORFOLOGICO` sem anatomia |
| Morfológico 3º trimestre | [morfologico-3-trimestre.md](morfologico-3-trimestre.md) | herda o formulário do 2º trimestre |
| Transfontanelar | [transfontanelar.md](transfontanelar.md) | MVP local existe; abre normal e imprime lacunas |

## Ordem sugerida

1. Transfontanelar: corrigir o MVP (estado vazio e lacunas impressas) — menor esforço, risco direto.
2. Morfológico 1º/3º: `não avaliado` respeitado e síntese normal condicionada — corrige os dois.
3. Obstétrico 1º trimestre: contrato de datação por CCN e vitalidade antes de qualquer card.
4. Gemelar: variante N fetos do `OBSTETRICA`, depois dos P0 do renderer (G-1 a G-4).

## Roteiro da próxima rodada manual (operador com navegador)

Registrar só controles, estados iniciais e efeitos, com dados sintéticos e sem salvar:
estado inicial de cada bloco; o que muda ao marcar "não avaliado"; se uma alteração remove a
normalidade da mesma estrutura; campos obrigatórios antes de concluir; lado e identificação do
feto; o que permanece no texto após desfazer. As perguntas específicas estão em cada arquivo.
