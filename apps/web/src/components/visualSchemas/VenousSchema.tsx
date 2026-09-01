'use client'

import { useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import {
  recolorVenousPixels4,
  VENOUS_4VIEW_COORDS,
  type MapaVenoso,
} from '@laudousg/schemes'

const ASSET = '/schemas/vascular/venous-4view-v1.png'

type RenderedMap = {
  image: string
  changedPixels: number
}

function loadImage(source: string, signal: AbortSignal) {
  return fetch(source, { signal })
    .then((response) => {
      if (!response.ok) throw new Error('A base anatômica da cartografia venosa não foi carregada.')
      return response.blob()
    })
    .then((blob) => new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('A base anatômica da cartografia venosa não foi preparada.'))
      }
      image.src = url
    }))
}

async function renderMap(map: MapaVenoso, signal: AbortSignal): Promise<RenderedMap> {
  const image = await loadImage(ASSET, signal)
  if (signal.aborted) throw new DOMException('Operação cancelada.', 'AbortError')
  const canvas = document.createElement('canvas')
  canvas.width = VENOUS_4VIEW_COORDS.width
  canvas.height = VENOUS_4VIEW_COORDS.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Não foi possível preparar a cartografia venosa.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const changedPixels = recolorVenousPixels4(
    pixels.data,
    pixels.width,
    pixels.height,
    map,
    VENOUS_4VIEW_COORDS,
  )
  context.putImageData(pixels, 0, 0)
  return { image: canvas.toDataURL('image/png'), changedPixels }
}

export function VenousSchema({ map, svgRef }: { map: MapaVenoso; svgRef: RefObject<SVGSVGElement> }) {
  const [rendered, setRendered] = useState<RenderedMap | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setRendered(null)
    setError('')
    void renderMap(map, controller.signal)
      .then(setRendered)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'A cartografia venosa não foi montada.')
      })
    return () => controller.abort()
  }, [map])

  const alteredSegments = useMemo(
    () => Object.values(map.lados.direito.segmentos).length + Object.values(map.lados.esquerdo.segmentos).length,
    [map],
  )

  return <div>
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VENOUS_4VIEW_COORDS.width} ${VENOUS_4VIEW_COORDS.height + 190}`}
      data-ready={rendered ? 'true' : 'false'}
      className="h-auto w-full rounded-2xl bg-white"
      role="img"
      aria-label="Cartografia venosa dos membros inferiores em quatro vistas"
    >
      <rect width={VENOUS_4VIEW_COORDS.width} height={VENOUS_4VIEW_COORDS.height + 190} fill="white" />
      {rendered ? <image href={rendered.image} width={VENOUS_4VIEW_COORDS.width} height={VENOUS_4VIEW_COORDS.height} /> : null}
      <line x1="80" x2={VENOUS_4VIEW_COORDS.width - 80} y1={VENOUS_4VIEW_COORDS.height + 26} y2={VENOUS_4VIEW_COORDS.height + 26} stroke="#d1d5db" strokeWidth="2" />
      <g transform={`translate(110 ${VENOUS_4VIEW_COORDS.height + 84})`}>
        <circle cx="0" cy="0" r="14" fill="#d1841a" />
        <text x="28" y="9" fontSize="30" fill="#374151">Refluxo / varicosidade</text>
        <circle cx="520" cy="0" r="14" fill="#b03a4a" />
        <text x="548" y="9" fontSize="30" fill="#374151">Trombose</text>
        <circle cx="900" cy="0" r="14" fill="#c4606e" />
        <text x="928" y="9" fontSize="30" fill="#374151">Trombose parcial</text>
        <circle cx="1425" cy="0" r="14" fill="#b03a4a" />
        <circle cx="1425" cy="0" r="7" fill="white" />
        <text x="1453" y="9" fontSize="30" fill="#374151">Recanalização</text>
      </g>
      <text x={VENOUS_4VIEW_COORDS.width / 2} y={VENOUS_4VIEW_COORDS.height + 158} textAnchor="middle" fontSize="26" fill="#6b7280">
        {alteredSegments > 0 ? `${alteredSegments} ${alteredSegments === 1 ? 'segmento alterado' : 'segmentos alterados'}` : 'Sem segmentos alterados no mapa estruturado'}
      </text>
    </svg>
    {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
  </div>
}
