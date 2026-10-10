# Decisões do Luiz — 10/10/2026 (tarde)

Fonte: resposta do Luiz ao consolidado de pendências. Cada item tem dono (frente) e vira teste.

## IG (W1)
- Quando o "hoje com" ditado diverge da 1ª US ditada **e** da linha da calculadora (que concordam), **segue a calculadora** —
  normalmente é erro de digitação/fala. Os casos e1f15cab/e5dfd891 eram fictícios (teste do Luiz). Manter o aviso no card.

## FIGO (W4)
- "intramural" sozinho = **FIGO 4**.
- Localização × FIGO incompatíveis = **[REVISAR]** (como está).
- FIGO **só na conclusão** (como está).
- Combinações vizinhas dos finais ("subseroso com menos de 50% intramural (FIGO 5)", "intramural (FIGO 5)"): **não sinalizar** —
  a auditoria não acusa vizinhas na mesma família/fronteira (4↔5, 5↔6, 1↔2…); incompatível de verdade (ex.: submucoso FIGO 6)
  continua [REVISAR].
- Texto das opções: o Luiz não viu a tabela — reenviada; aguardando confirmação (seguem provisórios).

## Clínicas
- A04 endométrio "normal para a fase do ciclo" automático: **mantém** (sem mudança).
- A08 morfologia típica no corpo com ditado só-diagnóstico (MSK/partes moles): **mantém**.
- A10 "Correlacionar com dados clínicos" automático no catálogo de partes moles: **pergunta reexplicada** ao Luiz; sem mudança.
- A11 esteatose moderada/acentuada com atenuação e visualização parcial automáticas: **mantém**.
- A07 "2 9 cm" (dois números separados por espaço antes da unidade) = **2,9 cm** (W10c: reverter a marca [REVISAR] desse caso;
  manter [REVISAR] só para o realmente ambíguo, ex.: eixos faltando).
- Tireoide: **somar o volume** dos dois lobos **incluindo o istmo** — exceção aprovada à regra "só calcule se pedir" (W10c:
  documentar a exceção no prompt e conferir que o istmo entra).

## Termos (W10b, dono do léxico W11)
1. "ecogênico(a)" sozinho → **hiperecoico(a)** ("foco ecogênico" → "foco hiperecoico"). "ecogenicidade" fica. **Exceção pendente**:
   a frase do golf ball "foco ecogênico intracardíaco" (snippet obstétrico em prod) — não mexer até o Luiz confirmar.
2. "bolsa" → **"bursa"** (MSK).
3. Compartimentos do punho **sempre em romano** (como está).
4. MSK: **"modificação do padrão ecotextural"** (não "alteração").
5. Corrigir "-ecogênico" nas frases fixas da **web** (`apps/web/src/lib/deterministic/organs/*`) e da **Biblioteca**
   (`packages/knowledge/snippets` e, se houver, `knowledge_blocks` no banco → SQL com guardas para o orquestrador aplicar).
6. **Ligar** os keyterms W11 do Deepgram (por categoria, mama primeiro — entra no pacote de deploy como env).

## Fila nova
- **W15 — Comentários/técnica padrão por via e transdutor** (briefing `W15-comentarios-tecnica.md`).

## Rodada 2 (10/10, noite)
- **Próstata**: a técnica da Biblioteca passa para a frase **longa** dos finais ("Exame realizado com transdutor de 4.0 MHz, pela
  técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais,
  longitudinais, oblíquos e coronais abrangendo toda a pelve.") — W4 gera o SQL com guardas na W15; orquestrador aplica.
- **FIGO**: tabela aprovada, exceto **2-5 = "subseroso, estendendo-se desde a mucosa"** (W4).
- **Golf ball**: mantém **"foco ecogênico intracardíaco"** (exceção do léxico, como está).
- **"Calcule o volume" ditado** (W10c tireoide; W10b writer completo): quando o médico pede, calcular o volume da estrutura
  com 3 eixos ditados (C × L × AP × 0,52, elipsoide, em cm³, uma casa decimal como nos lobos) e, na tireoide, somar ao volume dos
  lobos para o volume total. Exemplo: "lobo direito medindo X x Y x Z com volume de V1, lobo esquerdo … com volume de V2, istmo
  medindo A x B x C, calcule o volume" → volume do istmo calculado + VT = V1 + V2 + istmo. Sem o pedido e sem volume ditado, nada
  é inventado (fica como hoje). O caso 42fbb3eb foi esquecimento do volume do istmo, não defeito.
- **"Correlacionar com dados clínicos" (partes moles, A10)**: **só quando o médico ditar** — sai do catálogo (`PARTES_MOLES.ts`: renderer, roteiro do prompt e few-shots) quando não ditado (W10b).
- **"Correlacionar com dados clínicos" em TODAS as categorias e superfícies** (renderers da API, catálogo, prompts/few-shots, web
  `apps/web`, shared/snippets, Biblioteca no banco): **só quando o médico ditar**, na redação dele (W10b; SQL da Biblioteca só como
  proposta com guardas, o orquestrador aplica).
- **Condutas específicas ligadas a uma alteração** ("correlacionar com as dosagens de TSH / cálcio e PTH / PSA / FSH e LH",
  "marcadores tumorais", "avaliação urológica"…): **continuam automáticas** conforme o modelo da alteração, mesmo sem ditado. Só a
  frase genérica "Correlacionar com dados clínicos" depende do ditado (como já implementado).
