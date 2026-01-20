import { useEffect, useRef, useState, useCallback } from 'react'
import * as iframeApiLoader from '@kinescope/player-iframe-api-loader'

interface UseKinescopePlayerOptions {
    videoSource: string
    onProgress: (percent: number) => void
    onDuration: (duration: number) => void
}

// Extract video ID from Kinescope embed code or URL
function extractVideoId(videoSource: string): string | null {
    if (!videoSource) return null

    // Extract from iframe src: https://kinescope.io/embed/VIDEO_ID
    const embedMatch = videoSource.match(/kinescope\.io\/embed\/([a-zA-Z0-9]+)/)
    if (embedMatch) return embedMatch[1]

    // Direct video ID
    if (/^[a-zA-Z0-9]+$/.test(videoSource)) return videoSource

    return null
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
    const videoId = extractVideoId(videoSource)

    // Initialize player
    useEffect(() => {
        if (!videoId || !containerRef.current) return

        let mounted = true
        let player: Kinescope.IframePlayer.Player | null = null

        const initPlayer = async () => {
            try {
                setIsLoading(true)

                // Load the Kinescope API
                const factory = await iframeApiLoader.load()

                if (!mounted || !containerRef.current) return

                // Create player with controls disabled
                player = await factory.create(containerRef.current, {
                    url: `https://kinescope.io/embed/${videoId}`,
                    size: {
                        width: '100%',
                        height: '100%'
                    },
                    behavior: {
                        autoPlay: false,
                        muted: false,
                        localStorage: false
                    },
                    ui: {
                        controls: false,           // Hide all native controls
                        mainPlayButton: false      // Hide center play button
                    }
                })

                if (!mounted) {
                    player.destroy()
                    return
                }

                playerRef.current = player

                // Subscribe to events
                player.on('Ready', (event) => {
                    if (!mounted) return
                    setIsReady(true)
                    setIsLoading(false)
                    if (event.data?.duration) {
                        onDuration(event.data.duration)
                    }
                })

                player.on('TimeUpdate', (event) => {
                    if (!mounted) return
                    const { percent } = event.data
                    onProgress(percent)
                })

                player.on('DurationChange', (event) => {
                    if (!mounted) return
                    onDuration(event.data.duration)
                })

                player.on('Playing', () => {
                    if (!mounted) return
                    setIsPlaying(true)
                })

                player.on('Pause', () => {
                    if (!mounted) return
                    setIsPlaying(false)
                })

                player.on('Ended', () => {
                    if (!mounted) return
                    setIsPlaying(false)
                })

            } catch (error) {
                console.error('Kinescope player init error:', error)
                setIsLoading(false)
            }
        }

        initPlayer()

        return () => {
            mounted = false
            if (player) {
                player.destroy().catch(() => {})
            }
            playerRef.current = null
        }
    }, [videoId, onProgress, onDuration])

    const play = useCallback(() => {
        playerRef.current?.play().catch(console.error)
    }, [])

    const pause = useCallback(() => {
        playerRef.current?.pause().catch(console.error)
    }, [])

    return {
        containerRef,
        videoId,
        isPlaying,
        isLoading,
        isReady,
        play,
        pause,
        setIsPlaying
    }
}
