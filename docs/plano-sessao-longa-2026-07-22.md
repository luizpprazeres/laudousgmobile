# Sessão longa 22/07 — Cartografia Android + ajustes iOS + esquemas visuais (tireoide/mama)

**Modo de trabalho (definido pelo Luiz):** Claude = planejamento mestre, orquestração, sequência, subagentes. **Dex2 (GPT 5.6 sol, high)** = preferência em decisões e elaboração de planos. **Dex1** = execução de código longo. Decisões relevantes passam pelo Dex2.

**DECISÕES DEX2 (22/07, registradas):**
1. Frente 2a: descartar o WIP dos 4 arquivos (restaurar p/ fecf33f) e remover a feature da base limpa; `/api/edit` backend + edição inline manual ficam.
2. Frente 2b: "Esquema visual" = entrada principal; PlusSheet MANTIDO como atalho na v1 (abre cartografia antes do laudo; mesma tela/estado — PlusSheet.swift:390). Retirar o atalho só após validar em uso real.
3. Frente 3: v1 MANUAL padrão miomas (editor SwiftUI, médico posiciona; parser local pode pré-preencher; reusar MyomaSchemaExporter/SalaSchemaUploader). SEM extractor backend/SSE/flag agora.
4. Sobras venosas (tributaria_lateral, medida-por-nível): frente C6 SEPARADA, depois das frentes 2–3 — salvo se o smoke Android mostrar que bloqueiam a cartografia atual.

---

## Frente 1 — Cartografia 4 vistas no ANDROID (EM ANDAMENTO)

Código RN pronto no branch `feat/venous-4view-recolor` (C4-clientes RN 328aeba + C5-clientes RN ffb5429/a4722f7). Flag `VENOUS_SCHEME_4VIEW=true` já em prod. iOS validado em device 20/07.

- [x] Device Samsung SM-G780G conectado via USB (RQ8R9036KRX)
- [ ] Build release local (`assembleRelease`, JAVA_HOME=JBR) — **rodando**
- [ ] `adb uninstall com.laudousg.LaudoUSG` (device tem v11 da Play, assinatura diferente) + install do APK release
- [x] Login com conta de teste + smoke: achados venosos por TEXTO → gerar → render 4-view (8 células, magna→medial laranja, parva→posterior vermelha, anotações Caveat legíveis SEM flip) ✅ VALIDADO
- [x] Enviar p/ Sala — "Esquema enviado à sala" (encodeToBase64 CPU OK) ✅
- [x] Fixes commitados no branch: **8bf2a6d** (reanimated + render CPU)
- **Nota:** "Ø 4 mn" na tela é a fonte cursiva Caveat (o 2º "m" parece "n") — texto real é "mm", não é defeito.
- **FRENTE 1 CONCLUÍDA E VALIDADA EM DEVICE (SM-G780G).** Falta só: build EAS/Play quando o Luiz quiser publicar (o fix do reanimated é pré-requisito).

### 🐞 BUGS ENCONTRADOS NO 1º TESTE EM DEVICE (22/07) — este é o 1º device-run do venoso no Android (antes só bundle Metro)

1. **[CRÍTICO — resolvido] `react-native-reanimated` faltando como peer dep do Skia.** `@shopify/react-native-skia@1.5.0` faz `require("react-native-reanimated")` (via ReanimatedProxy) em qualquer tela que monte Skia; sem a dep, o JS derruba o ReactHost → **tela branca no boot**. `apps/mobile/package.json` não declarava reanimated. Corrigido: `react-native-reanimated@~3.16.7` adicionado. **Por que a v11 da Play não trava:** v11 é de 07/07, ANTERIOR à cartografia venosa (08/07+) — não tem VenousSchemeView, logo não puxa Skia/reanimated. **⚠️ Sem este fix, o 1º build de produção Android COM cartografia travaria em prod.** Gotcha de build: `createBundleReleaseJsAndAssets` fica UP-TO-DATE e reusa bundle JS velho → precisa `--rerun-tasks` ou apagar o bundle após mexer em deps JS.

2. **[MENOR — resolvido] Evento SSE `sanity_warning`/`stage` rejeitado pelo schema RN.** O RN tem uma CÓPIA local do schema (`apps/mobile/src/shared/schemas/generate.ts`), defasada do `packages/shared` — faltavam `sanity_warning` e `stage` → ZodError, evento descartado. Corrigido (commit `654bf71`): tipos add ao schema RN + reducer `state.ts` trata como no-op. tsc 0.

3. **[EM CORREÇÃO] Cartografia 4-view renderiza BRANCA no device.** Card "Cartografia venosa" monta, `rendered.image != null`, subtítulo "Mapa recolorido…" (changedPixels>0), mas o Canvas de preview sai branco. Causa: `surface.makeImageSnapshot()` de offscreen GPU surface 2048×3072 vira textura presa à surface liberada (`updateAndRelease: EGLConsumer is not attached`). Fix aplicado em `VenousSchemeView.tsx`: `.makeNonTextureImage()` nos dois compose (`drawAnnotationsImage`/`drawCalloutsImage`) → traz p/ CPU. Rebuild em validação.

**Sobras do plano C1–C5 (avaliar com Dex2):** v2 do schema venoso (tributaria_lateral nomeada, medida-por-nível, distância plantar "43cm"); asset home de prod se sair do bundle.

## 🔧 EM ANDAMENTO (Dex1): remover o botão "Ajustar laudo" do ANDROID
O RN tem a MESMA feature "Ajustar laudo" que removemos do iOS (edição incremental por voz/texto via POST `/api/edit`), entrelaçada em `apps/mobile/app/generate.tsx` (127 ocorrências). Escopo cirúrgico mapeado por Claude: REMOVER tudo `adjust*` (estados/refs/funções `submitAdjustment`/`toggleAdjustmentPanel`/`stopAdjustmentRecordingIfNeeded`/`applyFinalText`, import `editReport`, painel `AdjustmentPanel`, gravação de voz do ajuste, estilos); MANTER edição inline manual (`editingLaudo`/`onEditFinal`/`EDIT_FINAL`/`EDIT_TEXT`/autosave/TextInput). Backend `/api/edit` FICA. Delegado ao Dex1 (tsc 0 + bundle Metro + diff p/ Claude revisar).

## Frente 2 — Ajustes iOS (repo Swift `laudousg-swift/LaudoUSG`, branch feat/venous-4view-recolor)

### 2a. REMOVER a ferramenta "Ajustar laudo" (decisão do Luiz — não funcionou, tirar)
Inventário (estudo feito):
- `Features/Generate/AdjustLaudoSheet.swift` — DELETAR (+ referência no .xcodeproj)
- `Models/EditReport.swift` — DELETAR (verificar usos exclusivos)
- `GenerateViewModel.swift` — remover estado/métodos (canAdjustLaudo, presentAdjust, adjustError, seção "Ajustar laudo")
- `Services/ReportService.swift` — remover chamadas `/api/edit`
- `GenerateView.swift` — remover botão (linhas ~760-779) + `.sheet` da AdjustLaudoSheet
- **WIP não commitado nesses 4 arquivos = a própria feature** → descartar junto (confirmar com Dex2)
- Backend `/api/edit` FICA (edição incremental Parte A continua no ar; só sai a UI do iOS)

### 2b. Barra de ações do laudo — novo layout (decisão do Luiz)
Hoje: `[saveIndicator] [Visualizar/Editar] [Copiar] [Ajustar laudo] [Enviar p/ Sala] [Esquema de miomas se pelve]` — espremido.
Novo:
- Linha 1: `Visualizar/Editar · Copiar · Enviar p/ Sala`
- Linha 2 (quando a categoria tiver esquema): botão **"Esquema visual"** full-width (largura da linha 1)
- Categorias com esquema: PELVE_FEMININA (miomas), MAMARIA (novo), TIREOIDE (novo), DOPPLER_VENOSO_MMII (cartografia — hoje abre via PlusSheet; unificar entrada por este botão, manter PlusSheet?→Dex2)

## Frente 3 — Esquemas visuais TIREOIDE + MAMA no iOS (artes aprovadas 08/07)

Artes: `tmp-review/tireoide-base.png` (mantém como está — Luiz: "lindo, não mudar") + `tmp-review/mama-base.png` + protótipos HTML/artifacts aprovados. Ordem: **tireoide primeiro** ("próximo passo"), depois mama.

### Ajustes de arte/estilo pedidos 22/07 (mama)
1. **Preto e branco**: contorno rosa da mama → grayscale (print-friendly, igual tireoide). Venoso continua colorido.
2. **Relógio de horas**: 12/3/6/9 destacados (tamanho atual, +bold discreto); demais horas (1,2,4,5,7,8,10,11) mais discretas — mais transparentes e/ou menores.
3. Anéis pontilhados de distância: já discretos, manter/afinar.

### Glifos de nódulos por léxico BI-RADS (mama) — definidos pelo Luiz + criatividade
| Achado | Glifo |
|---|---|
| Nódulo sólido | círculo PREENCHIDO preto |
| Cisto simples | círculo SÓ CONTORNO preto (anecoico) |
| Margens lobuladas | contorno LOBULADO (sólido=preenchido lobulado; cisto=contorno lobulado) |
| Linfonodo intramamário | OVAL com PONTO central (periferia hipoecoica, hilo central hiperecoico) |
| Demais (cisto oleoso, complicado, microcalcificações…) | propor a partir do léxico BI-RADS na íntegra (doc já estudado em sessão anterior — reencontrar em docs/_extraction) e validar com Luiz |
- Legenda no esquema acompanha os glifos. Mama: rótulos só "Cisto"/"Nódulo sólido" (nunca "suspeito").

### Tireoide (TI-RADS)
- Arte aprovada como está. Nódulos por lobo (direito/esquerdo/istmo) + terço (superior/médio/inferior). Mesma linguagem de glifos (sólido/cisto/misto) adaptada a TI-RADS — propor e validar.

### ✅ Correções não-visuais JÁ FEITAS (Dex1, commit `616eb9a`, independentes do gate):
- `reportId` real no envio à Sala (mama+tireoide; era `nil` → não substituía por laudo). Propagado do PlusSheet.
- Editor abre VAZIO — removida a auto-importação em `.task` (v1 manual). Botão "Importar achados do laudo" segue funcionando. BUILD SUCCEEDED.
- NÃO tocado (depende do gate): glifos, artes, render, geometria, examType.

### Arquitetura — DECIDIDA (Dex2): v1 MANUAL estilo miomas. **Plano detalhado: `docs/plano-esquemas-tireoide-mama-2026-07-22.md`**.
- **Descoberta do Dex2:** NÃO é do zero. Já há impls parciais no repo Swift: tireoide (`5d03f20`: modelo+parser+editor+view+sheet+exporter) e mama (`da4f8ab`). Gaps: redesenham a anatomia por código (não usam as artes aprovadas); mama sem destaque 12/3/6/9; léxico de glifos incompleto; autoimport em `.task` (contraria a fonte manual); `reportId: nil` no envio à Sala; entrada duplicada no PlusSheet. → **auditar e estender, não reimplementar.**
- **Fase 0 = GATE VISUAL com o Luiz antes de codar** (2 pranchas + tabela de glifos). Validar: arte tireoide idêntica; P&B da mama; orientação clínica (lado/relógio/medial-lateral); polaridade do linfonodo; rótulos dos casos especiais; glifos opcionais na v1.
- `mama-base-bw.png` já gerado (P&B, fundo limpo) — candidato do gate. Léxico BI-RADS: `docs/det-5-mamaria-birads-pesquisa.md`.

## Sequência da sessão
1. Frente 1 (Android) até validar em device.
2. Frente 2a+2b (iOS remoção + barra) — código curto, Claude ou Dex1; build BUILD SUCCEEDED.
3. Frente 3 tireoide → mama (plano de arquitetura Dex2 → execução Dex1/Claude → build + validação).
4. Registrar tudo (memória + docs) e preparar handoff.
