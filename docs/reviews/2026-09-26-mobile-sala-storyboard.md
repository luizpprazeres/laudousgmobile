# Storyboard: seção mobile com capturas reais e Sala do Auxiliar

**Data:** 26/09/2026
**Autor:** Atlas (roteiro e evidências; não edita componentes)
**Alvo:** seção mobile da landing (`MobileStory.tsx`, owner Claude 17bd), com badges e disponibilidade da root
**Pedido:** trocar a recriação do iPhone por capturas reais, dar zoom no microfone e na categoria, mostrar o texto surgindo e trazer a Sala do Auxiliar para DENTRO da seção mobile. A Sala não é atribuída à Web.

## 1. O que o código confirma (read-only)

A Sala é alimentada pelo **app**, não pela Web. Evidências:

| Contrato | Onde | O que faz |
|---|---|---|
| Código de pareamento | `apps/api/src/app/api/sala/pair/generate/route.ts` | Médico autenticado gera um código fixo (reusa o ativo; validade longa, regenerável por `revoke`). |
| Entrada do auxiliar | `apps/api/src/app/api/sala/pair/redeem/route.ts`, `apps/api/src/app/sala/page.tsx` | Rota pública: o auxiliar digita o código em `sala.laudousg.com`; erro propositalmente ambíguo. |
| Laudo ao vivo | `apps/api/src/app/api/sala/latest/route.ts` | Rota pública por código: lê a tabela **`reports`** (laudos gerados pelo app), só do **dia** (BRT), mais recente primeiro; mostra `final_output` e, na falta dele, `generated_output`. **Não lê `web_reports`.** |
| Reenviar um laudo | `apps/api/src/app/api/sala/push/route.ts` | "Enviar à sala" num laudo antigo do dia o traz de volta ao topo, sem regerar. |
| Esquema visual | `apps/api/src/app/api/sala/push-schema/route.ts`, `[token]/schemas` | O app envia o esquema (PNG + PDF) para a Sala; substitui o anterior do mesmo exame. |
| Encerrar | `apps/api/src/app/api/sala/revoke/route.ts` | Médico revoga a sala; o próximo código cria outra. |
| Tela da Sala | `apps/api/src/app/sala/[token]/page.tsx` | Laudo do dia ao vivo, timeline do turno, copiar, imprimir, destacar cabeçalhos, anotações, frases, esquemas recebidos, atalhos de teclado. |
| iOS | `LaudoUSG/Components/Sheets/SalaPairingSheet.swift`, `Services/SalaService.swift`, `Features/ReportDetail/ReportDetailView.swift`, `Features/History/HistoryView.swift` | Gera o código ("Código da sala"), "Enviar p/ Sala" no laudo, no histórico e nos esquemas. |
| Android | `apps/mobile/src/lib/api.ts` | Também chama `/api/sala`. |

**Cuidados de copy tirados do código:**
- Não citar intervalo de atualização. O polling é de 3 s (`POLL_INTERVAL_MS = 3000`), mas a tela diz "a cada 5 segundos". Usar só "em segundos" ou "ao vivo".
- A Sala mostra os laudos **do dia**; não prometer histórico longo nela.
- O pareamento é por código digitado uma vez no turno. Não chamar de "conexão segura", "criptografada" nem "LGPD" na landing.
- Não dizer que o laudo da **Web** aparece na Sala. Hoje a Sala lê só `reports`.

## 2. Direção (design-taste-frontend)

Leitura: SaaS médico, capítulo escuro em grafite já existente, uma cena de mockup com luz lateral. Movimento **motivado**: cada zoom mostra onde está a ação (microfone, categoria, texto, código, Sala). Nada de loop decorativo.

- **Captura real, não recriação.** O aparelho mostra PNG/WebP reais do app. Moldura do iPhone em CSS simples (borda e raio), sem imitar hardware em detalhe.
- **Zoom = recorte ampliado da mesma captura**, nunca uma segunda arte. Implementação: a captura inteira no aparelho e, ao lado, uma "lupa" com `transform: scale()` + `object-position` na região de interesse, ligada ao scroll (ou só aparecendo, em movimento reduzido).
- **Texto surgindo:** máscara vertical (`clip-path`/gradiente) sobre a captura da transcrição e do laudo, avançada pelo scroll. É a própria imagem que se revela, sem texto HTML reescrito por cima.
- **Transição para a Sala:** o celular recua para a esquerda e uma janela de navegador (captura real de `sala.laudousg.com`) desliza da direita, parcialmente sobreposta. É o único momento com dois dispositivos, para mostrar que o laudo sai do celular e chega à sala.
- Desktop: aparelho fixo (sticky) à esquerda, texto da etapa à direita. Mobile: aparelho centralizado menor, texto abaixo; a lupa vira um recorte acima do aparelho; a janela da Sala entra embaixo, sem sobreposição lateral.
- Uma cor de destaque (emerald), zero travessão longo, zero métrica.

## 3. Roteiro (7 etapas)

`data-stage` sugerido entre parênteses, na ordem do scroll. Todas avançam e voltam.

| # | Etapa | Captura real | Zoom / movimento | Título | Texto |
|---|---|---|---|---|---|
| 1 | Abrir (`abrir`) | Tela inicial de ditado (`GenerateView`), conta de teste | Nenhum. Aparelho entra do escuro com luz lateral | No celular, ao lado do aparelho. | O app abre direto na tela de ditado. |
| 2 | Ditar (`ditar`) | `RecordingOverlay` gravando, com transcrição parcial | **Zoom no microfone**; depois a lupa desce para a transcrição, que **surge linha a linha** | Dite com o gel na mão. | Fale os achados. O texto aparece enquanto você fala, para conferir antes de gerar. |
| 3 | Escolher o exame (`categoria`) | `CategorySheet` aberta, item "Abdome total" | **Zoom na lista de categorias**, destaque no item tocado | Escolha o exame. | As categorias mais usadas ficam no topo; a busca encontra as outras. |
| 4 | Gerar (`gerar`) | Tela de processamento da geração | Barra/etapas avançam com o scroll; sem zoom | Um toque para gerar. | O app organiza os achados e redige no padrão do exame. |
| 5 | Laudo pronto (`laudo`) | `ReportDetailView` com o laudo sintético | **Texto do laudo surgindo** de cima para baixo; zoom suave no título e na impressão | O laudo pronto para revisar. | Leia, ajuste o que quiser e copie. A revisão final é sempre sua. |
| 6 | Enviar à Sala (`enviar-sala`) | `SalaPairingSheet` com código **fictício borrado** e o botão "Enviar p/ Sala" | **Zoom no botão** "Enviar p/ Sala" | Mande para a sala. | O auxiliar entra uma vez por turno com um código. Os laudos do dia chegam lá em segundos. |
| 7 | Sala do Auxiliar (`sala`) | `sala.laudousg.com` no navegador, com o mesmo laudo do passo 5 no topo e a timeline do turno | Celular recua; janela da Sala desliza e sobrepõe; **zoom no laudo chegando** e no botão Copiar | A sala acompanha. | Na recepção ou na sala de exame, o auxiliar vê o laudo do dia, copia ou imprime. |

Fecho da seção (sem etapa): badges App Store e Google Play com o selo **"Disponível em breve"** (componente da root, não alterar) e o CTA único "Criar conta grátis".

Movimento reduzido: sem sticky nem zoom animado. As 7 capturas aparecem em sequência estática, cada uma com o recorte ampliado já visível ao lado e o texto da etapa. Botões de etapa continuam funcionando.

## 4. Capturas necessárias (root está gravando)

Todas com dados demonstrativos, com o mesmo ditado sintético do resto da landing (esteatose leve, cálculo biliar de 1,2 cm, cisto renal simples à direita). Nenhum nome, idade, data de nascimento ou identificador de paciente.

| Arquivo sugerido | Tela | Observação |
|---|---|---|
| `mobile-01-ditado.webp` | `GenerateView` em repouso | Barra de status limpa (9:41, bateria cheia) ou recortada |
| `mobile-02-gravando.webp` | `RecordingOverlay` com microfone ativo | Precisa do microfone e da transcrição parcial visíveis na mesma imagem |
| `mobile-02b-transcricao.webp` | Mesma tela com a transcrição completa | Usada para a revelação linha a linha |
| `mobile-03-categoria.webp` | `CategorySheet` aberta | "Abdome total" visível, sem histórico pessoal na lista |
| `mobile-04-gerando.webp` | Processamento | Um quadro no meio da geração |
| `mobile-05-laudo.webp` | `ReportDetailView` | Laudo completo visível, rolado para o topo |
| `mobile-06-enviar-sala.webp` | `SalaPairingSheet` e/ou botão "Enviar p/ Sala" | **Código real borrado ou trocado por "ABC123"** antes de publicar; não revogar a sala do usuário |
| `sala-07-web.webp` | `sala.laudousg.com` com o laudo do passo 5 | Janela de navegador 1440 px; sem URL com código real na barra de endereço |

Peso: cada captura exportada a ~720 px de largura em WebP, alvo de até 80 KB. Carregar com `loading="lazy"`, exceto a da etapa 1.

Vídeo: o QuickTime fornece o bruto real. Priorizar quadros leves e movimentos ligados à rolagem; trechos de vídeo podem ser usados se ajudarem a reproduzir o ditado ou a geração reais. O pedido permite ambas as abordagens.

## 5. Pendências para decisão

1. **Laudo da Web na Sala:** hoje não aparece. Se o produto quiser isso, é mudança de backend; a landing não pode sugerir.
2. **Texto "a cada 5 segundos" na tela da Sala** diverge do polling real de 3 s. Sugestão para o owner da Sala: trocar por "ao vivo".
3. **Código de pareamento em captura:** confirmar com a root que o código aparece borrado sem revogar a sala do usuário.
