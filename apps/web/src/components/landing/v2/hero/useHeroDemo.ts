'use client'

import { useCallback, useEffect, useReducer, useRef, type RefObject } from 'react'
import { HERO_CASES, buildClipboardText } from './heroCases'
import {
  createAutoplay,
  createHeroReducer,
  initialHeroState,
  showcaseState,
  type HeroAction,
  type HeroAutoplay,
} from './heroAutoplay'

const reducer = createHeroReducer(HERO_CASES)

/**
 * Liga o núcleo puro (heroAutoplay) ao navegador:
 * - autoplay só com movimento liberado; pausa fora da tela e com aba oculta;
 * - o primeiro gesto humano dentro da demo (ponteiro, tecla, foco) para a
 *   autoplay na hora, antes de o evento chegar ao controle;
 * - `copy` é a ÚNICA porta para a área de transferência, e só por clique.
 */
export function useHeroDemo(root: RefObject<HTMLElement | null>, reduce: boolean) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialHeroState(HERO_CASES))
  const autoplay = useRef<HeroAutoplay | null>(null)
  const human = useRef(false)

  useEffect(() => {
    if (human.current) return
    if (reduce) {
      // Estático: o primeiro caso já preenchido, sem relógio nenhum.
      dispatch({ type: 'showcase', state: showcaseState(HERO_CASES, 0) })
      return
    }
    const player = createAutoplay({
      cases: HERO_CASES,
      dispatch: (a: HeroAction) => dispatch(a),
      timers: { set: (fn, ms) => window.setTimeout(fn, ms), clear: (h) => window.clearTimeout(h as number) },
    })
    autoplay.current = player

    let onScreen = true
    const sync = () => {
      if (onScreen && document.visibilityState === 'visible') player.resume()
      else player.pause()
    }
    const io = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting
          sync()
        }, { threshold: 0.2 })
    if (root.current && io) io.observe(root.current)
    document.addEventListener('visibilitychange', sync)
    player.start()
    sync()

    return () => {
      player.stop()
      io?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      autoplay.current = null
    }
  }, [reduce, root])

  const takeOver = useCallback(() => {
    if (human.current) return
    human.current = true
    autoplay.current?.stop()
    dispatch({ type: 'takeOver' })
  }, [])

  const copy = useCallback(async () => {
    takeOver()
    const heroCase = HERO_CASES[state.caseIndex]
    try {
      await navigator.clipboard.writeText(buildClipboardText(heroCase, state.values[heroCase.id]))
      dispatch({ type: 'status', status: 'copiado' })
    } catch {
      dispatch({ type: 'status', status: 'copia-falhou' })
    }
  }, [state.caseIndex, state.values, takeOver])

  // Handlers de captura: rodam antes do onClick/onChange do controle.
  const interruptProps = {
    onPointerDownCapture: takeOver,
    onKeyDownCapture: takeOver,
    onFocusCapture: takeOver,
  }

  return { state, dispatch, takeOver, copy, interruptProps, cases: HERO_CASES }
}
