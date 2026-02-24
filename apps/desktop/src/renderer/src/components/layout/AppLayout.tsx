import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-text">
      <Sidebar />
      <div className="flex flex-col flex-grow w-full h-full overflow-hidden">
        <Topbar />
        <main className="flex-grow w-full overflow-hidden bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
