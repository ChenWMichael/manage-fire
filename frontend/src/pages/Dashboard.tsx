import {
  ArrowRight, Briefcase, Calculator, Check, CreditCard,
  Flame, Home, Loader2, Pencil, Target, Trash2, TrendingUp, Waves, Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { useAuth } from '../hooks/useAuth'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { deleteSnapshot, deleteSnapshots, getSnapshots } from '../lib/api'
import type { Snapshot } from '../lib/api'
import type { CreditCardPortfolio, FireResult } from '../types'
import { FIRE_TYPE_META } from '../types'
import { formatCurrency, formatCurrencyFull } from '../utils/fireCalculations'
import {
  DEFAULT_PORTFOLIO,
  SPENDING_CATEGORIES,
  computeCoverage,
  getGapCategories,
  getRecommendations,
} from '../utils/creditCardData'

const tools = [
  {
    to: '/app/calculator',
    icon: Calculator,
    title: 'FIRE Calculator',
    description: 'Project your portfolio growth and find your FIRE date.',
    color: 'bg-fire-50 border-fire-100 hover:border-fire-300',
    iconColor: 'text-fire-600 bg-fire-100',
  },
  {
    to: '/app/rent-vs-buy',
    icon: Home,
    title: 'Rent vs. Buy',
    description: 'Compare long-term wealth: home equity vs. investing the down payment.',
    color: 'bg-violet-50 border-violet-100 hover:border-violet-300',
    iconColor: 'text-violet-600 bg-violet-100',
  },
  {
    to: '/app/house-affordability',
    icon: Target,
    title: 'House Affordability',
    description: 'Find your comfortable max home price based on income and DTI ratios.',
    color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300',
    iconColor: 'text-emerald-600 bg-emerald-100',
  },
  {
    to: '/app/offer',
    icon: Briefcase,
    title: 'Offer Simulator',
    description: 'Compare job offers side-by-side with after-tax income breakdown.',
    color: 'bg-slate-50 border-slate-200 hover:border-slate-400',
    iconColor: 'text-slate-600 bg-slate-200',
  },
]

const SNAPSHOT_ROUTES: Record<string, string> = {
  fire: '/app/calculator',
  rent_buy: '/app/rent-vs-buy',
  house_affordability: '/app/house-affordability',
  offer: '/app/offer',
}

function SnapshotCard({
  snapshot, onDelete, selectionMode, selected, onToggleSelect,
}: {
  snapshot: Snapshot
  onDelete: () => void
  selectionMode: boolean
  selected: boolean
  onToggleSelect: () => void
}) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDeleteClick = () => setConfirmDelete(true)

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await deleteSnapshot(snapshot.id)
      onDelete()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleEdit = () => {
    const route = SNAPSHOT_ROUTES[snapshot.calculator_type]
    if (route) navigate(`${route}?snapshot=${snapshot.id}`)
  }

  const date = new Date(snapshot.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const summary = snapshot.summary as Record<string, unknown>

  const renderSummary = () => {
    if (snapshot.calculator_type === 'fire') {
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
          <span className="text-slate-500">FI Number</span>
          <span className="font-semibold text-slate-800 text-right">{formatCurrency(summary.fiNumber as number)}</span>
          <span className="text-slate-500">Progress</span>
          <span className="font-semibold text-slate-800 text-right">{summary.progressPercentage as number}%</span>
          <span className="text-slate-500">FIRE Age</span>
          <span className="font-semibold text-slate-800 text-right">
            {summary.isAlreadyFi ? "FIRE'd!" : summary.fireAge ? `Age ${summary.fireAge as number}` : '—'}
          </span>
          <span className="text-slate-500">CoastFIRE</span>
          <span className="font-semibold text-slate-800 text-right">{formatCurrency(summary.coastFireNumber as number)}</span>
        </div>
      )
    }
    if (snapshot.calculator_type === 'rent_buy') {
      const rec = summary.recommendation as string
      const recColor = rec === 'buy' ? 'text-violet-700' : rec === 'rent' ? 'text-sky-700' : 'text-amber-700'
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
          <span className="text-slate-500">Recommendation</span>
          <span className={`font-semibold text-right uppercase ${recColor}`}>{rec}</span>
          <span className="text-slate-500">Break-Even</span>
          <span className="font-semibold text-slate-800 text-right">
            {summary.breakEvenYear ? `Year ${summary.breakEvenYear as number}` : 'N/A'}
          </span>
          <span className="text-slate-500">Buy 30yr NW</span>
          <span className="font-semibold text-slate-800 text-right">{formatCurrency(summary.buyFinalNetWorth as number)}</span>
          <span className="text-slate-500">Rent 30yr NW</span>
          <span className="font-semibold text-slate-800 text-right">{formatCurrency(summary.rentFinalNetWorth as number)}</span>
        </div>
      )
    }
    if (snapshot.calculator_type === 'house_affordability') {
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
          <span className="text-slate-500">Max Price</span>
          <span className="font-semibold text-slate-800 text-right">{formatCurrency(summary.maxAffordablePrice as number)}</span>
          <span className="text-slate-500">Monthly PITI</span>
          <span className="font-semibold text-slate-800 text-right">{formatCurrencyFull(summary.monthlyPayment as number)}</span>
          <span className="text-slate-500">Rate</span>
          <span className="font-semibold text-slate-800 text-right">{(summary.effectiveRate as number).toFixed(2)}%</span>
          <span className="text-slate-500">State</span>
          <span className="font-semibold text-slate-800 text-right">{summary.state as string}</span>
        </div>
      )
    }
    if (snapshot.calculator_type === 'offer') {
      type FourYrEntry = { label: string; totalNet: number; totalGross: number }
      const totals = (summary.fourYearTotals as FourYrEntry[]) ?? []
      const counts: Record<string, number> = {}
      totals.forEach((t) => { counts[t.label] = (counts[t.label] || 0) + 1 })
      const seen: Record<string, number> = {}
      const displayLabels = totals.map((t) => {
        if (counts[t.label] > 1) {
          seen[t.label] = (seen[t.label] || 0) + 1
          return `${t.label} — Team ${seen[t.label]}`
        }
        return t.label
      })
      return (
        <div className="space-y-1 text-xs mt-2">
          {totals.map((t, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-slate-500 truncate max-w-[120px]">{displayLabels[i]}</span>
              <span className="font-semibold text-slate-800">{formatCurrency(t.totalNet)} net / 4yr</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const typeIcon: Record<string, React.ElementType> = {
    fire: Calculator,
    rent_buy: Home,
    house_affordability: Target,
    offer: Briefcase,
  }
  const typeLabel: Record<string, string> = {
    fire: 'FIRE Calculator',
    rent_buy: 'Rent vs. Buy',
    house_affordability: 'House Affordability',
    offer: 'Offer Simulator',
  }
  const typeColor: Record<string, string> = {
    fire: 'bg-fire-50 text-fire-600',
    rent_buy: 'bg-violet-50 text-violet-600',
    house_affordability: 'bg-emerald-50 text-emerald-600',
    offer: 'bg-slate-100 text-slate-600',
  }

  const Icon = typeIcon[snapshot.calculator_type] ?? Calculator

  return (
    <div
      onClick={selectionMode ? onToggleSelect : undefined}
      className={`card p-4 space-y-2 transition-all duration-150 ${
        selectionMode ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2 ring-blue-400 bg-blue-50/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {selectionMode && (
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'
            }`}>
              {selected && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
          )}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor[snapshot.calculator_type]}`}>
            <Icon size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{snapshot.name}</p>
            <p className="text-xs text-slate-400">{typeLabel[snapshot.calculator_type]} · {date}</p>
          </div>
        </div>
        {!selectionMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {confirmDelete ? (
              <>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  {deleting ? '…' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="p-1 rounded text-slate-300 hover:text-slate-600 transition-colors"
                  aria-label="Edit snapshot"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="p-1 rounded text-slate-300 hover:text-red-400 transition-colors"
                  aria-label="Delete snapshot"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {renderSummary()}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [lastResult, setLastResult] = useState<FireResult | null>(null)
  const [fireType, setFireType] = useState<string>('regular')
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(true)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('mf_last_result')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { result: FireResult; fireType: string }
        setLastResult(parsed.result)
        setFireType(parsed.fireType || 'regular')
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    getSnapshots()
      .then(setSnapshots)
      .catch(() => setSnapshots([]))
      .finally(() => setSnapshotsLoading(false))
  }, [])

  const removeSnapshot = (id: string) => setSnapshots((prev) => prev.filter((s) => s.id !== id))

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkDeleting(true)
    try {
      await deleteSnapshots(ids)
      setSnapshots((prev) => prev.filter((s) => !selectedIds.has(s.id)))
      exitSelectionMode()
    } finally {
      setBulkDeleting(false)
    }
  }

  const [ccPortfolio] = useLocalStorage<CreditCardPortfolio>('credit-card-portfolio', DEFAULT_PORTFOLIO)

  const cc = useMemo(() => {
    const safe = {
      wallet:           ccPortfolio.wallet           ?? [],
      customCategories: ccPortfolio.customCategories ?? [],
      customCards:      ccPortfolio.customCards      ?? [],
      rateOverrides:    ccPortfolio.rateOverrides    ?? {},
      coverageThreshold: ccPortfolio.coverageThreshold ?? 3,
    }
    const allCategories: { key: string; label: string; emoji: string }[] = [
      ...(SPENDING_CATEGORIES as { key: string; label: string; emoji: string }[]),
      ...safe.customCategories.map(c => ({ key: c.id, label: c.label, emoji: c.emoji })),
    ]
    const allKeys = allCategories.map(c => c.key)
    const coverage = computeCoverage(safe.wallet, safe.customCards, safe.rateOverrides, allKeys)
    const gaps = getGapCategories(coverage, allKeys, safe.coverageThreshold)
    const recs = getRecommendations(safe.wallet, [], safe.customCards, safe.rateOverrides, gaps.slice(0, 3))
    const coveredCount = allKeys.filter(k => (coverage[k]?.rate ?? 0) >= safe.coverageThreshold).length
    return { safe, allCategories, coverage, gaps, recs, coveredCount, totalCats: allKeys.length }
  }, [ccPortfolio])

  const name = user?.user_metadata?.full_name as string | undefined
    || user?.email?.split('@')[0]
    || 'there'
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

      {/* FIRE Stats */}
      {lastResult ? (
        <>
        <p className="text-xs text-slate-400 -mb-2">Last calculator session on this device</p>
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
            subtext={lastResult.isAlreadyFi ? "You've reached FI!" : 'of your FI number'}
            icon={TrendingUp}
            iconColor="text-fire-500"
            trend={lastResult.isAlreadyFi ? 'up' : 'neutral'}
          />
          <StatCard
            label={lastResult.isAlreadyFi ? 'Status' : 'FIRE Age'}
            value={lastResult.isAlreadyFi ? "FIRE'd!" : lastResult.fireAge ? `Age ${lastResult.fireAge}` : 'Not reached'}
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
        </>
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

      {/* Credit Card Portfolio Widget */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-50 text-sky-600">
              <CreditCard size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Credit Card Portfolio</h2>
              {cc.safe.wallet.length > 0 ? (
                <p className="text-xs text-slate-400">
                  {cc.safe.wallet.length} card{cc.safe.wallet.length !== 1 ? 's' : ''}
                  {' · '}{cc.coveredCount}/{cc.totalCats} at {cc.safe.coverageThreshold}x+
                  {cc.gaps.length > 0 && (
                    <span className="text-amber-500"> · {cc.gaps.length} gap{cc.gaps.length !== 1 ? 's' : ''}</span>
                  )}
                  {cc.gaps.length === 0 && (
                    <span className="text-emerald-500"> · all covered</span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-slate-400">No cards added yet</p>
              )}
            </div>
          </div>
          <Link to="/app/credit-cards" className="flex items-center gap-1 text-xs text-slate-400 hover:text-fire-600 transition-colors">
            Open <ArrowRight size={12} />
          </Link>
        </div>

        {cc.safe.wallet.length === 0 ? (
          <div className="flex flex-col items-center py-3 text-center">
            <p className="text-sm text-slate-500 mb-3">
              Set up your portfolio to see reward coverage at a glance.
            </p>
            <Link to="/app/credit-cards" className="btn-primary text-sm inline-flex items-center gap-2">
              Set up portfolio <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
            {cc.allCategories.map(cat => {
              const cov = cc.coverage[cat.key] ?? { rate: 1, cardId: null, rewardType: null }
              const t = cc.safe.coverageThreshold
              const bg = cov.rate >= t + 1 ? 'bg-emerald-50 border-emerald-200'
                : cov.rate >= t       ? 'bg-fire-50 border-fire-200'
                : cov.rate > 1        ? 'bg-amber-50 border-amber-200'
                :                       'bg-slate-50 border-slate-200'
              const text = cov.rate >= t + 1 ? 'text-emerald-600'
                : cov.rate >= t       ? 'text-fire-600'
                : cov.rate > 1        ? 'text-amber-600'
                :                       'text-slate-400'
              return (
                <div key={cat.key} className={`rounded-lg border p-1.5 flex flex-col items-center gap-0.5 ${bg}`}>
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  <span className={`text-[11px] font-bold leading-none tabular-nums ${text}`}>
                    {cov.rewardType === 'points' ? `${cov.rate}x` : `${cov.rate}%`}
                  </span>
                  <span className="text-[8px] text-slate-400 leading-tight text-center w-full truncate">
                    {cat.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Saved Snapshots */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Saved Snapshots</h2>
          {!snapshotsLoading && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                snapshots.length >= 20
                  ? 'bg-red-50 text-red-600'
                  : snapshots.length >= 16
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {snapshots.length} / 20
              </span>
              {snapshots.length > 0 && !selectionMode && (
                <button
                  onClick={() => setSelectionMode(true)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Select
                </button>
              )}
              {selectionMode && (
                <>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedIds.size === 0 || bulkDeleting}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedIds.size === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {bulkDeleting
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Trash2 size={11} />}
                    {bulkDeleting ? 'Deleting…' : `Delete${selectedIds.size > 0 ? ` ${selectedIds.size}` : ''}`}
                  </button>
                  <button
                    onClick={exitSelectionMode}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {snapshotsLoading ? (
          <div className="card p-6 text-center text-slate-400 text-sm">Loading…</div>
        ) : snapshots.length === 0 ? (
          <div className="card p-6 text-center border-dashed">
            <p className="text-slate-500 text-sm">No saved snapshots yet.</p>
            <p className="text-slate-400 text-xs mt-1">
              Use "Save to dashboard" in any calculator to pin a result here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshots.map((s) => (
              <SnapshotCard
                key={s.id}
                snapshot={s}
                onDelete={() => removeSnapshot(s.id)}
                selectionMode={selectionMode}
                selected={selectedIds.has(s.id)}
                onToggleSelect={() => toggleSelect(s.id)}
              />
            ))}
          </div>
        )}
      </div>

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
