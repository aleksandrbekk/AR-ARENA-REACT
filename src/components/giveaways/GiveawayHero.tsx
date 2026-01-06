import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function GiveawayHero() {
    return (
        <div className="relative w-full h-[320px] flex items-center justify-center mb-8">
            {/* Background Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-[#FFD700]/10 blur-[60px] rounded-full animate-pulse" />
            </div>

            {/* Glass Container */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-[280px] h-[280px] rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_40px_-10px_rgba(255,215,0,0.1)]"
            >
                {/* Inner Border */}
                <div className="absolute inset-0 border border-[#FFD700]/20 rounded-3xl z-20 pointer-events-none" />

                {/* 3D Asset */}
                <motion.img
                    src="/hero_bull.png"
                    alt="Golden Bull Trophy"
                    className="w-[90%] h-[90%] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                    animate={{
                        y: [-5, 5, -5],
                        rotate: [0, 1, -1, 0]
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent z-30 pointer-events-none" />

                {/* Floating Sparkles */}
                <Sparkles className="absolute top-4 right-4 w-5 h-5 text-[#FFD700]/50 animate-pulse" />
                <Sparkles className="absolute bottom-6 left-6 w-4 h-4 text-[#FFD700]/30 animate-pulse delay-75" />
            </motion.div>
        </div>
    )
}
