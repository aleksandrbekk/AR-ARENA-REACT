import { motion, useMotionValue, useTransform, useAnimationControls } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { useState, useRef, useCallback } from 'react'

interface SqueezeCardProps {
  result: 'green' | 'red'
  playerName?: string
  playerAvatar?: string
  ticketNumber?: number
  isRevealed?: boolean // External control (for automated reveals)
  onReveal?: () => void
  onRevealComplete?: () => void // Backward compat alias
  onDragProgress?: (progress: number) => void // 0-1 for haptics
}

const REVEAL_THRESHOLD = 0.4 // 40% = reveal
const MAX_DRAG = 150 // max drag distance in px

/**
 * SqueezeCard - Interactive card with poker-style "squeeze" reveal
 * Drag to peek, release to snap back or reveal
 */
export function SqueezeCard({
  result,
  playerName = 'Player',
  playerAvatar,
  ticketNumber,
  isRevealed: externalRevealed,
  onReveal,
  onRevealComplete,
  onDragProgress
}: SqueezeCardProps) {
  const [internalRevealed, setInternalRevealed] = useState(false)

  // Use external control if provided, otherwise internal state
  const isRevealed = externalRevealed !== undefined ? externalRevealed : internalRevealed
  const [isDragging, setIsDragging] = useState(false)
  const peelControls = useAnimationControls()
  const lastProgressRef = useRef(0)

  // Motion values for drag
  const dragY = useMotionValue(0)

  // Transform drag to rotation (peek effect)
  const rotateX = useTransform(dragY, [0, MAX_DRAG], [0, 35])
  const rotateY = useTransform(dragY, [0, MAX_DRAG], [0, -25])
  const cardX = useTransform(dragY, [0, MAX_DRAG], [0, -15])
  const peekOpacity = useTransform(dragY, [0, MAX_DRAG * 0.3, MAX_DRAG], [0, 0.3, 0.8])

  // Result colors
  const resultColors = {
    green: {
      border: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.5)',
      bg: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%)',
      text: 'PASSED'
    },
    red: {
      border: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.5)',
      bg: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #ef4444 100%)',
      text: 'OUT'
    }
  }

  const colors = resultColors[result]

  // Handle drag for haptic feedback
  const handleDrag = useCallback((_: any, info: PanInfo) => {
    const progress = Math.min(Math.abs(info.offset.y) / MAX_DRAG, 1)

    // Call haptic progress callback (debounced by progress delta)
    if (onDragProgress && Math.abs(progress - lastProgressRef.current) > 0.05) {
      onDragProgress(progress)
      lastProgressRef.current = progress
    }
  }, [onDragProgress])

  // Handle drag end - snap back or reveal
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    setIsDragging(false)
    const progress = Math.abs(info.offset.y) / MAX_DRAG

    if (progress >= REVEAL_THRESHOLD) {
      // REVEAL!
      doReveal()
    } else {
      // Snap back
      dragY.set(0)
      lastProgressRef.current = 0
    }
  }, [dragY])

  // Full reveal animation
  const doReveal = async () => {
    if (isRevealed) return

    // Animate card flying away
    await peelControls.start({
      rotateY: -180,
      rotateX: 0,
      x: 0,
      opacity: 0,
      transition: { duration: 0.5, ease: 'easeIn' }
    })

    setInternalRevealed(true)
    onReveal?.()
    onRevealComplete?.()
  }

  // Handle tap to reveal (alternative to drag)
  const handleTap = () => {
    if (!isRevealed && !isDragging) {
      doReveal()
    }
  }

  return (
    <div
      className="relative w-full touch-none"
      style={{ perspective: '1000px', aspectRatio: '5/7' }}
    >
      {/* Result card (underneath) */}
      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: isRevealed ? 1 : peekOpacity.get(),
          scale: isRevealed ? 1 : 0.95
        }}
        style={{
          background: colors.bg,
          border: `3px solid ${colors.border}`,
          boxShadow: isRevealed ? `0 0 40px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)` : 'none'
        }}
      >
        {/* Result content */}
        <div className="flex flex-col items-center justify-center h-full p-3">
          {/* Avatar */}
          <motion.div
            className="w-16 h-16 rounded-full overflow-hidden mb-2 border-4"
            style={{ borderColor: colors.border }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: isRevealed ? 1 : 0,
              rotate: isRevealed ? 0 : -180
            }}
            transition={{ delay: 0.1, duration: 0.4, type: 'spring' }}
          >
            {playerAvatar ? (
              <img src={playerAvatar} alt={playerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-black/30">
                {playerName.charAt(0).toUpperCase()}
              </div>
            )}
          </motion.div>

          {/* Player name */}
          <motion.div
            className="text-white font-bold text-sm text-center truncate w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isRevealed ? 1 : 0, y: isRevealed ? 0 : 10 }}
            transition={{ delay: 0.2 }}
          >
            {playerName}
          </motion.div>

          {/* Ticket */}
          {ticketNumber && (
            <motion.div
              className="text-white/60 text-xs mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: isRevealed ? 1 : 0 }}
              transition={{ delay: 0.25 }}
            >
              #{ticketNumber}
            </motion.div>
          )}

          {/* Status badge */}
          <motion.div
            className="mt-2 px-4 py-1.5 rounded-full font-black text-base tracking-wider"
            style={{
              background: 'rgba(0,0,0,0.4)',
              color: colors.border,
              textShadow: `0 0 20px ${colors.glow}`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isRevealed ? 1 : 0, opacity: isRevealed ? 1 : 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          >
            {colors.text}
          </motion.div>
        </div>

        {/* Shine overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isRevealed ? 1 : 0 }}
        />
      </motion.div>

      {/* Card back (draggable) */}
      {!isRevealed && (
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
          drag="y"
          dragConstraints={{ top: 0, bottom: MAX_DRAG }}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onTap={handleTap}
          animate={peelControls}
          style={{
            y: dragY,
            rotateX,
            rotateY,
            x: cardX,
            transformOrigin: 'bottom center',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Card back design */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
              border: '3px solid rgba(255, 215, 0, 0.3)'
            }}
          >
            {/* Pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,215,0,0.1) 10px, rgba(255,215,0,0.1) 20px)`
              }}
            />

            {/* Center logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.1) 100%)',
                  border: '2px solid rgba(255,215,0,0.3)',
                  boxShadow: '0 0 30px rgba(255,215,0,0.2)'
                }}
              >
                <span className="text-[#FFD700] font-black text-2xl">AR</span>
              </div>
            </div>

            {/* Corner decorations */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
              <div
                key={corner}
                className={`absolute w-6 h-6 ${
                  corner === 'top-left' ? 'top-2 left-2' :
                  corner === 'top-right' ? 'top-2 right-2' :
                  corner === 'bottom-left' ? 'bottom-2 left-2' : 'bottom-2 right-2'
                }`}
                style={{
                  borderTop: corner.includes('top') ? '2px solid rgba(255,215,0,0.4)' : 'none',
                  borderBottom: corner.includes('bottom') ? '2px solid rgba(255,215,0,0.4)' : 'none',
                  borderLeft: corner.includes('left') ? '2px solid rgba(255,215,0,0.4)' : 'none',
                  borderRight: corner.includes('right') ? '2px solid rgba(255,215,0,0.4)' : 'none',
                }}
              />
            ))}

            {/* Drag hint */}
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">
                {isDragging ? 'Release to reveal' : 'Drag to peek'}
              </span>
            </div>
          </div>

          {/* Dynamic shine on drag */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: useTransform(dragY, [0, MAX_DRAG], [
                'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 30%)',
                'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)'
              ])
            }}
          />
        </motion.div>
      )}

      {/* Card shadow */}
      <motion.div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[85%] h-6 rounded-full blur-xl"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        animate={{
          scaleX: isRevealed ? 1.1 : 1,
          scaleY: isDragging ? 1.3 : 1,
          opacity: isRevealed ? 0.8 : 0.5
        }}
      />

      {/* Reveal particles */}
      {isRevealed && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: colors.border,
                left: '50%',
                top: '50%',
                boxShadow: `0 0 10px ${colors.glow}`
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: Math.cos(i * Math.PI / 4) * 100,
                y: Math.sin(i * Math.PI / 4) * 100,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0]
              }}
              transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
            />
          ))}
        </>
      )}
    </div>
  )
}
