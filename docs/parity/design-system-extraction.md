# Design System — extração iOS × estado RN

> Gerado 2026-07-04 (Fase 0). Fonte iOS: `DesignSystem/` (`Color+Tokens.swift`, `Font+Tokens.swift`, `Spacing.swift`, `Shadows.swift`). Fonte RN: `src/ui/tokens.ts`, `src/ui/useColorTokens.ts`.

## 1. Cores — comparação

### Brand (iguais ✅)
| Token | iOS | RN light | RN dark |
|---|---|---|---|
| primary | `#059669` | `#059669` ✅ | `#10B981` |
| primaryDeep | `#065F46` | `#065F46` ✅ | — |
| primarySoft | `#D1FAE5` | brandLight `#D1FAE5` ✅ | — |
| primaryHover | `#047857` | ❌ falta | — |
| primaryBorder | `#A7F3D0` | ❌ falta | — |
| primaryTint | `#ECFDF5` | ❌ falta | — |
| wordmark | `#18533F` / dark `#6EE7B7` | `#065F46` ⚠️ divergente / dark `#6ee7b7` ✅ | |

### Superfícies (AppSurface iOS = dinâmico light/dark)
| Token | iOS light | iOS dark | RN light | RN dark |
|---|---|---|---|---|
| background | `#F2F2F7` | `#0B0B0F` | ✅ | ✅ |
| card | white | `#1C1C1E` | ✅ | ✅ |
| muted | gray50 `#F9FAFB` | `#131316` | ❌ falta | ❌ |
| border | gray200 `#E5E7EB` | `#2C2C2E` | usa `separator` rgba iOS-style ⚠️ | idem |
| textPrimary | gray900 `#111827` | white | `#000000` ⚠️ | ✅ |
| textSecondary | gray600 `#4B5563` | `#8E8E93` | rgba(60,60,67,…) ⚠️ escala Apple, não a Neutral do DS | rgba(235,235,245,…) |
| textMuted | gray400 `#9CA3AF` | `#636366` | rgba ⚠️ | rgba |

> **Δ estrutural:** o RN usa a escala de cinza do iOS system (rgba 60,60,67) em vez da escala Neutral gray50–900 do DesignSystem Swift. Para paridade visual real, migrar `text2/textSec/textMute/separator/fill*` para os hex Neutral + `border`/`muted`.

### Neutral (iOS `NeutralColor`, RN ❌ não tem)
`gray50 #F9FAFB · 100 #F3F4F6 · 200 #E5E7EB · 300 #D1D5DB · 400 #9CA3AF · 500 #6B7280 · 600 #4B5563 · 700 #374151 · 800 #1F2937 · 900 #111827`

### Semantic (iOS completo, RN parcial)
| | iOS | RN |
|---|---|---|
| error | Bg `#FEF2F2` Border `#FECACA` Text `#B91C1C` Accent `#FF3B30` | só `danger #FF3B30` (dark `#FF453A`) |
| warning | Bg `#FFFBEB` Border `#FDE68A` Text `#B45309` | warningBg/warningText ✅ aprox |
| success | Bg `#F0FDF4` Border `#BBF7D0` Text `#15803D` | ❌ |
| info | `#2563EB` | ❌ |

### Cores por categoria
iOS: `Models/Category.swift:104-119` (`tintHex`) — abdome `059669`, mama `F43F5E`, pelve `A855F7`, obstétrica `EC4899`, doppler `F59E0B`, morfológico `8B5CF6`… RN: `CATS[].color` em `tokens.ts:129-144` — **conferir 1:1 ao expandir para 28 categorias**.

## 2. Tipografia

| | iOS | RN |
|---|---|---|
| Famílias | Inter (body) + Barlow (display) | ✅ iguais (`FONT`, tokens.ts:84-92) |
| Escala | TextStyle: caption 12, footnote 13, body 14, bodyLarge 16, subtitle 18, h3 20, h2 24, h1 30 (ExtraBold), display 36, hero 48 | ❌ RN não tem escala nomeada — tamanhos inline por tela |

**Ação:** criar `TEXT_STYLE` no tokens.ts espelhando a escala iOS (nome→size/weight/família) e migrar gradualmente.

## 3. Spacing / Radius — ✅ JÁ IGUAIS

- SPACING: 0/4/8/12/16/24/32/48/64/96 — idêntico (`Spacing.swift` ↔ `tokens.ts:98-108`).
- RADIUS: 4/6/8/12/16/24/pill999 — idêntico.

## 4. Sombras — iOS tem 5 níveis, RN não tem tokens

iOS `Shadows.swift`:
| Nível | cor/opacity | radius | y |
|---|---|---|---|
| sm | black 0.04 | 2 | 1 |
| md | black 0.06 | 6 | 2 |
| lg | black 0.08 | 12 | 4 |
| xl | black 0.10 | 24 | 8 |
| cardHover | primary 0.10 | 16 | 6 |

RN: sombras inline espalhadas (ex.: `generate.tsx:1190-1207`). **Ação:** criar `SHADOW` tokens (iOS shadow* + `elevation` Android equivalente: sm=1, md=3, lg=6, xl=12) e substituir os inline.

## 5. Animações / interação

| iOS | Valor | RN equivalente sugerido |
|---|---|---|
| `laudousgSmooth` | spring response 0.35 | Reanimated/`Animated.spring` afinado; já há animações no login |
| `laudousgSnappy` | spring 0.24 | idem |
| `PressableButtonStyle` | scale 0.98 + opacity 0.92, easeOut 0.12s | `Pressable` com style fn — padronizar num `PressableScale` |
| PrimaryButton | h48, radius xl, loading→checkmark | RN `Button` existe; adicionar estado loading/success |
| SecondaryButton | h40, outline, radius lg | criar |

## 6. Dark mode — estado real RN (o gap nº 1 de design)

- `useColorTokens()` só segue o **tema do SO**; a preferência do usuário (`laudousg.theme_mode` em AsyncStorage, UI em `preferencias.tsx:39-43`) **nunca é aplicada** — não existe ThemeProvider.
- **Light-locked** (usam `C` fixo): `generate.tsx` (home!), `report/[id].tsx`, `_layout.tsx` (+ `StatusBar style="dark"` fixo `:57`), `Segment`, `Sheet`, `Suggestion`, `MenuSheet` (fixado deliberadamente, `MenuSheet.tsx:79`), `SalaPairingSheet`, `CategorySheet`, `PlusSheet`, `CalculatorsSheet`, `IGCalculatorSheet`, `DopplerCalculatorSheet`, `RecordingOverlay`.
- **Já respeitam tema**: historico, analytics, preferencias, sobre, biblioteca, seguranca, login (parcial — `BRAND` hardcoded `:29`), Banner, Field, PageHeader, Button, EmptyState.

**Plano de correção (ordem):**
1. `ThemeProvider` (context) que resolve `auto|light|dark` a partir do AsyncStorage + `useColorScheme()`; `useColorTokens` passa a ler dele. StatusBar dinâmica.
2. Migrar telas light-locked: generate → report → sheets (um PR por bloco, screenshot antes/depois).
3. Igualar iOS: no iOS o toggle de tema está em Settings›Aparência (Sistema/Claro/Escuro) e no LoginView (`@AppStorage("preferredColorScheme")`).

## 7. Divergências a decidir (não bloqueiam)

- `wordmark` light: iOS `#18533F` × RN `#065F46` — adotar o iOS.
- RN tem `brandLight` como fundo de chip; iOS usa `primarySoft`+`primaryTint` distintos — adotar os 3 do iOS.
- Splash RN: fundo `#000000` com logo branca; conferir contra LaunchScreen iOS.
