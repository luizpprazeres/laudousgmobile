'use client'

import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { FetalPositionSchema as FetalPositionData } from '@/lib/visualSchemas/fetalPosition'

function imageAsDataUrl(source: string, signal: AbortSignal) {
  return fetch(source, { signal })
    .then((response) => {
      if (!response.ok) throw new Error('A base visual da posição fetal não foi carregada.')
      return response.blob()
    })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('A base visual da posição fetal não foi preparada.'))
      reader.readAsDataURL(blob)
    }))
}

export function FetalPositionSchema({ position, svgRef }: { position: FetalPositionData; svgRef: RefObject<SVGSVGElement> }) {
  const [image, setImage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setImage('')
    setError('')
    void imageAsDataUrl(position.imageSrc, controller.signal)
      .then(setImage)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'A base visual da posição fetal não foi carregada.')
      })
    return () => controller.abort()
  }, [position.imageSrc])

  return <div>
    <svg
      ref={svgRef}
      viewBox="0 0 640 720"
      data-ready={image ? 'true' : 'false'}
      className="h-auto w-full rounded-2xl bg-white"
      role="img"
      aria-label={`Esquema fetal: ${position.title}`}
    >
      <rect width="640" height="720" rx="20" fill="white" />
      <text x="320" y="36" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">POSIÇÃO FETAL</text>
      {image ? <image href={image} x="45" y="55" width="550" height="545" preserveAspectRatio="xMidYMid meet" /> : null}
      <line x1="54" x2="586" y1="612" y2="612" stroke="#d1d5db" />
      <text x="54" y="637" fontSize="12" fontWeight="700" fill="#4b5563">ESQUERDA MATERNA</text>
      <text x="586" y="637" textAnchor="end" fontSize="12" fontWeight="700" fill="#4b5563">DIREITA MATERNA</text>
      <text x="320" y="673" textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">{position.title}</text>
      {position.dorsum ? <text x="320" y="700" textAnchor="middle" fontSize="13" fill="#4b5563">Dorso {position.dorsum}</text> : null}
    </svg>
    {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
  </div>
}
