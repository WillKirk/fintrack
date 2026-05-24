import Sidebar from '@/components/Sidebar'

export default function SavingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 ml-56 p-10">
        {children}
      </main>
    </div>
  )
}