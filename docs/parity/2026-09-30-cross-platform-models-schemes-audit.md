# Matriz de paridade clínica — Web, iOS e Android

Data da conferência: 30/09/2026.

Esta matriz cruza o seed do repositório, os caminhos reais de geração, os seletores dos três clientes e uma leitura somente de metadados do Supabase de produção. Nenhum laudo, ditado ou dado de paciente foi lido. “Blocos” abaixo significa `knowledge_blocks` validados; a contagem não prova qualidade clínica, mas distingue uma categoria curada de um código vazio.

## Resultado executivo

O banco tem 36 categorias, sendo 34 ativas. Depois desta rodada, iOS e Android oferecem as mesmas 29 categorias clinicamente liberadas. As cinco ativas mantidas fora dos apps são justamente as que ainda não têm conteúdo clínico validado: `ABDOMEN_TOTAL_DOPPLER`, `DOPPLER_ARTERIAL_MMSS`, `DOPPLER_VENOSO_MMSS`, `QUADRIL_INFANTIL` e `TORAX`. Os rascunhos para revisão estão em `docs/parity/drafts/2026-09-30-modelos-pendentes-domingos.md`; eles não foram ativados.

`CERVICOMETRIA` é a exceção aparente à regra dos blocos: não possui bloco RAG próprio no banco, mas já tem schema, extrator, renderer programático, modelo normal e testes no código. `LIVRE` também não deve receber modelo por categoria: seu comportamento é deliberadamente genérico. `TESTE` e `MUSCULOESQUELETICO_RARAS` estão inativas e não devem aparecer para um exame novo.

Depois desta implementação, a Web também oferece as 29 categorias liberadas, distinguindo 15 formulários estruturados e 14 caminhos por texto que usam o writer/RAG real. Os caminhos por texto não simulam formulários: enviam o relato do médico como `raw_input` com `category_hint` e consomem o SSE do mesmo `/api/generate`. Persistência e retomada no mesmo `reportId` estão detalhadas em [web-writer-categories.md](2026-09-30-web-writer-categories.md).

## Matriz completa

Legenda: **sim** = disponível para iniciar exame; **não** = não aparece; **estruturado** = compositor determinístico Web; **texto** = writer/RAG Web; **writer** = backend usa writer/RAG; **pendente** = exige aprovação clínica antes de ativar.

| Categoria | Banco | Caminho clínico atual | iOS | Android | Web | Situação |
|---|---:|---|:---:|:---:|:---:|---|
| ABDOMEN_TOTAL | 44 blocos | renderer + máscara clássica | sim | sim | estruturado | liberado |
| ABDOMEN_SUPERIOR | 84 | renderer programático | sim | sim | estruturado | liberado |
| ABDOMEN_TOTAL_DOPPLER | 0 | sem contrato próprio | não | não | não | **rascunho pendente**; sugerido como complemento do abdome total |
| PAREDE_ABDOMINAL | 56 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| VIAS_URINARIAS | 30 | renderer programático | sim | sim | estruturado | liberado |
| PROSTATA_SUPRAPUBICA | 24 | renderer programático | sim | sim | estruturado | liberado |
| PROSTATA_TRANSRETAL | 48 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| ESCROTAL | 96 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| REGIAO_INGUINAL | 52 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| TIREOIDE | 24 | renderer programático | sim | sim | estruturado | liberado; esquema alinhado nesta rodada |
| PARATIREOIDE | 40 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| GLANDULAS_SALIVARES | 28 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| CERVICAL | 12 | renderer programático | sim | sim | estruturado | liberado |
| MAMARIA | 24 | renderer programático | sim | sim | estruturado | liberado; esquema visual disponível |
| PARTES_MOLES | 16 | renderer programático | sim | sim | estruturado | liberado |
| PELVE_FEMININA | 34 | renderer programático | sim | sim | estruturado | liberado; iOS tem esquema de miomas |
| OBSTETRICA | 41 | renderer programático | sim | sim | estruturado | liberado |
| DOPPLER_OBSTETRICO | 68 | renderer programático | sim | sim | estruturado | liberado |
| MORFOLOGICO | 54 | renderer programático | sim | sim | estruturado | liberado |
| CERVICOMETRIA | 0 | renderer programático | sim | sim | estruturado | liberado; não depende de RAG |
| MUSCULOESQUELETICO_V2 | 20 | renderer programático | sim | sim | estruturado com alias legado | liberado; alias Web precisa permanecer testado |
| MUSCULOESQUELETICO_RARAS | inativa, 0 | sem conteúdo | não | não | não | manter inativa |
| DOPPLER_CAROTIDAS | 56 | renderer programático | sim | sim | estruturado | liberado |
| DOPPLER_VENOSO_MMII | 44 | writer guardado + mapa | sim | sim | texto + mapa SSE | liberado; mapa só aparece após evento real |
| DOPPLER_VENOSO_MMII_MEDIDAS | 28 | writer/RAG + mapa quando emitido | sim | sim | texto | liberado; sem mapa sem evento SSE |
| DOPPLER_ARTERIAL_MMII | 20 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| DOPPLER_FISTULA_AV | 48 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| DOPPLER_RENAL | 28 | writer guardado | sim | sim | texto | liberado; fluxo writer Web |
| DOPPLER_VENOSO_MMSS | 0 | sem conteúdo validado | não | não | não | **rascunho pendente** |
| DOPPLER_ARTERIAL_MMSS | 0 | sem conteúdo validado | não | não | não | **rascunho pendente** |
| TRANSFONTANELA | 48 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| OCULAR | 52 | writer/RAG | sim | sim | texto | liberado; fluxo writer Web |
| TORAX | 0 | sem conteúdo validado | não | não | não | **rascunho pendente** |
| QUADRIL_INFANTIL | 0 | sem conteúdo validado | não | não | não | **rascunho pendente** |
| LIVRE | 0 por desenho | writer genérico | sim | sim | texto | liberado; sem template específico |
| TESTE | inativa, 0 | sem conteúdo | não | não | não | manter inativa |

## Esquemas visuais

| Esquema | Web | iOS | Android | Estado desta rodada |
|---|---|---|---|---|
| Mama | interativo | interativo | manual, com envio à Sala | Android usa a mesma base anatômica, sem inferir BI-RADS nem alterar o texto |
| Tireoide | frontal + transversal | frontal + transversal atualizados | frontal + transversal, manual | iOS e Android deixaram de depender da apresentação tireoidiana antiga |
| Mapa venoso MMII | painel montado após evento SSE válido | disponível | disponível | Web consome o evento `scheme` real; sem evento válido, nenhum mapa é criado |
| Miomas | ausente | disponível | ausente | recurso específico do iOS; não anunciado como multiplataforma |
| Posição fetal | retirado do fluxo | não tratado como esquema principal | ausente | não reintroduzir |

## Pendências que dependem de decisão clínica

As cinco categorias sem conteúdo validado não foram ligadas apenas para aumentar a contagem. Fazer isso colocaria um código vazio no seletor e permitiria que o writer respondesse sem o conjunto de regras específico do exame. A ativação correta é: revisão clínica do rascunho, transformação em blocos/modelo, testes com casos normais e alterados sintéticos, carga no banco e só então inclusão simultânea nos três clientes.

## Fonte dos números

Consulta agregada em produção em 30/09/2026: 36 categorias, 34 ativas, 1.496 blocos de conhecimento e 3.861 laudos totais. A consulta contou apenas IDs e códigos por categoria, sem selecionar `raw_input`, `generated_output`, `final_output`, usuário ou qualquer dado de paciente.
