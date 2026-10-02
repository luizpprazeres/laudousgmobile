# Esquemas no histórico do laudo — o que o banco guarda e o que falta

Data: 02/10/2026. Escopo: reabrir, a partir do histórico (`apps/mobile/app/report/[id].tsx`), os esquemas visuais ligados a um `reportId`.

## O que foi conferido

Metadados de produção (Supabase `laudousgmobile`), sem ler nenhuma imagem, laudo ou dado de paciente:

| Item | Estado real |
|---|---|
| Colunas de `sala_schemas` | `id`, `user_id`, `report_id` (nullable), `exam_type`, `exam_label`, `png_base64`, `pdf_base64` (nullable), `created_at`, `updated_at` |
| Dado estruturado do desenho | **nenhuma coluna** — sem `contract_version`, `findings`, mapa ou marcadores |
| DDL no repositório | ausente; a tabela só aparece no `GRANT` de `packages/db/src/sql/0024_menor_privilegio_escrita.sql` |
| RLS | ligada, **sem nenhuma política** → só o service role lê ou grava |
| Índices | PK em `id`; `sala_schemas_user_idx (user_id, updated_at desc)`; `sala_schemas_dedup_idx (user_id, report_id, exam_type)` **não único** |
| FK `report_id → reports.id` | não existe |
| `reports.generation_metadata` | nenhuma chave de esquema, mapa ou mioma |
| Volume (contagem por tipo) | 3 linhas: MAMA 1, MIOMAS 1, VENOSO_MMII 1; só a venosa tem `report_id` |

No código:

- `POST /api/sala/push-schema` **valida** o contrato `myoma-scheme/v1` e o **descarta**: grava apenas PNG/PDF.
- O `MapaVenoso` é emitido só pelo SSE `scheme` (`apps/api/src/app/api/generate/route.ts`) e não é persistido; `venousMapService` não escreve no banco.
- Os marcadores de tireoide e mama do Android ficam em `useState` (`visualDraft` em `app/generate.tsx`) e somem ao sair da tela.
- Só existe linha em `sala_schemas` quando o médico **envia à Sala**; esquema não enviado nunca é persistido.
- Os três envios do Android (miomas, venoso, tireoide/mama) já mandam `reportId`.

## O que foi implementado

Reabertura **somente leitura** da imagem que o médico enviou, a única coisa que o banco guarda:

- `GET /api/reports/:id/schemas` (`apps/api/src/app/api/reports/[id]/schemas/route.ts`): JWT obrigatório, filtra por `user_id` **e** `report_id` (é a autorização, já que a tabela não tem política), `cache-control: no-store`. Cada linha passa por `toStoredSchemes` (`apps/api/src/server/reportSchemes/storedSchemes.ts`): exige assinatura PNG e cabeçalho IHDR íntegros e devolve largura/altura para o app desenhar na proporção certa. Uma linha ilegível é omitida.
- Android, aba **Laudo** do histórico: seção "Esquemas enviados à Sala" com cada imagem, rótulo e data de envio. Sem envio, a seção não aparece; 404 (backend anterior à rota) é tratado como "nenhum esquema".
- Nenhum dado é reconstruído: não há re-extração do ditado, nenhuma IA é chamada e nenhum achado é inferido a partir da imagem.

Teste: `apps/api/src/server/reportSchemes/__tests__/storedSchemes.manual.ts`.

## O que NÃO dá para reabrir hoje, e o contrato que falta

Reabrir o **editor** (mover marcador, confirmar FIGO, reenviar) exige os achados do desenho, e eles não existem no banco. A migration abaixo é uma **proposta**; não foi aplicada:

```sql
-- 1) Contrato estruturado ao lado da imagem enviada.
alter table public.sala_schemas
  add column contract_version text,
  add column findings jsonb,
  add constraint sala_schemas_contract_pair
    check ((contract_version is null) = (findings is null));

-- 2) O upsert de push-schema (select + insert/update) supõe uma linha por
--    usuário × laudo × tipo, mas o índice atual não garante isso.
--    Antes: conferir duplicatas com
--    select user_id, report_id, exam_type, count(*) from public.sala_schemas
--    group by 1,2,3 having count(*) > 1;
create unique index sala_schemas_report_exam_uniq
  on public.sala_schemas (user_id, report_id, exam_type)
  where report_id is not null;

-- 3) Opcional: apagar o laudo apaga seus esquemas.
alter table public.sala_schemas
  add constraint sala_schemas_report_fk
  foreign key (report_id) references public.reports(id) on delete cascade;
```

Contratos por esquema, que precisam existir antes de gravar `findings`:

| Esquema | Contrato | Falta |
|---|---|---|
| Miomas | `myoma-scheme/v1` (`packages/schemes/src/myoma/contract.ts`) já existe | `push-schema` gravar `contract_version`/`findings` quando o contrato passar; o histórico validar com `MyomaSchemeContractSchema` antes de abrir o editor |
| Venoso MMII | `MapaVenoso` + `asset_version` (`venous-4view-1` ou `venoso-anterior-1`) | definir um envelope versionado (ex.: `venous-scheme/v1 = { asset_version, map }`) e o cliente enviá-lo junto do PNG; alternativa: gravar o mapa emitido pelo SSE em `generation_metadata`, o que o torna disponível mesmo sem envio à Sala |
| Tireoide / mama | não existe | criar um contrato versionado para `VisualMarker` (`apps/mobile/src/features/generate/visualSchemeState.ts`) em `packages/schemes`, compartilhado com a Web, antes de persistir |

Para recuperar também esquemas **não enviados** à Sala, seria preciso um armazenamento de rascunho próprio. `sala_schemas` é a vitrine da Sala e não deve virar rascunho.

`push-schema` fica no domínio Sala, fora do escopo desta rodada: as mudanças acima precisam de dono e de deploy coordenado (migration → API → clientes).
