# Goal Sala + landing — 28/09/2026

Objetivo autorizado: migrar Sala para .com.br com compatibilidade Android/iOS, redesenhar uso da auxiliar e concluir melhorias da landing. Execução em ondas, contextos pequenos e revisão central.

## Contratos e defaults
- Novo host canônico sala.laudousg.com.br; antigo redireciona páginas com path/query preservados. Endpoints de escrita/API antigos continuam compatíveis.
- Nenhum laudo fica "revisado" por geração, cópia ou envio automático. Confirmação médica autenticada vinculada ao conteúdo; edição posterior invalida. Clientes antigos: revisão não confirmada.
- Nome opcional da auxiliar somente identificação local de sessão/dia/token, nunca incorporado automaticamente ao laudo nem logado; limpeza na expiração/saída/troca de dia.
- Sala em leitura vertical, navegação anterior/próximo e lista do dia. Novo laudo não rouba a seleção enquanto auxiliar está copiando outro.
- Hero com 4 casos sintéticos (2 abdome, pelve, tireoide), loop3–5s por caso, interação humana interrompe autoplay; "copiado" automático deve indicar demonstração, nunca gravar clipboard sem clique.
- Exemplos calculadoras produzidos por motores reais com dados sintéticos e formato real; não alegar igualdade/certificaçãoFMF.
- Esquemas com patologias fictícias a partir dos renderers existentes; não produzir mapa anatômico clinicamente falso. Novos ícones GPT lineart consistentes, persistidos e usados landing+seletor.

## Ondas e ownership
1. DevOps subagent sala_domain: auditoria e depois middleware/paircanonical/testes; produção somente após revisão/root e DNS/TLS comprovados.
2. Backend subagent sala_contract: auditoria e contrato de revisão; implementação posterior isolada backend/shared. Apps em taskseparada.
3. Atlas Claude: /brainstorming da Sala com opções e design; em seguida UI apps/api/src/app/sala/** após contrato.
4. Claude Code: hero apenas HeroWorkspace e móduloshero novos; não page.tsx.
5. Clínica Claude: fixtures reais PE/trissomias e esquemas preenchidos; não fórmulas nem publicação.
6. Root: imagensGPT, integração assets, revisão, QA e coordenação. Integração seletor pode ser delegada após assets.

## Critérios
DNS/TLS novo200, antigo redirect semloop, códigos/links antigos preservados; endpoints antigos Android/iOS aceitos; sem vazamento de tokens/nome. API: aprovação por dono; edição invalida; copyestado seguro. UIdesktop/mobile/teclado, sem overflow ou salto indevido, longoslaudosverticais. Hero sem clipboardfake, inputsmanuais persistentes. Íconesreconhecíveis32px. Build/lint/typecheck e testes focados; prévias verificadas; produção em faseisolada, rollbackregistrado.

## Estado
Em andamento. Vercel acessível. DNS .com.br é Hostinger externo, painel solicitado ao usuário. Antigo shortlink404 e camelCaseAndroid incompatível detectados e incluídos na correção.

Referência de processo: https://github.com/soumatheusgomes/vibe-coding-toolkit (README + subagent orchestration + Superpowers). Adotados ownership/depends-on, revisões e checkpoints; sem instalarconfigexterna ou mudar eslintglobal.

## Checkpoint produção
Migração aditiva report_medical_review aplicada em Supabase yldtkqrsbgcnwlydrrot via apply_migration, sucesso. Inclui correção critical tardio após revisão independente PGlite. API/UI/domínio ainda NÃO publicados. Campos antigos preservados, sem backfill de aprovação.

Vercel: sala.laudousg.com.br adicionado ao projeto laudousgmobile, confirmado CLI. DNS Hostinger pendente: A sala 76.76.21.21. SALA_CANONICAL_ENABLED continua desativado; domínio antigo preservado até TLS/DNS. Web build passou; prévia3001 reiniciada; calculadoras/FAQ QA PASS1440/1920/390/320/short720/reducedmotion.

## QA integrado final
Web build/typecheck/lint concluídos (lint com avisos preexistentes), 16 suites e 11 testes Hero passaram. Hero4casos3,6–4,6s, manualpreservado, semclipboardautomático, reducedestático; ícones15/15 landing e seletorreal harness1440/390/320. Calculadoras/FAQ6viewportsPASS. Meshrecebeu fios discretos verdes, build/typecheck repetidosPASS. Sala QA sintético contra nextstartrelease3012 PASS, captura1440 revisada. P1stale selected após errofetch corrigido/testado; nenhum selo aprovado para texto stale/offline/acréscimos. iOSbuild+6testesfocadosPASS; suítecompleta92pass/3skip/2falhas ImageAnalysisServiceTests nãoalterados, baseline não comprovado. Androidtypecheck e contratosPASS; hardware não validado.
Supabase security advisor após DDL: reviewtable RLS sempolicies INFO é intencional (somente service_role, anon/auth semprivilégios). Warnings outrasfunções e passwordleak são preexistentes/foraescopo, não alterados. https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

API/Sala promovida após QA: dpl_J918LvxKnWNSnTfBw4JTepYmmoLi, aliases sala.laudousg.com e laudousgmobile.vercel.app confirmados. Health/Sala200, invalidtokenfalse, POST semJWT401. Canonicalfalse. Landing somente prévia3001; apps mudanças locais, não distribuídos. Migração domínio depende DNSHostinger e TLS, depois flagtrue; teste físico apps pendente. Sem commit/push nesta onda.

## Estado atualizado 29/09 — domínio e landing publicados

DNS Hostinger sala A76.76.21.21 TTL300 criado, HTTPS válido emitido. Domínio canônico ativo em dpl_GzTRZyscnEfHZRduwJboELmesVTi; antigo redireciona páginas preservando links/query, APIs continuam sem redirect. Flag persistida production. Landing publicada dpl_95q5tmkMojLcLTcPZR1v3ULcQVeZ após QA completo3013. Ver runbooks docs/reviews/2026-09-29-*.md e COMPLETION-AUDIT.md para evidência atual; checkpoints acima são históricos. E2E autenticado dos apps e commit/push ainda em andamento.
