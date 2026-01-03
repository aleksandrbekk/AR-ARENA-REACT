import { ChartBattle } from '../../components/live/ChartBattle'

import { Link } from 'react-router-dom'

export function ChartBattleDemoPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] p-8 flex flex-col items-center justify-center">
            <Link to="/" className="absolute top-8 left-8 text-white/50 hover:text-white transition-colors">
                ← Back to Home
            </Link>

            <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-[#FFD700] mb-4">
                    CHART BATTLE
                </h1>
                <p className="text-white/60 max-w-xl mx-auto">
                    Experimental mechanic for the Final Stage. Instead of a roulette wheel, players battle on the chart.
                    Green candles = Bull points. Red candles = Bear points.
                </p>
            </div>

            <ChartBattle
                player1Name="Bull King"
                player2Name="Bear Lord"
                onComplete={() => console.log('Battle finished')}
            />

            <div className="mt-8 text-white/30 text-sm">
                Powered by TradingView Lightweight Charts
            </div>
        </div>
    )
}
