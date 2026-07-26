# Writer V2 — PRINCÍPIO-GUIA: leitor reflexivo, não preenchedor de lacunas

**Registrado em 25/07/2026** (dado do Luiz). É o critério que separa o comportamento certo do errado no V2.

## O princípio

> **Um bom assistente de laudos LÊ, ENTENDE e ESCREVE fiel — ele NÃO fareja lacunas para preencher cegamente.**

Dois agentes com os MESMOS ingredientes (laudo-base + frases cadastradas) podem ter posturas opostas:

| | Preenchedor cego (o que tínhamos) | Leitor reflexivo (o V2) |
|---|---|---|
| Como opera | extrai para uma ficha e ENCAIXA valor por valor num template com slots | LÊ o ditado + base + dicionário, ENTENDE, COMPÕE |
| Diante de dado ausente | deixa "____" ou preenche o slot sem juízo | decide se a cláusula pertence: normal / omite sub-cláusula / placeholder obrigatório |
| Diante do incomum | descarta (não cabe no template) | redige com princípios de laudo |
| Diante de um pedido de ajuste | ignora (não é um slot) | cumpre |
| Frase cadastrada | slot a preencher | conhecimento a consultar QUANDO faz sentido |

O "farejador cego" era tanto o **renderer** (encaixe mecânico após o structurer) quanto o **writer antigo** (amarrado por regras de preenchimento: "mantenha o '____' literal", "use APENAS as frases-padrão"). O V2 troca essas instruções de preenchimento por instruções de **reflexão**.

## Correções às instruções (Luiz, 25/07) — o que NÃO é regra de preenchimento cego

1. **NÃO existe "todo achado do corpo gera item na conclusão".** Corpo e conclusão são independentes: o médico às vezes coloca uma alteração só no corpo, ou só na conclusão. A regra real é: **corpo descreve de forma mais pura; conclusão traz o diagnóstico** — e respeita-se ONDE o médico pôs a informação. Sem forçar 1:1.
2. **NÃO existe "se não foi dito, omita".** O certo, em 3 casos:
   - Estrutura do protocolo não mencionada → **frase de normalidade** (não omite).
   - Sub-cláusula opcional dentro de um achado (ex.: "situada no ___") sem valor → **omite a sub-cláusula** (não deixa "____").
   - Campo **obrigatório** do modelo sem valor (ex.: CCN na obstétrica inicial) → **placeholder "____"** (não omite a linha).

Estas correções já estão no `universalCoreV2.ts` (princípios 2 e 3) + o princípio-guia no topo.

## Consequência de arquitetura
O objetivo não é um preenchedor melhor; é um **leitor reflexivo** com (a) princípios universais de redação, (b) o estilo do médico como DADO editável (base + dicionário de frases + contrato), e (c) validações determinísticas só para o sensível. Ver `docs/writer-v2-arquitetura-*` (conclusão do diálogo com o Codex).
