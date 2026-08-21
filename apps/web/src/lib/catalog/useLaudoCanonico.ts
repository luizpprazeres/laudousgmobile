'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * O LAUDO VEM DO RENDERER — a troca de motor da TIREOIDE (§3.2).
 *
 * A tela compunha o texto localmente, de forma síncrona, dentro de um `useMemo`.
 * Agora ela manda os achados para `/api/catalog/TIREOIDE/render` e recebe o
 * laudo pronto do renderer canônico — o mesmo que atende o iOS e o Android.
 *
 * ## As três decisões que importam aqui
 *
 * **Não há mais compositor local para cair.** O antigo foi apagado, não
 * desativado (ver `lib/deterministic/organs/tireoide.ts`). Um segundo motor
 * vivo é a definição de segunda fonte de redação clínica, e o pior é que ele
 * falha *plausivelmente*: produz um laudo que parece certo. Quando o `/render`
 * não responde, a tela diz que não conseguiu — não inventa.
 *
 * **O texto anterior fica na tela enquanto o novo não chega, e é marcado como
 * desatualizado.** Piscar em branco a cada tecla digitada tornaria o formulário
 * inutilizável; mostrar o texto velho sem avisar faria o médico ler como atual
 * um laudo que já não corresponde ao que está preenchido.
 *
 * **Resposta atrasada não sobrescreve resposta nova.** Duas edições rápidas
 * disparam duas chamadas, e nada garante a ordem de volta. Sem o carimbo de
 * geração, a primeira resposta poderia chegar depois da segunda e repor um
 * laudo que já não é o do formulário.
 *
 * ## O que o adaptador manda junto
 *
 * Além dos `dados`, ele deriva **alterações**: as quatro tireoidites e os
 * linfonodos suspeitos são cenários do catálogo, não campos. Mandar só os dados
 * faria o laudo sair NORMAL com a tireoidite selecionada na tela — o diagnóstico
 * escolhido desapareceria sem erro nenhum.
 *
 * E ele devolve **pendências**. As que marcam `bloqueia` significam que a tela
 * tem uma escolha que o canônico não sabe representar; renderizar assim mesmo
 * produziria um laudo que NEGA o que o médico marcou. Nesse caso não se
 * renderiza: diz-se o que falta.
 */

export type EstadoDoLaudo = {
  /** O último laudo que o renderer devolveu. Vazio antes da primeira resposta. */
  texto: string
  /** Há uma chamada em curso — o texto na tela pode não refletir o formulário. */
  carregando: boolean
  /** O texto exibido é de uma versão anterior dos achados. */
  desatualizado: boolean
  /** Mensagem para o médico quando não deu — nunca um laudo inventado. */
  erro: string | null
  /** Conflitos nomeados do 409: escolhas que não se combinam. */
  conflitos: { motivo: string }[]
}

const ESPERA_MS = 400

export type Entrada = {
  dados: Record<string, unknown>
  alteracoes: string[]
  pendencias: { onde: string; valor: string; motivo: string; bloqueia?: boolean }[]
}

export function useLaudoCanonico(
  categoria: string,
  entrada: Entrada | null,
  ativo: boolean,
): EstadoDoLaudo {
  const [estado, setEstado] = useState<EstadoDoLaudo>({
    texto: '',
    carregando: false,
    desatualizado: false,
    erro: null,
    conflitos: [],
  })

  /** Serializado, para não refazer a chamada quando só a identidade do objeto muda. */
  const corpo = entrada
    ? JSON.stringify({ alteracoes: entrada.alteracoes, dados: entrada.dados })
    : null
  const bloqueios = (entrada?.pendencias ?? []).filter((p) => p.bloqueia)
  const bloqueado = JSON.stringify(bloqueios)
  const geracao = useRef(0)

  useEffect(() => {
    if (!ativo || !corpo) return

    /**
     * BLOQUEADO — a tela tem algo que o canônico não representa.
     *
     * Renderizar assim mesmo devolveria um laudo sem aquele achado, e o médico
     * leria "normal" onde marcou uma doença. Melhor nenhum texto e um motivo.
     */
    const travas = JSON.parse(bloqueado) as Entrada['pendencias']
    if (travas.length > 0) {
      geracao.current++
      setEstado({
        texto: '',
        carregando: false,
        desatualizado: false,
        erro: travas.map((p) => `${p.onde}: ${p.motivo}`).join(' · '),
        conflitos: [],
      })
      return
    }

    const minha = ++geracao.current
    setEstado((e) => ({ ...e, carregando: true, desatualizado: e.texto !== '' }))

    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/catalog/${encodeURIComponent(categoria)}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: corpo,
        })
        // Chegou tarde: já há uma edição mais nova em voo.
        if (minha !== geracao.current) return

        const j = (await r.json().catch(() => null)) as
          | { laudo?: string; error?: string; conflitos?: { motivo: string }[] }
          | null

        if (!r.ok || typeof j?.laudo !== 'string') {
          setEstado((e) => ({
            ...e,
            carregando: false,
            desatualizado: e.texto !== '',
            erro: j?.error ?? 'Não foi possível montar o laudo agora.',
            conflitos: j?.conflitos ?? [],
          }))
          return
        }

        setEstado({
          texto: j.laudo,
          carregando: false,
          desatualizado: false,
          erro: null,
          conflitos: [],
        })
      } catch {
        if (minha !== geracao.current) return
        setEstado((e) => ({
          ...e,
          carregando: false,
          desatualizado: e.texto !== '',
          erro: 'Sem conexão com o serviço de laudos.',
          conflitos: [],
        }))
      }
    }, ESPERA_MS)

    return () => clearTimeout(timer)
  }, [categoria, corpo, bloqueado, ativo])

  return estado
}
