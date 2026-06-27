import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/interviews', label: 'Interviews' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r bg-white p-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">ROVE Hire</h2>
        <p className="text-xs text-gray-500">HR Portal</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={clsx(
              'block rounded-md px-3 py-2 text-sm font-medium',
              pathname === item.to
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t pt-6">
        <p className="mb-2 truncate text-sm text-gray-900">
          {user?.email ?? 'HR User'}
        </p>
        <Button variant="secondary" className="w-full" onClick={logout}>
          Sign out
        </Button>
      </div>
    </aside>
  )
}
