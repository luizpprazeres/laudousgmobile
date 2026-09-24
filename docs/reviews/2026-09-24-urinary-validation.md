# Validação da unificação urinária — 24/09/2026

## Resultado

GO técnico no fluxo estruturado: bexiga compartilhada entre Abdome Total, Vias Urinárias, Pelve Feminina transabdominal e Próstata Suprapúbica; rins compartilhados entre Abdome Total e Vias Urinárias. Isto não é validação clínica nem liberação de produção. O baseline validado é o checkout `a3d26f4`, com Node `v22.23.3` e pnpm `10.33.3`. O worktree continha mudanças simultâneas de outras frentes; esta validação não atribui nem revisa essas mudanças.

O fluxo coberto é seleção estruturada na web, adaptação para o contrato canônico e renderer real da API. Após a revisão adversarial final, o teste dedicado terminou com `GO — 25 grupos de regressão urinária passaram`.

## Contrato validado

A bexiga usa uma base compartilhada para repleção, parede, conteúdo, jatos, volume inicial e resíduo. Cálculo, debris com nível, coágulo descritivo com Doppler, sonda, divertículo, ureterocele, lesão focal e dupla micção chegam ao renderer com frases próprias. JUV, ureterocele e jatos unilaterais exigem lateralidade explícita. Pelve transvaginal pura envia `bexiga: null` e não declara normalidade vesical.

Os rins usam os mesmos estados e opções nas categorias compartilhadas, mantendo os IDs `rim_direito` e `rim_esquerdo`. Foram cobertos dimensões, diferenciação corticomedular, posição/rotação, DRC selecionada, dilatação pielocalicial, litíase, cistos simples e múltiplos, cisto complexo, nódulo, angiomiolipoma, ectasia, nefrocalcinose, alteração difusa e medidas opcionais.

Estados antigos de Abdome, Vias e Próstata foram exercitados. Chaves raiz reservadas com prefixo `__` não entram nos adapters urinários. Enums antigos desconhecidos bloqueiam o fluxo; não são convertidos silenciosamente em normalidade.

## Validação numérica

Os parsers exigem correspondência integral do campo. Entradas como `abc5` e `-2` são recusadas. Uma medida multidimensional é tudo ou nada: `1 x 0 x 2` não vira `[1, 2]`. A espessura do parênquima é escalar e rejeita `1 x 2`, sem truncar o segundo valor. Conversões explícitas entre mm e cm preservam precisão suficiente; `0,5 mm` chega ao texto como `0,05 cm`, não `0,1 cm`.

Medidas não obtidas permanecem `null` e o novo fluxo compartilhado não cria placeholders numéricos. O renderer legado direto de Vias ainda mantém seus placeholders históricos quando chamado sem os contratos opcionais compartilhados, para compatibilidade com consumidores antigos.

## Gates executados

| Gate | Resultado |
|---|---:|
| `shared-urinary-organs-ponta-a-ponta.manual.ts` | 25 grupos, PASS |
| Typecheck web | PASS |
| Typecheck API | PASS |
| Vias clássico golden | 44/44 PASS |
| Vias objetivo golden | 36/36 PASS |
| Vias boletins clássico/objetivo | 9 e 8 casos gerados, PASS, sem diff persistente |
| Próstata suprapúbica | 27/27 PASS |
| Pelve clássico | 60/60 PASS |
| Pelve objetivo | 39/39 PASS |
| Pelve ponta a ponta | PASS, zero perda registrada |
| Abdome objetivo | 21/21 PASS |

O teste histórico `abdome-ponta-a-ponta.manual.ts` não completou porque tenta consultar PostgreSQL local em `localhost:5432`, indisponível nesta execução. Nenhum banco remoto foi acessado. O caminho urinário de Abdome foi validado no teste novo com máscara sintética, passando por seleção, adapter, schema e renderer reais.

Build web e gate browser integrado foram informados como aprovados pela coordenação e não foram repetidos nesta frente.

## Revisão adversarial de compatibilidade

A falha foi reproduzida antes da correção: quando um estado continha simultaneamente `dimensao: reduzida` legado e `dimensoes: normal` novo, o valor legado vencia. O mesmo ocorria com `hidronefrose` versus `dilatacao`; achados antigos também podiam reaparecer depois do reset porque eram unidos às listas novas.

O contrato corrigido usa presença de chave para determinar a autoridade. `dimensoes` vence `dimensao`, `dilatacao` vence `hidronefrose`, e cada grupo novo de achados substitui somente seu grupo legado correspondente. Assim, editar litíase não apaga um cisto legado ainda não editado, enquanto esvaziar litíase realmente remove o cálculo antigo. Um estado puramente legado continua aceito.

Não foi necessário helper de migração na UI. O adapter aceita estado legado puro, estado compartilhado e estado misto durante edição. O reset compartilhado pode substituir a seção pelo `initialState()` atual; sombras legadas remanescentes não ressuscitam achados. Enums renais inválidos, inclusive nos estados antigos e itens não textuais dentro de arrays, agora geram pendência bloqueante. Subcampos de opções ocultas são ignorados e não bloqueiam.

## Limites clínicos e técnicos

A implementação descreve o que foi selecionado; não infere cistite, bexiga neurogênica, endometriose, etiologia tumoral ou histologia. Resíduo é documentado sem limiar diagnóstico automático. Medidas são condicionais e não são preenchidas por padrão, em linha com a distinção de escopo registrada em `2026-09-24-ultrasound-sources.md`, incluindo os Protocolos iniciais do CBR de novembro de 2025, pp. 3–6.

Os campos compartilhados são contratos opcionais para preservar clientes e extração legados. O JSON Schema usado pela extração por ditado continua no formato histórico; esta entrega garante o fluxo estruturado da web e a aceitação/renderização dos contratos novos pela API, não amplia a extração por LLM.

Não houve mudança de banco, commit, push ou deploy.
