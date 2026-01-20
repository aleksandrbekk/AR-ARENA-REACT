import { useEffect, useRef, useState, useMemo } from 'react'
import * as iframeApiLoader from '@kinescope/player-iframe-api-loader'

interface UseKinescopePlayerOptions {
    videoSource: string
    onProgress: (percent: number) => void
    onDuration: (duration: number) => void
}

export function useKinescopePlayer({
    videoSource,
    onProgress,
    onDuration
}: UseKinescopePlayerOptions) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isReady, setIsReady] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<Kinescope.IframePlayer.Player | null>(null)

    // Extract video ID from Kinescope embed
    const { videoId, videoUrl } = useMemo(() => {
        if (!videoSource) return { videoId: '', videoUrl: '' }

        // Extract video ID from URL like https://kinescope.io/embed/6Y8BFWaag2M7gBLy66Paq6
        const match = videoSource.match(/kinescope\.io\/embed\/([a-zA-Z0-9]+)/)
        if (match) {
            return {
                videoId: match[1],
                videoUrl: `https://kinescope.io/embed/${match[1]}`
            }
        }
        return { videoId: '', videoUrl: '' }
    }, [videoSource])

    // Initialize Kinescope SDK Player
    useEffect(() => {
        if (!videoId || !containerRef.current) return

        let player: Kinescope.IframePlayer.Player | null = null
        let mounted = true

        const initPlayer = async () => {
            try {
                setIsLoading(true)
                const factory = await iframeApiLoader.load()

                if (!mounted || !containerRef.current) return

                player = await factory.create(containerRef.current, {
                    url: videoUrl,
                    size: { width: '100%', height: '100%' },
                    behavior: {
                        autoPlay: false,
                        muted: false,
                        localStorage: true
                    },
                    ui: {
                        controls: false, // Hide native controls
                        mainPlayButton: false // We'll show our own
                    }
                })

                playerRef.current = player
                setIsLoading(false)
                setIsReady(true)

                // Attach event listeners
                player.on(player.Events.TimeUpdate, (e) => {
                    const { percent } = e.data
                    onProgress(percent)
                })

                player.on(player.Events.DurationChange, (e) => {
                    onDuration(e.data.duration)
                })

                player.on(player.Events.Playing, () => {
                    setIsPlaying(true)
                })

                player.on(player.Events.Pause, () => {
                    setIsPlaying(false)
                })

                player.on(player.Events.Ended, () => {
                    setIsPlaying(false)
                })

                player.on(player.Events.Loaded, (e) => {
                    onDuration(e.data.duration)
                })

                // Polling for smooth progress updates (every 1 second)
                const progressInterval = setInterval(async () => {
                    if (playerRef.current) {
                        try {
                            const [currentTime, duration] = await Promise.all([
                                playerRef.current.getCurrentTime(),
                                playerRef.current.getDuration()
                            ])
                            if (duration > 0) {
                                const percent = (currentTime / duration) * 100
                                onProgress(percent)
                            }
                        } catch (e) {
                            // Ignore errors during polling
                        }
                    }
                }, 1000)

                    // Store interval for cleanup
                    ; (player as any)._progressInterval = progressInterval

            } catch (err) {
                console.error('Kinescope SDK init error:', err)
                setIsLoading(false)
            }
        }

        initPlayer()

        return () => {
            mounted = false
            if (player) {
                // Clear polling interval
                if ((player as any)._progressInterval) {
                    clearInterval((player as any)._progressInterval)
                }
                player.destroy()
            }
        }
    }, [videoId, videoUrl, onProgress, onDuration])

    const play = async () => {
        if (playerRef.current) {
            try {
                await playerRef.current.play()
                setIsPlaying(true)
            } catch (err) {
                console.error('Play error:', err)
            }
        }
    }

    const pause = async () => {
        if (playerRef.current) {
            try {
                await playerRef.current.pause()
                setIsPlaying(false)
            } catch (err) {
                console.error('Pause error:', err)
            }
        }
    }

    return {
        containerRef,
        isPlaying,
        isLoading,
        isReady,
        play,
        pause,
        videoId
    }
}
