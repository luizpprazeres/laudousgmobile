# 09 — Revisão adversarial do plano de correções no laudo

Revisão do plano descrito em `08-correcoes-no-laudo.md`, considerando a decisão
posterior de que as linhas `REVISAR: ...` devem aparecer dentro do texto exibido
na Sala do Auxiliar. A Sala deverá retirar essas linhas ao usar o botão Copiar e
avisar que existem pendências.

## Resumo executivo

Antes da implementação, eu mudaria três premissas do plano:

1. `trecho literal + ocorrência` ajuda a localizar uma pendência num texto
   estático, mas não autoriza uma substituição depois que o médico começou a
   editar. O texto precisa de revisão/hash, e a sugestão precisa ficar obsoleta
   quando sua base muda.
2. `structured_output` não é uma fonte determinística. No caminho renderer, ele
   é extraído por LLM (`pipeline/renderer.ts:47-52,214-225`). Um valor presente
   ali só pode virar correção aplicável se também estiver ancorado no ditado ou
   for validado por uma regra determinística.
3. A taxonomia `falta | sugestao` não representa um erro conhecido cuja correção
   o sistema não sabe. Esse terceiro estado é necessário para não esconder o
   problema nem chamá-lo falsamente de ausência.

O maior risco novo é temporal: hoje o sanity determinístico existe antes do
`done`, mas o sanity de IA termina depois. Se as pendências virarem texto, não é
seguro acrescentar ou remover linhas `REVISAR:` depois que o cliente já recebeu
`done` e pode ter começado a editar. O texto entregue no `done` deve ser
imutável do ponto de vista da geração.

---

## 1. Âncora textual enquanto o médico edita

### 1.1 `trecho + ocorrência` não identifica semanticamente o alvo

O contrato proposto usa:

```ts
ancora: { trecho: string; ocorrencia: number }
```

Isso resolve apenas a duplicidade no instante em que a pendência foi criada. Não
acompanha o trecho através de edições.

Exemplo: a pendência aponta para a segunda ocorrência de `Ovário de aspecto
normal.`. O médico insere a mesma frase antes dela. A segunda ocorrência ainda
existe, mas agora corresponde a outro ovário. O localizador encontra texto e
ocorrência válidos e destaca a frase errada. Nesse caso não há falha de
`indexOf`; há sucesso no alvo errado.

Também existem alterações menos óbvias que quebram a identidade: corrigir
pontuação, trocar espaço por quebra de linha, mudar `3,4 cm` para `34 mm`, inserir
uma palavra dentro da frase ou remover uma ocorrência idêntica anterior. Em todos
esses casos, o significado pode continuar o mesmo enquanto a âncora literal
some ou muda de posição.

O campo `ocorrencia` não permite cumprir a promessa de R3 — “nunca destacar o
trecho errado”. Ele só permite degradar quando nenhum match existe. Não detecta
o match semanticamente errado.

### 1.2 O comportamento atual deixa a pendência obsoleta durante a digitação

No iOS, o `SanityChecker` roda uma vez quando chega `done`
(`GenerateViewModel.swift:524-535`). Depois disso, `laudoTextChanged` altera o
texto e dispara autosave, mas não recalcula os issues
(`GenerateViewModel.swift:447-467`).

No Android, `EDIT_FINAL` troca `finalText` e preserva o mesmo `sanity` no estado
(`apps/mobile/src/features/generate/state.ts:109-112`). O card pode continuar
acusando algo já corrigido ou oferecer uma troca baseada numa versão anterior.

Enquanto o usuário digita, há três estratégias possíveis:

1. Recalcular e reancorar a cada tecla. É complexo, gera flicker e exige um
   editor estruturado ou transformação de ranges através de diffs.
2. Continuar exibindo a pendência antiga como se ainda fosse aplicável. É o
   caminho mais perigoso.
3. Manter o aviso, mas invalidar a ação automática assim que o texto-base muda.

Para a v1, recomendo a terceira. Qualquer edição manual posterior à detecção
deve mudar a pendência aplicável para `stale`. Ela pode continuar visível como
“reanalise este ponto”, mas o botão Aceitar desaparece até o alvo ser reconciliado
com o texto atual.

### 1.3 Contrato mínimo da âncora

A pendência deveria carregar, no mínimo:

```ts
type TextAnchor = {
  detectedOnRevision: number;
  detectedOnTextHash: string;
  trechoExato: string;
  contextoAntes: string;
  contextoDepois: string;
  ocorrencia: number;
};
```

O contexto reduz falsos matches, mas não substitui a revisão. A autorização para
aplicar deve exigir simultaneamente:

```text
revisão atual = revisão da detecção
hash atual = hash da detecção
slice atual = trecho exato esperado
```

Se qualquer condição falhar, não procurar outro match como fallback. A
pendência fica obsoleta e precisa ser reavaliada.

Quando `ReportDoc` existir, `slotId` melhora a identidade semântica, mas ainda
não resolve sozinho a edição concorrente. Em gemelar e outros blocos repetidos,
será necessário `slotId + instanceKey`, por exemplo
`biometria.dbp + feto:A`, além da revisão do documento.

### 1.4 Alteração recomendada em R3

R3 deveria ser reformulado para:

> Uma pendência é calculada sobre uma revisão específica do texto. Qualquer
> edição manual invalida a aplicação automática até nova reconciliação. A
> localização usa trecho e contexto apenas para apresentação; nunca autoriza
> substituição numa revisão diferente.

---

## 2. Modos de falha de “Aceitar sugestão”

### 2.1 Sugestões sobrepostas

Duas sugestões podem agir sobre a mesma região. Exemplo: A substitui a frase
inteira `Colo uterino mede 35 cm.` por uma versão corrigida; B substitui apenas
`35 cm` por `35 mm`. Aceitar A elimina o alvo de B. Aceitar B primeiro altera a
pré-condição de A. A ordem produz resultados diferentes.

O backend deve detectar sobreposição quando produz as pendências e criar grupos
de conflito. Ao aceitar uma sugestão do grupo, as demais precisam ser
invalidadas ou recalculadas. Não basta atualizar índices após cada troca.

Uma opção conservadora é não emitir duas ações aplicáveis para ranges
sobrepostos. O sistema escolhe a correção mais específica ou apresenta uma única
pendência para revisão manual.

### 2.2 Aceitar depois de o médico editar o trecho

Se o médico corrigiu `35 cm` para `35 mm` manualmente, o botão antigo não deve
mais aparecer. Se alterou para `3,5 cm`, o sistema também não pode procurar
`35 cm` em outro ponto e aplicar ali.

Aceitar precisa ser uma operação compare-and-swap: aplicar somente se a revisão
do laudo e o trecho atual ainda forem exatamente os esperados. Em conflito, o
servidor responde que a sugestão ficou desatualizada e devolve a versão atual.

### 2.3 Aceitar e depois desfazer manualmente

Registrar “pendência aceita” não prova que o texto continua corrigido. O médico
pode usar desfazer, recolocar o valor antigo ou alterar novamente a frase. O
evento de aceite é auditoria histórica; não deve ser a fonte da situação atual.

Ao mudar o texto depois do aceite, a pendência deve ser recalculada ou marcada
como “alterada após aceite”. Se o conteúdo problemático reaparecer, o aviso
precisa reaparecer. Caso contrário, o sistema mostrará “resolvido” enquanto o
erro voltou ao laudo.

A afirmação de que aceitar é “reversível” também precisa ser qualificada. Uma
substituição programática pode não entrar corretamente no undo nativo do
`TextEditor`/`TextInput`. Para reversão auditável, grave um patch com texto
anterior, texto posterior, revisão anterior, revisão posterior e autoria.

### 2.4 Duplo toque, retry e idempotência

O usuário pode tocar duas vezes, a rede pode repetir a chamada, ou o cliente pode
reenviar após timeout. A mesma sugestão não pode ser aplicada duas vezes.

`pendenciaId + expectedRevision` deve ser uma chave idempotente. Repetir a
operação devolve o resultado já aplicado. Se a revisão mudou por outra causa,
devolve conflito.

### 2.5 Corrida com o autosave local

Os apps mantêm saves adiados. Android usa debounce de 600 ms
(`apps/mobile/app/generate.tsx:154-215`) e iOS também usa 600 ms
(`GenerateViewModel.swift:447-456`).

Exemplo de perda silenciosa:

1. Médico digita no app; o texto A fica aguardando o debounce.
2. Uma sugestão é aceita e o servidor grava o texto B.
3. O timer antigo dispara e grava A por cima de B.

Antes de aceitar, o cliente precisa cancelar ou concluir o autosave pendente. Ao
receber a resposta, deve substituir seu estado local pelo texto e revisão
devolvidos pelo servidor. Também é necessário serializar saves para que uma
resposta antiga não chegue depois e marque como atual uma versão superada.

### 2.6 Concorrência entre app e Sala

Hoje os updates de `final_output` são last-write-wins. Android atualiza com
filtro apenas por `reportId` (`apps/mobile/src/lib/api.ts:255-275`). iOS faz PATCH
direto pelo mesmo ID (`HistoryService.swift:34-39`). Não existe revisão nem
pré-condição de versão.

Se app e Sala puderem aceitar ou editar:

1. ambos leem a revisão N;
2. o médico edita no app e grava N+1;
3. a Sala aceita uma sugestão baseada em N e envia o texto inteiro;
4. a escrita da Sala apaga a edição médica.

O inverso também acontece: o autosave atrasado do app pode desfazer uma correção
aceita na Sala.

Se a Sala for somente leitura, esse problema diminui muito. Se ela puder
resolver, não deve fazer PATCH de texto inteiro. Precisa chamar um endpoint de
comando, por exemplo:

```http
POST /api/reports/:reportId/pendencias/:pendenciaId/accept
{
  "expected_revision": 12,
  "expected_text_hash": "..."
}
```

O backend aplica o patch numa transação condicionada à revisão atual, incrementa
a revisão, registra autoria/dispositivo e devolve texto + pendências atualizados.

### 2.7 Recomendação para a v1

Na primeira versão, eu limitaria Aceitar ao app do médico, com uma sugestão
determinística, sem sobreposição, sobre o texto ainda não editado. A Sala apenas
mostraria as pendências. Isso permite validar a mecânica sem introduzir edição
concorrente clínica no mesmo corte.

---

## 3. Usar ou não LLM para criar a sugestão

Não usar LLM para uma correção aplicável com um toque não é conservadorismo
excessivo. O verde e o botão Aceitar comunicam que o sistema conhece a resposta,
não apenas que gerou outra hipótese. O fato de o writer já ser LLM não torna
seguro oferecer um segundo palpite com aparência de correção objetiva.

Entretanto, a regra atual “guard determinístico ou `structured_output`” mistura
fontes de confiança diferentes. No renderer, o LLM extrai os achados tipados
(`pipeline/renderer.ts:47-52,214-225`). Temperatura zero e schema estrito limitam
o formato, mas não provam que o valor foi entendido corretamente.

A regra deveria ser:

> Só oferecer substituição automática quando cada fato clínico novo do texto
> substituto estiver ancorado no ditado bruto ou for resultado de cálculo
> determinístico validado.

Para usar `structured_output`, confirme também que valor, unidade, lateralidade e
contexto aparecem de forma compatível no `raw_input`. Um `femur_mm: 34` isolado
não é suficiente se o ditado contém várias estruturas com 34 mm.

O argumento a favor do LLM é cobertura. No caminho writer, o modelo pode omitir,
contradizer ou deformar frases que nenhum guard específico sabe reconstruir. Um
segundo modelo, independente do writer, poderia comparar ditado, achados e laudo
e propor uma correção completa para o médico aceitar.

Isso pode ser explorado depois, mas como categoria distinta:

```text
correção determinística — valor comprovado; ação direta
sugestão de IA — hipótese apoiada em evidência; revisão explícita
```

Uma futura sugestão de IA deveria devolver alvo, substituição, evidência literal
do ditado e campos utilizados. Números, unidades, lateralidade e classificações
precisariam passar por validação independente. Antes de produção, medir em
laudos reais a taxa de “correções” falsas; acerto médio não basta, porque o dano
está nos falsos positivos aceitos por reflexo.

Para a v1, mantenho a recomendação de não usar LLM como fonte de novos fatos na
substituição. Ele pode, no máximo, ajustar gramática em torno de fatos já
comprovados, sem alterar os tokens clínicos protegidos.

---

## 4. Prova de equivalência e decisão de inserir `REVISAR:` no texto

### 4.1 Não existe uma baseline única

Não é possível provar igualdade simples entre a lista nova e “o que os clientes
mostram hoje”, porque hoje há comportamentos diferentes:

1. iOS ignora o evento `sanity` e calcula quatro checks locais
   (`GenerateViewModel.swift:522-534`; `SanityChecker.swift:11-20`).
2. Android mantém o sanity recebido do backend
   (`apps/mobile/src/features/generate/state.ts:151-216`).
3. Ambos interpretam marcadores `[REVISAR]` por regex, mas a apresentação e o
   momento de remoção não são iguais.

Além disso, o novo comportamento não pretende ser visualmente equivalente. Hoje
um `[REVISAR]` pode deixar algo roxo mesmo quando o valor existe e está errado;
no desenho novo, roxo significa ausência. O critério correto é cobertura dos
problemas, não igualdade de listas ou pixels.

### 4.2 Desenho da prova

Use um corpus congelado contendo renderer e writer, todas as categorias com
sanity específico, placeholders, marcadores de LLM, múltiplas ocorrências e
laudos editados. Para cada relatório, execute três adaptadores:

```text
old_ios(texto, categoria)          -> issues normalizados
old_android(sanity, texto)         -> issues normalizados
new_pendencias(report, revisão)    -> pendências normalizadas
```

Cada delta precisa de classificação explícita:

```text
preservado
fundido por duplicidade
removido intencionalmente
novo e esperado
perdido — regressão
```

Gates mínimos:

1. 100% dos placeholders e issues críticos atuais continuam representados.
2. Nenhuma sugestão é associada ao trecho errado.
3. Nenhuma substituição contém fato clínico sem evidência ou cálculo.
4. Execuções iguais geram os mesmos IDs e a mesma ordem.
5. Uma edição manual torna a sugestão obsoleta; não a reaplica em outro trecho.
6. Não há duplicidade entre marcador textual, sanity determinístico e sanity de
   IA para o mesmo problema.

Os resultados históricos do sanity local do iOS não foram persistidos. Para
compará-los, será necessário portar/reexecutar uma versão congelada do
`SanityChecker` ou instrumentar temporariamente o cliente para registrar apenas
os códigos detectados. Usar a versão futura do checker sobre laudos antigos
contamina a baseline.

O passo 1 continua útil como shadow mode, mas deve persistir `schemaVersion`,
`basedOnTextHash`, `reportRevision`, `producedAt` e a origem de cada pendência.
Sem isso, listas calculadas em momentos diferentes parecem equivalentes mesmo
quando usam textos diferentes.

### 4.3 Achado crítico: pendências em texto depois do `done`

Hoje a ordem real do backend é:

1. o sanity determinístico é calculado em `route.ts:1165`;
2. o relatório é finalizado com esse resultado em `route.ts:1193-1203`;
3. `done` entrega `final_text` em `route.ts:1224-1229`;
4. o sanity de IA roda depois em `route.ts:1261-1271`;
5. o relatório é finalizado novamente e o evento `sanity` é emitido em
   `route.ts:1274-1292`.

Enquanto sanity é metadado, essa ordem já causa listas temporariamente
diferentes, mas não muda o laudo. Quando as pendências viram linhas dentro do
texto, a mesma ordem passa a significar que o texto clínico pode mudar depois de
`done`.

Isso cria estados incompatíveis:

1. o app recebeu texto A e começou a editar;
2. o backend conclui o sanity de IA e cria texto B com novas linhas `REVISAR:`;
3. a Sala pode ler B enquanto o app ainda mostra A;
4. o primeiro autosave do médico cria `final_output` baseado em A;
5. como a Sala prioriza `final_output`, as linhas tardias de B podem desaparecer;
6. se o backend tentar acrescentá-las em `final_output`, pode apagar a edição do
   médico.

Também pode ocorrer o inverso: uma pendência tardia é exibida na Sala depois de
o médico já ter corrigido manualmente o problema no app. A linha `REVISAR:` fica
obsoleta, mas aparenta ser atual.

Minha recomendação é inegociável neste ponto: **não modificar o texto da geração
depois de emitir `done`**.

Com a decisão de colocar as linhas dentro do texto, existem apenas duas opções
seguras para a v1:

1. Embutir antes do `done` somente pendências determinísticas, já disponíveis em
   `route.ts:1165`. O sanity de IA posterior continua como metadado e não altera
   o texto.
2. Se as pendências de IA também precisarem entrar no texto, esperar o sanity de
   IA antes de emitir `done`, aceitando o acréscimo de latência.

Uma terceira opção — aplicar patches depois do `done` — exige revisão de texto,
stream de atualização, rebase contra edições locais e controle transacional de
concorrência. É desproporcional para a v1 e transforma o editor num sistema de
colaboração em tempo real.

### 4.4 Limites da mitigação “Copiar remove e avisa”

O botão Copiar da Sala remover as linhas reduz o risco principal, mas não o
elimina. Ainda existem seleção manual + `Cmd/Ctrl+C`, copiar pelo menu do
navegador, impressão/PDF, endpoints de histórico, acessibilidade e outros
clientes que podem usar o texto persistido diretamente.

Se as linhas forem literalmente persistidas dentro de `final_output`, cada rota
de saída terá de repetir a remoção. O projeto já demonstra o risco dessa
duplicação: `/api/sala/latest` remove marcadores, mas `/api/sala/report` não
remove (`api/sala/latest/route.ts:79-85`; `api/sala/report/route.ts:61-73`).

Mesmo respeitando a decisão visual de mostrar `REVISAR:` junto do laudo, a opção
mais segura é armazenar texto clínico e pendências separadamente e compô-los na
renderização. Visualmente ficam “dentro do laudo”, mas o conteúdo copiável nasce
limpo. Se a decisão for persistir as linhas no próprio texto, isso deve ser
registrado como risco residual aceito e todos os caminhos de copiar,
compartilhar, imprimir, exportar e buscar histórico precisam de testes.

---

## 5. Risco ausente e correções na taxonomia

### 5.1 O sistema não representa “errado sem resposta conhecida”

O contrato possui apenas:

```ts
tipo: "falta" | "sugestao";
substituirPor?: string;
```

E o plano diz que, quando não há resposta, vira `falta` roxa. Isso está
semanticamente errado.

Uma lateralidade conflitante, data impossível, medida presente porém suspeita ou
contradição entre achado e conclusão não é algo que falta. Também não pode ser
uma sugestão aplicável sem texto substituto. Com dois tipos, o sistema terá de
esconder o problema ou apresentá-lo com significado falso.

Problema e ação devem ser dimensões separadas:

```ts
type Pendencia = {
  id: string;
  problema: "faltando" | "incorreto" | "conflitante" | "ambiguo";
  acao: "preencher" | "substituir" | "revisar_manualmente";
  substituirPor?: string;
  origem: string;
  evidencia?: {
    rawInputTrecho?: string;
    structuredPath?: string;
    calculoId?: string;
  };
  ancora: TextAnchor;
  severidade: "critical" | "warning";
};
```

Assim:

```text
faltando + preencher             -> roxo
incorreto + substituir           -> riscado + verde + Aceitar
incorreto + revisar_manualmente  -> aviso sem correção inventada
ambiguo + revisar_manualmente    -> aviso de confirmação
```

### 5.2 Outros riscos que merecem entrar na lista formal

**R7 — Pendência obsoleta e lost update.** Uma pendência calculada sobre uma
revisão pode ser aplicada depois de edição ou sobrescrever outra origem. Mitigar
com revisão/hash, compare-and-swap, idempotência e invalidação após edição.

**R8 — `structured_output` tratado como verdade determinística.** A extração é
LLM e pode errar campo, unidade ou lateralidade. Mitigar exigindo evidência no
ditado ou cálculo determinístico independente.

**R9 — Texto mutável depois do `done`.** Sanity tardio pode produzir linhas
novas enquanto app e Sala já trabalham com outra versão. Mitigar congelando o
texto antes do `done`; resultado tardio não altera o texto.

**R10 — Linha de revisão vazando por caminhos diferentes do botão Copiar.**
Seleção manual, impressão, exportação e histórico podem carregar `REVISAR:`.
Mitigar preferencialmente com armazenamento separado e composição visual; se
persistida no texto, testar e sanitizar todos os canais de saída.

**R11 — ID aparentemente estável, mas semanticamente ambíguo.** Um hash do texto
ou apenas o código do guard colide em achados repetidos. O ID deve incluir
detector, versão do detector, campo/slot semântico, instância e identidade da
revisão, sem depender apenas da frase renderizada.

---

## Ordem de implementação revisada

1. Definir taxonomia, revisão do texto, estado `stale`, evidência e IDs antes da
   UI.
2. Produzir em shadow mode apenas pendências determinísticas, sem alterar texto.
3. Executar a prova diferencial iOS × Android × lista nova e adjudicar os
   deltas.
4. Embutir antes do `done` apenas as linhas determinísticas aprovadas para a v1.
5. Implementar uma sugestão sem sobreposição e bloqueá-la após qualquer edição.
6. Implementar aceite idempotente com compare-and-swap e audit log de patch.
7. Exibir na Sala; inicialmente sem permissão de aceitar.
8. Validar todos os caminhos de cópia, seleção, impressão, exportação e
   histórico.
9. Só depois avaliar sugestões produzidas por IA com evidência e benchmark
   próprio.

O critério de segurança central deve ser: a conveniência do botão Aceitar nunca
pode permitir que uma correção calculada sobre texto antigo seja aplicada a
texto novo, nem que uma pendência tardia altere silenciosamente um laudo já
entregue ao médico.
