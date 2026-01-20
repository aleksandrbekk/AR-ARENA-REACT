import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import ReactPlayer from 'react-player'
import { useKinescopePlayer } from '../hooks/useKinescopePlayer'

const ReactPlayerAny = ReactPlayer as any

interface KinescopeVideoPlayerProps {
    videoSource: string
    onProgress: (percent: number) => void
    onDuration: (duration: number) => void
    videoProgress: number
    ProgressBar: React.FC<{ progress: number }>
}

export function KinescopeVideoPlayer({
    videoSource,
    onProgress,
    onDuration,
    videoProgress,
    ProgressBar
}: KinescopeVideoPlayerProps) {
    const isKinescope = videoSource.includes('kinescope.io')

    // Use Kinescope hook for Kinescope videos
    const {
        iframeRef,
        videoUrl,
        isPlaying,
        isLoading,
        isReady,
        play
    } = useKinescopePlayer({
        videoSource,
        onProgress,
        onDuration
    })

    // Fallback for non-Kinescope videos
    const [fallbackPlaying, setFallbackPlaying] = useState(false)
    const fallbackUrl = useMemo(() => {
        if (!videoSource || isKinescope) return ''
        if (videoSource.includes('<iframe')) {
            const match = videoSource.match(/src=["'](.*?)["']/)
            return match ? match[1] : ''
        }
        return videoSource
    }, [videoSource, isKinescope])

    // Click handler for play button
    const handlePlayClick = () => {
        if (isKinescope) {
            play()
            // Also try clicking the iframe directly as fallback
            if (iframeRef.current) {
                iframeRef.current.focus()
            }
        } else {
            setFallbackPlaying(true)
        }
    }

    return (
        <div className="w-full">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 group">
                {isKinescope && videoUrl ? (
                    <>
                        {/* Kinescope iframe */}
                        <iframe
                            ref={iframeRef}
                            src={videoUrl}
                            className="absolute inset-0 w-full h-full"
                            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                            frameBorder="0"
                            allowFullScreen
                            id="kinescope-player"
                            onLoad={() => {
                                // Player loaded
                            }}
                        />

                        {/* Custom Play Button Overlay */}
                        {!isPlaying && isReady && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20 cursor-pointer"
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
                                    {/* Ripple effect */}
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-[#FFD700]" />
                                </motion.div>
                            </div>
                        )}

                        {/* Loading Spinner */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                                <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {/* Bottom Mask */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
                    </>
                ) : fallbackUrl ? (
                    <div className="absolute inset-0 w-full h-full">
                        <ReactPlayerAny
                            url={fallbackUrl}
                            width="100%"
                            height="100%"
                            controls={true}
                            playing={fallbackPlaying}
                            config={{
                                youtube: {
                                    playerVars: { showinfo: 0, rel: 0, controls: 0 }
                                }
                            } as any}
                            onProgress={(state: any) => {
                                onProgress(state.played * 100)
                            }}
                            onDuration={onDuration}
                            onPlay={() => setFallbackPlaying(true)}
                        />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
                        <p className="text-white/40 text-sm">Видео не настроено</p>
                    </div>
                )}

                {/* Internal Border Glow */}
                <div
                    className="absolute inset-0 pointer-events-none rounded-2xl z-20"
                    style={{
                        boxShadow: 'inset 0 0 0 1px rgba(255, 215, 0, 0.1), 0 0 40px rgba(255, 215, 0, 0.05)'
                    }}
                />
            </div>

            <div className="-mt-1.5 relative z-10">
                <ProgressBar progress={videoProgress} />
            </div>
        </div>
    )
}
