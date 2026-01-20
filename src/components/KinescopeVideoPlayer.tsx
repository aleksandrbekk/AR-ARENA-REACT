import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import KinescopePlayer from '@kinescope/react-kinescope-player'

interface KinescopeVideoPlayerProps {
    videoSource: string
    onProgress: (percent: number) => void
    onDuration: (duration: number) => void
    videoProgress: number
    ProgressBar: React.FC<{ progress: number }>
}

// Извлекаем videoId из embed кода или URL
function extractVideoId(videoSource: string): string {
    if (!videoSource) return ''
    
    // Если это embed код с iframe
    if (videoSource.includes('<iframe')) {
        const match = videoSource.match(/embed\/([a-zA-Z0-9]+)/)
        return match ? match[1] : ''
    }
    
    // Если это прямой URL
    if (videoSource.includes('kinescope.io')) {
        const match = videoSource.match(/embed\/([a-zA-Z0-9]+)/)
        return match ? match[1] : ''
    }
    
    // Если это уже videoId
    if (videoSource.length > 0 && !videoSource.includes('http') && !videoSource.includes('<')) {
        return videoSource
    }
    
    return ''
}

export function KinescopeVideoPlayer({
    videoSource,
    onProgress,
    onDuration,
    videoProgress,
    ProgressBar
}: KinescopeVideoPlayerProps) {
    const videoId = extractVideoId(videoSource)
    const playerRef = useRef<any>(null)

    const [hasClickedPlay, setHasClickedPlay] = useState(false)
    const [duration, setDuration] = useState<number>(0)

    const handlePlayClick = async () => {
        setHasClickedPlay(true)
        // Запускаем видео через ref
        if (playerRef.current) {
            try {
                await playerRef.current.play()
            } catch (error) {
                console.error('Error playing video:', error)
            }
        }
    }

    const handleVideoClick = async () => {
        if (!playerRef.current) return
        
        try {
            const isPaused = await playerRef.current.isPaused()
            if (isPaused) {
                await playerRef.current.play()
            } else {
                await playerRef.current.pause()
            }
        } catch (error) {
            console.error('Error toggling playback:', error)
        }
    }

    const handleTimeUpdate = (data: { currentTime: number }) => {
        // Если duration уже установлена, используем её
        if (duration > 0) {
            const percent = Math.min((data.currentTime / duration) * 100, 100)
            onProgress(percent)
        } else if (playerRef.current) {
            // Если duration ещё не установлена, пытаемся получить её из плеера
            playerRef.current.getDuration().then((dur: number) => {
                if (dur > 0 && dur !== duration) {
                    setDuration(dur)
                    onDuration(dur)
                }
                if (dur > 0) {
                    const percent = Math.min((data.currentTime / dur) * 100, 100)
                    onProgress(percent)
                }
            }).catch(() => {
                // Если не удалось получить duration, используем fallback (324 секунды)
                const fallbackDuration = 324
                if (duration !== fallbackDuration) {
                    setDuration(fallbackDuration)
                    onDuration(fallbackDuration)
                }
                const percent = Math.min((data.currentTime / fallbackDuration) * 100, 100)
                onProgress(percent)
            })
        } else {
            // Если ref ещё не готов, используем fallback
            const fallbackDuration = 324
            const percent = Math.min((data.currentTime / fallbackDuration) * 100, 100)
            onProgress(percent)
        }
    }

    const handleDurationChange = (data: { duration: number }) => {
        const newDuration = data.duration
        if (newDuration > 0) {
            setDuration(newDuration)
            onDuration(newDuration)
        }
    }

    const handleReady = async (data: { currentTime: number; duration: number; quality: any }) => {
        // Когда плеер готов, устанавливаем длительность
        if (data.duration > 0) {
            setDuration(data.duration)
            onDuration(data.duration)
        }
    }

    const handlePlay = () => {
        // Событие воспроизведения
    }

    const handlePause = () => {
        // Событие паузы
    }

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

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 group">
                {/* Kinescope Player */}
                <div className="absolute inset-0 w-full h-full">
                    <KinescopePlayer
                        ref={playerRef}
                        videoId={videoId}
                        controls={false}
                        onReady={handleReady}
                        onTimeUpdate={handleTimeUpdate}
                        onDurationChange={handleDurationChange}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        className="w-full h-full"
                        style={{ width: '100%', height: '100%' }}
                        playsInline={true}
                        autoPlay={false}
                    />
                </div>

                {/* Click overlay for play/pause tracking */}
                {hasClickedPlay && (
                    <div
                        className="absolute inset-0 z-20 cursor-pointer"
                        onClick={handleVideoClick}
                        style={{ pointerEvents: 'auto' }}
                        onDoubleClick={(e) => e.preventDefault()} // Предотвращаем fullscreen на двойной клик
                    />
                )}

                {/* Overlay to block controls at bottom (на случай если контролы всё равно видны) - выше кликабельного overlay */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-14 z-30 pointer-events-auto"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
                />

                {/* Custom Play Button */}
                {!hasClickedPlay && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/50 z-40 cursor-pointer"
                        onClick={handlePlayClick}
                    >
                        <motion.div
                            className="w-20 h-20 rounded-full flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)'
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </motion.div>
                    </div>
                )}

                {/* Border glow */}
                <div
                    className="absolute inset-0 pointer-events-none rounded-2xl"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(255, 215, 0, 0.1)' }}
                />
            </div>
        </div>
    )
}
