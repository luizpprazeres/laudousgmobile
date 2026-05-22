---
slug: sprint-6-sala-auxiliar
title: "Sala do Auxiliar — atendimento em dupla"
date: 2026-05-10
status: shipped
size: large
tags: [ios, backend, real-time, pairing]
sprint: S6
commits: ["ecd3d23", "33e83f4"]
related_adrs: []
files_touched: 22
---

## Resumo (leigo)

Em muitas clínicas, o ultrassonografista trabalha em dupla com um auxiliar: o médico examina e dita os achados, o auxiliar transcreve. Esta sprint trouxe esse fluxo pro app.

Como funciona: o médico cria uma "sala" no app dele e gera um código. O auxiliar, em outro dispositivo (celular ou desktop), entra com esse código. Daí em diante, tudo que o médico dita aparece ao vivo na tela do auxiliar — sem precisar gritar, repetir, ou mandar mensagem.

A sala é uma sessão temporária. Cada exame começa uma nova sala. Os dados não são armazenados além do necessário (regra LGPD).

## Detalhes (técnico)

Backend: endpoints novos em `apps/api/`: `POST /api/sala/create`, `POST /api/sala/join`, `POST /api/sala/event`, `GET /api/sala/[id]/stream` (SSE long-polling pro auxiliar).

Mobile (iOS): `SalaPairingView` com 6 dígitos numéricos, polling do estado da sala, broadcast de eventos (ditado, pause, finalizar) via novo serviço `SalaService.swift`.

Modelo: sala persistida como "sessão temporária" — TTL 4h, garbage-collected após. Refactor mid-sprint moveu UI da sala pra Preferências (modelo de sessão persistente, não criação ad-hoc por laudo).

Sprint 7.1 (commit 605b6e8) corrigiu bug no `SalaPairing` decoder + UX adjustments.

## Impacto & Próximos passos

Médicos com auxiliar têm fluxo natural agora — o que ditam aparece pra eles em tempo real. Próximos passos: redesign da tela principal de geração (sprint 7) pra deixar mais clara a separação entre achados e laudo final.
