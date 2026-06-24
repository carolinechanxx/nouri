import { NavLink } from 'react-router-dom'

const items = [
  { to: '/home', label: 'Home' },
  { to: '/feed', label: 'Feed' },
  { to: '/experiment', label: 'Experiment' },
  { to: '/chat', label: 'Chat' },
  { to: '/profile', label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
