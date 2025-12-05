import { useEffect, useState } from 'react'

interface Props {
  value: number
  id: number
  onComplete: (id: number) => void
}

export function FloatingNumber({ value, id, onComplete }: Props) {
  const [style, setStyle] = useState({
    opacity: 1,
    transform: 'translateY(0)'
  })

  useEffect(() => {
    // Запуск анимации
    requestAnimationFrame(() => {
      setStyle({
        opacity: 0,
        transform: 'translateY(-60px)'
      })
    })

    // Удалить после анимации
    const timer = setTimeout(() => onComplete(id), 600)
    return () => clearTimeout(timer)
  }, [id, onComplete])

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-1/3 pointer-events-none z-50 text-2xl font-bold"
      style={{
        ...style,
        transition: 'all 0.5s ease-out',
        color: '#FFD700',
        textShadow: '0 0 10px rgba(255,215,0,0.7), 0 2px 4px rgba(0,0,0,0.5)'
      }}
    >
      +{value}
    </div>
  )
}
