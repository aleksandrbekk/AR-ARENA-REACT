import { useEffect, useRef, useState, useMemo, useCallback } from 'react'

interface UseKinescopePlayerOptions {
    videoSource: string
    onProgress: (percent: number) => void
    onDuration: (duration: number) => void
    fallbackDuration?: number // Fallback duration in seconds if postMessage doesn't work
}

export function useKinescopePlayer({
    videoSource,
    onProgress,
    onDuration,
    fallbackDuration = 324 // 5:24 default
}: UseKinescopePlayerOptions) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isReady, setIsReady] = useState(false)
    const [hasReceivedProgress, setHasReceivedProgress] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const timerRef = useRef<number | null>(null)
    const startTimeRef = useRef<number>(0)
    const elapsedRef = useRef<number>(0)

    // Extract video URL from Kinescope embed
    const videoUrl = useMemo(() => {
        if (!videoSource) return ''

        let url = ''
        if (videoSource.includes('<iframe')) {
            const match = videoSource.match(/src=["'](.*?)["']/)
            url = match ? match[1] : ''
        } else if (videoSource.includes('kinescope.io')) {
            url = videoSource
        }

        if (url) {
            const hasParams = url.includes('?')
            const separator = hasParams ? '&' : '?'
            url += `${separator}api=1`
        }

        return url
    }, [videoSource])

    // Ready when URL is available
    useEffect(() => {
        if (videoUrl) {
            setIsLoading(false)
            setIsReady(true)
            // Set fallback duration immediately
            onDuration(fallbackDuration)
        }
    }, [videoUrl, fallbackDuration, onDuration])

    // Fallback timer for progress tracking
    const startTimer = useCallback(() => {
        if (timerRef.current) return

        startTimeRef.current = Date.now() - (elapsedRef.current * 1000)

        timerRef.current = window.setInterval(() => {
            if (!hasReceivedProgress) {
                const elapsed = (Date.now() - startTimeRef.current) / 1000
                elapsedRef.current = elapsed
                const percent = Math.min((elapsed / fallbackDuration) * 100, 100)
                onProgress(percent)
            }
        }, 500)
    }, [fallbackDuration, hasReceivedProgress, onProgress])

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => stopTimer()
    }, [stopTimer])

    // Listen for Kinescope events via postMessage
    useEffect(() => {
        if (!videoUrl) return

        const handleMessage = (event: MessageEvent) => {
            if (!event.origin.includes('kinescope')) return

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
                const eventType = data.event || data.type || data.method || ''

                if (eventType === 'timeupdate' || eventType === 'TimeUpdate') {
                    setHasReceivedProgress(true)
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
                    startTimer()
                }

                if (eventType === 'pause' || eventType === 'Pause') {
                    setIsPlaying(false)
                    stopTimer()
                    elapsedRef.current = (Date.now() - startTimeRef.current) / 1000
                }

                if (eventType === 'ended' || eventType === 'Ended') {
                    setIsPlaying(false)
                    stopTimer()
                    onProgress(100)
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
        return () => window.removeEventListener('message', handleMessage)
    }, [videoUrl, onProgress, onDuration, startTimer, stopTimer])

    const play = useCallback(() => {
        if (iframeRef.current?.contentWindow) {
            const commands = [
                { method: 'play' },
                { command: 'play' },
                { type: 'play' }
            ]
            commands.forEach(cmd => {
                iframeRef.current?.contentWindow?.postMessage(JSON.stringify(cmd), '*')
            })
            setIsPlaying(true)
            startTimer() // Start fallback timer
        }
    }, [startTimer])

    const pause = useCallback(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*')
            setIsPlaying(false)
            stopTimer()
            elapsedRef.current = (Date.now() - startTimeRef.current) / 1000
        }
    }, [stopTimer])

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
