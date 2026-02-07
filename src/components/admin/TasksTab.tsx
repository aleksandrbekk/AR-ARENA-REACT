import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus,
    Loader2,
    Play,
    ThumbsUp,
    MessageCircle,
    Bell,
    Trash2,
    Eye,
    EyeOff,
    Gift,
    Clock,
    Users,
    X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Task {
    id: string
    title: string
    description: string | null
    type: string
    target_url: string | null
    reward_ar: number
    wait_seconds: number
    max_completions: number | null
    is_active: boolean
    expires_at: string | null
    created_at: string
    completions_count?: number
}

const TASK_TYPES = [
    { value: 'youtube_watch', label: 'Посмотреть видео', icon: Play },
    { value: 'youtube_like', label: 'Поставить лайк', icon: ThumbsUp },
    { value: 'youtube_comment', label: 'Комментарий', icon: MessageCircle },
    { value: 'youtube_subscribe', label: 'YouTube подписка', icon: Bell },
    { value: 'telegram_subscribe', label: 'Telegram канал', icon: Bell },
]

export function TasksTab() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'youtube_watch',
        target_url: '',
        reward_ar: 50,
        wait_seconds: 60,
        max_completions: '',
    })

    const loadTasks = async () => {
        try {
            setLoading(true)

            // Get tasks with completion count
            const { data: tasksData, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Get completion counts
            const tasksWithCounts = await Promise.all(
                (tasksData || []).map(async (task) => {
                    const { count } = await supabase
                        .from('task_completions')
                        .select('*', { count: 'exact', head: true })
                        .eq('task_id', task.id)
                        .eq('reward_claimed', true)

                    return {
                        ...task,
                        completions_count: count || 0
                    }
                })
            )

            setTasks(tasksWithCounts)
        } catch (err) {
            console.error('Error loading tasks:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTasks()
    }, [])

    const handleCreate = async () => {
        if (!formData.title || !formData.target_url) {
            alert('Заполните название и ссылку')
            return
        }

        setIsCreating(true)
        try {
            const { data, error } = await supabase.rpc('admin_create_task', {
                p_title: formData.title,
                p_description: formData.description || null,
                p_type: formData.type,
                p_target_url: formData.target_url,
                p_reward_ar: formData.reward_ar,
                p_wait_seconds: formData.wait_seconds,
                p_max_completions: formData.max_completions ? parseInt(formData.max_completions) : null,
                p_expires_at: null
            })

            if (error) throw error

            if (data?.success) {
                setShowCreateModal(false)
                setFormData({
                    title: '',
                    description: '',
                    type: 'youtube_watch',
                    target_url: '',
                    reward_ar: 50,
                    wait_seconds: 60,
                    max_completions: '',
                })
                loadTasks()
            } else {
                alert(data?.error || 'Ошибка создания')
            }
        } catch (err) {
            console.error('Error creating task:', err)
            alert('Ошибка создания задания')
        } finally {
            setIsCreating(false)
        }
    }

    const toggleTaskActive = async (taskId: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_active: !currentState })
                .eq('id', taskId)

            if (error) throw error
            loadTasks()
        } catch (err) {
            console.error('Error toggling task:', err)
        }
    }

    const deleteTask = async (taskId: string) => {
        if (!confirm('Удалить задание?')) return

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error
            loadTasks()
        } catch (err) {
            console.error('Error deleting task:', err)
        }
    }

    const getTypeIcon = (type: string) => {
        const taskType = TASK_TYPES.find(t => t.value === type)
        return taskType?.icon || Gift
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Задания</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform"
                >
                    <Plus className="w-5 h-5" />
                    Создать
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-white/10 text-center">
                    <div className="text-2xl font-bold text-white">{tasks.length}</div>
                    <div className="text-xs text-white/50">Всего</div>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-white/10 text-center">
                    <div className="text-2xl font-bold text-green-400">{tasks.filter(t => t.is_active).length}</div>
                    <div className="text-xs text-white/50">Активных</div>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-white/10 text-center">
                    <div className="text-2xl font-bold text-[#FFD700]">
                        {tasks.reduce((sum, t) => sum + (t.completions_count || 0), 0)}
                    </div>
                    <div className="text-xs text-white/50">Выполнено</div>
                </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
                {tasks.map((task) => {
                    const TypeIcon = getTypeIcon(task.type)
                    return (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`
                p-4 rounded-xl border
                ${task.is_active
                                    ? 'bg-zinc-900/50 border-white/10'
                                    : 'bg-zinc-900/30 border-white/5 opacity-60'}
              `}
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center flex-shrink-0">
                                    <TypeIcon className="w-5 h-5 text-[#FFD700]" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-white truncate">{task.title}</h3>
                                    <p className="text-sm text-white/50 truncate">{task.target_url}</p>

                                    {/* Meta */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="flex items-center gap-1 text-xs text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                                            <Gift className="w-3 h-3" />
                                            +{task.reward_ar} AIR
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
                                            <Clock className="w-3 h-3" />
                                            {task.wait_seconds}с
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
                                            <Users className="w-3 h-3" />
                                            {task.completions_count || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => toggleTaskActive(task.id, task.is_active)}
                                        className={`p-2 rounded-lg transition-colors ${task.is_active
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-white/5 text-white/40'
                                            }`}
                                    >
                                        {task.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}

                {tasks.length === 0 && (
                    <div className="text-center py-12">
                        <Gift className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/40">Заданий пока нет</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-lg bg-zinc-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">Новое задание</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 rounded-full bg-white/10 text-white/60"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Название</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Посмотреть видео о криптовалютах"
                                        className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Описание</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Подробное описание задания..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 resize-none"
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Тип задания</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TASK_TYPES.map(type => {
                                            const isSelected = formData.type === type.value
                                            return (
                                                <button
                                                    key={type.value}
                                                    onClick={() => setFormData({ ...formData, type: type.value })}
                                                    className={`
                            flex items-center gap-2 p-3 rounded-xl border transition-all
                            ${isSelected
                                                            ? 'bg-[#FFD700]/10 border-[#FFD700]/50 text-[#FFD700]'
                                                            : 'bg-zinc-800 border-white/10 text-white/60'}
                          `}
                                                >
                                                    <type.icon className="w-4 h-4" />
                                                    <span className="text-sm">{type.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Target URL */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">
                                        {formData.type === 'telegram_subscribe' ? 'Username канала (@channel)' : 'Ссылка на YouTube'}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.target_url}
                                        onChange={e => setFormData({ ...formData, target_url: e.target.value })}
                                        placeholder={formData.type === 'telegram_subscribe' ? '@ararena_channel' : 'https://www.youtube.com/watch?v=...'}
                                        className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                                    />
                                </div>

                                {/* Reward & Wait */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-white/60 mb-2">Награда (AIR)</label>
                                        <input
                                            type="number"
                                            value={formData.reward_ar}
                                            onChange={e => setFormData({ ...formData, reward_ar: parseInt(e.target.value) || 0 })}
                                            min={1}
                                            className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-white/60 mb-2">Ожидание (сек)</label>
                                        <input
                                            type="number"
                                            value={formData.wait_seconds}
                                            onChange={e => setFormData({ ...formData, wait_seconds: parseInt(e.target.value) || 60 })}
                                            min={5}
                                            className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    className="w-full py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 mt-4"
                                >
                                    {isCreating ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Создать задание'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
