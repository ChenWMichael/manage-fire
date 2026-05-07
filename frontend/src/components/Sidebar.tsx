import {
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  ChevronRight,
  CreditCard,
  Flame,
  GitBranch,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  User,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/app/calculator', icon: Calculator, label: 'FIRE Calculator', public: true },
  { to: '/app/flowchart', icon: GitBranch, label: 'FIRE Flow Guide', public: true },
  { to: '/app/offer', icon: Briefcase, label: 'Offer Simulator', public: true },
  { to: '/app/rent-vs-buy', icon: Home, label: 'Rent vs. Buy', public: true },
  { to: '/app/house-affordability', icon: Building2, label: 'House Affordability', public: true },
  { to: '/app/credit-cards', icon: CreditCard, label: 'Credit Cards', public: true },
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', public: false },
  { to: '/app/profile', icon: User, label: 'Profile', public: false },
]

const comingSoon = [
  { icon: BarChart3, label: 'Net Worth Tracker' },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()

  return (
    <aside className="w-64 h-full min-h-screen bg-slate-900 flex flex-col flex-shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <Link to="/app/calculator" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-fire-500 rounded-lg flex items-center justify-center shadow-lg shadow-fire-500/20">
            <Flame className="text-white" size={18} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">ManageFIRE</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, public: isPublic }) => {
          const requiresAuth = !isPublic
          const locked = requiresAuth && !user
          const active = location.pathname === to

          if (locked) {
            return (
              <Link
                key={to}
                to="/auth"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 transition-all duration-150"
                title="Sign in to access"
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] font-semibold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                  Sign in
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-fire-500 text-white shadow-md shadow-fire-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-60" />}
            </Link>
          )
        })}

        {/* Coming Soon */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Coming Soon</p>
        </div>
        {comingSoon.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed"
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <span className="text-[10px] font-semibold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">SOON</span>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-fire-500/20 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-fire-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all duration-150"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150"
          >
            <LogIn size={16} />
            <span>Sign in / Register</span>
          </Link>
        )}
      </div>
    </aside>
  )
}
