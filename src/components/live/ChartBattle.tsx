import { createChart, ColorType, CandlestickSeries, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChartBattleProps {
    bullWins?: boolean
    onComplete?: () => void
    player1Name?: string
    player2Name?: string
    player1Avatar?: string
    player2Avatar?: string
}

export function ChartBattle({
    bullWins: _bullWins = true,
    onComplete,
    player1Name: _player1Name = "Bull",
    player2Name: _player2Name = "Bear",
    player1Avatar: _player1Avatar,
    player2Avatar: _player2Avatar
}: ChartBattleProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

    const [bullScore, setBullScore] = useState(0)
    const [bearScore, setBearScore] = useState(0)
    const [currentTurn, setCurrentTurn] = useState<'bull' | 'bear' | null>(null)
    const [lastPrice, setLastPrice] = useState(100)
    const [winner, setWinner] = useState<'bull' | 'bear' | null>(null)

    // Initial Chart Setup
    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#DDD',
            },
            grid: {
                vertLines: { color: '#333' },
                horzLines: { color: '#333' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
        })

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        })

        // Initial data - flat line to start
        const initialData = []
        const time = Math.floor(Date.now() / 1000) - 100
        let price = 100

        for (let i = 0; i < 20; i++) {
            initialData.push({
                time: (time + i) as Time,
                open: price,
                high: price + Math.random() * 2,
                low: price - Math.random() * 2,
                close: price + (Math.random() - 0.5),
            })
            price = initialData[initialData.length - 1].close
        }

        series.setData(initialData)
        setLastPrice(price)

        chartRef.current = chart
        seriesRef.current = series

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth || 600 })
        }

        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [])

    // Game Logic
    useEffect(() => {
        if (!seriesRef.current) return

        const sequence = async () => {
            await new Promise(r => setTimeout(r, 1000))

            // Simulate 5 turns
            for (let i = 0; i < 5; i++) {
                // Decide winner of this turn logic (mock)
                const isBullTurn = Math.random() > 0.4 // Slightly favoring bull for demo
                setCurrentTurn(isBullTurn ? 'bull' : 'bear')

                // Visual effect for turn start
                await new Promise(r => setTimeout(r, 500))

                // Add candle
                const time = Math.floor(Date.now() / 1000)
                const open = lastPrice
                const change = isBullTurn ? (Math.random() * 5 + 2) : -(Math.random() * 5 + 2)
                const close = open + change
                const high = Math.max(open, close) + Math.random() * 2
                const low = Math.min(open, close) - Math.random() * 2

                seriesRef.current?.update({
                    time: time as Time,
                    open,
                    high,
                    low,
                    close
                })

                setLastPrice(close)

                if (isBullTurn) setBullScore(s => s + 1)
                else setBearScore(s => s + 1)

                await new Promise(r => setTimeout(r, 1500))
                setCurrentTurn(null)
            }

            // Final determination
            if (bullScore > bearScore) setWinner('bull')
            else setWinner('bear')

            onComplete?.()
        }

        sequence()
    }, []) // Empty dependency for demo simple run

    return (
        <div className="w-full max-w-4xl mx-auto p-4 bg-zinc-900 border-2 border-[#FFD700]/20 rounded-3xl relative overflow-hidden">
            {/* HUD */}
            <div className="absolute top-4 left-4 z-10 flex gap-8">
                <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${currentTurn === 'bull' ? 'bg-green-500/20 border border-green-500' : ''}`}>
                    <div className="text-sm font-bold text-green-500">BULLS</div>
                    <div className="text-2xl font-black text-white">{bullScore}</div>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${currentTurn === 'bear' ? 'bg-red-500/20 border border-red-500' : ''}`}>
                    <div className="text-sm font-bold text-red-500">BEARS</div>
                    <div className="text-2xl font-black text-white">{bearScore}</div>
                </div>
            </div>

            {/* Winner Overlay */}
            <AnimatePresence>
                {winner && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <div className="text-center">
                            <h2 className={`text-6xl font-black mb-4 ${winner === 'bull' ? 'text-green-500' : 'text-red-500'}`}>
                                {winner === 'bull' ? 'PUMP IT!' : 'DUMP IT!'}
                            </h2>
                            <div className="text-2xl text-white font-bold">
                                {winner === 'bull' ? 'Bulls Win' : 'Bears Win'}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chart */}
            <div ref={chartContainerRef} className="w-full h-[400px]" />

            {/* Decorative Gradients */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-zinc-900 to-transparent pointer-events-none" />
        </div>
    )
}
