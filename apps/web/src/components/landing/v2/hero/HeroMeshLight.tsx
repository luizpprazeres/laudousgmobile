'use client'

import { useEffect, useRef, type RefObject } from 'react'

const SPACING = 22
const REACH = 150
const REST = { x: 0.78, y: 0.72 } // repouso: perto do canto superior esquerdo do mockup

/**
 * Luz de fundo do hero: uma malha de pontos quase invisível que acende em
 * verde, bem de leve, perto do ponteiro, com fios discretos entre os nós.
 *
 * - O ponteiro é lido do `host` (a seção inteira), mas o canvas não recebe
 *   eventos: nada nele é clicável.
 * - O laço de quadros só roda enquanto a luz ainda está se movendo, a seção
 *   está na tela e a aba está visível. Parado, não gasta nada.
 * - Movimento reduzido: um único quadro estático, luz no ponto de repouso.
 */
export function HeroMeshLight({ host, reduce }: { host: RefObject<HTMLElement | null>; reduce: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const section = host.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !section || !ctx) return

    let width = 0
    let height = 0
    const light = { x: 0, y: 0, tx: 0, ty: 0, strength: 0.55, target: 0.55 }
    let frame = 0
    let visible = true

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!light.x && !light.y) {
        light.x = light.tx = width * REST.x
        light.y = light.ty = height * REST.y
      }
      draw()
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, REACH * 1.6)
      glow.addColorStop(0, `rgba(16,185,129,${0.1 * light.strength})`)
      glow.addColorStop(1, 'rgba(16,185,129,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)
      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          const dx = x - light.x
          const dy = y - light.y
          const d = Math.hypot(dx, dy)
          const k = d < REACH ? (1 - d / REACH) ** 2 * light.strength : 0
          // Os nós próximos cedem levemente; os fios aparecem só na região iluminada.
          const px = x - (d ? (dx / d) * k * 3 : 0)
          const py = y - (d ? (dy / d) * k * 3 : 0)
          if (k > 0.02) {
            ctx.strokeStyle = `rgba(5,150,105,${k * 0.22})`
            ctx.lineWidth = 0.65
            for (const [ox, oy] of [[SPACING, 0], [0, SPACING], [SPACING, SPACING]]) {
              const nx = x + ox
              const ny = y + oy
              if (nx >= width || ny >= height) continue
              const nd = Math.hypot(nx - light.x, ny - light.y)
              const nk = nd < REACH ? (1 - nd / REACH) ** 2 * light.strength : 0
              ctx.beginPath()
              ctx.moveTo(px, py)
              ctx.lineTo(nx - (nd ? (nx - light.x) / nd * nk * 3 : 0), ny - (nd ? (ny - light.y) / nd * nk * 3 : 0))
              ctx.stroke()
            }
          }
          ctx.fillStyle = k > 0.02 ? `rgba(5,150,105,${0.12 + k * 0.45})` : 'rgba(100,116,139,0.10)'
          ctx.beginPath()
          ctx.arc(px, py, 0.9 + k * 0.9, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const tick = () => {
      frame = 0
      light.x += (light.tx - light.x) * 0.12
      light.y += (light.ty - light.y) * 0.12
      light.strength += (light.target - light.strength) * 0.08
      draw()
      const settled =
        Math.abs(light.tx - light.x) < 0.3 && Math.abs(light.ty - light.y) < 0.3 && Math.abs(light.target - light.strength) < 0.005
      if (!settled) request()
    }

    const request = () => {
      if (!frame && visible && document.visibilityState === 'visible') frame = window.requestAnimationFrame(tick)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const inside = x > -REACH && y > -REACH && x < width + REACH && y < height + REACH
      light.tx = inside ? x : width * REST.x
      light.ty = inside ? y : height * REST.y
      light.target = inside ? 1 : 0.55
      request()
    }
    const onLeave = () => {
      light.tx = width * REST.x
      light.ty = height * REST.y
      light.target = 0.55
      request()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    if (reduce) return () => ro.disconnect()

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) request()
      else if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
    })
    io.observe(canvas)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }
    section.addEventListener('pointermove', onMove, { passive: true })
    section.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [host, reduce])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute left-[26%] top-[4%] -z-10 hidden h-[58%] w-[40%] [mask-image:radial-gradient(ellipse_at_70%_60%,black_30%,transparent_72%)] lg:block"
    />
  )
}
