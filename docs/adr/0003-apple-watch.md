# ADR-0003 — Apple Watch app pra captura rápida de laudos

- **Status:** Proposed (uso pessoal experimental, sem App Store por enquanto)
- **Data:** 2026-05-31
- **Contexto trigger:** Decisão original da sticky `next-sprints` (2026-05-25) era aguardar feedback TestFlight do iPhone antes de construir Watch. Iniciamos antes mesmo do TestFlight maduro para uso pessoal do médico-fundador (Luiz) e testes incrementais privados via Internal Testing — explicitamente NÃO para liberação na Apple Store agora.

## Decisão

Construir Watch app como experimento isolado para **uso pessoal do Luiz primeiro** (TestFlight Internal), com escopo de **geração completa de laudos via Watch** (não apenas captura), com **publicação automática na Sala do Auxiliar** via touch no `updated_at` do report.

A revisão e edição do laudo continua exclusivamente no iPhone OU é dispensada (auxiliar imprime o laudo direto da Sala sem revisão prévia do médico — modelo de confiança no pipeline RAG + sanity check).

## Contexto e use case

### Use case primário (uso pessoal)
1. Médico durante o exame com gel nas mãos → não quer pegar iPhone
2. Levanta o pulso, toca Apple Watch
3. Escolhe categoria via Digital Crown
4. Toca microfone → dita achados (~30s-2min)
5. Toca "Gerar"
6. Watch mostra spinner ~10-20s
7. "Enviado à sala ✓"
8. Auxiliar vê o laudo aparecer no `sala.laudousg.com` em ~5s
9. Auxiliar imprime/entrega

**Note**: médico não revisa no Watch. Confia no pipeline. Em caso de erro grave, ajusta verbalmente com auxiliar OU edita depois no iPhone.

### Use case NÃO coberto
- Editar laudo completo no Watch
- Revisão histórica de laudos
- Consultor IA no Watch
- Análise de imagens
- Settings/preferências do app

## Arquitetura técnica

### Estratégia: Independent Watch app + backend único

```
┌─────────────┐         ┌──────────────────────┐
│ Apple Watch │────────▶│ /api/transcribe      │
│   (watchOS) │         │ /api/generate        │
└─────────────┘         │  + auto_push_to_sala │
       │                └──────────────────────┘
       │                           │
       │                           ▼
       │                ┌──────────────────────┐
       │                │ Supabase reports     │
       │                │ (mesmo banco iPhone) │
       │                └──────────────────────┘
       │                           │
       │                           ▼
       │                ┌──────────────────────┐
       └───────────────▶│ /api/sala/latest     │
                        │ (auxiliar vê laudo)  │
                        └──────────────────────┘
```

- **Watch é independent**: não precisa iPhone pareado por Bluetooth
- **Backend único**: mesma `laudousgmobile.vercel.app/api/*` que iPhone consome
- **Sync iPhone↔Watch**: via Supabase (re-fetch on-open) — sem WatchConnectivity necessário no MVP
- **Autenticação**: Watch armazena JWT Supabase no Keychain (mesmo padrão do iPhone)

### Stack
- **watchOS 10+** (SwiftUI nativo)
- **AVAudioRecorder** pra gravação (limite ~60s por captura inicial; pode evoluir pra streaming chunks)
- **URLSession** pra `/api/transcribe` (multipart) + `/api/generate` (JSON + SSE)
- **Keychain** pra JWT
- **NÃO usa WatchConnectivity** no MVP (independent of iPhone)
- **NÃO usa CloudKit** (Supabase é fonte da verdade)

### 4 telas (UI)

1. **Setup token Sala** (1x, ao instalar):
   - Mostra QR code reader OU campo pra digitar pairing_code (6 chars)
   - Salva token no Keychain
   - Sem token configurado → telas seguintes ficam bloqueadas

2. **Lista de categorias** (Digital Crown):
   - 7 categorias com contracts RAG completos (decisão 2026-05-31):
     - OBSTETRICA
     - PELVE_FEMININA
     - TIREOIDE
     - MAMARIA
     - DOPPLER_OBSTETRICO
     - ABDOMEN_TOTAL
     - MORFOLOGICO

3. **Gravação**:
   - Botão mic central (toggle start/stop)
   - Timer visual mostrando duração
   - Após stop: botão "Gerar" + botão "Cancelar"

4. **Pós-gerar**:
   - Spinner enquanto STT + LLM rolam (~10-20s)
   - "Enviado à sala ✓" (3s) → volta pra tela 2

### Backend changes (Sub-Sprint A — JÁ FEITO em 2026-05-31)

Schema `GenerateRequest` (packages/shared) ganhou 2 campos opcionais:
- `source: 'iphone' | 'watch' | 'web'` — analytics + roteamento futuro
- `auto_push_to_sala: boolean` — quando true, toca `updated_at` do report após `done`, antes da sanity, pra empurrar pro topo do feed `/api/sala/latest`

Route `/api/generate` ganhou hook in-process pós-done que executa o touch quando flag presente.

**Zero novos endpoints. Zero novo schema na sala.**

## Pré-requisitos (estado atual 2026-05-31)

| Pré-requisito | Status |
|---|---|
| iPhone TestFlight maduro (S17.6) | ❌ Build 77 em Apple Review aguardando reply |
| Feedback médico ≥ 2 pedindo Watch | ❌ Não há feedback ainda |
| Backend `source` param | ✅ Implementado nesta ADR (commit subsequente) |
| Backend `auto_push_to_sala` | ✅ Implementado |
| Apple Watch físico pra testar | ✅ User tem |

**Desvio explícito da decisão original**: construímos sem feedback médico porque o user é o testador primário (uso pessoal). Aceito como exception bem-fundamentada (não é over-engineering — é dogfood do próprio fundador).

## Distribuição (TestFlight Internal — NÃO App Store)

- Watch target adicionado ao mesmo projeto Xcode do iPhone
- Bundle ID: `com.laudousg.LaudoUSG.watchkitapp` (família do iPhone)
- Distribuição via Internal Testing (até 100 emails) — Luiz + opcionalmente 1-2 amigos
- **NÃO submetemos à Apple Store** até decidir que feedback médico justifica
- iPhone Build 77 atual segue independente — Watch não muda binário iPhone se isolado em branch experimental

## Branch isolada

Trabalho em `apple-watch-experimental` (worktree git) no repo `/Users/luizprazeres/laudousg-swift/LaudoUSG`. Main do iPhone fica imune até decisão de merge.

## Trade-offs aceitos

| Trade-off | Decisão |
|---|---|
| Sem revisão antes da Sala | Aceito. Médico confia em RAG + sanity. Watch é canal informativo pro auxiliar, não contrato com paciente. |
| Sanity check async pós-publish na Sala | Aceito no MVP. Pode aparecer warning na UI Sala futura. |
| Sem atalhos clínicos (Hadlock, DUM) no Watch MVP | Aceito. Reduz UX risk + dev time. Médico dita verbalmente "FIGO 4" etc. Atalhos vão pra backlog. |
| Bateria do Watch com 1min+ gravação | Aceito como reclamação esperada. Backlog: streaming chunks pra economizar. |
| Sem CloudKit/WatchConnectivity | Aceito. Backend único (Supabase) é fonte da verdade. Sync via re-fetch on-open. |
| App Store Review desconhecida pra apps médicos no Watch | Adiado. Só atacamos quando feedback médico justificar submissão pública. |

## Roadmap

| Sub-Sprint | Escopo | Estimativa | Status |
|---|---|---|---|
| **A** — Backend prep | Schema `source` + `auto_push_to_sala` + hook na route generate | ~1h | ✅ feito 2026-05-31 |
| **B** — Watch app MVP | Watch target + 4 telas + AVAudioRecorder + URLSession + Keychain | ~15-20h dex1 | ⏳ delegado |
| **C** — TestFlight Internal Watch | Archive + upload + Internal Testing + instalar | ~30min user | ⏳ aguarda B |
| **D** — Uso pessoal real (dogfood) | Luiz usa no consultório por 2-4 semanas, anota fricções | variável | backlog |
| **E** — Decisão GO/NO-GO público | Baseado em D: vale submeter à App Store? Ou Watch fica privado? | decisão | backlog |

## Critérios de sucesso

- **MVP funciona end-to-end**: dito no Watch → laudo na Sala em <30s
- **Bateria aceitável**: Watch dura 1 dia de trabalho com 5-10 laudos
- **Latência percebida**: <20s do toque "Gerar" até "Enviado à sala ✓"
- **Erro rate**: <5% dos laudos exigem regenerar (manual ou via iPhone)
- **UX no consultório**: Luiz consegue usar com gel/luva sem frustração

## Riscos identificados

| Risco | Mitigação |
|---|---|
| watchOS bloquear gravações longas | Limitar UI a 60s. Backlog: streaming chunks. |
| Watch hibernar durante geração 20s | Manter wake lock via `WKExtendedRuntimeSession` |
| Apple rejeitar Watch app médico no review | Mitigado: ficar em Internal Testing até maturar |
| Auxiliar imprimir laudo errado sem revisão médica | Risco clínico aceito no MVP pessoal. Em futuro produção, Sala pode ter etapa "aguarda confirmação verbal" |
| RAG drift entre iPhone e Watch | Mesmo backend — sem drift estrutural |

## Decisões trancadas (não-negociáveis sem ADR de revisão)

- Watch usa MESMO backend que iPhone (sem servidor próprio)
- Watch NÃO substitui iPhone — é canal complementar
- Geração no Watch envia direto pra Sala, sem etapa de draft no iPhone
- 7 categorias do MVP fixadas até feedback do uso pessoal
- Apple Store submission só após pelo menos 4 semanas de uso pessoal validado

## Referências
- Sticky `next-sprints` § "⌚ Apple Watch" (decisão original 2026-05-25)
- ADR-0001 — camada-geracao-laudos (RAG infra que Watch reutiliza)
- `/api/sala/push` (touch updated_at — base do `auto_push_to_sala`)
- AIUM Practice Parameter Head and Neck (RAG MAMARIA/TIREOIDE)
- watchOS SDK docs (watchOS 10+)
