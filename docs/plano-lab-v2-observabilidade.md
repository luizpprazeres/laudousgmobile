# Lab v2 — Cockpit de Qualidade & Autoria (visão)

> Reconstrução do `lab.laudousg.com` alinhada à arquitetura determinística. O lab
> antigo (era RAG) editava `knowledge_blocks`; com renderers determinísticos, as
> regras migraram para código. Decisão do Luiz (2026-06-18): **não retrofitar o lab
> antigo — construir um novo do zero** no mesmo subdomínio. Status: VISÃO (não
> implementado). Ver `[[arquitetura-ux-modelo]]`.

## Propósito
Uma plataforma inteligente e didática para: ver/ajustar as regras, observar a saúde
do sistema (tempos, erros, crashes, uso do coringa), e receber **feedback diário
automático de qualidade** dos laudos — para que mesmo após 1 semana sem mexer, o Luiz
tenha um conteúdo rico de melhorias prontas para concordar/discordar e virar plano.

## 4 componentes

### 1. Boletim diário de qualidade (AUTOMAÇÃO) — maior valor, menor esforço → COMEÇAR AQUI
Job agendado (diário) que revisa os laudos do dia anterior (ditado + laudo gerado +
auditoria) e produz uma análise crítica + ações sugeridas, salva como boletim.
- **Detecta:** erros, alucinações, falhas de comunicação, comandos ignorados, números
  trocados/errados, omissões, uso do coringa, crashes/blocks.
- **Brain = Claude** (exatamente o tipo de revisão crítica/juízo que o Luiz já pede
  manualmente e funciona). Prompt rico codificando a doutrina + preferências do Luiz.
- **Arquitetura recomendada:** **Vercel Cron** (rota agendada no app Next.js) → query
  Supabase (runs do dia anterior) → chamada Claude (análise) → grava boletim numa
  tabela `quality_bulletins` → Lab v2 lê. Alternativa: Supabase pg_cron + Edge
  Function. Vercel Cron é o mais simples/integrado ao stack atual.
  (Cron + chamada de API é mais adequado que um agente de código para um job
  determinístico diário; a riqueza vem do PROMPT de análise.)
- **Inclui os feedbacks dos usuários** (componente 3) na análise.
- **Saída:** boletins diários persistidos (histórico navegável).

### 2. Feedback colaborativo (sem fricção)
No menu do app: o usuário escreve o que precisa + anexa prints/imagens (opcional) e
envia em 1 toque — **sem formulário** (nome/email já vêm da conta). Vai direto para o
Lab v2 (seção própria) E entra no boletim diário (a IA considera os feedbacks na
análise e nas sugestões). O Luiz também envia da própria prática.
- **Implementação:** endpoint `/api/feedback` + tabela `user_feedback` (+ storage de
  imagens) + UI iOS (dex1) + seção no Lab v2.

### 3. Observabilidade
Dashboard: tempos de resposta (extração/total/percebido), laudos que crasharam/bloquearam,
laudos que usaram o coringa (fallback), categorias problemáticas, taxa de sanity issues.
Fonte: `generation_runs` + `generation_audit` (já existem).

### 4. Visualização/edição das regras (didática) — o lever de longo prazo
- **Writer/coringa:** os blocos de `knowledge_blocks` SÃO editáveis (infra do lab
  antigo reaproveitável/reconstruível). Edição direta.
- **Renderer (determinístico):** as regras estão em TS. Curto prazo = visualização
  READ-ONLY (didática). Longo prazo = **"fluxograma como dados"**: extrair as regras
  clínicas do código para forma declarativa editável (tabela de decisão). É o maior
  lever de manutenibilidade — mas é o de maior esforço.

## LGPD (não é parecer jurídico — confirmar na política)
- O boletim processa dados que a plataforma JÁ armazena, para qualidade/segurança do
  serviço (legítimo interesse / melhoria do serviço). Enviar ao LLM = MESMO fluxo de
  dados da geração (o ditado já vai ao LLM para gerar). Consistente com o tratamento
  existente.
- Abranger todos os usuários do dia anterior: defensável para revisão interna de
  qualidade. Manter o boletim focado em QUALIDADE do laudo (não na identidade do
  paciente); de-identificar onde possível. Documentar a base legal/política.

## Sequência sugerida (fases)
1. **Boletim diário** (cron + Claude + tabela + view simples) — entrega o valor "feedback
   rico mesmo após dias fora" sem depender do lab inteiro. **Quick win.**
2. **Feedback colaborativo** (endpoint + tabela + UIs) — alimenta o boletim.
3. **Observabilidade** (dashboard sobre runs/audit).
4. **Lab v2 autoria** (edição de blocos writer/coringa; depois regras-como-dados do renderer).
