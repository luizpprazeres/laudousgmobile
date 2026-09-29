# Sala: contrato de revisão médica — auditoria 28/09/2026

Escopo: leitura do checkout, sem dados de pacientes, consultas de produção ou mudanças de código/schema. A leitura da skill Supabase orientou o controle de ownership e privilégios; implementação deverá verificar documentação atual antes de migrar. Este documento descreve o código local, não comprova o deployment atual.

## Evidência e implicações

- `packages/db/src/schema/reports.ts:34`: status do pipeline, generated_output e final_output existem, mas não há revisão médica vinculada ao conteúdo. `final_output` não prova aprovação.
- `apps/api/src/app/api/sala/push/route.ts:51`: enviar à Sala só atualiza updated_at após verificar proprietário. Não pode ser interpretado como revisão de clientes antigos.
- `apps/mobile/src/lib/api.ts:291`: Android/RN escreve final_output diretamente via Supabase. `apps/mobile/app/report/[id].tsx:89` e `apps/mobile/app/generate.tsx:218` usam autosave; `generate.tsx:1069` publica após limpeza, sem contrato de revisão.
- `/Users/luizprazeres/laudousg-swift/LaudoUSG/LaudoUSG/Services/HistoryService.swift:34`: Swift também faz PATCH direto. `Features/Generate/GenerateViewModel.swift:546` agenda autosave e `:561` salva texto sem marcadores. `Services/SalaService.swift:32` só envia reportId; `Features/History/HistoryView.swift:327` reenvia histórico.
- `apps/api/src/app/api/sala/latest/route.ts:87`: Sala recebe texto de reports automaticamente, até antes de um envio explícito, por polling. `apps/api/src/app/sala/[token]/page.tsx:439` atualiza a cada 3 segundos. Não é um transporte separado para Android e iOS.
- `apps/api/src/app/api/sala/report/route.ts:46`: início do dia usa timezone do servidor, diferente de latest (BRT explícito). Na madrugada/à noite um laudo pode aparecer na lista e não abrir; compartilhar helper de janela diária.
- `latest/route.ts:108` remove marcadores REVISAR; `report/route.ts:61` devolve texto sem a mesma normalização. Compartilhar serializador e regra de conteúdo. Remover marcador nunca significa revisão.
- `apps/api/src/app/sala/[token]/page.tsx:153`: laudo anterior fica num snapshot carregado uma vez; polling atualiza latest, não necessariamente o laudo selecionado. Revisão ou edição do laudo anterior deve revalidar também esse snapshot.
- `apps/api/src/app/sala/[token]/page.tsx:1529`: columnCount/columnFill criam páginas horizontais. Converter leitura para fluxo vertical, mantendo formato de impressão separado.
- `apps/api/src/app/sala/[token]/page.tsx:171`: preferências atuais usam localStorage global. Não reutilizar essas chaves para nomes de pacientes.

## Contrato aditivo recomendado

Preservar status atual do pipeline. Adicionar versão monotônica de conteúdo (`content_revision`, default 1), e registro de revisão dedicado, associado a reportId: reviewed_revision, reviewed_at, reviewed_by. Preferível tabela privada de aprovação sem escrita direta de anon/authenticated, com RLS/privileges explícitos; evita clientes que têm UPDATE de reports poderem forjar aprovação. Endpoint da API verifica JWT e propriedade e chama operação transacional restrita ao backend. Não confiar em reviewed=true vindo do cliente.

Trigger de reports incrementa content_revision ao mudar generated_output, final_output ou categoria, e invalida revisão anterior atomicamente. Deve cobrir todos os writers, inclusive PATCH legado e pipeline. Touch de updated_at para reenvio não muda a revisão. Nunca usar updated_at como versão, pois push também o altera.

Criar POST /api/reports/:id/review com expectedRevision e texto exato que o médico revisou (ou digest fornecido previamente pelo servidor), usando lock/CAS no banco. Validar owner, texto não vazio, geração terminada, ausência de bloqueio clínico e igualdade com conteúdo atual. Se divergente, responder 409 e exigir recarregamento; não aprovar uma versão diferente silenciosamente. A operação pode salvar a edição final e revisar na mesma transação, evitando corrida entre debounce de autosave e aprovação. Não logar texto clínico em erros.

Resposta aditiva compartilhada para latest, report, histórico e detalhe: contentRevision, reviewStatus (pending/reviewed), reviewedAt opcional. `reviewed` somente quando registro existe e reviewed_revision === content_revision. Linhas antigas e campos ausentes são pending. Não fazer backfill de aprovação. Auxiliar não chama endpoint de revisão e token da sala não concede autorização médica.

UI médico: ação explícita “Revisado — liberar para a Sala”, desabilitada enquanto salva/gera; aguardar resposta antes do sucesso visual. Editar depois retorna a pendente imediatamente e o backend garante invalidação mesmo no app antigo. Enviar/reenvio continua disponível, mas não equivale a aprovar. Mostrar claramente distinção entre salvo/enviado/revisado.

UI Sala: faixa grande “Revisado pelo médico · pronto para copiar”, ícone + texto + horário (não apenas cor). Pendente: “Aguardando revisão médica”. A auxiliar pode navegar e identificar; copiar/imprimir pendente exige confirmar revisão com médico, preferencialmente ação indisponível até liberação. Incluir modo legado explícito se necessário para rollout, nunca badge verde presumido. Alterações/observações locais devem ficar visualmente separadas do texto aprovado e não herdar seu selo como se fossem revisão médica.

## Nome temporário e navegação

Nome é dado pessoal mesmo temporário: não afirmar isenção da LGPD. Implementação inicial exclusivamente local, opcional e claramente identificada como “Identificação nesta aba”. Não incluir automaticamente no conteúdo médico, clipboard, analytics, URL ou logs.

Usar sessionStorage isolado por versão, hash do token, dia BRT e reportId. Envelope contém expiresAt (mínimo entre meia-noite BRT e expiração da sala). Comparar expiração em toda leitura/escrita, ao focar aba e por timer; apagar namespace ao trocar token, revogar, expirar ou sair. sessionStorage pode sobreviver restauração de sessão do navegador: TTL explícito é obrigatório. Fechamento da aba não deve ser a única garantia. Sem migração de dados entre domínios e sem repassar nomes na URL.

Texto simples, limite curto (ex.: 80 caracteres), sem HTML. Avisar discretamente que não sincroniza entre auxiliares/dispositivos. Lista lateral pode mostrar nome local + categoria + hora + estado de revisão. Anterior/próximo com teclado e botões visíveis. Novo laudo anuncia chegada sem tirar auxiliar do laudo que está copiando; botão “Ver novo laudo”.

## Sequência / ownership

1. Backend/DB: helper BRT, serializador único, migração aditiva, trigger de versão, revisão transacional/ownership, DTOs opcionais. Manter APIs antigas funcionais. Não mudar a URL de API dos apps por causa do domínio da Sala.
2. Android/RN: adapters `lib/api.ts`, schemas compartilhados/espelhados, Generate e detalhe/histórico; flush/atomic-save antes de aprovar, conflitos visíveis.
3. iOS: Models/Report, HistoryService, SalaService, GenerateViewModel, ReportDetail/History. Build e validação física independentes; não editar cópia LaudoUSG-watch automaticamente.
4. Sala/Atlas: consumir DTO tolerante a ausência, visual pending/reviewed, vertical, navegação e nomes TTL. Enquanto backend não existe, mostrar pending real; fixture sintética só em harness.
5. Root: integrar, revisar e publicar backend antes de clientes e UI exigir revisão, com rollout compatível. Migração domínio preserva token/caminho/query e usa mesmo backend; aprovação não depende da origem HTTP.

## Gates mínimos

Provar: proprietário aprova; outro usuário/anon/token Sala não aprova; revisão antiga e payload forjado rejeitados; edição por PATCH legado invalida; atualização pipeline invalida; reenvio não invalida; clientes antigos nunca recebem revisão inventada. Teste concorrente edit-versus-review. Testar laudo anterior selecionado atualizado, troca de token sem vazamento, expiração BRT, restauração da aba após TTL, quota/storage indisponível. Browser: revisão visual + hit targets + teclado + clipboard e impressão em fluxo vertical. Integração sintética de um laudo originado pelo adapter RN e outro Swift chegando no domínio novo via redirect do antigo; isso não substitui teste físico dos apps.

## Implementação local concluída

Migração `supabase/migrations/20260928231237_report_medical_review.sql` gerada com CLI Supabase (via npx; binário global ausente), não aplicada em cloud. Usa trigger SECURITY INVOKER para versão e RPC SECURITY INVOKER acessível somente a service_role; aprovações têm tabela com RLS e sem grants a anon/authenticated. API deriva actor do JWT, trava row e confere versão/texto/status na mesma transação.

Endpoint final: `POST /api/reports/:id/review`, JSON estrito `{expectedRevision: number, expectedText: string}`. Retorna `{ok:true,contentRevision,reviewStatus:"reviewed",reviewedAt}`; 409 content_changed/report_not_ready, 404 not_found, 503 indisponibilidade. Primeiro aguardar autosave e obter GET detalhe atualizado (`report.content_revision`). O endpoint não salva edição; compara o texto exato `final_output ?? generated_output`. Legados continuam lendo/escrevendo normalmente e não recebem aprovação implícita.

Sala latest/report/timeline recebem campos aditivos camelCase: contentRevision, reviewStatus, reviewedAt. Helper compartilhado normaliza marcadores e janela BRT. A lista latest usa primeiro texto não vazio, evitando que geração incompleta esconda o último laudo disponível. Falha na consulta de revisões retorna pending.

Validação local: migration executada em PGlite (PostgreSQL embutido, sem rede), com schema mínimo sintético. PASS: dono/texto/versão negativos; aprovação válida; touch; forjar versão; PATCH authenticated direto invalida revisão; ACL de RPC/tabela; blocked não aprovável. Script SQL versionado em `packages/db/tests/report-medical-review.sql`. Fixture/runner PGlite temporário em `/tmp/laudousg-review-dbtest/run.mjs`; não substitui integração com RLS/schema completo ou PostgREST cloud. Teste helper `apps/api/src/server/sala/__tests__/reportContract.manual.ts` PASS em meia-noite BRT e DTO. Typecheck API inicialmente limitado por erros alheios domain.ts:44,49; DB typecheck separado.

Ordem de rollout obrigatória: aplicar migração, verificar grants/trigger no ambiente alvo, só depois publicar API que seleciona content_revision, depois clientes. `packages/db/src/migrate.ts` não executa supabase/migrations; não assumir aplicação pelo migrador Drizzle legado. Não houve commit, deploy ou alteração de produção nesta entrega.

Revisão independente corrigida: status generated pode coexistir com sanity critical. RPC agora nega verdict critical ou issue severity critical, trigger invalida qualquer mudança sanity_result e DTO força pending em critical mesmo diante de aprovação inconsistente. Regressões generated+critical, critical tardio após aprovação e warning com issue critical passaram no PostgreSQL embutido; DTOs negativos também. Typecheck API/DB completos passaram após ajuste de domínio por outro agente.
