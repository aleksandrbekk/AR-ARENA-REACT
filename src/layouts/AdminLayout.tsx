import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, LayoutDashboard, MessageSquare, Settings, ChevronDown, Check, Plus } from 'lucide-react'
// import { supabase } from '../lib/supabase'

interface Project {
    id: string
    name: string
}

export function AdminLayout() {
    const navigate = useNavigate()
    const { projectId } = useParams()
    const [projects, setProjects] = useState<Project[]>([])
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
    const [currentProject, setCurrentProject] = useState<Project | null>(null)

    // -- 1. Загрузка проектов при старте
    useEffect(() => {
        async function fetchProjects() {
            // Здесь потом будет fetch из Supabase
            // Пока мокаем данные, чтобы не ломать логику до полного API
            // const { data } = await supabase.from('projects').select('id, name')

            const mockProjects = [
                { id: '11111111-1111-1111-1111-111111111111', name: 'AR ARENA (Main)' },
                { id: '22222222-2222-2222-2222-222222222222', name: 'Личный Бренд' }
            ]
            setProjects(mockProjects)

            // Еcли в URL нет projectId, редиректим на первый проект
            if (!projectId && mockProjects.length > 0) {
                navigate(`/app/${mockProjects[0].id}/dashboard`, { replace: true })
            } else if (projectId) {
                const found = mockProjects.find(p => p.id === projectId)
                if (found) setCurrentProject(found)
            }
        }
        fetchProjects()
    }, [projectId, navigate])

    const handleSwitchProject = (project: Project) => {
        setCurrentProject(project)
        setIsProjectMenuOpen(false)
        // Сохраняем текущую страницу (dashboard/crm/inbox), меняем только ID
        const currentPath = window.location.pathname.split('/').pop() || 'dashboard'
        navigate(`/app/${project.id}/${currentPath}`)
    }

    if (!currentProject) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/50">Loading Workspace...</div>

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white">
            {/* --- SIDEBAR --- */}
            <aside className="w-64 border-r border-white/5 flex flex-col pt-6 pb-4 px-4">
                {/* Project Selector */}
                <div className="relative mb-8">
                    <button
                        onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                    >
                        <span className="font-semibold tracking-wide truncate">{currentProject.name}</span>
                        <ChevronDown size={16} className={`text-white/50 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                        {isProjectMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
                            >
                                {projects.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSwitchProject(p)}
                                        className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 cursor-pointer text-sm"
                                    >
                                        <span className={p.id === currentProject.id ? 'text-white' : 'text-white/60'}>{p.name}</span>
                                        {p.id === currentProject.id && <Check size={14} className="text-[#FFD700]" />}
                                    </div>
                                ))}
                                <div className="border-t border-white/5 px-3 py-2 text-xs text-white/40 hover:text-white hover:bg-white/5 cursor-pointer flex items-center gap-2">
                                    <Plus size={12} />
                                    New Project
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1">
                    <NavItem to="dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <NavItem to="crm" icon={<Users size={20} />} label="CRM Users" />
                    <NavItem to="inbox" icon={<MessageSquare size={20} />} label="Inbox & Auto" />
                    <NavItem to="settings" icon={<Settings size={20} />} label="Settings" />
                </nav>

                {/* User Info Footnote */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFD700] to-[#FFA500] flex items-center justify-center text-black font-bold text-xs">
                        AB
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Aleksandr Bekk</span>
                        <span className="text-[10px] text-white/40">Super Admin</span>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-auto bg-[#0a0a0a]">
                <div className="h-full">
                    {/* Outlet renders the child route (Dashboard, CRM, etc.) */}
                    <Outlet context={{ projectId }} />
                </div>
            </main>
        </div>
    )
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
        ${isActive
                    ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}
      `}
        >
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </NavLink>
    )
}
