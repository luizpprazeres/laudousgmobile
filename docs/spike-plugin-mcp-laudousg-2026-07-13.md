# Spike: plugin LaudoUSG para Claude / Codex (MCP)

**Data:** 2026-07-13 · **Status:** desenho de spike (aguarda GO do Luiz + estimativa Dex)

## Objetivo
Um **plugin do LaudoUSG** que roda dentro do Claude e do Codex/ChatGPT, usando o **modelo mais recente do plano do usuário** para ESCREVER, e o LaudoUSG para o CONHECIMENTO + DETERMINÍSTICO (prompts por categoria, calculadoras, sanity). Corta caminho: sem ditar/transcrever no app, sem o gpt-4.1 do LaudoUSG.

## UX-alvo (exemplo do Luiz, 13/07)
No Codex/Claude, com o plugin LaudoUSG selecionado, o médico dita:
> "Próximo paciente, ultrassonografia obstétrica com Doppler, feto em apresentação cefálica…, medidas nas imagens em anexo, primeira US realizada 20/04/2026 com 10 semanas e 4 dias, hoje com…, calcule os percentis pelos do Doppler…"

E recebe: o **laudo pronto no estilo DOPPLER_OBSTETRICO**, com **percentis do Doppler já calculados**, **calculadoras preenchidas automaticamente a partir dos achados** (peso, IG, percentis), ajustes em linguagem natural aplicados, sanity considerado.

## Tecnologia: MCP (a ponte comum)
Claude (connectors/MCP) e Codex/ChatGPT (o marketplace de plugins) convergem no **MCP (Model Context Protocol)**. Um **único servidor MCP LaudoUSG** atende os dois. Servidor **remoto** (hospedado, ex.: Vercel) = instalável por qualquer médico.

## Arquitetura — "extrai-calcula-escreve", com o WRITER no host
Mesma espinha da estratégia writer-first, mas o *escrever* é delegado ao modelo do host:

1. **Host (Claude/GPT do plano do usuário)** = orquestra + VÊ as imagens (visão nativa dele) + ESCREVE a prosa.
2. **Servidor MCP LaudoUSG** = expõe o determinístico + o conhecimento:
   - **Recursos/prompts (por categoria):** o prompt da casa + few-shots + estilo (o host escreve no estilo LaudoUSG).
   - **Tools determinísticas:**
     - `calcular_ig({ primeira_us_data, primeira_us_ig, data_hoje })` → IG âncora (regra Domingos).
     - `calcular_percentis_doppler({ ig, umbilical_ip, acm_ip, uterinas_ip, dv? })` → percentis (tabelas de referência).
     - `calcular_peso_fetal({ dbp, cc, ca, cf })` → peso + percentil (Hadlock).
     - `calcular({ tipo, inputs })` genérico p/ as demais (ILA, BI-RADS, TI-RADS, trissomias FMF…).
     - `sanity_check({ laudo, categoria })` → flags de segurança (Doppler umbilical falso-normal etc.).
     - `listar_categorias()`.

### Fluxo do exemplo do Luiz
a. Médico dita tudo + anexa as imagens das medidas no Codex/Claude.
b. **Host lê as imagens (visão)** → extrai DBP/CC/CA/CF, IPs do Doppler. Interpreta as refs de IG ("1ª US 20/04 10s4d, hoje com…").
c. **Host chama as tools LaudoUSG** com esses números: `calcular_ig`, `calcular_percentis_doppler`, `calcular_peso_fetal` → recebe os FATOS computados (determinísticos).
d. **Host puxa o prompt/few-shots DOPPLER_OBSTETRICO** (recurso MCP).
e. **Host escreve o laudo** no estilo da casa usando os fatos computados + aplica os ajustes em linguagem natural.
f. **Host chama `sanity_check`** → mostra/corrige pelos flags.
g. Retorna o laudo pronto.

**Ponto elegante:** o LaudoUSG NÃO precisa de visão própria — aproveita a do host (o modelo mais recente). E a MATEMÁTICA nunca é do LLM: os percentis/peso/IG vêm das tools determinísticas.

## Segurança (o que decide se é sério pra medicina)
O risco: o host **pode pular** uma tool. Mitigação em camadas:
- **Tool de alto nível `gerar_laudo(categoria, achados, imagens?)`** que orquestra a espinha no servidor e devolve **fatos computados + prompt da casa + flags** — reduz a chance de o host improvisar a conta.
- **Prompt do plugin forte** exigindo o uso das calculadoras e do sanity.
- **`sanity_check` como gate**: instruir o host a rodar antes de entregar; os flags aparecem pro médico.
- Disclaimers/rastreabilidade no output (é laudo médico num chat genérico — precisa de aviso).

## O que reaproveita do LaudoUSG (já existe)
- Prompts por categoria (`packages/knowledge/snippets`, `apps/api/src/server/prompts/contracts`).
- Calculadoras (peso Hadlock, IG determinística `computeIg`, percentis Doppler, ILA, BI-RADS, TI-RADS, trissomias FMF).
- `sanityCheck` + guards.
→ O servidor MCP é um **embrulho fino** dessas peças (não reescreve lógica).

## MVP proposto
- **1 categoria: DOPPLER_OBSTETRICO** (é o exemplo do Luiz e o de maior uso).
- Servidor MCP remoto (Node/TS SDK) expondo: prompt/few-shots DOPPLER_OBSTETRICO + `calcular_ig` + `calcular_percentis_doppler` + `calcular_peso_fetal` + `sanity_check`.
- Testar no **Claude** e no **Codex/ChatGPT** com o ditado-exemplo (com imagens anexas).
- Medir: qualidade do laudo, uso correto das tools, latência.

## Ressalvas / decisões abertas
1. **Superfície complementar**, não substitui o app (perde voz/Sala/histórico/UX mobile). É pra desktop/power-user.
2. **Segurança**: host pode pular tool — mitigado pela tool de alto nível + prompt + sanity gate; validar na prática.
3. **Licenciamento/negócio**: só usuários pagantes do LaudoUSG? auth no servidor MCP (token). A geração migra pro plano do usuário → repensar receita (assinatura do plugin/freemium).
4. **Regulatório**: laudo em chat genérico precisa de disclaimers.
5. **Plataforma primeiro**: Claude ou Codex? (MCP atende os dois; começar por um.)

## Próximo passo
Estimar o MVP com o Dex (esforço do servidor MCP + hosting + auth) e, se GO, spike de 1 categoria ponta-a-ponta.
