# Parecer — opções de posicionamento da landing

Data: 26/09/2026. Revisão de `copy/landing-estrategia.md` (não editado). Referências: `docs/reviews/2026-09-26-landing-competitive-strategy.md`, `docs/reviews/2026-09-26-landing-copy.md`. Verificação no código apenas para os claims citados abaixo.

## Veredito

**GO para a direção A** ("Do achado ao laudo, com menos trabalho."), com **B** ("Selecione os achados. Acompanhe o laudo.") como variante de teste. As duas são qualitativas, não dependem de número, exclusividade nem leitura automática de imagem, e o subtítulo proposto descreve o que a Web faz hoje: seleção por órgão, texto ao lado e edição antes de copiar.

**C** ("Seu laudo acompanha o que você encontrou.") fica como terceira opção, só com subtítulo explícito sobre seleção manual. Sem ele, sugere que o sistema lê a imagem.

## A × B

| Critério | A | B |
|---|---|---|
| Benefício | Claro ("menos trabalho") | Implícito |
| Mecanismo | Precisa do subtítulo | Explícito no título |
| Risco de promessa | Baixo; "menos trabalho" é qualitativo e deve ser mostrado pela demonstração | Muito baixo |
| Melhor para | Tráfego frio, que ainda não conhece laudo por seleção | Tráfego que já busca software de laudo |

Recomendação: A no hero; B como título do bloco de demonstração ou variante do teste, mantendo subtítulo, oferta e layout constantes (como a própria proposta prevê).

## Claims conferidos

| Claim da proposta | Status | Evidência |
|---|---|---|
| Essencial R$ 99/mês, Profissional R$ 169,90/mês | **Confere** | `apps/web/src/lib/planos.ts:12-13` |
| 10 laudos grátis no total, sem cartão | **Confere** | `planos.ts:29` ("10 vitalício"); CTA atual "Sem cartão · 10 laudos grátis" |
| Cinco áreas de exame | **Confere** | `components/laudar/categoryGroups.ts` |
| Esquemas de mama, tireoide e posição fetal; mapa venoso em preparação | **Confere** | v2 `SchemeDeck.tsx:75,125` |
| Apps "em breve", Web disponível | **Confere** | iOS aguardando revisão em 14/09 (`docs/reviews/appstore-live-2026-09-14.md`); nenhuma prova de publicação |
| Laudo da Web não vai para a Sala | **Confere** | Sala lê `reports`; a Web grava em `web_reports` (`docs/reviews/2026-09-26-composition-cross-platform-audit.md`) |
| Frases pessoais | **Confere** | `components/preferencias/FrasesPessoais.tsx` |

## Divergências a resolver antes de publicar a oferta

1. **Sala do Auxiliar no plano gratuito: divergência no próprio código.**
   - `components/landing/Pricing.tsx:65` lista **"Link para auxiliar de sala"** no plano Gratuito.
   - `lib/planos.ts:32` (`COMPARATIVO`) marca **`free: false`** para "Link de sala (auxiliar)".
   - A landing (via `Pricing`) e a tabela comparativa de `/precos` dizem coisas opostas. **Não verifiquei qual das duas corresponde ao bloqueio real** (gating do servidor). Decisão do Luiz; até lá, a proposta não deve citar a Sala como benefício gratuito.
2. **Cartografia no plano Profissional.** `Pricing.tsx` lista "Cartografia automática no Doppler" como item do Profissional, enquanto a landing a apresenta como "em breve". Marcar "em breve" também na tabela, ou retirar.
3. **Exportação .docx no gratuito** (`planos.ts:33` e `Pricing.tsx:65`): lacuna já registrada, sem evidência no código da Web. Não bloqueia.

## Ajustes pontuais na proposta

- **Rótulo único de cadastro.** A proposta usa "Fazer meu primeiro laudo"; a v2 usa "Criar conta grátis" no nav e no CTA, e "Criar conta" no rodapé. Escolher **um** rótulo para toda a página.
- **"Laudos de ultrassom no navegador"** como identificação está correto e ajuda a separar Web de app.
- **Mobile:** o texto conservador ("apps em preparação") está correto. "Os achados na voz" só com a demonstração marcada como ilustrativa.
- **FAQ:** as respostas sobre Sala, lojas e integração estão corretas e não prometem nada além do código. Manter a ressalva sobre LGPD e retenção sem selos.
- **Tipografia:** o título do arquivo usa travessão longo; não levar esse caractere para o texto publicado.

## Fora deste parecer
Não conferi a página renderizada nem métricas de conversão. As variantes são hipóteses de teste; nenhuma foi medida.
