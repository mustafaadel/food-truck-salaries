import { Link, NavLink, Outlet } from 'react-router'
import { Icon, type IconName } from '../components/Icon'
import { useData } from '../data/DataContext'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'pay' },
  { to: '/month', label: 'Month', icon: 'calendar' },
  { to: '/workers', label: 'Workers', icon: 'users' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

function Tabs({ className }: { className: string }) {
  return (
    <nav className={className} aria-label="Main">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className="tab">
          <Icon name={tab.icon} size={22} />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

/** Top bar on every screen; the tabs sit at the bottom on phones and in the top bar on wider screens. */
export function Layout() {
  const { mode } = useData()
  return (
    <div className="app">
      <header className="topbar no-print">
        <Link to="/" className="brand">
          <Icon name="truck" size={22} />
          <span>Food Truck Salaries</span>
        </Link>
        {mode === 'demo' && (
          <Link to="/settings" className="badge badge-demo">
            Demo
          </Link>
        )}
        <Tabs className="tabs-top" />
      </header>
      <main className="content">
        <Outlet />
      </main>
      <Tabs className="tabs-bottom no-print" />
    </div>
  )
}
