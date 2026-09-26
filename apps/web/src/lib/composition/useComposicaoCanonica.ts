'use client'

import { useEffect, useRef, useState } from 'react'
import type { CompositionSession } from './associations'
import { buildCompositionBody, type ComponentPendency } from './buildRequest'
import {
  CLINICAL_COMPOSITION_CONTRACT_VERSION,
  ClinicalCompositionResponseV1Schema,
  type ClinicalCompositionBrowserRequest,
  type ClinicalCompositionErrorV1,
  type ClinicalCompositionSuccessV1,
  type CompositionBlock,
} from './contract'

/**
 * O LAUDO COMPOSTO vem do endpoint de composição — mesma disciplina do
 * `useLaudoCanonico`, com duas travas a mais.
 *
 * 1. **Resposta antiga não vence.** Cada pedido leva `requestId` novo e
 *    `revision` crescente. Só é aceita a resposta que ecoa o `requestId` do
 *    ÚLTIMO pedido, a mesma `revision` e o mesmo `compositionId`. Uma resposta
 *    atrasada de uma edição anterior é descartada mesmo que chegue com 200.
 * 2. **Falha parcial é falha.** Se um componente vier `error`/`blocked`, ou se
 *    a lista de componentes renderizados não for exatamente a da sessão, não
 *    há laudo — o texto anterior fica marcado como desatualizado e o salvar é
 *    recusado. Um componente pronto não se apresenta como exame completo.
 */

export type EstadoDaComposicao = {
  texto: string
  document: ClinicalCompositionSuccessV1['document'] | null
  blocks: CompositionBlock[]
  /** requestId/revision da resposta ACEITA que produziu `texto`. */
  requestId: string | null
  revision: number
  carregando: boolean
  desatualizado: boolean
  erro: string | null
  conflitos: Array<{ motivo: string; componentId?: string }>
  pendencias: ComponentPendency[]
  componentesComFalha: string[]
}

const ESPERA_MS = 400

function vazio(revision: number): EstadoDaComposicao {
  return {
    texto: '', document: null, blocks: [], requestId: null, revision,
    carregando: false, desatualizado: false, erro: null, conflitos: [], pendencias: [], componentesComFalha: [],
  }
}

function newRequestId() {
  return crypto.randomUUID()
}

type Validated = { ok: true; value: ClinicalCompositionSuccessV1 } | { ok: false; erro: string; value?: ClinicalCompositionErrorV1 }

/** Aceita só o que corresponde AO pedido feito — nada de laudo de outra sessão. */
export function validarResposta(
  pedido: Pick<ClinicalCompositionBrowserRequest, 'requestId' | 'revision' | 'compositionId' | 'associationCode' | 'components'>,
  json: unknown,
  httpOk: boolean,
): Validated {
  const r = json as { contractVersion?: unknown; requestId?: unknown; revision?: unknown; compositionId?: unknown; associationCode?: unknown } | null
  if (!r || typeof r !== 'object') return { ok: false, erro: 'Resposta inválida do serviço de composição.' }
  // Falha antes do contrato (sessão, proxy, serviço fora): o proxy responde
  // `{ error }` sem eco. Não é "versão desconhecida" — é o motivo dele.
  if (!httpOk && r.contractVersion === undefined) {
    const simples = (json as { error?: unknown }).error
    return { ok: false, erro: typeof simples === 'string' ? simples : 'Não foi possível montar o laudo composto agora.' }
  }
  if (r.contractVersion !== CLINICAL_COMPOSITION_CONTRACT_VERSION) {
    return { ok: false, erro: 'Versão de contrato da composição não suportada por esta tela.' }
  }
  if (r.requestId !== pedido.requestId || r.revision !== pedido.revision || r.compositionId !== pedido.compositionId || r.associationCode !== pedido.associationCode) {
    return { ok: false, erro: 'A resposta não corresponde ao pedido atual.' }
  }
  const parsed = ClinicalCompositionResponseV1Schema.safeParse(json)
  if (!parsed.success) return { ok: false, erro: 'Resposta de composição fora do contrato.' }
  if (parsed.data.status === 'error' || !httpOk) {
    const err = parsed.data.status === 'error' ? parsed.data : undefined
    return { ok: false, erro: err?.error.message ?? 'Não foi possível montar o laudo composto.', value: err }
  }
  const ok = parsed.data
  /**
   * Os componentes devolvidos têm de ser EXATAMENTE os do pedido: mesmos ids,
   * sem repetição, cada um com a sua categoria, todos `rendered`. Contar e
   * conferir pertença não basta — [A, A] passaria sem B.
   */
  const pedidos = new Map(pedido.components.map((c) => [c.componentId, c.categoryCode]))
  const vieram = ok.components
  const idsVindos = new Set(vieram.map((c) => c.componentId))
  const componentesConferem =
    vieram.length === pedidos.size &&
    idsVindos.size === pedidos.size &&
    vieram.every((c) => c.status === 'rendered' && pedidos.get(c.componentId) === c.categoryCode)
  if (!componentesConferem) {
    return { ok: false, erro: 'Um dos exames associados não foi montado — o laudo não está completo.' }
  }
  // A origem de cada bloco precisa apontar para componentes deste pedido, com
  // as categorias deles — senão a rastreabilidade mostrada na tela mente.
  const blocosConferem = ok.blocks.every((b) =>
    b.componentIds.length > 0 &&
    new Set(b.componentIds).size === b.componentIds.length &&
    b.componentIds.every((id) => pedidos.has(id)) &&
    [...new Set(b.componentIds.map((id) => pedidos.get(id)))].sort().join('|') === [...new Set(b.categoryCodes)].sort().join('|'))
  if (!blocosConferem) {
    return { ok: false, erro: 'A origem dos blocos do laudo não confere com os exames associados.' }
  }
  return { ok: true, value: ok }
}

export function useComposicaoCanonica(
  session: CompositionSession | null,
  ativo: boolean,
  baseRevision = 0,
): EstadoDaComposicao {
  const [estado, setEstado] = useState<EstadoDaComposicao & { compositionId: string | null }>(() => ({ ...vazio(baseRevision), compositionId: null }))
  const built = session ? buildCompositionBody(session) : null
  const chave = built ? JSON.stringify(built) : null
  const ultimoPedido = useRef<string | null>(null)
  const revisao = useRef(baseRevision)

  useEffect(() => {
    if (baseRevision > revisao.current) revisao.current = baseRevision
  }, [baseRevision])

  useEffect(() => {
    if (!ativo || !chave) return
    const b = JSON.parse(chave) as ReturnType<typeof buildCompositionBody>
    const compositionId = session?.compositionId ?? null

    if (!b.ok) {
      ultimoPedido.current = null
      setEstado((e) => ({
        ...vazio(e.revision),
        compositionId,
        erro: b.pendencias.map((p) => `${p.onde}: ${p.motivo}`).join(' · '),
        pendencias: b.pendencias,
      }))
      return
    }

    const requestId = newRequestId()
    const revision = ++revisao.current
    ultimoPedido.current = requestId
    const pedido: ClinicalCompositionBrowserRequest = { ...b.body, requestId, revision }

    setEstado((e) => {
      const mesma = e.compositionId === compositionId
      return {
        ...e,
        compositionId,
        texto: mesma ? e.texto : '',
        document: mesma ? e.document : null,
        blocks: mesma ? e.blocks : [],
        carregando: true,
        desatualizado: mesma && e.texto !== '',
        erro: null,
        conflitos: [],
        pendencias: [],
        componentesComFalha: [],
      }
    })

    const timer = setTimeout(async () => {
      let resposta: Response
      let json: unknown = null
      try {
        resposta = await fetch('/api/compositions/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pedido),
        })
        json = await resposta.json().catch(() => null)
      } catch {
        if (ultimoPedido.current !== requestId) return
        setEstado((e) => ({ ...e, carregando: false, desatualizado: e.texto !== '', erro: 'Não foi possível montar o laudo composto agora.' }))
        return
      }
      // Chegou tarde: há um pedido mais novo em voo, ou a sessão mudou.
      if (ultimoPedido.current !== requestId) return

      const v = validarResposta(pedido, json, resposta.ok)
      if (!v.ok) {
        const falhas = (v.value?.components ?? []).filter((c) => c.status !== 'rendered').map((c) => c.componentId)
        setEstado((e) => ({
          ...e,
          carregando: false,
          desatualizado: e.texto !== '',
          erro: v.erro,
          conflitos: v.value?.conflicts ?? [],
          componentesComFalha: falhas,
        }))
        return
      }
      setEstado({
        compositionId,
        texto: v.value.document.fullText,
        document: v.value.document,
        blocks: v.value.blocks,
        requestId,
        revision,
        carregando: false,
        desatualizado: false,
        erro: null,
        conflitos: [],
        pendencias: [],
        componentesComFalha: [],
      })
    }, ESPERA_MS)

    return () => clearTimeout(timer)
    // `session` entra pela `chave` serializada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, chave])

  if (!session || estado.compositionId !== session.compositionId) {
    return { ...vazio(revisao.current), carregando: Boolean(ativo && chave) }
  }
  const { compositionId: _ignored, ...publico } = estado
  return publico
}
