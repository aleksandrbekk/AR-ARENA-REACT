import { useEffect, useRef, useState, useMemo } from 'react'

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
    const iframeRef = useRef<HTMLIFrameElement>(null)

    // Extract video URL from Kinescope embed
    const videoUrl = useMemo(() => {
        if (!videoSource) return ''

        let url = ''
        // Extract src from iframe tag if present
        if (videoSource.includes('<iframe')) {
            const match = videoSource.match(/src=["'](.*?)["']/)
            url = match ? match[1] : ''
        } else if (videoSource.includes('kinescope.io')) {
            url = videoSource
        }

        // Add API parameters - autoplay will start video immediately when user clicks
        if (url) {
            const hasParams = url.includes('?')
            const separator = hasParams ? '&' : '?'
            // autoplay=1 - start playing immediately
            // playButtonShow=0 - hide the native play button
            // controls=0 - hide all native controls (timeline, etc)
            url += `${separator}api=1&autoplay=1&playButtonShow=0&controls=0`
        }

        return url
    }, [videoSource])

    // Ready when URL is available
    useEffect(() => {
        if (videoUrl) {
            setIsLoading(false)
            setIsReady(true)
        }
    }, [videoUrl])

    // Listen for Kinescope events via postMessage
    useEffect(() => {
        if (!videoUrl) return

        const handleMessage = (event: MessageEvent) => {
            // Skip non-Kinescope messages
            if (!event.origin.includes('kinescope')) return

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

                // Handle different event formats
                const eventType = data.event || data.type || ''

                if (eventType === 'timeupdate' || eventType === 'TimeUpdate') {
                    const payload = data.data || data
                    const currentTime = payload.currentTime ?? payload.current
                    const duration = payload.duration
                    const percent = payload.percent

                    if (typeof percent === 'number') {
                        onProgress(percent)
                    } else if (typeof currentTime === 'number' && typeof duration === 'number' && duration > 0) {
                        onProgress((currentTime / duration) * 100)
                    }

                    if (typeof duration === 'number' && duration > 0) {
                        onDuration(duration)
                    }
                }

                if (eventType === 'playing' || eventType === 'Playing' || eventType === 'play' || eventType === 'Play') {
                    setIsPlaying(true)
                }

                if (eventType === 'pause' || eventType === 'Pause' || eventType === 'ended' || eventType === 'Ended') {
                    setIsPlaying(false)
                }

                if (eventType === 'ready' || eventType === 'Ready') {
                    setIsReady(true)
                }

                if ((eventType === 'durationchange' || eventType === 'DurationChange') && data.data?.duration) {
                    onDuration(data.data.duration)
                }
            } catch {
                // Ignore parse errors
            }
        }

        window.addEventListener('message', handleMessage)

        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [videoUrl, onProgress, onDuration])

    const play = () => {
        if (iframeRef.current?.contentWindow) {
            // Send play command in various formats for compatibility
            const commands = [
                { method: 'play' },
                { command: 'play' },
                { type: 'play' }
            ]
            commands.forEach(cmd => {
                iframeRef.current?.contentWindow?.postMessage(JSON.stringify(cmd), '*')
            })
            setIsPlaying(true)
        }
    }

    const pause = () => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*')
            setIsPlaying(false)
        }
    }

    return {
        iframeRef,
        videoUrl,
        isPlaying,
        isLoading,
        isReady,
        play,
        pause,
        setIsPlaying
    }
}
