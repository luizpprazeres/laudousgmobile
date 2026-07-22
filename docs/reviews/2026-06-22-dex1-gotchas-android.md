# Caça a bugs RN/Android standalone Hermes

Escopo: leitura estática em `apps/mobile/src` e `apps/mobile/app`, sem modificar código. Foco em padrões que podem funcionar em dev/web e quebrar no APK Android release com Hermes.

## Achados reais / candidatos fortes

### RISCO médio: `TextDecoder` global no parser SSE pode não existir no Hermes standalone

`apps/mobile/src/lib/api.ts:282-283`

O streaming foi corrigido para `expo/fetch`, mas o parser ainda depende de `new TextDecoder("utf-8")`. Em web isso existe. Em Node/dev também costuma existir. Em RN/Hermes standalone, `TextDecoder/TextEncoder` já foi historicamente inconsistente por versão/runtime e não há import de polyfill no arquivo. O `package.json` do app mostra `react-native-url-polyfill`, mas não mostra polyfill explícito de encoding/text-decoder em `apps/mobile/package.json:15-42`. Se o global não existir no APK, a geração vai quebrar logo depois do HTTP 200, agora com erro tipo `Can't find variable: TextDecoder` ou `TextDecoder is not a constructor`.

Fix sugerido: validar em APK release real com um `console.log(typeof TextDecoder)` antes do parser; se vier ausente, adicionar polyfill de encoding no entrypoint antes do uso, ou importar um decoder compatível diretamente em `api.ts`. Para blindar, eu não deixaria esse global implícito no caminho crítico da geração.

### RISCO médio: upload de áudio usa `FormData` RN com objeto tipado como `Blob`

`apps/mobile/src/features/generate/transcribe.ts:73-80`

O código faz `form.append("audio", { uri, name: "recording.m4a", type: "audio/m4a" } as unknown as Blob)`. Em React Native isso é o padrão prático, mas não é `Blob` real. Em dev pode passar e no APK pode falhar dependendo da combinação RN/fetch/backend/mime, principalmente se o servidor ou multipart parser for sensível ao `Content-Type` do arquivo. O próprio comentário reconhece o formato especial de RN em `apps/mobile/src/features/generate/transcribe.ts:75`. O header global está correto por não setar `Content-Type` manualmente em `apps/mobile/src/features/generate/transcribe.ts:86-92`.

Fix sugerido: manter sem `Content-Type` manual, mas trocar o MIME para o mais aceito para `.m4a` (`audio/mp4` costuma ser mais compatível que `audio/m4a`) ou inferir pelo URI/asset. Melhor ainda: testar upload no APK release e logar no backend `filename`, `mimetype` e tamanho recebido. Se houver falha intermitente, migrar essa chamada também para o stack recomendado pelo Expo para upload multipart ou normalizar o arquivo antes do envio.

### RISCO médio-baixo: `Intl`/locale `pt-BR` está espalhado sem fallback

`apps/mobile/app/report/[id].tsx:282-288`
`apps/mobile/app/report/[id].tsx:297-298`
`apps/mobile/app/analytics.tsx:176-177`
`apps/mobile/app/generate.tsx:749-753`
`apps/mobile/app/historico.tsx:237`
`apps/mobile/src/shared/calculators/gestationalAge.ts:46-51`

O app usa `Intl.DateTimeFormat`, `Intl.NumberFormat`, `toLocaleDateString("pt-BR")`, `toLocaleTimeString("pt-BR")` e `toLocaleString("pt-BR")`. Isso costuma funcionar em RN moderno com Hermes, mas é exatamente o tipo de diferença que aparece só em standalone/release se a build/runtime não carregar Intl ou locale data como esperado. O impacto seria crash em telas comuns: detalhe do laudo, analytics, histórico, tela de geração e calculadora de IG.

Fix sugerido: centralizar formatação em helpers com fallback manual simples (`DD/MM`, `DD/MM/YYYY`, número com `String(value)`/regex) e/ou adicionar polyfill `@formatjs/intl-*` se o APK release provar ausência de locale. O ponto prático é não deixar formatação derrubar tela clínica; se `Intl` falhar, cair para formato simples.

### RISCO baixo-médio: `Date.parse(expiresAt)` aceita qualquer string da API da Sala

`apps/mobile/src/features/sala/SalaPairingSheet.tsx:32-35`
`apps/mobile/src/lib/api.ts:169-180`

A UI da Sala calcula validade com `Date.parse(expiresAt)`. O schema do retorno só exige `expiresAt: z.string()` em `apps/mobile/src/lib/api.ts:176-180`, diferente de `ReportSchema`, que exige datas ISO com `z.string().datetime()` em `apps/mobile/src/shared/schemas/report.ts:31-32`. Se o backend devolver ISO completo com timezone, está ok. Se devolver formato SQL/locale ou string sem timezone, Hermes tende a ser mais estrito/inconsistente que Chrome/web, e o contador pode virar vazio ou errado.

Fix sugerido: trocar `expiresAt` para `z.string().datetime()` no schema mobile e garantir no backend `toISOString()`. Na UI, depois do parse, se inválido, mostrar erro explícito de validade em vez de string vazia.

## Padrões procurados e não encontrados como bug novo

### Fetch streaming / `response.body` / `getReader`

Só encontrei o caminho já corrigido em `apps/mobile/src/lib/api.ts:261-283`: usa `expoFetch`, valida `res.body` e chama `getReader`. Não encontrei outro uso de `response.body`, `.body.getReader()` ou `getReader()` em `apps/mobile/src`/`apps/mobile/app`.

Os outros `fetch` globais são chamadas não-streaming: `authedFetch` para JSON em `apps/mobile/src/lib/api.ts:82-90` e upload de transcrição em `apps/mobile/src/features/generate/transcribe.ts:84-93`. O bug original do `response.body === null` não se repete nesses pontos porque eles não leem stream.

### Web APIs ausentes no Hermes

Não encontrei uso de `structuredClone`, `crypto.randomUUID`, `atob`, `btoa`, `Blob` real, `FileReader`, `localStorage`, `sessionStorage` ou `EventSource` em `apps/mobile/src`/`apps/mobile/app`. O único `Blob` encontrado é o cast TypeScript do multipart em `apps/mobile/src/features/generate/transcribe.ts:76-80`; em runtime ele é objeto `{ uri, name, type }`, não API Web `Blob`.

### `process.env` fora do padrão Expo

Os usos diretos são `EXPO_PUBLIC_*`, que é o padrão do Expo: `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` em `apps/mobile/src/lib/supabase.ts:5-6`, e `EXPO_PUBLIC_API_URL` em `apps/mobile/src/lib/api.ts:17-20` e `apps/mobile/src/features/generate/transcribe.ts:5`/`apps/mobile/src/features/generate/transcribe.ts:52-53`. Não encontrei `process.env` com variável privada/não prefixada dentro do escopo pedido.

### `window` / `document` / `navigator`

Não encontrei `window` ou `document`. Há `navigator?.clipboard` em `apps/mobile/app/report/[id].tsx:72-73`, mas ele está protegido por `Platform.OS === "web" && ...`; no Android o lado direito não é avaliado, então não é um bug Hermes provável.

### Supabase realtime / WebSocket

Não encontrei `supabase.channel`, `postgres_changes`, `presence`, `broadcast`, `removeChannel`, `WebSocket`, `ws://` ou `wss://` no escopo mobile. O client Supabase está em `apps/mobile/src/lib/supabase.ts:14-20` apenas com auth/storage. Ele importa `react-native-url-polyfill/auto` em `apps/mobile/src/lib/supabase.ts:1`, que é o cuidado correto para Supabase no RN. Portanto não há gotcha realtime/WebSocket atual para APK Android, porque realtime não parece usado.

### Date parsing não-ISO

Os campos de laudo/perfil são validados como ISO por Zod: `created_at` e `updated_at` usam `z.string().datetime()` em `apps/mobile/src/shared/schemas/report.ts:31-32` e `apps/mobile/src/shared/schemas/profile.ts:16-17`. O histórico direto via Supabase usa `new Date(report.created_at)` em `apps/mobile/app/historico.tsx:207` e `apps/mobile/app/historico.tsx:228`, mas Supabase normalmente entrega `timestamptz` em ISO, então não marquei como bug real.

A calculadora de IG evita o clássico bug de timezone adicionando `T12:00:00` nos parses de `YYYY-MM-DD`/`DD/MM/YYYY` em `apps/mobile/src/shared/calculators/gestationalAge.ts:135-149`, então esse ponto está bem tratado.

## Resumo executivo

Não achei outro clone direto do bug `fetch global + response.body null`. O único streaming está no caminho corrigido com `expo/fetch`. Os pontos que eu testaria obrigatoriamente no APK release são: existência de `TextDecoder`, upload multipart real do áudio, e presença/locale de `Intl`. O resto da lista ficou limpo ou com risco baixo controlado.
