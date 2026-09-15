# BI-RADS® e licenciamento do ACR — registro e recomendação (T31)

Data: 2026-09-12 · Autor: Vigia (FAROL) · Escopo: só documento, nenhum código.
Aviso: isto não é parecer jurídico. É o levantamento do que o ACR publica, do que o produto faz hoje e das opções. A decisão é do Luiz.

## 1. O que o ACR publica (fontes consultadas em 12/09/2026)

| Fonte | O que diz | Relevância |
|---|---|---|
| Página oficial do BI-RADS (acr.org/…/Reporting-and-Data-Systems/BI-RADS) | Seção **"Software Vendors — Interested in licensing BI-RADS in your software? Complete the BI-RADS Software Vendor Contact Form or email RADS@acr.org"**. Formulário: `app.smartsheet.com/b/form/0dc6f3068046473b98fb103b459b3f23`. Há também **"Request Permission for BI-RADS — Submit request"** (`form.jotform.us/71095935087162`). Disclaimer: o ACR se exime de responsabilidade por atos ou omissões decorrentes do uso dos RADS. | O ACR trata "BI-RADS em software" como algo licenciável e mantém um canal dedicado. Não publica critério de obrigatoriedade nem preço. |
| Página Legal do ACR (acr.org/Legal) | Todo conteúdo é protegido por copyright. **"Nothing contained in this Web site will be construed as granting to the user a license to use these materials under any copyright, trademark, patent, or other intellectual property right of ACR."** Uso das **ACR Marks** (marcas, nomes, logos) sem consentimento escrito é "strictly prohibited". Reprodução para fins comerciais é proibida; membros só podem copiar para uso interno não comercial. | BI-RADS® é marca registrada do ACR. Usar a marca em nome de feature, site ou anúncio é uso de marca, não só de terminologia. |
| FAQ "BI-RADS Atlas and MQSA" (PDF do ACR, rev. 2012) | Rodapé em toda página: *"This document is copyright protected… Any attempt to reproduce, copy, modify, alter or otherwise change or use this document without the express written permission of the ACR is prohibited."* Pergunta sobre software: o ACR "provides a list of licensed vendors… All have medical audit software"; vendors licenciados alimentam o National Mammography Database (NMD). | Os "licensed vendors" que o ACR cita são sistemas de auditoria/registro de mamografia (EUA, MQSA). O LaudoUSG não é isso. |
| Lista "BI-RADS Licensed Software Vendors" (cs.acr.org/…/Bi-Rads/Vendors) | **HTTP 404** em 12/09/2026. | O link citado no plano de sprints está morto; a lista não está acessível para conferir quem é licenciado. |
| Quick Reference Card e US-FAQ (links do plano, em cs.acr.org) | O US-FAQ também não baixa (retorna HTML de erro). O cartão é material com copyright do ACR. | Esses PDFs servem como referência de leitura da equipe; **não podem ser reproduzidos** no produto nem em material de marketing. |
| Atlas BI-RADS 5ª ed. / Manual v2025 | Produto pago do ACR (eBook/impresso, "Bulk Pricing"). Traduções (inclusive a brasileira, pelo CBR) são feitas sob licença do ACR. | A tabela de descritores, faixas de VPP e condutas por categoria são conteúdo do Atlas. |

Resumo do que o ACR publica: (1) a marca e os textos são dele e nada é licenciado por padrão; (2) existe um canal formal para "licenciar BI-RADS em software"; (3) não há, em lugar público, a regra de quando a licença é exigida, quanto custa, nem a diferença entre "usar a terminologia no laudo" e "implementar a lógica". Só o ACR responde isso.

## 2. O que o produto usa hoje

Três camadas distintas, com exposição diferente:

**(a) Terminologia e categoria no laudo do médico** — o léxico US (forma, orientação, margem, ecogenicidade, fenômeno posterior, calcificações) como opções de formulário, e o rótulo "(Categoria BI-RADS® N)" na conclusão. O médico escolhe a categoria; o sistema transcreve.
- `apps/api/src/server/renderer/categories/MAMARIA.ts` — ditado vence, "maior BI-RADS vence", guard só-sinaliza (`MAMARIA_BIRADS_GUARD`, nunca rebaixa).
- `apps/web/src/components/laudar/MamariaFormPanel.tsx` — botões 0…6 "BI-RADS definido pelo médico"; texto "A sugestão do sistema não entra no laudo sem sua confirmação".
- Golden cases e fixtures em `apps/api/src/server/renderer/__tests__/mamaria-*`.

**(b) Lógica que calcula categoria a partir dos descritores** — é o que o ACR chama de "BI-RADS in your software".
- `packages/shared/src/calculators/mamariaBirads.ts` — sugestão compartilhada (sprint 15): 2/3/4 por tipo de achado, sem subcategoria 4A/4B/4C, sem percentual, sem conduta. Só aparece como "Sugestão do sistema" com botão "Confirmar sugestão".
- `apps/web/src/lib/calculators/biRads.ts` — calculadora local mais antiga: devolve **4A/4B/4C, faixa de risco ("2–10%", "10–50%", "50–95%", "≥ 95%") e conduta ("Biópsia indicada/recomendada/pode ser considerada")**. Reproduz as faixas de VPP e o manejo do Atlas. O próprio plano (§Mamas) marca essa heurística como "pendente de validação" e diz que não deve ser apresentada como classificação definitiva.
- `apps/mobile/src/shared/calculators/birads.ts` + `BIRADSCalculatorSheet.tsx` — calculadora equivalente no Android, dentro do menu de calculadoras.
- iOS: calculadora auditada em `laudousg-swift/…/docs/auditoria-calculadoras-2026-06-24.md`.

**(c) Uso da marca "BI-RADS" fora do laudo** — nome de calculadora nas telas ("Calculadora BI-RADS"), e o pipeline de blog/SEO em `~/markerting-laudousg/squads/blog-seo-laudousg` cita BI-RADS em artigos e no tom de voz.

O produto **não** reproduz o Atlas, o cartão de referência, ilustrações ou o logo do ACR.

## 3. Leitura de risco (opinião de produto, não jurídica)

| Camada | Risco IP | Risco clínico | Comentário |
|---|---|---|---|
| (a) terminologia no laudo | Baixo | Baixo | É o padrão de laudo mamário no mundo inteiro; todo RIS/PACS/sistema de laudo escreve "BI-RADS 3". O ACR nunca foi atrás de uso descritivo em laudo. Manter o ® e a atribuição já é boa prática. |
| (b) lógica calculada | Médio | **Alto** na versão com 4A/4B/4C + % + conduta | É exatamente o que o ACR chama de "licensing BI-RADS in your software". Além do IP, o próprio código admite que a heurística 4A/4B/4C não é validada. Uma sugestão errada com "≥ 95%" e "biópsia indicada" na tela é pior do que qualquer carta do ACR. |
| (c) marca em feature/marketing | Médio-alto | — | A página Legal é explícita: ACR Marks só com consentimento escrito. Anúncio, landing ou nome de plano com "BI-RADS" é o ponto mais fácil de ser questionado. |

Ponto adicional: os "licensed vendors" do ACR são softwares de auditoria/NMD para o mercado americano sob MQSA. O LaudoUSG é software de redação de laudo no Brasil. Isso não elimina o direito de marca e copyright do ACR (que valem aqui, e a tradução brasileira do Atlas é licenciada pelo CBR), mas mostra que o programa de licenciamento não foi desenhado para o nosso caso, o que favorece uma consulta objetiva em vez de assumir que precisamos de licença de vendor.

## 4. Opções

**A. Consultar o ACR** pelo formulário "Software Vendor Contact" ou por RADS@acr.org, descrevendo exatamente o uso (laudo em português, médico define a categoria, sugestão opcional sem percentual). Custo zero. Resposta pode demorar semanas e pode vir como "precisa licença, taxa X". Entra no radar do ACR.

**B. Reduzir a exposição agora, sem depender do ACR**:
1. Aposentar a calculadora local da web (`biRads.ts`: 4A/4B/4C + % + conduta) e a do mobile, ou rebaixá-las ao mesmo comportamento da sugestão compartilhada (só categoria, sem %, sem conduta, com "confirmar" obrigatório). Isso já era a direção da sprint 15.
2. Não usar "BI-RADS" como nome de feature, plano ou chamada de marketing. Dentro do laudo continua "Categoria BI-RADS® N".
3. Rodapé/aviso único no produto: "BI-RADS® é marca registrada do American College of Radiology. A categoria é atribuída pelo médico."
4. Bardo revisa os artigos do blog para uso descritivo (citar o sistema, não vender "calculadora BI-RADS").

**C. Pedir "Request Permission for BI-RADS"** (formulário jotform) para o uso específico de terminologia e categorias no laudo. É o canal de permissão de material, mais leve que licença de vendor. Mesma dúvida de prazo da opção A.

**D. Não fazer nada.** Mantém a calculadora com % e conduta e a marca no marketing. Não recomendo: o risco clínico da camada (b) já justificava mudar, independente do ACR.

## 5. Recomendação

Fazer **B agora** (é higiene clínica e de produto, alinhada ao que o plano já decidiu) e **A em paralelo**, com uma consulta curta e honesta. Se o ACR responder que uso descritivo no laudo não exige licença, fecha o assunto. Se responder que exige, o produto já está na configuração mais defensável para negociar (nada calculado, nada em marketing).

Nenhuma dessas ações toca o corpus, os golden cases nem o renderer canônico. Só a camada (b) vira tarefa FORJA (remover/rebaixar as duas calculadoras), meio dia.

## 6. Perguntas para o Luiz (via Orquestrador)

1. Autoriza contato com o ACR? Em nome de quem (LaudoUSG como empresa, ou Luiz como médico)? Preferência entre "Software Vendor Contact" (A) ou "Request Permission" (C)?
2. Aceita rebaixar as calculadoras BI-RADS da web e do Android para "só categoria sugerida, sem percentual e sem conduta", ou removê-las de vez?
3. Concorda em não usar "BI-RADS" como nome de feature/marketing (fica só dentro do laudo, com ®)?

## Fontes

- https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/BI-RADS (seções "Software Vendors" e "Request Permission for BI-RADS")
- https://www.acr.org/Legal (Copyright and Trademark Information; Proprietary Rights)
- FAQ "The ACR BI-RADS® Atlas and MQSA: Frequently Asked Questions" (PDF do ACR, cópia pública em aula.campuspanamericana.com)
- https://cs.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Bi-Rads/Vendors (404 em 12/09/2026)
- Plano vigente: `docs/plano-produto-web-sprints-15-22-2026-08-31.md` §Mamas e axilas
- Pesquisa interna do léxico: `docs/det-5-mamaria-birads-pesquisa.md`
