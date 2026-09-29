# Landing: calculadoras em cards empilhados e FAQ

Pedido: apresentar calculadoras com destaque sincronizado à esquerda, cards empilhados à direita, desfoque e escurecimento dos anteriores. FAQ ao final com dúvidas de compra e uso, inspirado nas perguntas dos concorrentes e respostas confirmadas no produto.

## Ownership
Root: CalculatorStory.tsx, calculator-story.module.css, app/page.tsx, integração e QA. Atlas (Claude Opus): LandingFaq.tsx, landing-faq.module.css e parecer de fontes. Clínica (Claude): auditoria read-only das calculadoras. Não houve alteração de motores clínicos.

## Decisões
Seção após especialidades e antes dos esquemas; quatro cards do claro ao verde escuro. Progresso por rolagem, navegação clicável/teclado, cartas anteriores recuam/desfocam; sem reprodução automática. Em mobile, telas baixas e movimento reduzido, todos os cards aparecem em fluxo normal. FAQ entre preços e CTA final, details/summary nativos.

Copy não afirma igualdade, precisão de 95% nem certificação FMF. Trissomias identificadas como em validação na Web; IG avulsa identificada como recurso do app, disponível em breve. Referência Doppler: Fetal Medicine Barcelona (não FMF de Londres). PE: modelo publicado, implementação não certificada.

Demonstração de AU: IG32+0, IP1,00, percentil obtido em execução pelo motor compartilhado calcularDopplerParcial, sem fórmula duplicada. IG: DUM10/04/2026, exame28/09/2026, 171 dias =24+3, DPP15/01/2027. Dados sintéticos claramente rotulados. Cards de rastreamento não exibem risco fictício.

Fontes do produto e limitações: docs/reviews/2026-09-28-calculator-marketing-evidence.md. FAQ: docs/reviews/2026-09-28-faq-evidence.md.
Fontes oficiais externas consultadas: https://fetalmedicinebarcelona.org/calc-en/ e publicação FMF https://www.fetalmedicine.org/var/pdf/publications/1077.pdf. Referências específicas e disponibilidade foram conferidas no código pelo terminal Clínica.

## Verificações
- [x] Implementação de cards, conteúdo e integração do FAQ.
- [x] Build, lint, typecheck e suítes web.
- [x] Browser desktop1440/1920, mobile390/320, tela baixa e reduced-motion; geometria, hit targets, rolagem reversa, destaque, blur, acordeão por teclado, ausência de overflow.
- [x] Revisão visual de screenshots e ajuste final.

Sem commit/push/publicação nesta etapa; prévia local3001.
