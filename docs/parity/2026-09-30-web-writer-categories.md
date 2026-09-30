# Fluxo Web de categorias por texto

Data: 2026-09-30

## Categorias liberadas

A allowlist Web de writer contém somente `PAREDE_ABDOMINAL`, `PROSTATA_TRANSRETAL`, `ESCROTAL`, `REGIAO_INGUINAL`, `PARATIREOIDE`, `GLANDULAS_SALIVARES`, `DOPPLER_VENOSO_MMII`, `DOPPLER_VENOSO_MMII_MEDIDAS`, `DOPPLER_ARTERIAL_MMII`, `DOPPLER_FISTULA_AV`, `DOPPLER_RENAL`, `TRANSFONTANELA`, `OCULAR` e `LIVRE`. As 15 categorias estruturadas também estão explicitadas em `STRUCTURED_WEB_CATEGORY_CODES`, no mesmo arquivo. A allowlist writer é aplicada novamente pela rota autenticada `apps/web/src/app/api/generate/route.ts`. O request é estrito: outras categorias e campos de controle são recusados. As cinco categorias sem validação, `TESTE` e categorias inativas não entram no seletor.

## Contrato e fonte de verdade

O seletor diferencia categorias determinísticas (“Estruturado”) de writer (“Por texto”). O ramo writer só coleta texto digitado/ditado e o `category_hint`; não envia achados estruturados fabricados nem monta texto clínico no navegador. A rota Web confirma sessão, injeta o `writing_style_id` salvo no perfil, força `source: web` e repassa o JWT da mesma sessão a `POST /api/generate`. O `CATALOG_SERVICE_TOKEN` não é usado nem exposto.

O consumo SSE valida cada evento com `GenerateSSEEventSchema`. `clarify` pausa e retoma usando `resume_from_report_id` e respostas, preservando o mesmo `reportId`; `blocked`, `sanity`, `done` e `error` têm estados próprios. O mapa só é montado após um evento `scheme` para `VENOSO_MMII` com versão e estrutura reconhecidas. Ausência/invalidade do evento não cria mapa nem achados.

## Persistência e retomada

O gerador grava uma única linha em `reports`. A Web não cria espelho em `web_reports`: o texto recebido em `done` continua em `generated_output` e já aparece no Histórico sob a origem IA. A página de Histórico combina `final_output` e `generated_output`, com preferência pela edição final, sem duplicar o relatório. Somente a ação explícita “Salvar edição” escreve `final_output`; o navegador não transforma automaticamente a saída da IA em edição final do médico. O gatilho existente de revisão de conteúdo continua aplicável.

Retomada de esclarecimento é feita contra o mesmo `reportId`. As perguntas pendentes são gravadas com versão em `reports.generation_metadata.pending_clarify`, coluna JSONB já existente, e a Web lista somente relatórios da categoria e status pendentes sob RLS. Após recarregar, o médico escolhe a tentativa a retomar; `raw_input` é lido do próprio relatório e enviado de volta no request de retomada. Não há cópia de ditado em `localStorage`/`sessionStorage`. As respostas digitadas ficam em memória até o envio; se fechar a página no meio de responder, as perguntas reaparecem sem respostas. Não foi necessária migração nem SQL.

## Verificação

Cobertura adicionada para os 14 códigos writer e 15 estruturados, exclusão dos pendentes/inativos, request estrito (incluindo bloqueio de `auto_push_to_sala`), schema versionado das perguntas recuperadas, parser SSE fragmentado, estados `clarify`/`blocked`/`sanity`/`done`/`scheme`, identidade do `reportId` na retomada e ausência de esquema antes de evento real. `apps/web/tests/categoryPicker.browser.manual.ts` percorre as 29 categorias, distingue modo de geração e confirma a ausência dos códigos proibidos.
