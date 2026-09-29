# Sala do Auxiliar: design de uso — 28/09/2026

Fase de design. Nada de código, commit, build ou deploy. Alvo: `apps/api/src/app/sala/[token]/page.tsx` (3.478 linhas, `"use client"`). A migração de domínio e o contrato de revisão são de outras frentes; aqui só **consumimos** esses contratos.

## 1. Quem usa e o que precisa

O médico faz o exame e dita no celular. A auxiliar, leiga, fica no computador da sala, copia o laudo para o sistema da clínica e imprime. Ela precisa responder a três perguntas sem ler jargão: **qual laudo é de qual paciente, se o médico já revisou e se pode copiar.**

### O que a página atual faz e atrapalha

| Hoje (código) | Efeito para a auxiliar |
|---|---|
| `selectedReportId === null` exibe sempre o último laudo ("ao vivo") | Um laudo novo **troca a tela** enquanto ela copia outro |
| `/api/sala/latest` ordena por `updated_at` | Uma edição do médico faz um laudo antigo subir para o topo e virar "o atual" |
| `ReportView` pagina em colunas A4 (`columnCount`) dentro de `overflow-x: auto` | Laudo longo vira páginas **lado a lado** com rolagem horizontal no 1440 |
| Lista mostra só hora + categoria | Três "Abdome total" seguidos ficam indistinguíveis |
| Rodapé: "Polling a cada 5s · última sincronização" (o intervalo real é 3 s) | Jargão, e ainda com um número errado |
| Nenhum sinal de revisão | Ela não sabe se o texto é final |

## 2. Abordagens

**A. Remendar o monolito.** Trocar `ReportView` e acrescentar o estado dentro do `page.tsx`. É o caminho mais rápido. Em compensação, o arquivo passa de 3,5 mil linhas, e a regra "não roubar a seleção" fica misturada ao polling, sem teste possível.

**B. Extrair a lógica e trocar o palco (recomendada).** Três unidades puras, testáveis sem navegador, e o `page.tsx` só compõe:
- `sala/[token]/_lib/selection.ts`: reducer `(estado, evento) → estado` com a política de seleção (seção 4). Eventos: `feedLoaded`, `userSelected`, `userNext/Prev`, `reportChanged`, `tokenInvalid`.
- `sala/[token]/_lib/localNames.ts`: leitura, escrita e limpeza de nomes em `sessionStorage` (seção 5).
- `sala/[token]/_lib/reviewState.ts`: mapeia o payload do contrato para `confirmed | pending | invalidated | unknown`, com fallback seguro.
- `_components/ReportReader.tsx` (leitura vertical), `DayList.tsx` e `ReviewBanner.tsx`.

Frases, anotações, esquemas, tema, destaque e impressão **ficam onde estão**. O `Shell` só recebe as peças novas.

**C. Sala v2 em rota paralela atrás de flag.** Rollback trivial, mas duplica 3,5 mil linhas no mesmo momento em que a frente de domínio mexe nos rewrites de `/sala/[token]`. Fica como plano B, caso o passo 2 de B quebre algo que não se consiga isolar.

**Recomendação: B.** O risco real está na política de seleção e no nome local, e são justamente as partes que B deixa puras e testáveis. A mudança visual fica restrita ao palco do laudo e à lista.

## 3. Wireframes

### 1440 × 900

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ LaudoUSG · Sala do Auxiliar            ● Conectado        14:32   ☾  ?  Sair │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ LAUDOS DE HOJE (5)    │ ┌──────────────────────────────────────────────────┐ │
│ ┌───────────────────┐ │ │ ✔ REVISADO PELO MÉDICO · 14:30   [ Copiar laudo ]│ │ ← faixa de estado
│ │▌14:28 Abdome total│ │ │   Pode copiar e imprimir.                        │ │   sticky
│ │  Maria S.         │ │ └──────────────────────────────────────────────────┘ │
│ │  ✔ Revisado       │ │  Paciente: [ Maria S.______ ] só neste computador  │
│ ├───────────────────┤ │  ‹ Anterior   2 de 5   Próximo ›       Imprimir     │
│ │ 14:15 Pelve       │ │ ┌──────────────────────────────────────────────────┐ │
│ │  (sem nome)       │ │ │ ULTRASSONOGRAFIA DE ABDOME TOTAL                 │ │
│ │  ⏳ Aguardando    │ │ │ TÉCNICA ...                                      │ │
│ ├───────────────────┤ │ │ ACHADOS ...                                      │ │ ← uma coluna,
│ │●NOVO 14:31 Tireoide│ │ │ ...  (rola para baixo, sem páginas lado a lado) │ │   largura ~720px,
│ │  ⏳ Aguardando    │ │ │ IMPRESSÃO ...                                    │ │   rolagem vertical
│ └───────────────────┘ │ └──────────────────────────────────────────────────┘ │
│ [Frases] [Anotações]  │  Esquemas (1) ▸                                       │
└───────────────────────┴──────────────────────────────────────────────────────┘
          ┌────────────────────────────────────────────┐
          │ Chegou um laudo novo · Tireoide · 14:31 [Abrir] ✕ │  ← aviso, não troca a tela
          └────────────────────────────────────────────┘
```

### 390 × 844

```
┌──────────────────────────────┐
│ Sala do Auxiliar   ● Conectado│
│ [ Laudos de hoje (5) ▾ ]     │ ← abre a lista em folha inferior
├──────────────────────────────┤
│ ⏳ AGUARDANDO REVISÃO         │ ← faixa grande, texto + cor + ícone
│ O médico ainda não confirmou.│
├──────────────────────────────┤
│ Pelve · 14:15                │
│ Paciente: [____________]     │
│ ULTRASSONOGRAFIA PÉLVICA ... │
│ ... (rolagem vertical)       │
├──────────────────────────────┤
│ ‹  2 de 5  › [Copiar rascunho]│ ← barra inferior fixa, alvos de 44px
└──────────────────────────────┘
```

A página inteira segue a identidade LaudoUSG: tinta `#15201a`, esmeralda só para o estado "revisado" e para a ação primária, e papel branco. Todo estado usa **texto, ícone e cor** juntos, com contraste AA ou melhor, e nunca só a cor. Não pode haver rolagem horizontal em 390 nem em 1440.

## 4. Seleção, navegação e laudo novo

Regra única: **a seleção só muda por ação da auxiliar.** A única exceção é quando ainda não há nada selecionado.

| Evento | Comportamento |
|---|---|
| Primeira carga com laudos | Seleciona o mais recente por `createdAt` |
| Primeira carga sem laudos | Estado "Esperando o primeiro laudo do dia"; o primeiro que chegar é selecionado (não há nada a roubar) |
| Chega um laudo novo | Entra na lista com o selo "NOVO"; aviso "Chegou um laudo novo · <categoria> · <hora> [Abrir]"; a tela **não muda** |
| O laudo selecionado muda de conteúdo | Texto atualiza no lugar, a rolagem se mantém, aparece o aviso "O médico alterou este laudo agora" e, se estava revisado, entra em `invalidated` |
| Outro laudo muda | Selo "ALTERADO" na lista, sem aviso intrusivo |
| Anterior / Próximo, atalhos `←` `→` e `J` `K` (fora de campos de texto) | Percorre a lista na ordem exibida |
| O laudo selecionado some da resposta (ocultado ou fora do dia) | Continua exibido, com a nota "Não está mais na lista de hoje", até a auxiliar escolher outro |

A lista é ordenada por **`createdAt` decrescente no cliente** e não por `updated_at`, para que uma edição não reordene nada. "Voltar ao vivo" deixa de existir: com "NOVO" e Próximo, não é mais necessário. A cópia sempre usa o texto que está **na tela** naquele instante.

## 5. Nome do paciente (local e temporário)

- É um campo opcional acima do laudo, com a legenda "só neste computador; não vai para o laudo". Também aparece na lista.
- Fica em `sessionStorage`, na chave `sala:names:v1:<token>:<AAAA-MM-DD BRT>`, com o valor `{ [reportId]: string }` (até 60 caracteres, texto puro).
- **Nunca** é enviado ao servidor, nunca é gravado em anotação, log, título do documento, URL, cópia ou impressão.
- É apagado nestes casos:
  - ao clicar em **Sair**, que também limpa a seleção;
  - ao fechar a aba (comportamento nativo do `sessionStorage`);
  - na virada do dia BRT, verificada a cada carga e a cada minuto, quando as chaves de outros dias somem;
  - quando o token volta como `revoked`, `expired` ou `not_found`;
  - quando a página abre com outro token, e as chaves de tokens diferentes são removidas.
- Limitação aceita e explicada na legenda: abrir a Sala em outra aba começa sem nomes.

## 6. Revisão médica

A UI depende do contrato `sala_contract`. O formato mínimo esperado em `latest`, `report` e em cada item de `reportsToday` é:

```
review?: { status: "confirmed" | "pending"; confirmedAt?: string; invalidatedAt?: string }
```

| Estado na UI | Quando | Faixa | Botão |
|---|---|---|---|
| `confirmed` | O médico confirmou este conteúdo | ✔ verde: "Revisado pelo médico · 14:30. Pode copiar e imprimir." | **Copiar laudo** (primário) |
| `pending` | Nunca confirmado, ou vindo de app antigo | ⏳ âmbar: "Aguardando revisão do médico." | Copiar rascunho (secundário) |
| `invalidated` | Confirmado, mas editado depois | ⚠ laranja forte: "O laudo mudou depois da revisão. Aguarde nova confirmação." | Copiar rascunho (secundário) |
| `unknown` | Campo ausente, erro ou API antiga | ⏳ cinza: "Revisão não confirmada." | Copiar rascunho (secundário) |

Regras:
- Na dúvida, a UI **nunca mostra "revisado"**.
- Copiar, imprimir e abrir **não mudam** o estado de revisão, e o texto copiado não leva selo, nome ou status.
- Não existe botão de revisar na Sala: só o médico autenticado confirma.
- Copiar rascunho não fica bloqueado, porque a auxiliar pode precisar adiantar o cadastro. O rótulo do botão, porém, deixa claro que é rascunho.

## 7. Estados da página

| Estado | Texto (sem jargão) |
|---|---|
| Carregando | "Abrindo a Sala…" (esqueleto da lista e do papel, sem piscar números) |
| Conectado | "● Conectado · atualiza sozinho" |
| Falha momentânea (1–2 tentativas) | Nada muda na tela |
| Sem conexão (3 ou mais falhas, ou mais de 10 s) | Faixa cinza "Sem conexão. Tentando de novo…" O laudo aberto continua na tela e a cópia continua funcionando |
| Carregando o laudo escolhido | Esqueleto só no papel, e a lista continua clicável |
| Erro ao abrir o laudo escolhido | "Não foi possível abrir este laudo. [Tentar de novo]" |
| Falha ao copiar | "Não foi possível copiar. Selecione o texto e use Ctrl+C." |
| Dia vazio | "Nenhum laudo hoje ainda. Assim que o médico gerar, ele aparece aqui." |
| Código revogado, expirado ou inválido | As telas atuais (`InvalidState`), com os nomes locais já apagados |

## 8. Checkpoints (escopo estreito)

1. **C0 (entrada):** o contrato de `review` publicado pela `sala_contract`. Sem ele, C1–C3 seguem com `unknown` e a UI já fica segura.
2. **C1:** extrair `selection.ts`, `localNames.ts` e `reviewState.ts`, com testes unitários da tabela da seção 4, das regras de limpeza e do fallback. **Zero mudança visual.**
3. **C2:** palco vertical (`ReportReader`) no lugar das colunas A4, mais Anterior/Próximo, atalhos, aviso de laudo novo e a nova lista. Remover "Voltar ao vivo" e o rodapé de polling.
4. **C3:** campo de nome, com verificação no DevTools de que o nome não aparece em nenhuma requisição, na cópia nem na impressão.
5. **C4:** faixa de revisão ligada ao contrato real.
6. **C5, QA:** 1440 e 390, só teclado, laudo de 3 ou mais páginas, laudo novo chegando durante uma cópia, edição de um laudo revisado, virada do dia simulada, token revogado, e lint, typecheck e testes focados. Tudo em prévia; produção é com o root.

Fora do escopo: migração de host, backend de revisão, frases, anotações, esquemas, estatísticas e a citação motivacional.

## 9. Decisões para o root confirmar

1. Copiar rascunho continua **liberado** nos estados não revisados, com rótulo e estilo secundário. Alternativa: exigir um segundo clique "Copiar mesmo assim".
2. Ordem da lista por `createdAt` no cliente. O endpoint continua ordenando por `updated_at` para os clientes antigos.
3. Remover "Voltar ao vivo" e o rodapé "Polling a cada 5s" (que está errado; o intervalo real é 3 s).
