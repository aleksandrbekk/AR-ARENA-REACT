import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectMethod: (method: 'crypto' | 'card') => void
    tariffName: string | null
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onSelectMethod,
    tariffName
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed z-[9999] w-full max-w-sm bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            margin: 0 // Explicit reset
                        }}
                    >
                        {/* Header */}
                        <div className="p-6 pb-2 text-center">
                            <h3 className="text-xl font-bold text-white mb-1">
                                Выберите способ оплаты
                            </h3>
                            <p className="text-sm text-gray-400">
                                Тариф: <span className="text-yellow-400 font-semibold">{tariffName}</span>
                            </p>
                        </div>

                        {/* Options */}
                        <div className="p-4 space-y-3">
                            {/* Card Option */}
                            <button
                                onClick={() => onSelectMethod('card')}
                                className="w-full group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/50 rounded-xl p-4 transition-all duration-300 flex items-center gap-4 text-left"
                            >
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    {/* Globe/Card Icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                                            Банковская карта
                                        </span>
                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                            Любая страна
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        РФ + Весь мир без ограничений
                                    </div>
                                </div>
                                {/* Chevorn */}
                                <div className="text-gray-600 group-hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Crypto Option */}
                            <button
                                onClick={() => onSelectMethod('crypto')}
                                className="w-full group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 rounded-xl p-4 transition-all duration-300 flex items-center gap-4 text-left"
                            >
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    {/* Crypto Icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="flex-grow">
                                    <div className="font-semibold text-white group-hover:text-green-400 transition-colors">
                                        Криптовалюта
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        USDT / BTC / ETH
                                    </div>
                                </div>
                                {/* Chevorn */}
                                <div className="text-gray-600 group-hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="p-4 pt-2 text-center">
                            <button
                                onClick={onClose}
                                className="text-xs text-gray-500 hover:text-white transition-colors"
                            >
                                Отмена
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
