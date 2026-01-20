import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
// @ts-ignore - types may not be available
import KinescopePlayer from '@kinescope/react-kinescope-player'

interface KinescopeVideoPlayerProps {
    videoSource: string
    onProgress: (percent: number) => void
    onDuration: (duration: number) => void
    videoProgress: number
    ProgressBar: React.FC<{ progress: number }>
}

// Extract video ID from Kinescope embed code or URL
function extractVideoId(videoSource: string): string | null {
    if (!videoSource) return null
    const embedMatch = videoSource.match(/kinescope\.io\/embed\/([a-zA-Z0-9]+)/)
    if (embedMatch) return embedMatch[1]
    if (/^[a-zA-Z0-9]+$/.test(videoSource)) return videoSource
    return null
}

export function KinescopeVideoPlayer({
    videoSource,
    onProgress,
    onDuration,
    videoProgress,
    ProgressBar
}: KinescopeVideoPlayerProps) {
    const videoId = extractVideoId(videoSource)

    const [isReady, setIsReady] = useState(false)
    const [hasClickedPlay, setHasClickedPlay] = useState(false)
    const [playerRef, setPlayerRef] = useState<any>(null)

    const handleReady = useCallback(({ duration }: { duration: number }) => {
        setIsReady(true)
        if (duration) onDuration(duration)
    }, [onDuration])

    const handleTimeUpdate = useCallback(({ currentTime, duration }: { currentTime: number; duration: number }) => {
        if (duration > 0) {
            const percent = (currentTime / duration) * 100
            onProgress(percent)
        }
    }, [onProgress])

    const handleDurationChange = useCallback(({ duration }: { duration: number }) => {
        if (duration > 0) onDuration(duration)
    }, [onDuration])

    const handlePlayClick = useCallback(() => {
        setHasClickedPlay(true)
        playerRef?.play?.()
    }, [playerRef])

    const handleRef = useCallback((ref: any) => {
        setPlayerRef(ref)
    }, [])

    if (!videoId) {
        return (
            <div className="w-full">
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                    <p className="text-white/40 text-sm">Видео не настроено</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            {/* Progress bar above video */}
            <div className="mb-3 relative z-10">
                <ProgressBar progress={videoProgress} />
            </div>

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 group">
                {/* Kinescope React Player */}
                <div className="absolute inset-0">
                    <KinescopePlayer
                        videoId={videoId}
                        ref={handleRef}
                        onReady={handleReady}
                        onTimeUpdate={handleTimeUpdate}
                        onDurationChange={handleDurationChange}
                        controls={false}
                        autoPlay={false}
                        muted={false}
                        width="100%"
                        height="100%"
                    />
                </div>

                {/* CSS overlay to block timeline/seek interaction */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-16 z-30"
                    style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                        pointerEvents: 'auto'
                    }}
                />

                {/* Custom Play Button Overlay */}
                {!hasClickedPlay && isReady && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-40 cursor-pointer"
                        onClick={handlePlayClick}
                    >
                        <motion.div
                            className="w-20 h-20 rounded-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300"
                            style={{
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)'
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-[#FFD700]" />
                        </motion.div>
                    </div>
                )}

                {/* Loading Spinner */}
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
                        <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Internal Border Glow */}
                <div
                    className="absolute inset-0 pointer-events-none rounded-2xl z-10"
                    style={{
                        boxShadow: 'inset 0 0 0 1px rgba(255, 215, 0, 0.1), 0 0 40px rgba(255, 215, 0, 0.05)'
                    }}
                />
            </div>
        </div>
    )
}
