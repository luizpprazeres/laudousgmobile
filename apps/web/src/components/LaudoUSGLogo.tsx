'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'

type LogoSize = 'sm' | 'md' | 'lg'

interface LaudoUSGLogoProps {
  size?: LogoSize
  variant?: 'default' | 'white'
  className?: string
}

const sizeMap: Record<LogoSize, { px: number; textClass: string; subTextClass: string; gap: string }> = {
  sm: { px: 28, textClass: 'text-base', subTextClass: 'text-[8px]', gap: 'gap-2' },
  md: { px: 36, textClass: 'text-xl', subTextClass: 'text-[9px]', gap: 'gap-2.5' },
  lg: { px: 48, textClass: 'text-3xl', subTextClass: 'text-[11px]', gap: 'gap-3' },
}

export default function LaudoUSGLogo({ size = 'md', variant = 'default', className = '' }: LaudoUSGLogoProps) {
  const { px, textClass, subTextClass, gap } = sizeMap[size]
  const isWhite = variant === 'white'
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const mainColor = isWhite ? '#ffffff' : isDark ? '#6ee7b7' : '#18533F'
  const accentColor = isWhite ? 'rgba(255,255,255,0.65)' : isDark ? 'rgba(110,231,183,0.65)' : '#4a8a6a'
  const subColor = isWhite ? 'rgba(255,255,255,0.45)' : isDark ? 'rgba(110,231,183,0.45)' : 'rgba(24,83,63,0.45)'

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <Image
        src={isWhite ? '/brand/logo-laudousg-white.png' : '/brand/logo-laudousg-transparent.png'}
        alt="LaudoUSG"
        width={px}
        height={px}
        className="object-contain"
        priority
      />

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span
          className={`${textClass} font-black tracking-tight leading-none`}
          style={{ color: mainColor }}
        >
          Laudo
          <span style={{ color: accentColor, fontWeight: 400 }}>
            USG
          </span>
        </span>
        {size !== 'sm' && (
          <span
            className={`${subTextClass} font-medium tracking-widest uppercase mt-0.5`}
            style={{ color: subColor }}
          >
            Laudos rápidos e inteligentes
          </span>
        )}
      </div>
    </div>
  )
}
