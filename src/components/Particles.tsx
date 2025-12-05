export function Particles() {
  // Генерируем частицы один раз
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 7,
    size: 2 + Math.random() * 3
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#FFD700]"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            opacity: 0.3,
            animation: `particleFloat ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
    </div>
  )
}
