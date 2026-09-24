# MSK — descritores tendíneos e lados independentes — validação

Data: 2026-09-24
Escopo: musculoesquelético (web). Sem commit, push, deploy nem acesso a banco.

## O que mudou

| Arquivo | Mudança |
|---|---|
| `apps/web/src/lib/deterministic/organs/musculoesqueletico.ts` | estado independente por lado; controle `lado` ganha **Ambos**; descritores tendíneos compartilhados; `interpretarEstrutura`, `migrateLegacyMskState`, `lerMedidaMsk`, `idSecaoMsk`, `ladosDoExame` |
| `apps/web/src/lib/catalog/musculoesqueleticoParaCatalogo.ts` | monta `laudos[]` com um bloco por lado; lê o legado só como rede de segurança; reexporta `migrateLegacyMskState` |
| `apps/api/src/server/renderer/catalog/__tests__/msk-descritores-lados.manual.ts` | **novo**, 25 casos com o renderer real |

Nenhuma alteração na API, nos tipos compartilhados, na UI genérica nem no `LaudarWebExperience` (a chamada de `migrateLegacyMskState` no `onOpts` foi integrada pelo coordenador, `LaudarWebExperience.tsx:441`, antes de gravar o novo `__opts`).

## Comportamento

### Lados independentes
- Cada lado tem chaves próprias: `${segmento}__d__${estrutura}` e `${segmento}__e__${estrutura}`.
- `lado = 'ambos'` gera dois blocos no contrato `laudos[]` já existente, direito primeiro. Lado fora do exame não gera bloco.
- Trocar o lado troca de estado; nunca move a patologia. Voltar restaura o que estava marcado. Remover o lado oposto tira o bloco inteiro.
- Valor de `lado` desconhecido cai em direito (nunca em ambos).

### Descritores tendíneos (20 estruturas)
- Padrão (`presentation: 'select'`): Normal · Tendinopatia · Rotura parcial · Rotura completa · Outra alteração (texto livre).
- Descritores: localização insercional, focos anecoicos, calcificações e medidas (cm ou mm, até 3 dimensões).
- **Padrão sozinho + achado canônico** → slug + descrição nula: corpo e conclusão saem da biblioteca do renderer (fonte única).
- **Com descritor** (ou sem canônico) → descrição composta: sujeito + morfologia do padrão + só o que foi selecionado. Sem canônico e sem descritor, a morfologia do padrão sai mesmo assim (nunca a frase neutra). O diagnóstico só aparece na conclusão. Texto livre digitado é preservado, e os descritores entram numa segunda frase.
- Nenhuma seleção é descartada: vira texto ou vira pendência bloqueante (medida ilegível, opção ou padrão desconhecido).
- Estruturas não tendíneas (bursas, derrame, partes moles, "geral") ficam como antes: Normal/Alterado + texto livre.

### Estado legado
- Legado = chave `${segmento}__${estrutura}` + `__opts.lado`.
- `migrateLegacyMskState(estado)`, chamada antes de trocar `lado`/`segmento`, leva o achado para a chave do lado anterior e remove a chave antiga.
- O adaptador só lê o legado se a chave nova do lado estiver **ausente**. Chave presente, mesmo normal (Reset), vale e não é ressuscitada.
- Legado com `lado = 'ambos'` vira pendência bloqueante. Nunca descarte silencioso.

## Evidências

Executado em 2026-09-24, após a integração no `onOpts`:

| Gate | Resultado |
|---|---|
| `msk-descritores-lados.manual.ts` (novo) | 25 casos aprovados, estilos Clássico e Objetivo |
| `sprint16c-ponta-a-ponta.manual.ts` (legado MSK e Partes moles) | aprovado |
| `musculoesqueletico-golden.manual.ts` | 53 passaram, 0 falharam |
| `msk-passthrough.manual.ts` | 13 passaram, 0 falharam |
| `tsc --noEmit` apps/web | sem erros |
| `tsc --noEmit` apps/api | sem erros |

O teste novo usa o mesmo caminho da rota (`renderizarSelecao`, com `dados` do adaptador). Toda asserção lê o laudo renderizado. Cobertura:

- seleção → adapter → renderer: padrão canônico, descritores em ordem estável, rotura parcial, estrutura sem canônico, texto livre preservado, "Outra alteração" literal;
- falha fechada: medida `12abc`, quatro dimensões, `0 x 0`, opção e padrão desconhecidos, estrutura sem perfil;
- bilateral assimétrico (extensores à direita, flexores à esquerda), lado oposto sem marcação = bloco normal completo;
- troca de lado sem vazamento e volta; remoção e re-adição do lado oposto; troca de segmento e volta;
- legado: unilateral, chave nova presente vence, Reset não ressuscita, `ambos` acusa pendência, direito → ambos → esquerdo → direito com migração, migração do lado esquerdo, segmento anterior, `ambos` anterior, conflito e idempotência;
- contrato: todos os 13 slugs dos perfis existem em `ACHADOS_CANONICOS` e chegam ao laudo (não caem na frase neutra);
- 20 estruturas × 3 padrões × 2 lados: descritores completos no bloco do lado certo, diagnóstico e lateralidade corretos;
- seções: ids únicos por lado, rótulos `· D`/`· E`, contrato de UI preservado (chaves do texto livre legado, defaults dos mini-seletores);
- estado inicial normal em todos os segmentos e lados.

**Verificação por mutação** (feita uma vez, arquivos restaurados): (A) fallback do legado quando a chave nova é "normal" e (B) id de seção sem o lado. Ambas fizeram o teste falhar.

## Correções pós-revisão

1. **"Transfixante" removido do padrão genérico.** É terminologia do manguito rotador, não sinônimo de rotura completa em todo tendão. O texto do padrão ficou "com solução de continuidade completa das fibras". O teste da matriz agora falha se o termo reaparecer em qualquer estrutura.
2. **Padrão sem slug e sem descritor perdia a morfologia.** Ex.: rotura completa do Aquiles → `descricao_livre = null` → o renderer imprimia a frase neutra no corpo enquanto a conclusão já dizia "Rotura completa…". Reproduzido com o renderer real antes da correção (o teste falhou em `descricao_livre`) e corrigido: `interpretarEstrutura` gera `sujeito + padrao.corpo` sempre que não há canônico puro nem texto livre. Testes novos: o caso do Aquiles e a matriz 20 estruturas × 3 padrões sem descritor (corpo com morfologia canônica ou do padrão, nunca a frase neutra).

## Limites conhecidos

1. **Redação dos descritores é proposta.** As frases de descritor (`organs/musculoesqueletico.ts`, bloco "Descritores tendíneos compartilhados") precisam de revisão clínica antes de valer em produção. Fontes consultadas: Lins, *Ultrassonografia Musculoesquelética* (2020), capítulos de cotovelo e ombro; inventário das referências de interface. As frases não foram copiadas.
2. **Canônico + descritor não combinam no contrato atual.** O renderer usa `descricao_livre` OU a morfologia canônica. Com descritor, a morfologia canônica é substituída pela composta. Combinar exigiria um campo de descritores no schema da API (coordenação).
3. **Painel genérico.** Os descritores nas subopções aparecem como botões (o painel só aplica `presentation: 'select'` ao campo de nível superior). Decisão de UI genérica, fora deste ownership.
4. **Legado em `ambos` sem migração é bloqueante**, por desenho. Só ocorre se alguém trocar para Ambos sem passar por `migrateLegacyMskState` (o `onOpts` integrado passa).
5. **Fora do escopo desta entrega:** graduação percentual e tipo da rotura, retração do coto, bursas, derrame, nervos, multiarticular com segmentos diferentes.
6. **Browser integrado pelo coordenador:** seleção em Ambos, estados independentes, reset unilateral e remoção/retorno do lado passaram em `workspaceTabs.browser.manual.ts`. O harness de layout não prova saída clínica; os testes acima usam o renderer real.
7. Nada disto é validação clínica: o teste prova que cada seleção chega ao laudo, no lado certo, sem vazar.

## Como reproduzir

```bash
cd apps/api
pnpm exec tsx --env-file=../../.env src/server/renderer/catalog/__tests__/msk-descritores-lados.manual.ts
pnpm exec tsx --env-file=../../.env src/server/renderer/catalog/__tests__/sprint16c-ponta-a-ponta.manual.ts
pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/musculoesqueletico-golden.manual.ts
pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/msk-passthrough.manual.ts
pnpm exec tsc --noEmit -p . && (cd ../web && npx tsc --noEmit -p .)
```

## Liberação de ownership

Os três arquivos acima e este documento estão liberados. Não há defeito aberto conhecido no escopo MSK.
