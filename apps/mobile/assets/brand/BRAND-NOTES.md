# LaudoUSG — Brand Notes

> **Não existia `STYLE.md` no original.** Este arquivo foi sintetizado a partir de `lib/design-tokens.ts` (single source of truth de tokens) e `components/LaudoUSGLogo.tsx` (componente React do logo) do repo original `/Users/luizprazeres/laudousg`.

## Identidade da marca

- **Nome:** LaudoUSG (composto: "Laudo" + "USG" com peso visual diferente)
- **Tagline oficial:** `Laudos rápidos e inteligentes`
- **Wordmark composition:** "Laudo" em peso **black** (negrito máximo) + "USG" em peso **regular** com cor mais clara (accent). Aplicado tanto em modo claro quanto escuro.

## Paleta de cores (verbatim do `lib/design-tokens.ts`)

### Brand primário — verde esmeralda (emerald scale)

```
emerald.50:  #ecfdf5    ← bg muito claro
emerald.100: #d1fae5
emerald.200: #a7f3d0
emerald.600: #059669    ← PRIMARY (favicon, accents principais)
emerald.700: #047857
emerald.800: #065f46
```

### Cores específicas do wordmark (do componente `LaudoUSGLogo.tsx`)

Light mode:
```
mainColor:   #18533F    ← "Laudo" — verde escuro elegante (NÃO é emerald do tailwind)
accentColor: #4a8a6a    ← "USG" — mid-green accent
subColor:    rgba(24,83,63,0.45)  ← tagline (40-45% opacity do mainColor)
```

Dark mode:
```
mainColor:   #6ee7b7    ← "Laudo" — emerald-300 (verde mais claro pra contraste)
accentColor: rgba(110,231,183,0.65)
subColor:    rgba(110,231,183,0.45)
```

White variant (over photos/dark backgrounds):
```
mainColor:   #ffffff
accentColor: rgba(255,255,255,0.65)
subColor:    rgba(255,255,255,0.45)
```

### Suporte (do design-tokens.ts)

```
gray.50-950: escala completa (#f9fafb → #030712)
red.500:     #ef4444  ← semantic error
amber.600:   #d97706  ← semantic warning
green.700:   #15803d  ← semantic success
```

## Catálogo de logos (do `brand.logos` em `design-tokens.ts`)

| ID | Arquivo | `useOn` (contexto) |
|---|---|---|
| `transparent` | `logos/logo-laudousg-transparent.png` | **light** (background claro) — **PRIMÁRIO (só ícone)** |
| `white` | `logos/logo-laudousg-white.png` | **dark** (background escuro — só ícone) |
| `main` | `logos/logo-laudousg-main.png` | any (logo completo HORIZONTAL — **MAS tem fundo branco opaco**) |
| `gold` | `logos/logo-gold.png` | premium (badges de plano pago / VIP — **tem fundo cinza opaco**) |
| `mockup` | `logos/logo-laudousg-mockup.png` | context (apresentações) |
| `mockups` | `logos/logo-mockups.png` | context (apresentações multi-device) |
| `fundobranco` | `logos/logo-fundobranco.png` (PNG) + `logo-fundobranco-jpg.jpg` (JPG) | branco/sólido — útil em impressos |

**`primaryLogoPath`** no original: `/brand/logo-laudousg-transparent.png`. No mobile, equivalente: `assets/brand/logos/logo-laudousg-transparent.png`.

### ⚠️ Importante — versão "completa" (ícone + wordmark juntos)

Os 7 arquivos acima do catálogo oficial NÃO incluem nenhuma versão com **ícone + wordmark "LaudoUSG" juntos em uma única imagem com fundo transparente**. O que existe:

- `logo-laudousg-transparent.png` (450×581, 112 KB) = **só o ÍCONE visual**. O wordmark é renderizado SEPARADO (como texto HTML/RN) pelo componente `LaudoUSGLogo.tsx`.
- `logo-laudousg-main.png` (2816×1536, 4 MB) = logo completo (ícone + nome horizontais), mas tem **fundo branco opaco** (pixel 0,0 = `rgb(249,251,250,255)`).
- `logo-laudousg-white.png` (322×433, 56 KB) = **só o ÍCONE** versão branca (pra fundos escuros).

### Variantes processadas LOCALMENTE (não vieram do original)

Como o `main.png` é o único que tem o **logo completo (ícone + wordmark "LaudoUSG" juntos)**, mas tinha fundo branco opaco, foi processado com remoção de fundo via NumPy (máscara brightness+saturation com anti-alias preservado):

| Arquivo | Dimensões | Tamanho | Qualidade | Quando usar |
|---|---|---|---|---|
| **`logos/logo-laudousg-main-nobg-1024.png`** | 1024×558 | 592 KB | **256 níveis alpha** (anti-alias suave) | **RECOMENDADO PRA MOBILE** — logo completo em fundo transparente, peso aceitável |
| `logos/logo-laudousg-main-nobg.png` | 2816×1536 | 2.4 MB | 61 níveis alpha | Alta resolução pra impressos/web |
| `logos/logo-laudousg-nobg.png` (tentativa anterior) | 2816×1536 | 1.5 MB | **2 níveis alpha** (bordas binárias) | NÃO recomendado — qualidade visual inferior |

**Como o componente `LaudoUSGLogo.tsx` usa hoje:** carrega só o ÍCONE (`logo-laudousg-transparent.png`) e renderiza "Laudo" + "USG" como texto HTML/RN ao lado, com tipografia controlável (Inter Bold + Inter Regular). Essa abordagem é mais flexível (responsiva, dark mode, controle de tamanho) que usar a imagem `main-nobg` inteira.

**Quando usar o `main-nobg-1024.png`:** se quiser o logo como uma única peça visual (ex: hero de marketing, share image, OG tag, splash screen com a marca pronta sem depender de fontes carregadas).

## Estrutura do diretório

```
assets/brand/
├── BRAND-NOTES.md            ← este arquivo
├── logos/                    ← 8 arquivos de logo (PNG + 1 JPG)
│   ├── logo-laudousg-transparent.png   ← PRIMÁRIO (usar sobre claro)
│   ├── logo-laudousg-white.png         ← sobre escuro
│   ├── logo-laudousg-main.png          ← versão completa
│   ├── logo-gold.png                   ← variante premium/pago
│   ├── logo-laudousg-mockup.png        ← apresentações
│   ├── logo-mockups.png                ← apresentações multi-device
│   ├── logo-fundobranco.png            ← sólido (impressos)
│   └── logo-fundobranco-jpg.jpg        ← idem, em JPG
├── icons-pwa/                ← PWA / Web icons (para Next.js web companion)
│   ├── apple-touch-icon.png            ← 180×180 (iOS Safari)
│   ├── icon-192.png                    ← PWA manifest standard
│   ├── icon-512.png                    ← PWA manifest large
│   └── icon-maskable-512.png           ← PWA maskable (Android adaptive)
├── favicon/
│   └── icon.svg                        ← Favicon vetorial (Next.js app/icon.svg)
├── expo/                     ← Assets já formatados pro Expo (mobile)
│   ├── icon.png                        ← ícone do app (iOS+Android)
│   ├── adaptive-icon.png               ← Android adaptive (foreground)
│   ├── splash-icon.png                 ← splash screen
│   ├── favicon.png                     ← favicon do build web do Expo
│   ├── logo-laudousg-main.png          ← uso in-app
│   └── logo-laudousg-transparent.png   ← uso in-app
└── web-component/
    └── LaudoUSGLogo.tsx                ← componente React de referência
                                          (Next.js + next-themes + next/image — adaptar pra Expo Image)
```

## Favicon SVG (verbatim do original)

`favicon/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="8" fill="#059669"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="white">L</text>
</svg>
```

Square com `border-radius: 8` (rx=8 sobre 32×32 = 25%), fundo `emerald.600` (#059669), letra "L" branca em Arial Bold. Versão minimalista para favicon — não tem o wordmark completo.

## Componente React de referência (`web-component/LaudoUSGLogo.tsx`)

API atual do componente:

```tsx
<LaudoUSGLogo
  size="sm" | "md" | "lg"      // default: 'md'
  variant="default" | "white"   // default: 'default'
  className?: string
/>
```

Tamanhos:
- `sm`: 28px ícone + texto base + tagline `text-[8px]` (mas tagline OMITIDA em `sm`)
- `md`: 36px ícone + texto xl + tagline `text-[9px]`
- `lg`: 48px ícone + texto 3xl + tagline `text-[11px]`

Detalhes de implementação:
- Usa `next/image` com `priority` (para LCP)
- Usa `next-themes` para detectar dark mode
- Wordmark é HTML (não imagem) — render via `<span>` com tracking-tight, leading-none, font-black no "Laudo"
- Tagline é uppercase, tracking-widest, font-medium

## NOT FOUND no original

- `STYLE.md` ou `BRAND.md` — não existe no repo `/Users/luizprazeres/laudousg`. As informações acima foram **extraídas** de `lib/design-tokens.ts:172-180` (catálogo de logos) e `components/LaudoUSGLogo.tsx` (cores literais).
- Arquivos `.ai` (Illustrator) ou `.fig` (Figma) — não estão versionados no repo.
- Versão SVG vetorial do wordmark completo — só existe o favicon SVG simples; o wordmark é renderizado em HTML/CSS no componente, e os logos completos são todos PNG.

## Recomendações para o Mobile (não estavam no original — sugestões)

1. **`expo/icon.png` (1024×1024)** já existe e é o oficial pra `app.json` → `expo.icon`.
2. **`expo/adaptive-icon.png`** já existe e é pra Android (`expo.android.adaptiveIcon.foregroundImage`). O background pode ser `#059669` (emerald.600) ou `#ffffff` dependendo da escolha.
3. **`expo/splash-icon.png`** já existe e é pra `expo.splash.image`. Background do splash recomendado: `#ecfdf5` (emerald.50) light / `#065f46` (emerald.800) dark.
4. **Tela de login:** usar `logos/logo-laudousg-transparent.png` em fundo claro OU `logos/logo-laudousg-white.png` em fundo escuro/foto.
5. **Componente React Native:** se quiser portar o `LaudoUSGLogo.tsx`, trocar `next/image` por `expo-image` e remover `next-themes` (usar `useColorScheme` do RN).
6. **Variante `gold`** (`logos/logo-gold.png`): exclusiva para áreas de plano premium/pago. Não usar em UI free tier.

## Comandos para validar as cópias

```bash
ls -la /Users/luizprazeres/Library/CloudStorage/GoogleDrive-contato@luizprazeres.com.br/Meu\ Drive/laudousgmobile/apps/mobile/assets/brand/
```
