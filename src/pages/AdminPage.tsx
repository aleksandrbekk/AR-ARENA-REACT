import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { GiveawayManager } from '../components/admin/GiveawayManager'
import { UserManager } from '../components/admin/UserManager'
import { Trophy, Users } from 'lucide-react'

type AdminTab = 'giveaways' | 'users'

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('giveaways')

  const tabs = [
    { id: 'giveaways' as AdminTab, label: 'Розыгрыши', icon: Trophy },
    { id: 'users' as AdminTab, label: 'Пользователи', icon: Users },
  ]

  return (
    <Layout>
      <div className="pt-[60px]">
        {/* Tab Navigation */}
        <div className="bg-zinc-900 border-b border-white/10">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${
                  activeTab === tab.id
                    ? 'text-[#FFD700]'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'giveaways' ? <GiveawayManager /> : <UserManager />}
      </div>
    </Layout>
  )
}
