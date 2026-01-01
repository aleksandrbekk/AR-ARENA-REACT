import { useState } from 'react'
import { Plus, Trash2, Zap, Save } from 'lucide-react'

// В будущем это будет приходить из БД (chat_flows)
interface AutomationRule {
    id: string
    trigger_keyword: string
    response_text: string
    is_active: boolean
}

export function AutomationRules({ projectId }: { projectId: string | undefined }) {
    // Silence unused warning for now
    console.log('AutomationRules mounted for project:', projectId)

    const [rules, setRules] = useState<AutomationRule[]>([
        { id: '1', trigger_keyword: '/start', response_text: 'Привет! Я бот.', is_active: true },
        { id: '2', trigger_keyword: 'цена', response_text: 'Наши тарифы: ...', is_active: true }
    ])

    const [isAdding, setIsAdding] = useState(false)
    const [newKeyword, setNewKeyword] = useState('')
    const [newResponse, setNewResponse] = useState('')

    const handleAddRule = () => {
        if (!newKeyword || !newResponse) return

        const newRule: AutomationRule = {
            id: Date.now().toString(),
            trigger_keyword: newKeyword,
            response_text: newResponse,
            is_active: true
        }

        setRules([...rules, newRule])
        setIsAdding(false)
        setNewKeyword('')
        setNewResponse('')

        // TODO: Save to Supabase (chat_flows)
    }

    const handleDelete = (id: string) => {
        setRules(rules.filter(r => r.id !== id))
        // TODO: Delete from Supabase
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6 text-white">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Zap className="text-yellow-500" />
                            Автоматизация
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">
                            Настройте автоматические ответы на ключевые слова
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition"
                    >
                        <Plus size={18} />
                        Создать правило
                    </button>
                </div>

                {/* Form for new rule */}
                {isAdding && (
                    <div className="mb-8 bg-zinc-900 border border-yellow-500/30 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                        <h3 className="font-bold text-lg mb-4">Новое правило</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Если сообщение содержит</label>
                                <input
                                    type="text"
                                    value={newKeyword}
                                    onChange={e => setNewKeyword(e.target.value)}
                                    placeholder="Например: цена"
                                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Ответить сообщением</label>
                                <input
                                    type="text"
                                    value={newResponse}
                                    onChange={e => setNewResponse(e.target.value)}
                                    placeholder="Текст ответа..."
                                    className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAddRule}
                                disabled={!newKeyword || !newResponse}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition disabled:opacity-50"
                            >
                                <Save size={16} />
                                Сохранить
                            </button>
                        </div>
                    </div>
                )}

                {/* Rules List */}
                <div className="space-y-4">
                    {rules.map(rule => (
                        <div key={rule.id} className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between transition">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rule.is_active ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-600'}`}>
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-sm">
                                            "{rule.trigger_keyword}"
                                        </span>
                                        <span className="text-zinc-600">→</span>
                                        <span className="text-zinc-300">
                                            {rule.response_text}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(rule.id)}
                                className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}

                    {rules.length === 0 && !isAdding && (
                        <div className="text-center py-12 text-zinc-500">
                            <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Нет активных правил</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
