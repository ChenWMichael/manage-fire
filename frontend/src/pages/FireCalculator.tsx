import { CheckCircle, ChevronDown, Home, Info, Plus, Trash2, TrendingUp, Wallet, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import HintTooltip from '../components/HintTooltip'
import { useAuth } from '../hooks/useAuth'
import { getSnapshot, saveSnapshot, updateSnapshot } from '../lib/api'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  Account,
  AccountTaxType,
  ContributionChangeEvent,
  ContributionFrequency,
  FireInputs,
  FireResult,
  HomePurchaseEvent,
  Milestone,
  OneTimeEvent,
  ReturnChangeEvent,
  WindfallEvent,
} from '../types'
import { accountEffectiveMonthly, calculateFire, formatCurrency, formatCurrencyFull } from '../utils/fireCalculations'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: FireInputs = {
  currentAge: 30,
  retirementAge: 65,
  accounts: [
    {
      id: 'default-taxable',
      name: 'Taxable Brokerage',
      taxType: 'taxable',
      currentBalance: 50_000,
      contributionAmount: 2_000,
      contributionFrequency: 'monthly',
      annualCap: null,
    },
  ],
  annualExpenses: 60_000,
  expectedAnnualReturn: 7,
  withdrawalRate: 4,
  events: [],
  monteCarloEnabled: false,
  returnStdDev: 15,
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, prefix, suffix,
  min = 0, max, step = 1, hint, small,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; min?: number; max?: number
  step?: number; hint?: string; small?: boolean
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1">
        {label}
        {hint && <HintTooltip hint={hint} />}
      </label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{prefix}</span>}
        <input
          type="number"
          className={`input ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''} ${small ? 'py-1.5 text-sm' : ''}`}
          value={value} min={min} max={max} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{suffix}</span>}
      </div>
    </div>
  )
}

// ─── InputCard ────────────────────────────────────────────────────────────────

function InputCard({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} />
        </div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
      {children}
    </div>
  )
}

// ─── MilestoneCard ────────────────────────────────────────────────────────────

function MilestoneCard({ m, currentInvestments, currentAge }: {
  m: Milestone; currentInvestments: number; currentAge: number
}) {
  const achieved = currentInvestments >= m.fiNumber
  const yearsAway = m.age !== null ? m.age - currentAge : null
  const borderStyle = `2px solid ${m.color}22`

  return (
    <div className="rounded-xl p-4 bg-white" style={{ border: borderStyle }}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
        <span className="text-xs font-bold tracking-wide" style={{ color: m.color }}>{m.label}</span>
        {achieved && <CheckCircle size={11} style={{ color: m.color }} />}
      </div>
      <p className="text-xl font-bold text-slate-900">{formatCurrency(m.fiNumber)}</p>
      <p className="text-xs text-slate-500 mt-1">
        {achieved
          ? '✓ Already achieved'
          : m.age !== null
          ? `Age ${m.age} · ${yearsAway} yr${yearsAway === 1 ? '' : 's'} away`
          : 'Beyond projection range'}
      </p>
    </div>
  )
}

// ─── Event Forms ──────────────────────────────────────────────────────────────

function HomePurchaseForm({ event, onChange, onDelete }: {
  event: HomePurchaseEvent
  onChange: (updated: HomePurchaseEvent) => void
  onDelete: () => void
}) {
  const upd = <K extends keyof HomePurchaseEvent>(k: K, v: HomePurchaseEvent[K]) =>
    onChange({ ...event, [k]: v })

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home size={14} className="text-slate-500" />
          <input className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none w-40"
            value={event.label} onChange={(e) => upd('label', e.target.value)} />
        </div>
        <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field small label="At age" value={event.age} onChange={(v) => upd('age', v)} min={1} max={100} />
        <Field small label="Downpayment" value={event.downpayment} onChange={(v) => upd('downpayment', v)} prefix="$" step={1000} />
        <div className="col-span-2">
          <Field small label="Monthly invest. reduction" value={event.monthlyContribReduction}
            onChange={(v) => upd('monthlyContribReduction', v)} prefix="$" step={50}
            hint="How much less you'll invest monthly after purchase (e.g. mortgage minus prior rent)" />
        </div>
      </div>
    </div>
  )
}

function WindfallForm({ event, onChange, onDelete }: {
  event: WindfallEvent
  onChange: (updated: WindfallEvent) => void
  onDelete: () => void
}) {
  const upd = <K extends keyof WindfallEvent>(k: K, v: WindfallEvent[K]) =>
    onChange({ ...event, [k]: v })

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-slate-500" />
          <input className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none w-40"
            value={event.label} onChange={(e) => upd('label', e.target.value)} />
        </div>
        <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field small label="At age" value={event.age} onChange={(v) => upd('age', v)} min={1} max={100} />
        <Field small label="Amount" value={event.amount} onChange={(v) => upd('amount', v)} prefix="$" step={1000} />
      </div>
    </div>
  )
}

function ContributionChangeForm({ event, onChange, onDelete }: {
  event: ContributionChangeEvent
  onChange: (updated: ContributionChangeEvent) => void
  onDelete: () => void
}) {
  const upd = <K extends keyof ContributionChangeEvent>(k: K, v: ContributionChangeEvent[K]) =>
    onChange({ ...event, [k]: v })

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-slate-500" />
          <input className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none w-44"
            value={event.label} onChange={(e) => upd('label', e.target.value)} />
        </div>
        <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field small label="At age" value={event.age} onChange={(v) => upd('age', v)} min={1} max={100} />
        <Field small label="New monthly amount" value={event.newMonthlyAmount}
          onChange={(v) => upd('newMonthlyAmount', v)} prefix="$" step={100}
          hint="Set to $0 to stop contributions entirely at this age" />
      </div>
    </div>
  )
}

function ReturnChangeForm({ event, onChange, onDelete }: {
  event: ReturnChangeEvent
  onChange: (updated: ReturnChangeEvent) => void
  onDelete: () => void
}) {
  const upd = <K extends keyof ReturnChangeEvent>(k: K, v: ReturnChangeEvent[K]) =>
    onChange({ ...event, [k]: v })

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-500" />
          <input className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none w-44"
            value={event.label} onChange={(e) => upd('label', e.target.value)} />
        </div>
        <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field small label="At age" value={event.age} onChange={(v) => upd('age', v)} min={1} max={100} />
        <Field small label="New annual return" value={event.newAnnualReturn}
          onChange={(v) => upd('newAnnualReturn', v)} suffix="%" step={0.5} max={30}
          hint="Model a conservative glide path as you approach retirement (e.g. switch to 5% at age 55)" />
      </div>
    </div>
  )
}

// ─── Account Form ─────────────────────────────────────────────────────────────

const ACCOUNT_TEMPLATES: {
  name: string
  shortLabel: string
  taxType: AccountTaxType
  annualCap: number | null
  defaultFrequency: ContributionFrequency
  defaultAmount: number
}[] = [
  { name: 'Taxable Brokerage',  shortLabel: 'Taxable',      taxType: 'taxable',   annualCap: null,   defaultFrequency: 'monthly',      defaultAmount: 1_000 },
  { name: 'Traditional 401(k)', shortLabel: 'Trad 401(k)',  taxType: 'pre-tax',   annualCap: 23_500, defaultFrequency: 'semi-monthly', defaultAmount: 979 },
  { name: 'Traditional IRA',    shortLabel: 'Trad IRA',     taxType: 'pre-tax',   annualCap: 7_000,  defaultFrequency: 'monthly',      defaultAmount: 583 },
  { name: 'Roth 401(k)',        shortLabel: 'Roth 401(k)',  taxType: 'roth',      annualCap: 23_500, defaultFrequency: 'semi-monthly', defaultAmount: 979 },
  { name: 'Roth IRA',           shortLabel: 'Roth IRA',     taxType: 'roth',      annualCap: 7_000,  defaultFrequency: 'monthly',      defaultAmount: 583 },
  { name: 'Mega Backdoor Roth', shortLabel: 'Mega Backdoor',taxType: 'roth',      annualCap: 46_500, defaultFrequency: 'monthly',      defaultAmount: 3_875 },
  { name: 'HSA',                shortLabel: 'HSA',          taxType: 'pre-tax',   annualCap: 4_300,  defaultFrequency: 'monthly',      defaultAmount: 358 },
]

const TAX_COLORS: Record<AccountTaxType, string> = {
  taxable:   'bg-slate-100 text-slate-600',
  'pre-tax': 'bg-blue-100 text-blue-700',
  roth:      'bg-violet-100 text-violet-700',
}
const TAX_LABELS: Record<AccountTaxType, string> = {
  taxable: 'Taxable', 'pre-tax': 'Pre-Tax', roth: 'Roth',
}
const TAX_ORDER: AccountTaxType[] = ['taxable', 'pre-tax', 'roth']

function AccountForm({ account, onChange, onDelete }: {
  account: Account
  onChange: (updated: Account) => void
  onDelete: () => void
}) {
  const upd = <K extends keyof Account>(k: K, v: Account[K]) => onChange({ ...account, [k]: v })

  const perYear =
    account.contributionFrequency === 'monthly' ? account.contributionAmount * 12
    : account.contributionFrequency === 'semi-monthly' ? account.contributionAmount * 24
    : account.contributionAmount * 26
  const effectiveMonthly = accountEffectiveMonthly(account)
  const cappedPerYear = effectiveMonthly * 12
  const isCapped = account.annualCap !== null && perYear > account.annualCap

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <div className="flex items-center gap-2">
        <button
          onClick={() => upd('taxType', TAX_ORDER[(TAX_ORDER.indexOf(account.taxType) + 1) % TAX_ORDER.length])}
          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer select-none ${TAX_COLORS[account.taxType]}`}
          title="Click to cycle tax type"
        >
          {TAX_LABELS[account.taxType]}
        </button>
        <input
          className="flex-1 text-sm font-semibold text-slate-800 bg-transparent border-none outline-none min-w-0"
          value={account.name}
          onChange={(e) => upd('name', e.target.value)}
        />
        <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field small label="Current Balance" value={account.currentBalance}
          onChange={(v) => upd('currentBalance', v)} prefix="$" step={1000} />
        <Field small label="Contribution" value={account.contributionAmount}
          onChange={(v) => upd('contributionAmount', v)} prefix="$" step={50} />
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Frequency</label>
          <select className="input py-1.5 text-sm" value={account.contributionFrequency}
            onChange={(e) => upd('contributionFrequency', e.target.value as ContributionFrequency)}>
            <option value="monthly">Monthly (12/yr)</option>
            <option value="semi-monthly">Semi-monthly (24/yr)</option>
            <option value="biweekly">Biweekly (26/yr)</option>
          </select>
        </div>
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
            Annual Cap
            <button
              onClick={() => upd('annualCap', account.annualCap !== null ? null : 23_500)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${account.annualCap !== null ? 'bg-fire-500' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${account.annualCap !== null ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </button>
          </label>
          {account.annualCap !== null ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" className="input pl-7 py-1.5 text-sm"
                value={account.annualCap} min={0} step={500}
                onChange={(e) => upd('annualCap', Number(e.target.value))} />
            </div>
          ) : (
            <div className="input py-1.5 text-sm text-slate-400 bg-slate-100 cursor-default select-none">No cap</div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 pt-0.5">
        Effective: <span className="font-semibold text-slate-700">{formatCurrencyFull(Math.round(effectiveMonthly))}/mo</span>
        {' · '}{formatCurrencyFull(Math.round(cappedPerYear))}/yr
        {isCapped && <span className="text-amber-600 font-medium"> (capped)</span>}
      </p>
    </div>
  )
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

interface TooltipPayload { value: number; dataKey: string; color: string }
function ChartTooltip({ active, payload, label, nominal }: {
  active?: boolean; payload?: TooltipPayload[]; label?: number; nominal?: boolean
}) {
  if (!active || !payload?.length) return null
  const inv = payload.find((p) => p.dataKey === 'investments')
  const p10 = payload.find((p) => p.dataKey === 'mcP10')
  const p50 = payload.find((p) => p.dataKey === 'mcP50')
  const p90 = payload.find((p) => p.dataKey === 'mcP90')
  return (
    <div className="card px-4 py-3 shadow-lg text-sm min-w-[190px]">
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="font-semibold text-slate-800">Age {label}</p>
        {nominal && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">nominal $</span>}
      </div>
      {inv && (
        <div className="flex justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Investments</span>
          </div>
          <span className="font-semibold">{formatCurrency(inv.value)}</span>
        </div>
      )}
      {(p10 || p50 || p90) && (
        <div className="border-t border-slate-100 mt-2 pt-2 space-y-1">
          <p className="text-xs font-semibold text-slate-500">Simulation range</p>
          {p90 && (
            <div className="flex justify-between gap-6">
              <span className="text-slate-400 text-xs">P90 (optimistic)</span>
              <span className="text-xs font-medium text-emerald-600">{formatCurrency(p90.value)}</span>
            </div>
          )}
          {p50 && (
            <div className="flex justify-between gap-6">
              <span className="text-slate-400 text-xs">P50 (median)</span>
              <span className="text-xs font-medium">{formatCurrency(p50.value)}</span>
            </div>
          )}
          {p10 && (
            <div className="flex justify-between gap-6">
              <span className="text-slate-400 text-xs">P10 (pessimistic)</span>
              <span className="text-xs font-medium text-red-400">{formatCurrency(p10.value)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Projection Table ─────────────────────────────────────────────────────────

const PORTFOLIO_MILESTONES = [
  { amount: 100_000,    label: '$100K', bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700' },
  { amount: 250_000,    label: '$250K', bg: 'bg-lime-50',    badge: 'bg-lime-100 text-lime-700' },
  { amount: 500_000,    label: '$500K', bg: 'bg-teal-50',    badge: 'bg-teal-100 text-teal-700' },
  { amount: 1_000_000,  label: '$1M',   bg: 'bg-yellow-50',  badge: 'bg-yellow-100 text-yellow-700' },
  { amount: 2_500_000,  label: '$2.5M', bg: 'bg-sky-50',     badge: 'bg-sky-100 text-sky-700' },
  { amount: 5_000_000,  label: '$5M',   bg: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-700' },
  { amount: 10_000_000, label: '$10M',  bg: 'bg-pink-50',    badge: 'bg-pink-100 text-pink-700' },
]

function ProjectionTable({ result, withdrawalRate, annualExpenses, retirementAge, coast, regular, nominal, inflationRate, currentAge, selectedAccountId }: {
  result: FireResult
  withdrawalRate: number
  annualExpenses: number
  retirementAge: number
  coast: Milestone
  regular: Milestone
  nominal: boolean
  inflationRate: number
  currentAge: number
  selectedAccountId: string | null
}) {
  const projections = selectedAccountId
    ? (result.accountProjections[selectedAccountId] ?? result.projections)
    : result.projections
  const { fiNumber } = result

  const factor = (age: number) =>
    nominal ? Math.pow(1 + inflationRate / 100, age - currentAge) : 1

  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <tr>
            <th className="text-left font-semibold text-slate-500 px-3 py-2 w-12">Age</th>
            <th className="text-right font-semibold text-slate-500 px-3 py-2">
              {selectedAccountId ? 'Account Balance' : 'Portfolio'}
              {nominal && <span className="font-normal text-amber-500 ml-1">(nom.)</span>}
            </th>
            <th className="text-right font-semibold text-slate-500 px-3 py-2 hidden sm:table-cell">
              Withdrawal/yr <span className="font-normal text-slate-400">@ {withdrawalRate}%</span>
            </th>
            <th className="text-right font-semibold text-slate-500 px-3 py-2">% to FI</th>
            <th className="text-left font-semibold text-slate-500 px-3 py-2">Milestone</th>
          </tr>
        </thead>
        <tbody>
          {projections.map((p, i) => {
            const prev = projections[i - 1]
            const displayInv = Math.round(p.investments * factor(p.age))
            const portfolioMs = PORTFOLIO_MILESTONES.find(
              (m) => p.investments >= m.amount && (!prev || prev.investments < m.amount),
            )
            const isCoast = !selectedAccountId && coast.age !== null && p.age === coast.age
            const isFire = !selectedAccountId && regular.age !== null && p.age === regular.age
            const isRetirement = !selectedAccountId && p.age === retirementAge && !isFire

            const pct = fiNumber > 0 ? (p.investments / fiNumber) * 100 : 0
            const withdrawal = displayInv * (withdrawalRate / 100)
            const coveragePct = annualExpenses > 0 ? (withdrawal / (annualExpenses * factor(p.age))) * 100 : 0

            const rowBg = isFire
              ? 'bg-emerald-50'
              : isCoast
              ? 'bg-blue-50'
              : portfolioMs
              ? portfolioMs.bg
              : i % 2 === 0 ? '' : 'bg-slate-50/50'

            return (
              <tr key={p.age} className={`border-b border-slate-50 ${rowBg}`}>
                <td className="px-3 py-1.5 font-medium text-slate-600">{p.age}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{formatCurrency(displayInv)}</td>
                <td className="px-3 py-1.5 text-right hidden sm:table-cell">
                  <span className={coveragePct >= 100 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
                    {formatCurrency(withdrawal)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right text-slate-500">{Math.min(999, Math.round(pct))}%</td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {portfolioMs && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${portfolioMs.badge}`}>
                        {portfolioMs.label}
                      </span>
                    )}
                    {isCoast && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                        CoastFIRE ✓
                      </span>
                    )}
                    {isFire && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        FIRE ✓
                      </span>
                    )}
                    {isRetirement && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Retire
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FireCalculator() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_INPUTS)
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [nominal, setNominal] = useState(false)
  const [inflationRate, setInflationRate] = useState(3)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('snapshot')
    if (!id) return
    getSnapshot(id)
      .then((snap) => {
        setInputs(snap.inputs as unknown as FireInputs)
        setSnapshotId(snap.id)
      })
      .catch(() => { /* fall through to defaults */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FireInputs>(key: K, value: FireInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const addEvent = (type: OneTimeEvent['type']) => {
    const id = genId()
    const age = inputs.currentAge + 5
    const event: OneTimeEvent =
      type === 'home_purchase'
        ? { id, type, age, label: 'Buy a Home', downpayment: 80_000, monthlyContribReduction: 500 }
        : type === 'windfall'
        ? { id, type, age, label: 'Inheritance / Windfall', amount: 50_000 }
        : type === 'contribution_change'
        ? { id, type, age, label: 'Change Contribution', newMonthlyAmount: 0 }
        : { id, type, age, label: 'Change Return Rate', newAnnualReturn: 5 }
    set('events', [...inputs.events, event])
  }

  const updateEvent = (updated: OneTimeEvent) =>
    set('events', inputs.events.map((e) => (e.id === updated.id ? updated : e)))

  const deleteEvent = (id: string) =>
    set('events', inputs.events.filter((e) => e.id !== id))

  const addAccount = (template: typeof ACCOUNT_TEMPLATES[number]) => {
    const account: Account = {
      id: genId(),
      name: template.name,
      taxType: template.taxType,
      currentBalance: 0,
      contributionAmount: template.defaultAmount,
      contributionFrequency: template.defaultFrequency,
      annualCap: template.annualCap,
    }
    set('accounts', [...inputs.accounts, account])
  }

  const updateAccount = (updated: Account) =>
    set('accounts', inputs.accounts.map((a) => (a.id === updated.id ? updated : a)))

  const deleteAccount = (id: string) => {
    if (selectedAccountId === id) setSelectedAccountId(null)
    set('accounts', inputs.accounts.filter((a) => a.id !== id))
  }

  const result: FireResult = useMemo(() => calculateFire(inputs), [inputs])

  const chartData = useMemo(() => {
    const projections = selectedAccountId
      ? (result.accountProjections[selectedAccountId] ?? result.projections)
      : result.projections

    const milestoneAges = Object.values(result.milestones).map((m) => m.age).filter((a): a is number => a !== null)
    const cap = Math.max(
      inputs.currentAge + 20,
      ...milestoneAges.map((a) => a + 5),
      inputs.retirementAge + 3,
    )
    const bandMap = !selectedAccountId && result.monteCarloResult
      ? new Map(result.monteCarloResult.bands.map((b) => [b.age, b]))
      : null

    const f = (age: number) => nominal ? Math.pow(1 + inflationRate / 100, age - inputs.currentAge) : 1

    return projections
      .filter((p) => p.age <= Math.min(cap, inputs.currentAge + 55))
      .map((p) => {
        const band = bandMap?.get(p.age)
        const scale = f(p.age)
        return {
          age: p.age,
          investments: Math.round(p.investments * scale),
          mcOffset: band ? Math.round(band.p10 * scale) : undefined,
          mcSpread: band ? Math.round((band.p90 - band.p10) * scale) : undefined,
          mcMidOffset: band ? Math.round(band.p25 * scale) : undefined,
          mcMidSpread: band ? Math.round((band.p75 - band.p25) * scale) : undefined,
          mcP10: band ? Math.round(band.p10 * scale) : undefined,
          mcP50: band ? Math.round(band.p50 * scale) : undefined,
          mcP90: band ? Math.round(band.p90 * scale) : undefined,
          nominalFiTarget: !selectedAccountId && nominal
            ? Math.round(result.fiNumber * scale)
            : undefined,
        }
      })
  }, [result, inputs.currentAge, inputs.retirementAge, selectedAccountId, nominal, inflationRate])

  const { coast, regular } = result.milestones

  const yMax = useMemo(() => {
    const last = chartData.at(-1)
    const maxData = Math.max(
      last?.investments ?? 0,
      last?.mcP90 ?? 0,
      last?.nominalFiTarget ?? 0,
    )
    const fiTarget = nominal
      ? result.fiNumber * Math.pow(1 + inflationRate / 100, Math.max(0, inputs.retirementAge - inputs.currentAge))
      : result.fiNumber
    return Math.max(maxData, fiTarget) * 1.3
  }, [chartData, result.fiNumber, nominal, inflationRate, inputs.retirementAge, inputs.currentAge])

  const totalBalance = inputs.accounts.reduce((s, a) => s + a.currentBalance, 0)
  const totalMonthly = inputs.accounts.reduce((s, a) => s + accountEffectiveMonthly(a), 0)

  const mc = result.monteCarloResult
  const mcColor = mc
    ? mc.successRate >= 80
      ? { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' }
      : mc.successRate >= 60
      ? { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600' }
      : { bg: 'bg-red-50 border-red-200', text: 'text-red-600' }
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">FIRE Calculator</h1>
        <p className="text-slate-500 mt-1">Every input updates the projection instantly.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* ── LEFT: Inputs ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Timeline */}
          <InputCard icon={TrendingUp} title="Timeline" color="bg-fire-50 text-fire-600">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Age" value={inputs.currentAge} onChange={(v) => set('currentAge', v)} min={18} max={80} />
              <Field label="Retire By" value={inputs.retirementAge} onChange={(v) => set('retirementAge', v)} min={18} max={100}
                hint="Used to calculate CoastFIRE number and monthly contribution needed by target date" />
            </div>
          </InputCard>

          {/* Investment Accounts */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-fire-50 text-fire-600">
                  <TrendingUp size={14} />
                </div>
                <p className="text-sm font-semibold text-slate-800">Investment Accounts</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total Portfolio</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrencyFull(totalBalance)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 -mt-2">
              Trad 401(k), IRA, brokerage — accounts that compound toward your FIRE number. All use the same expected return.
            </p>

            {inputs.accounts.length > 0 && (
              <div className="space-y-3">
                {inputs.accounts.map((account) => (
                  <AccountForm key={account.id} account={account}
                    onChange={updateAccount} onDelete={() => deleteAccount(account.id)} />
                ))}
              </div>
            )}

            {inputs.accounts.length > 1 && (
              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                <span className="text-slate-500">Total contribution</span>
                <span className="font-semibold text-slate-700">{formatCurrencyFull(Math.round(totalMonthly))}/mo · {formatCurrencyFull(Math.round(totalMonthly * 12))}/yr</span>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Add account</p>
              <div className="grid grid-cols-4 gap-1.5">
                {ACCOUNT_TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => addAccount(t)}
                    className="flex items-center justify-center gap-1 h-8 text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 rounded-lg hover:bg-slate-200 transition-colors leading-tight text-center">
                    <Plus size={9} className="shrink-0" />
                    <span className="truncate">{t.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Expenses */}
          <InputCard icon={Home} title="Retirement Expenses" color="bg-violet-50 text-violet-600">
            <Field label="Annual spending in retirement" value={inputs.annualExpenses}
              onChange={(v) => set('annualExpenses', v)} prefix="$" step={1000}
              hint="Your expected annual spending once retired (today's dollars). Want FatFIRE? Just input higher expenses." />
          </InputCard>

          {/* Assumptions + Monte Carlo */}
          <InputCard icon={Info} title="Assumptions" color="bg-slate-100 text-slate-500">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expected Return" value={inputs.expectedAnnualReturn}
                onChange={(v) => set('expectedAnnualReturn', v)} suffix="%" step={0.5} max={30}
                hint="~7% is the common inflation-adjusted estimate for a broad index fund (S&P 500 avg ~10% nominal)" />
              <Field label="Withdrawal Rate" value={inputs.withdrawalRate}
                onChange={(v) => set('withdrawalRate', v)} suffix="%" step={0.25} min={1} max={10}
                hint="4% is the classic safe withdrawal rate (25x rule). Use 3.5% for extra safety, 3% for 50+ year retirements." />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Monte Carlo</p>
                  <p className="text-xs text-slate-400 mt-0.5">Simulate 1,000 market scenarios</p>
                </div>
                <button
                  onClick={() => set('monteCarloEnabled', !inputs.monteCarloEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    inputs.monteCarloEnabled ? 'bg-fire-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    inputs.monteCarloEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {inputs.monteCarloEnabled && (
                <Field label="Return Volatility (Std Dev)" value={inputs.returnStdDev}
                  onChange={(v) => set('returnStdDev', v)} suffix="%" step={0.5} min={0} max={50}
                  hint="S&P 500 historical std dev ≈ 15–18%. Higher = wider outcome range shown on chart." />
              )}
            </div>
          </InputCard>

          {/* Life Events */}
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Life Events</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['home_purchase', 'Home Purchase', 'hover:text-fire-600 hover:bg-fire-50'],
                ['windfall', 'Windfall', 'hover:text-violet-600 hover:bg-violet-50'],
                ['contribution_change', 'Change Contribution', 'hover:text-sky-600 hover:bg-sky-50'],
                ['return_change', 'Change Return', 'hover:text-amber-600 hover:bg-amber-50'],
              ] as const).map(([type, label, hover]) => (
                <button key={type} onClick={() => addEvent(type)}
                  className={`flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors ${hover}`}>
                  <Plus size={12} /> {label}
                </button>
              ))}
            </div>

            {inputs.events.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">
                Add events to see their impact — home purchases, windfalls, contribution changes, or return shifts.
              </p>
            ) : (
              <div className="space-y-3">
                {inputs.events.map((event) => {
                  if (event.type === 'home_purchase')
                    return <HomePurchaseForm key={event.id} event={event} onChange={(u) => updateEvent(u)} onDelete={() => deleteEvent(event.id)} />
                  if (event.type === 'windfall')
                    return <WindfallForm key={event.id} event={event} onChange={(u) => updateEvent(u)} onDelete={() => deleteEvent(event.id)} />
                  if (event.type === 'contribution_change')
                    return <ContributionChangeForm key={event.id} event={event} onChange={(u) => updateEvent(u)} onDelete={() => deleteEvent(event.id)} />
                  return <ReturnChangeForm key={event.id} event={event} onChange={(u) => updateEvent(u)} onDelete={() => deleteEvent(event.id)} />
                })}
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              localStorage.setItem('mf_last_result', JSON.stringify({ result, fireType: 'regular' }))
              setSaveError(false)
              if (user) {
                const summaryData = {
                  fiNumber: result.fiNumber,
                  fireAge: result.fireAge,
                  yearsToFire: result.yearsToFire,
                  progressPercentage: result.progressPercentage,
                  coastFireNumber: result.coastFireNumber,
                  isAlreadyFi: result.isAlreadyFi,
                }
                try {
                  if (snapshotId) {
                    await updateSnapshot(snapshotId, {
                      inputs: inputs as unknown as Record<string, unknown>,
                      summary: summaryData,
                    })
                  } else {
                    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    await saveSnapshot('fire', `FIRE Plan — ${date}`, inputs as unknown as Record<string, unknown>, summaryData)
                  }
                } catch {
                  setSaveError(true)
                  setTimeout(() => setSaveError(false), 3000)
                  return
                }
              }
              setSaved(true)
              setTimeout(() => setSaved(false), 3000)
            }}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 flex items-center justify-center gap-2 ${
              saved ? 'bg-fire-50 border-fire-200 text-fire-700' : saveError ? 'bg-red-50 border-red-200 text-red-700' : 'btn-secondary'
            }`}
          >
            {saved ? <CheckCircle size={14} /> : null}
            {saved
              ? (snapshotId ? 'Updated' : 'Saved to dashboard')
              : saveError
              ? 'Save failed — try again'
              : (snapshotId ? 'Update snapshot' : 'Save to dashboard')}
          </button>
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Milestone cards */}
          <div className="grid grid-cols-2 gap-3">
            <MilestoneCard m={coast} currentInvestments={totalBalance} currentAge={inputs.currentAge} />
            <MilestoneCard m={regular} currentInvestments={totalBalance} currentAge={inputs.currentAge} />
          </div>

          {/* Monte Carlo success rate */}
          {mc && mcColor && (
            <div className={`card p-4 flex items-center justify-between border ${mcColor.bg}`}>
              <div>
                <p className="text-sm font-semibold text-slate-700">Monte Carlo Success Rate</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  1,000 simulations · ±{inputs.returnStdDev}% annual return volatility
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${mcColor.text}`}>{mc.successRate}%</p>
                <p className="text-xs text-slate-400">reach FIRE by {inputs.retirementAge}</p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="card p-5 pb-4">
            {/* Chart header: title + nominal/real toggle */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Portfolio Projection</h2>
              <div className="flex items-center gap-2">
                {nominal && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span>Inflation</span>
                    <input
                      type="number" value={inflationRate} min={0} max={20} step={0.5}
                      onChange={(e) => setInflationRate(Number(e.target.value))}
                      className="w-12 text-xs text-center border border-slate-200 rounded px-1 py-0.5 bg-white"
                    />
                    <span>%/yr</span>
                  </div>
                )}
                <button
                  onClick={() => setNominal((v) => !v)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    nominal ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {nominal ? 'Nominal $' : 'Real $'}
                </button>
              </div>
            </div>

            {/* Account selector tabs */}
            {inputs.accounts.length > 1 && (
              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  onClick={() => setSelectedAccountId(null)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    !selectedAccountId ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  All accounts
                </button>
                {inputs.accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      selectedAccountId === acc.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            )}

            <ResponsiveContainer width="100%" height={440}>
              <ComposedChart data={chartData} margin={{ top: 16, right: 12, left: 8, bottom: 24 }}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false} axisLine={false}
                  label={{ value: 'Age', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, yMax]} width={66}
                  tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)} />

                <Tooltip content={(props: any) => <ChartTooltip {...props} nominal={nominal} />} />

                {/* FIRE milestone reference lines (real-dollar targets) — shown in all modes */}
                {!selectedAccountId && [coast, regular].map((m) => (
                  <ReferenceLine key={m.label} y={m.fiNumber} stroke={m.color}
                    strokeDasharray="6 4" strokeWidth={1.5} />
                ))}

                {/* Monte Carlo bands */}
                {!selectedAccountId && mc && (
                  <>
                    <Area stackId="mc" type="monotone" dataKey="mcOffset"
                      fillOpacity={0} stroke="none" dot={false} legendType="none" activeDot={false} />
                    <Area stackId="mc" type="monotone" dataKey="mcSpread"
                      fill="#10b981" fillOpacity={0.08} stroke="#10b981" strokeWidth={0.5} strokeOpacity={0.15}
                      dot={false} legendType="none" activeDot={false} />
                    <Area stackId="mc2" type="monotone" dataKey="mcMidOffset"
                      fillOpacity={0} stroke="none" dot={false} legendType="none" activeDot={false} />
                    <Area stackId="mc2" type="monotone" dataKey="mcMidSpread"
                      fill="#10b981" fillOpacity={0.16} stroke="none"
                      dot={false} legendType="none" activeDot={false} />
                    <Line type="monotone" dataKey="mcP90" stroke="#86efac" strokeWidth={1.5} strokeOpacity={0.7}
                      dot={false} strokeDasharray="4 3" legendType="none" activeDot={false} />
                    <Line type="monotone" dataKey="mcP50" stroke="#34d399" strokeWidth={1.5} strokeOpacity={0.8}
                      dot={false} strokeDasharray="5 2" legendType="none" activeDot={false} />
                    <Line type="monotone" dataKey="mcP10" stroke="#fca5a5" strokeWidth={1.5} strokeOpacity={0.7}
                      dot={false} strokeDasharray="4 3" legendType="none" activeDot={false} />
                  </>
                )}

                {/* Nominal FI target line — growing dashed line showing inflation-adjusted target */}
                {nominal && !selectedAccountId && (
                  <Line type="monotone" dataKey="nominalFiTarget" stroke="#f59e0b" strokeWidth={1.5}
                    strokeDasharray="5 3" dot={false} legendType="none" activeDot={false} />
                )}

                {/* Vertical age markers where milestones are crossed */}
                {!selectedAccountId && [coast, regular].map((m) =>
                  m.age !== null && m.age > inputs.currentAge ? (
                    <ReferenceLine key={`v-${m.label}`} x={m.age}
                      stroke={m.color} strokeWidth={1} strokeOpacity={0.35} />
                  ) : null
                )}

                {/* Life event vertical markers */}
                {inputs.events.map((event) => (
                  <ReferenceLine key={`ev-${event.id}`} x={event.age}
                    stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{
                      value: event.type === 'home_purchase' ? '🏠'
                           : event.type === 'windfall' ? '💰'
                           : event.type === 'contribution_change' ? '💸'
                           : '📈',
                      position: 'top',
                      fontSize: 14,
                    }}
                  />
                ))}

                {/* Retirement age marker */}
                <ReferenceLine x={inputs.retirementAge} stroke="#cbd5e1" strokeWidth={1}
                  label={{ value: 'Retire', position: 'top', fill: '#94a3b8', fontSize: 10 }} />

                {/* Investment area */}
                <Area type="monotone" dataKey="investments" stroke="#10b981"
                  strokeWidth={2.5} fill="url(#invGrad)" dot={false}
                  activeDot={{ r: 4, fill: '#059669', strokeWidth: 0 }} legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-8 h-3 rounded-sm bg-fire-400 opacity-70" />
                <span>{selectedAccountId ? inputs.accounts.find(a => a.id === selectedAccountId)?.name ?? 'Account' : 'Investments'}</span>
              </div>
              {!selectedAccountId && [coast, regular].map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-8 border-t-2 border-dashed" style={{ borderColor: m.color }} />
                  <span>{m.label} <span className="text-slate-400">({formatCurrency(m.fiNumber)} real)</span></span>
                </div>
              ))}
              {nominal && !selectedAccountId && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-8 border-t-2 border-dashed border-amber-400" />
                  <span className="text-amber-600">FI target (nominal)</span>
                </div>
              )}
              {!selectedAccountId && mc && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-8 border-t-2 border-dashed border-emerald-400" />
                  <span className="text-slate-400">P10 / P50 / P90</span>
                </div>
              )}
              {inputs.events.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-8 border-t border-dashed border-slate-400" />
                  <span>Life event</span>
                </div>
              )}
              {nominal && (
                <div className="text-xs text-amber-600 font-medium ml-auto">
                  Nominal · {inflationRate}% inflation
                </div>
              )}
            </div>
          </div>

          {/* Key numbers */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Key Numbers <span className="text-xs font-normal text-slate-400">(real dollars)</span></h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[
                ['FI Number', formatCurrencyFull(result.fiNumber)],
                ['FIRE Age', result.fireAge ? `Age ${result.fireAge}` : '—'],
                ['Progress toward FI', `${result.progressPercentage}%`],
                ['Years to FIRE', result.yearsToFire !== null ? `${result.yearsToFire} yrs` : '—'],
                ['CoastFIRE number', formatCurrencyFull(result.coastFireNumber)],
                ['Current monthly contribution', formatCurrencyFull(Math.round(totalMonthly))],
                ['Monthly needed for target', result.monthlyNeededForTarget !== null ? formatCurrencyFull(result.monthlyNeededForTarget) : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 col-span-1">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-900 ml-2">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Year-by-year projection table */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowTable((v) => !v)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="text-left">
                <h2 className="text-sm font-semibold text-slate-700">Year-by-Year Projection</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedAccountId
                    ? `${inputs.accounts.find(a => a.id === selectedAccountId)?.name ?? 'Account'} · individual view`
                    : 'Portfolio growth with milestone markers'
                  }
                  {nominal ? ' · nominal $' : ' · real $'}
                </p>
              </div>
              <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${showTable ? 'rotate-180' : ''}`} />
            </button>
            {showTable && (
              <div className="border-t border-slate-100">
                <ProjectionTable
                  result={result}
                  withdrawalRate={inputs.withdrawalRate}
                  annualExpenses={inputs.annualExpenses}
                  retirementAge={inputs.retirementAge}
                  coast={coast}
                  regular={regular}
                  nominal={nominal}
                  inflationRate={inflationRate}
                  currentAge={inputs.currentAge}
                  selectedAccountId={selectedAccountId}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center pb-2">
        Projections assume constant real returns with monthly compounding. Events fire at the start of the specified age.
        Monte Carlo uses Box-Muller normal sampling around your expected return. Not financial advice.
      </p>
    </div>
  )
}
