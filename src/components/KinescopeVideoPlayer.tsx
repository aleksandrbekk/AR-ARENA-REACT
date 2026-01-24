import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import KinescopePlayer from '@kinescope/react-kinescope-player'
import { removeStorageItem, STORAGE_KEYS } from '../hooks/useLocalStorage'

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
    const videoId = useMemo(() => extractVideoId(videoSource), [videoSource])
    const playerRef = useRef<any>(null)
    const durationRef = useRef<number>(324) // Fallback duration сразу

    const [hasClickedPlay, setHasClickedPlay] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isReady, setIsReady] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)

    // Сбрасываем позицию при монтировании компонента
    useEffect(() => {
        // Очищаем сохранённую позицию из localStorage для этого видео
        if (videoId) {
            removeStorageItem(`${STORAGE_KEYS.KINESCOPE_TIME_PREFIX}${videoId}_time`)
        }
    }, [videoId])

    const handlePlayClick = useCallback(async () => {
        setHasClickedPlay(true)
        // Запускаем видео через ref
        if (playerRef.current) {
            try {
                // Сначала включаем звук
                if (playerRef.current.unmute) {
                    await playerRef.current.unmute()
                }
                if (playerRef.current.setVolume) {
                    await playerRef.current.setVolume(1) // 100% громкость
                }
                // Затем запускаем воспроизведение
                await playerRef.current.play()
                setIsPlaying(true)
            } catch (error) {
                console.error('Error playing video:', error)
                // Если не удалось запустить, сбрасываем состояние
                setIsPlaying(false)
            }
        }
    }, [])

    const handleVideoClick = useCallback(async () => {
        if (!playerRef.current) return
        
        try {
            const isPaused = await playerRef.current.isPaused()
            if (isPaused) {
                // Включаем звук при возобновлении воспроизведения
                try {
                    if (playerRef.current.unmute) {
                        await playerRef.current.unmute()
                    }
                    if (playerRef.current.setVolume) {
                        await playerRef.current.setVolume(1)
                    }
                } catch (volumeError) {
                    console.log('Volume control error:', volumeError)
                }
                await playerRef.current.play()
                setIsPlaying(true)
            } else {
                await playerRef.current.pause()
                setIsPlaying(false)
            }
        } catch (error) {
            console.error('Error toggling playback:', error)
        }
    }, [])

    const handleTimeUpdate = useCallback((data: { currentTime: number }) => {
        // Используем duration из ref для быстрого доступа
        const currentDuration = durationRef.current
        const percent = Math.min((data.currentTime / currentDuration) * 100, 100)
        onProgress(percent)
    }, [onProgress])

    const handleDurationChange = useCallback((data: { duration: number }) => {
        const newDuration = data.duration
        if (newDuration > 0 && newDuration !== durationRef.current) {
            durationRef.current = newDuration
            onDuration(newDuration)
        }
    }, [onDuration])

    const handleReady = useCallback(async (data: { currentTime: number; duration: number; quality: any }) => {
        // Когда плеер готов, устанавливаем длительность
        if (data.duration > 0 && data.duration !== durationRef.current) {
            durationRef.current = data.duration
            onDuration(data.duration)
        }
        
        setIsLoading(false)
        setIsReady(true)
        
        // Сбрасываем позицию если нужно
        if (playerRef.current && data.currentTime > 0.5) {
            try {
                await playerRef.current.seekTo(0)
            } catch (error) {
                console.log('Error seeking to start:', error)
            }
        }
        
        // НЕ запускаем автовоспроизведение - всегда показываем кнопку play
        // Это гарантирует, что звук будет работать на всех устройствах
    }, [onDuration])

    const handleInit = useCallback(() => {
        // Плеер инициализирован, но ещё не готов
        setIsLoading(true)
    }, [])

    const handleInitError = useCallback(() => {
        setIsLoading(false)
        setIsReady(false)
        console.error('Kinescope player initialization error')
    }, [])

    const handlePlay = useCallback(async () => {
        setIsPlaying(true)
        // Когда видео начинает играть, явно включаем звук
        // Это важно для десктопов, где браузеры могут блокировать звук при автовоспроизведении
        if (playerRef.current) {
            try {
                // Проверяем, не выключен ли звук
                const isMuted = playerRef.current.isMuted ? await playerRef.current.isMuted() : false
                if (isMuted) {
                    if (playerRef.current.unmute) {
                        await playerRef.current.unmute()
                    }
                }
                // Устанавливаем максимальную громкость
                if (playerRef.current.setVolume) {
                    await playerRef.current.setVolume(1)
                }
            } catch (error) {
                // Игнорируем ошибки - возможно методы недоступны
                console.log('Volume control in onPlay:', error)
            }
        }
    }, [])

    const handlePause = useCallback(() => {
        setIsPlaying(false)
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

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 group">
                {/* Kinescope Player */}
                <div className="absolute inset-0 w-full h-full">
                    <KinescopePlayer
                        ref={playerRef}
                        videoId={videoId}
                        controls={false}
                        preload="metadata"
                        localStorage={false}
                        onInit={handleInit}
                        onInitError={handleInitError}
                        onReady={handleReady}
                        onTimeUpdate={handleTimeUpdate}
                        onDurationChange={handleDurationChange}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        className="w-full h-full"
                        style={{ width: '100%', height: '100%' }}
                        playsInline={true}
                        autoPlay={false}
                        muted={false}
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

                {/* Loading Indicator */}
                {isLoading && !isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-40">
                        <motion.div
                            className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#FFD700]/30 border-t-[#FFD700]"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                    </div>
                )}

                {/* Custom Play Button - показываем если видео не играет */}
                {!isPlaying && isReady && !isLoading && (
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
