import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useAuth } from '../hooks/useAuth'
import { isAdmin } from '../config/admins'
import { TaskCard } from '../components/tasks/TaskCard'
import { Navbar } from '../components/layout/Navbar'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export function TasksPage() {
    const navigate = useNavigate()
    const { tasks, loading, error, pendingTasksCount, startTask, claimReward, fetchTasks } = useTasks()
    const { telegramUser } = useAuth()
    const userIsAdmin = isAdmin(telegramUser?.id)
    const [resetLoading, setResetLoading] = useState(false)

    const completedCount = tasks.filter(t => t.completion?.reward_claimed).length
    const totalRewards = tasks
        .filter(t => t.completion?.reward_claimed)
        .reduce((sum, t) => sum + t.reward_ar, 0)

    // Админ-сброс заданий для тестирования
    const handleResetTasks = async () => {
        if (!telegramUser?.id) return
        setResetLoading(true)
        try {
            await supabase
                .from('task_completions')
                .delete()
                .eq('user_id', String(telegramUser.id))

            // Перезагрузить задания
            await fetchTasks()
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        } catch (err) {
            console.error('Reset error:', err)
        } finally {
            setResetLoading(false)
        }
    }

    // Активные (незавершённые) задания
    const activeTasks = tasks.filter(t => !t.completion?.reward_claimed)
    // Все задания выполнены?
    const allDone = tasks.length > 0 && activeTasks.length === 0

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-28">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <img src="/icons/back.png" alt="Назад" className="w-5 h-5" />
                    </button>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <img src="/icons/TASK.png" alt="" className="w-6 h-6" />
                            Задания
                        </h1>
                    </div>

                    {pendingTasksCount > 0 && (
                        <div className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                            <span className="text-yellow-400 font-semibold text-sm">{pendingTasksCount} новых</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Banner */}
            <div className="px-4 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-purple-500/10 border border-white/10"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                <img src="/icons/TASK.png" alt="" className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-white/50 text-sm">Выполнено заданий</p>
                                <p className="text-xl font-bold text-white">{completedCount} / {tasks.length}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-white/50 text-sm">Заработано</p>
                            <p className="text-xl font-bold text-yellow-400">+{totalRewards} AIR</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Tasks List */}
            <div className="px-4 space-y-3">
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="text-center py-20">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Все задания выполнены */}
                {!loading && !error && allDone && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-green-500/20 flex items-center justify-center">
                            <img src="/icons/TASK.png" alt="" className="w-10 h-10" />
                        </div>
                        <p className="text-white font-semibold text-lg">Все задания выполнены! 🎉</p>
                        <p className="text-white/40 text-sm mt-1">Следите за обновлениями</p>
                    </motion.div>
                )}

                {/* Нет заданий вообще */}
                {!loading && !error && tasks.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                            <img src="/icons/TASK.png" alt="" className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="text-white/50">Пока нет доступных заданий</p>
                        <p className="text-white/30 text-sm mt-1">Следите за обновлениями!</p>
                    </motion.div>
                )}

                {/* Задания */}
                <AnimatePresence>
                    {!loading && !error && activeTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onStart={startTask}
                            onClaimReward={claimReward}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Admin Reset Button */}
            {userIsAdmin && (
                <div className="px-4 mt-8">
                    <button
                        onClick={handleResetTasks}
                        disabled={resetLoading}
                        className="w-full py-2 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                    >
                        {resetLoading ? 'Сбрасываю...' : '🔄 Сбросить мои задания (тест)'}
                    </button>
                </div>
            )}

            {/* Bottom Navigation */}
            <Navbar />
        </div>
    )
}
