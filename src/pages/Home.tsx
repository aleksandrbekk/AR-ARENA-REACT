import { Layout } from '../components/layout/Layout'

export function Home() {
  return (
    <Layout>
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">Home Page</h1>
          <p className="text-white/60 mt-2">Welcome to AR ARENA</p>
        </div>
      </div>
    </Layout>
  )
}
