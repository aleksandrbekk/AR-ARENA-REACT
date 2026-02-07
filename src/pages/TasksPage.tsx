import { motion } from 'framer-motion'
import { Gift, Loader2, Trophy, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { TaskCard } from '../components/tasks/TaskCard'
import { Navbar } from '../components/layout/Navbar'

export function TasksPage() {
    const navigate = useNavigate()
    const { tasks, loading, error, pendingTasksCount, startTask, claimReward } = useTasks()

    const completedCount = tasks.filter(t => t.completion?.reward_claimed).length
    const totalRewards = tasks
        .filter(t => t.completion?.reward_claimed)
        .reduce((sum, t) => sum + t.reward_ar, 0)

    return (
        <div className="min-h-screen bg-ar-black pb-28">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-ar-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-white/70" />
                    </button>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Gift className="w-6 h-6 text-ar-gold" />
                            Задания
                        </h1>
                    </div>

                    {pendingTasksCount > 0 && (
                        <div className="px-3 py-1 rounded-full bg-ar-gold/20 border border-ar-gold/30">
                            <span className="text-ar-gold font-semibold text-sm">{pendingTasksCount} новых</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Banner */}
            <div className="px-4 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-ar-gold/10 via-ar-orange/5 to-ar-purple/10 border border-white/10"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-ar-gold/20 flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-ar-gold" />
                            </div>
                            <div>
                                <p className="text-white/50 text-sm">Выполнено заданий</p>
                                <p className="text-xl font-bold text-white">{completedCount} / {tasks.length}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-white/50 text-sm">Заработано</p>
                            <p className="text-xl font-bold text-ar-gold">+{totalRewards} AIR</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Tasks List */}
            <div className="px-4 space-y-3">
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-ar-gold animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="text-center py-20">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {!loading && !error && tasks.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <Gift className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <p className="text-white/50">Пока нет доступных заданий</p>
                        <p className="text-white/30 text-sm mt-1">Следите за обновлениями!</p>
                    </motion.div>
                )}

                {!loading && !error && tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onStart={startTask}
                        onClaimReward={claimReward}
                    />
                ))}
            </div>

            {/* Bottom Navigation */}
            <Navbar />
        </div>
    )
}
