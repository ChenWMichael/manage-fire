import { ArrowRight, Calculator, Flame, Target, TrendingUp, Waves, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { useAuth } from '../hooks/useAuth'
import type { FireResult } from '../types'
import { FIRE_TYPE_META } from '../types'
import { formatCurrency, formatCurrencyFull } from '../utils/fireCalculations'

const tools = [
  {
    to: '/app/calculator',
    icon: Calculator,
    title: 'FIRE Calculator',
    description: 'Project your portfolio growth and find your FIRE date.',
    color: 'bg-fire-50 border-fire-100 hover:border-fire-300',
    iconColor: 'text-fire-600 bg-fire-100',
  },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [lastResult, setLastResult] = useState<FireResult | null>(null)
  const [fireType, setFireType] = useState<string>('regular')

  useEffect(() => {
    const stored = localStorage.getItem('mf_last_result')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setLastResult(parsed.result)
        setFireType(parsed.fireType || 'regular')
      } catch {
        /* ignore */
      }
    }
  }, [])

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  const typeMeta = FIRE_TYPE_META[fireType as keyof typeof FIRE_TYPE_META] || FIRE_TYPE_META.regular

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {name} 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's your financial independence overview.</p>
        </div>
        {lastResult && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${typeMeta.color}`}>
            <Flame size={11} />
            {typeMeta.label}
          </span>
        )}
      </div>

      {/* Stats */}
      {lastResult ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="FI Number"
            value={formatCurrency(lastResult.fiNumber)}
            subtext="Your financial independence target"
            icon={Target}
            iconColor="text-fire-500"
          />
          <StatCard
            label="Progress"
            value={`${lastResult.progressPercentage}%`}
            subtext={lastResult.isAlreadyFi ? 'You\'ve reached FI!' : 'of your FI number'}
            icon={TrendingUp}
            iconColor="text-fire-500"
            trend={lastResult.isAlreadyFi ? 'up' : 'neutral'}
          />
          <StatCard
            label={lastResult.isAlreadyFi ? 'Status' : 'FIRE Age'}
            value={lastResult.isAlreadyFi ? 'FIRE\'d!' : lastResult.fireAge ? `Age ${lastResult.fireAge}` : 'Not reached'}
            subtext={lastResult.yearsToFire !== null && !lastResult.isAlreadyFi ? `${lastResult.yearsToFire} years away` : undefined}
            icon={Zap}
            iconColor={lastResult.isAlreadyFi ? 'text-fire-500' : 'text-amber-500'}
            trend={lastResult.isAlreadyFi ? 'up' : 'neutral'}
          />
          <StatCard
            label="CoastFIRE Number"
            value={formatCurrency(lastResult.coastFireNumber)}
            subtext="Amount to save today and coast"
            icon={Waves}
            iconColor="text-blue-500"
          />
        </div>
      ) : (
        <div className="card p-8 text-center border-dashed">
          <div className="w-14 h-14 bg-fire-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calculator size={24} className="text-fire-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Run your first calculation</h3>
          <p className="text-slate-500 text-sm mb-5">
            Use the FIRE Calculator to see your projected path to financial independence.
          </p>
          <Link to="/app/calculator" className="btn-primary inline-flex items-center gap-2">
            Open Calculator <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Progress bar */}
      {lastResult && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Progress to FI</h2>
            <span className="text-sm text-slate-500">{lastResult.progressPercentage}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fire-400 to-fire-500 rounded-full transition-all duration-700"
              style={{ width: `${lastResult.progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>$0</span>
            <span>{formatCurrencyFull(lastResult.fiNumber)}</span>
          </div>
        </div>
      )}

      {/* Tools */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">FIRE Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map(({ to, icon: Icon, title, description, color, iconColor }) => (
            <Link
              key={to}
              to={to}
              className={`card p-5 flex items-start gap-4 border-2 transition-all duration-150 group ${color}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-fire-700 transition-colors">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-fire-500 transition-colors flex-shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center pb-4">
        Projections are estimates based on historical averages. Not financial advice — consult a professional.
      </p>
    </div>
  )
}
