import { Layout } from '../components/layout/Layout'
import { GiveawayManager } from '../components/admin/GiveawayManager'

export function AdminPage() {
  return (
    <Layout>
      <div className="pt-[60px]">
        <GiveawayManager />
      </div>
    </Layout>
  )
}
