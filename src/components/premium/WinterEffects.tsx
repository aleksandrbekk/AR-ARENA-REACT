import React, { useEffect, useRef } from 'react'

export const WinterEffects: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width = window.innerWidth
        let height = window.innerHeight

        canvas.width = width
        canvas.height = height

        // Snowflakes configuration
        const snowflakes: { x: number; y: number; radius: number; speed: number; opacity: number; sway: number }[] = []
        const particleCount = 50 // Reduced count for "subtle" effect

        for (let i = 0; i < particleCount; i++) {
            snowflakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2 + 0.5, // Small size
                speed: Math.random() * 0.5 + 0.2, // Slow speed
                opacity: Math.random() * 0.05 + 0.05, // 5-10% opacity
                sway: Math.random() * Math.PI * 2 // Random starting sway
            })
        }

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, width, height)

            // Gradient overlay (Frosty vignette)
            // We do this via CSS preferably, but can add subtle glow here if needed.
            // Keeping canvas just for particles to be performant.

            snowflakes.forEach(flake => {
                ctx.beginPath()
                ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`
                ctx.fill()

                // Update position
                flake.y += flake.speed
                flake.x += Math.sin(flake.sway) * 0.2 // Gentle sway
                flake.sway += 0.01

                // Loop
                if (flake.y > height) {
                    flake.y = -10
                    flake.x = Math.random() * width
                }
            })

            requestAnimationFrame(animate)
        }

        const animationId = requestAnimationFrame(animate)

        const handleResize = () => {
            width = window.innerWidth
            height = window.innerHeight
            canvas.width = width
            canvas.height = height
        }

        window.addEventListener('resize', handleResize)

        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-10"
            style={{ background: 'transparent' }}
        />
    )
}
