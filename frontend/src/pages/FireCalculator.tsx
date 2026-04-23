import { CheckCircle, Home, Info, Plus, Trash2, TrendingUp, Wallet, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import type { FireInputs, FireResult, HomePurchaseEvent, Milestone, OneTimeEvent, WindfallEvent } from '../types'
import { calculateFire, formatCurrency, formatCurrencyFull } from '../utils/fireCalculations'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: FireInputs = {
  currentAge: 30,
  retirementAge: 65,
  currentSavings: 15_000,
  savingsGrowthRate: 4.5,
  currentInvestments: 50_000,
  contributionAmount: 2_000,
  contributionFrequency: 'monthly',
  annualExpenses: 60_000,
  expectedAnnualReturn: 7,
  withdrawalRate: 4,
  events: [],
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
        {hint && (
          <span className="group relative inline-flex">
            <Info size={11} className="text-slate-400 cursor-help" />
            <span className="pointer-events-none absolute bottom-5 left-0 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-2 w-56 opacity-0 group-hover:opacity-100 transition-opacity z-20 leading-relaxed">
              {hint}
            </span>
          </span>
        )}
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

// ─── EventForm ────────────────────────────────────────────────────────────────

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
          <input
            className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none w-40"
            value={event.label}
            onChange={(e) => upd('label', e.target.value)}
          />
        </div>
        <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field small label="At age" value={event.age} onChange={(v) => upd('age', v)} min={1} max={100} />
        <Field small label="Downpayment" value={event.downpayment} onChange={(v) => upd('downpayment', v)} prefix="$" step={1000} />
        <Field
          small label="Invest. reduction/mo" value={event.monthlyContribReduction}
          onChange={(v) => upd('monthlyContribReduction', v)} prefix="$" step={50}
          hint="How much less you'll invest monthly after the purchase (e.g. mortgage minus what you paid in rent)"
        />
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Down payment from</label>
          <select
            className="input py-1.5 text-sm"
            value={event.source}
            onChange={(e) => upd('source', e.target.value as HomePurchaseEvent['source'])}
          >
            <option value="savings">Savings</option>
            <option value="investments">Investments</option>
          </select>
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
          <input
            className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none w-40"
            value={event.label}
            onChange={(e) => upd('label', e.target.value)}
          />
        </div>
        <button onClick={onDelete} className="text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field small label="At age" value={event.age} onChange={(v) => upd('age', v)} min={1} max={100} />
        <Field small label="Amount" value={event.amount} onChange={(v) => upd('amount', v)} prefix="$" step={1000} />
        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-700 mb-1 block">Add to</label>
          <select
            className="input py-1.5 text-sm"
            value={event.destination}
            onChange={(e) => upd('destination', e.target.value as WindfallEvent['destination'])}
          >
            <option value="investments">Investments</option>
            <option value="savings">Savings</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

interface TooltipPayload { value: number; dataKey: string; color: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: number }) {
  if (!active || !payload?.length) return null
  const inv = payload.find((p) => p.dataKey === 'investments')
  const sav = payload.find((p) => p.dataKey === 'savings')
  return (
    <div className="card px-4 py-3 shadow-lg text-sm min-w-[180px]">
      <p className="font-semibold text-slate-800 mb-2">Age {label}</p>
      {inv && (
        <div className="flex justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-fire-500" />
            <span className="text-slate-600">Investments</span>
          </div>
          <span className="font-semibold">{formatCurrency(inv.value)}</span>
        </div>
      )}
      {sav && (
        <div className="flex justify-between gap-6 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-slate-600">Savings</span>
          </div>
          <span className="font-semibold">{formatCurrency(sav.value)}</span>
        </div>
      )}
      {inv && sav && (
        <div className="flex justify-between gap-6 mt-1 border-t border-slate-100 pt-1">
          <span className="text-slate-500">Total</span>
          <span className="font-semibold">{formatCurrency(inv.value + sav.value)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FireCalculator() {
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_INPUTS)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof FireInputs>(key: K, value: FireInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const addEvent = (type: OneTimeEvent['type']) => {
    const base = { id: genId(), age: inputs.currentAge + 5, label: type === 'home_purchase' ? 'Buy a Home' : 'Inheritance / Windfall' }
    const event: OneTimeEvent =
      type === 'home_purchase'
        ? { ...base, type, downpayment: 80_000, monthlyContribReduction: 500, source: 'savings' }
        : { ...base, type, amount: 50_000, destination: 'investments' }
    set('events', [...inputs.events, event])
  }

  const updateEvent = (updated: OneTimeEvent) =>
    set('events', inputs.events.map((e) => (e.id === updated.id ? updated : e)))

  const deleteEvent = (id: string) =>
    set('events', inputs.events.filter((e) => e.id !== id))

  const result: FireResult = useMemo(() => calculateFire(inputs), [inputs])

  // Chart window: from currentAge to furthest milestone + 5, capped at 55yr range
  const chartData = useMemo(() => {
    const milestoneAges = Object.values(result.milestones).map((m) => m.age).filter((a): a is number => a !== null)
    const cap = Math.max(
      inputs.currentAge + 20,
      ...milestoneAges.map((a) => a + 5),
      inputs.retirementAge + 3,
    )
    return result.projections
      .filter((p) => p.age <= Math.min(cap, inputs.currentAge + 55))
      .map((p) => ({ age: p.age, investments: p.investments, savings: p.savings }))
  }, [result, inputs.currentAge, inputs.retirementAge])

  const { coast, regular} = result.milestones

  const yMax = Math.max(
    regular.fiNumber * 1.08,
    chartData.at(-1)?.investments ?? 0,
  )

  const biweeklyEquiv = inputs.contributionFrequency === 'biweekly'
    ? inputs.contributionAmount * 26 / 12
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">FIRE Calculator</h1>
        <p className="text-slate-500 mt-1">Every input updates the projection instantly.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* ── LEFT: Inputs (2 cols) ──────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Timeline */}
          <InputCard icon={TrendingUp} title="Timeline" color="bg-fire-50 text-fire-600">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Age" value={inputs.currentAge} onChange={(v) => set('currentAge', v)} min={18} max={80} />
              <Field label="Retire By" value={inputs.retirementAge} onChange={(v) => set('retirementAge', v)} min={18} max={100}
                hint="Used to calculate CoastFIRE number and monthly contribution needed by target date" />
            </div>
          </InputCard>

          {/* Savings */}
          <InputCard icon={Wallet} title="Savings / Emergency Fund" color="bg-sky-50 text-sky-600">
            <p className="text-xs text-slate-500 -mt-2">
              Liquid savings (HYSA, etc.) — grows separately and is <strong>not</strong> counted toward your FIRE number.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Balance" value={inputs.currentSavings} onChange={(v) => set('currentSavings', v)}
                prefix="$" step={1000} />
              <Field label="Growth Rate" value={inputs.savingsGrowthRate} onChange={(v) => set('savingsGrowthRate', v)}
                suffix="%" step={0.1} max={20}
                hint="Annual yield on your savings account (e.g. 4–5% for a high-yield savings account)" />
            </div>
          </InputCard>

          {/* Investments */}
          <InputCard icon={TrendingUp} title="Investments" color="bg-fire-50 text-fire-600">
            <p className="text-xs text-slate-500 -mt-2">
              Your FIRE portfolio — 401k, IRA, brokerage. This is what FIRE milestones measure against.
            </p>
            <Field label="Current Portfolio" value={inputs.currentInvestments} onChange={(v) => set('currentInvestments', v)}
              prefix="$" step={1000} />

            {/* Contribution with frequency toggle */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Contribution</label>
              <div className="flex border border-slate-200 rounded-lg overflow-hidden mb-2">
                {(['monthly', 'biweekly'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => set('contributionFrequency', f)}
                    className={`flex-1 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      inputs.contributionFrequency === f
                        ? 'bg-fire-500 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  className="input pl-7"
                  value={inputs.contributionAmount}
                  min={0}
                  step={100}
                  onChange={(e) => set('contributionAmount', Number(e.target.value))}
                />
              </div>
              {biweeklyEquiv !== null && (
                <p className="text-xs text-slate-400 mt-1.5">
                  ≈ {formatCurrencyFull(biweeklyEquiv)}/mo &middot; {formatCurrencyFull(inputs.contributionAmount * 26)}/yr
                </p>
              )}
            </div>
          </InputCard>

          {/* Expenses */}
          <InputCard icon={Home} title="Retirement Expenses" color="bg-violet-50 text-violet-600">
            <Field label="Annual spending in retirement" value={inputs.annualExpenses}
              onChange={(v) => set('annualExpenses', v)}
              prefix="$" step={1000}
              hint="Your expected annual spending once retired (today's dollars)." />
            <div className="grid grid-cols-2 gap-2 pt-1">
            </div>
          </InputCard>

          {/* Assumptions */}
          <InputCard icon={Info} title="Assumptions" color="bg-slate-100 text-slate-500">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expected Return" value={inputs.expectedAnnualReturn}
                onChange={(v) => set('expectedAnnualReturn', v)} suffix="%" step={0.5} max={30}
                hint="~7% is the common inflation-adjusted estimate for a broad index fund (S&P 500 avg ~10% nominal)" />
              <Field label="Withdrawal Rate" value={inputs.withdrawalRate}
                onChange={(v) => set('withdrawalRate', v)} suffix="%" step={0.25} min={1} max={10}
                hint="4% is the classic safe withdrawal rate (25x rule). Use 3.5% for extra safety, 3% for 50+ year retirements." />
            </div>
          </InputCard>

          {/* Life Events */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Life Events</p>
              <div className="flex gap-2">
                <button
                  onClick={() => addEvent('home_purchase')}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-fire-600 bg-slate-100 hover:bg-fire-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Home Purchase
                </button>
                <button
                  onClick={() => addEvent('windfall')}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-violet-600 bg-slate-100 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Windfall
                </button>
              </div>
            </div>

            {inputs.events.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">
                Add events like a home purchase or inheritance to see their impact on the projection.
              </p>
            ) : (
              <div className="space-y-3">
                {inputs.events.map((event) =>
                  event.type === 'home_purchase' ? (
                    <HomePurchaseForm
                      key={event.id}
                      event={event}
                      onChange={(u) => updateEvent(u)}
                      onDelete={() => deleteEvent(event.id)}
                    />
                  ) : (
                    <WindfallForm
                      key={event.id}
                      event={event}
                      onChange={(u) => updateEvent(u)}
                      onDelete={() => deleteEvent(event.id)}
                    />
                  )
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              localStorage.setItem('mf_last_result', JSON.stringify({ result, fireType: 'regular' }))
              setSaved(true)
              setTimeout(() => setSaved(false), 3000)
            }}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 flex items-center justify-center gap-2 ${
              saved ? 'bg-fire-50 border-fire-200 text-fire-700' : 'btn-secondary'
            }`}
          >
            {saved ? <CheckCircle size={14} /> : null}
            {saved ? 'Saved to dashboard' : 'Save to dashboard'}
          </button>
        </div>

        {/* ── RIGHT: Results (3 cols) ────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Milestone cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MilestoneCard m={coast} currentInvestments={inputs.currentInvestments} currentAge={inputs.currentAge} />
            <MilestoneCard m={regular} currentInvestments={inputs.currentInvestments} currentAge={inputs.currentAge} />
          </div>

          {/* Savings vs Investments strip */}
          <div className="card p-4 grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Current Investments', value: inputs.currentInvestments, color: 'text-fire-600' },
              { label: 'Current Savings', value: inputs.currentSavings, color: 'text-sky-600' },
              { label: 'Total Net Worth', value: inputs.currentInvestments + inputs.currentSavings, color: 'text-slate-900' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card p-5 pb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Portfolio Projection</h2>

            {/* External legend — no inline chart labels */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-8 h-3 rounded-sm bg-fire-400 opacity-70" />
                <span>Investments</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-8 border-t-2 border-sky-400" />
                <span>Savings</span>
              </div>
              {[coast, regular].map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-8 border-t-2 border-dashed" style={{ borderColor: m.color }} />
                  <span>{m.label} <span className="text-slate-400">({formatCurrency(m.fiNumber)})</span></span>
                </div>
              ))}
              {inputs.events.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-8 border-t border-dashed border-slate-400" />
                  <span>Life event</span>
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={440}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 24 }}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                <XAxis
                  dataKey="age" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false} axisLine={false}
                  label={{ value: 'Age', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, yMax]} width={66}
                  tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />

                <Tooltip content={<ChartTooltip />} />

                {/* FIRE milestone reference lines — color coded, no labels */}
                {[coast, regular].map((m) => (
                  <ReferenceLine key={m.label} y={m.fiNumber} stroke={m.color}
                    strokeDasharray="6 4" strokeWidth={1.5} />
                ))}

                {/* Vertical age markers where milestones are crossed */}
                {[coast, regular].map((m) =>
                  m.age !== null && m.age > inputs.currentAge ? (
                    <ReferenceLine key={`v-${m.label}`} x={m.age}
                      stroke={m.color} strokeWidth={1} strokeOpacity={0.35} />
                  ) : null
                )}

                {/* Life event vertical markers */}
                {inputs.events.map((event) => (
                  <ReferenceLine
                    key={`ev-${event.id}`}
                    x={event.age}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: event.type === 'home_purchase' ? '🏠' : '💰',
                      position: 'top',
                      fontSize: 14,
                    }}
                  />
                ))}

                {/* Retirement age marker */}
                <ReferenceLine
                  x={inputs.retirementAge}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  label={{ value: 'Retire', position: 'top', fill: '#94a3b8', fontSize: 10 }}
                />

                {/* Savings line */}
                <Line
                  type="monotone" dataKey="savings" stroke="#38bdf8"
                  strokeWidth={1.5} dot={false} activeDot={false}
                />

                {/* Investment area — drawn on top */}
                <Area
                  type="monotone" dataKey="investments" stroke="#10b981"
                  strokeWidth={2.5} fill="url(#invGrad)" dot={false}
                  activeDot={{ r: 4, fill: '#059669', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Key numbers */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Key Numbers</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[
                ['FI Number (target)', formatCurrencyFull(result.fiNumber)],
                ['Progress toward FI', `${result.progressPercentage}%`],
                ['CoastFIRE number', formatCurrencyFull(result.coastFireNumber)],
                ['Monthly to investments', formatCurrencyFull(result.effectiveMonthlyContrib)],
                ['Monthly needed for target', result.monthlyNeededForTarget !== null ? formatCurrencyFull(result.monthlyNeededForTarget) : '—'],
                ['Regular FI Number', formatCurrencyFull(regular.fiNumber)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 col-span-1">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-900 ml-2">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center pb-2">
        Projections assume constant real returns with monthly compounding. Events fire at the start of the specified age.
        Not financial advice — consult a qualified professional.
      </p>
    </div>
  )
}
