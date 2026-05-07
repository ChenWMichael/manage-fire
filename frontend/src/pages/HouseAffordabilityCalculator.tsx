import { useEffect, useId, useMemo, useState } from 'react'
import {
  AlertCircle, Building2, CheckCircle, CheckCircle2, ChevronDown, ChevronUp,
  Gift, Loader2, MapPin, PiggyBank, Receipt, Target, Users, XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getSnapshot, saveSnapshot, updateSnapshot } from '../lib/api'
import {
  CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import HintTooltip from '../components/HintTooltip'
import {
  calculateHouseAffordability,
  getEstimatedRate,
  STATE_DATA,
  CREDIT_SCORE_LABELS,
  type HouseAffordabilityInputs,
  type CreditScoreRange,
  type FilingStatus,
  type LoanTerm,
  type MonthlyBreakdown,
} from '../utils/houseAffordabilityCalculations'
import { formatCurrency, formatCurrencyFull } from '../utils/fireCalculations'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: HouseAffordabilityInputs = {
  filingStatus: 'single',
  annualIncome1: 120000,
  annualIncome2: 80000,
  monthlyDebt: 500,

  availableSavings: 120000,
  cashReserves: 20000,
  downPaymentPct: 20,
  giftFundsAmount: 0,

  state: 'TX',
  propertyTaxRate: 1.80,

  creditScoreRange: 'very_good',
  useCustomRate: false,
  mortgageRate: 6.75,
  loanTermYears: 30,

  hoaMonthly: 0,
  homeInsuranceAnnual: 1800,
  maintenancePct: 1.0,

  roommateCount: 0,
  roommateRentMonthly: 800,

  targetHomePrice: 0,

  pmiRate: 0.5,
  closingCostsPct: 3.0,
  homeAppreciation: 3.5,
  opportunityReturn: 7.0,
  frontEndRatioTarget: 28,
  backEndRatioTarget: 36,
}

// ─── Internal helpers ─────────────────────────────────────────────────────────


function Field({
  label, value, onChange, prefix, suffix, hint,
  step = 1, min = 0, max, disabled = false, className = '',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  hint?: string
  step?: number
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label flex items-center gap-1">
        {label}
        {hint && <HintTooltip hint={hint} />}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          className={`input ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-12' : ''} ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
          value={value}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function InputCard({
  icon: Icon, title, color = 'bg-slate-50 text-slate-600', children, collapsible, defaultOpen = true,
}: {
  icon: LucideIcon
  title: string
  color?: string
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <div
        className={`px-5 py-3.5 ${(!collapsible || open) ? 'border-b border-slate-100' : ''} flex items-center gap-3 ${collapsible ? 'cursor-pointer select-none hover:bg-slate-50 transition-colors' : ''}`}
        onClick={collapsible ? () => setOpen(v => !v) : undefined}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm flex-1">{title}</h3>
        {collapsible && (
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </div>
      {(!collapsible || open) && (
        <div className="px-5 py-4 space-y-4">{children}</div>
      )}
    </div>
  )
}

function StatBox({
  label, value, sub, accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-fire-50 border-fire-200' : 'bg-white border-slate-200'}`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-fire-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function DTIBar({ label, value, target, hint }: { label: string; value: number; target: number; hint?: string }) {
  const pct = Math.min(value / (target * 1.5) * 100, 100)
  const color = value <= target ? 'bg-emerald-500' : value <= target * 1.15 ? 'bg-amber-400' : 'bg-red-500'
  const textColor = value <= target ? 'text-emerald-700' : value <= target * 1.15 ? 'text-amber-700' : 'text-red-700'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
          {label}
          {hint && <HintTooltip hint={hint} />}
        </span>
        <span className={`text-sm font-bold ${textColor}`}>
          {value.toFixed(1)}%
          <span className="text-xs font-normal text-slate-400 ml-1">/ {target}% target</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BreakdownBar({ breakdown }: { breakdown: MonthlyBreakdown }) {
  const total = breakdown.totalWithMaintenance
  const segments = [
    { label: 'P&I',        value: breakdown.principalAndInterest, color: 'bg-slate-600' },
    { label: 'Tax',        value: breakdown.propertyTax,          color: 'bg-violet-500' },
    { label: 'Insurance',  value: breakdown.homeInsurance,        color: 'bg-sky-500'    },
    { label: 'PMI',        value: breakdown.pmi,                  color: 'bg-orange-400' },
    { label: 'HOA',        value: breakdown.hoa,                  color: 'bg-amber-400'  },
    { label: 'Maintenance',value: breakdown.maintenance,          color: 'bg-emerald-400'},
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden gap-px">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all duration-500`}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${formatCurrencyFull(s.value)}/mo`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className={`w-2.5 h-2.5 rounded-sm ${s.color} flex-shrink-0`} />
              {s.label}
              {s.label === 'Maintenance' && (
                <span className="text-slate-400 italic">(est.)</span>
              )}
            </span>
            <span className="font-medium text-slate-700">{formatCurrencyFull(s.value)}</span>
          </div>
        ))}
        <div className="col-span-2 border-t border-slate-100 pt-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600">Total / month</span>
          <span className="text-slate-900">{formatCurrencyFull(breakdown.totalWithMaintenance)}</span>
        </div>
        <div className="col-span-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Lender DTI (excl. maintenance)</span>
          <span className="text-slate-500 font-medium">{formatCurrencyFull(breakdown.totalLenderDTI)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Custom tooltip for sensitivity chart ─────────────────────────────────────

function SensitivityTooltip({ active, payload, hasRoommates }: { active?: boolean; payload?: { payload: { price: number; monthly: number; netMonthly: number; frontEndDTI: number; backEndDTI: number } }[]; hasRoommates?: boolean }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="card px-3 py-2.5 text-xs space-y-1 shadow-lg">
      <p className="font-semibold text-slate-800">{formatCurrency(d.price)}</p>
      <p className="text-slate-600">{formatCurrencyFull(d.monthly)}<span className="text-slate-400">/mo PITI</span></p>
      {hasRoommates && d.netMonthly !== d.monthly && (
        <p className="text-indigo-600 font-medium">{formatCurrencyFull(d.netMonthly)}<span className="font-normal text-indigo-400">/mo net</span></p>
      )}
      <p className="text-slate-500">Front-end DTI: <span className="font-medium text-slate-700">{d.frontEndDTI.toFixed(1)}%</span></p>
      <p className="text-slate-500">Back-end DTI: <span className="font-medium text-slate-700">{d.backEndDTI.toFixed(1)}%</span></p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HouseAffordabilityCalculator() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputs, setInputs] = useLocalStorage<HouseAffordabilityInputs>('mf-house-inputs', DEFAULT_INPUTS)
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(() => !!searchParams.get('snapshot'))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('snapshot')
    if (!id) return
    getSnapshot(id)
      .then((snap) => {
        setInputs(snap.inputs as unknown as HouseAffordabilityInputs)
        setSnapshotId(snap.id)
      })
      .catch(() => setSearchParams({}, { replace: true }))
      .finally(() => setSnapshotLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof HouseAffordabilityInputs>(k: K, v: HouseAffordabilityInputs[K]) =>
    setInputs((prev) => ({ ...prev, [k]: v }))

  const handleStateChange = (abbr: string) => {
    const s = STATE_DATA.find((d) => d.abbr === abbr)
    setInputs((prev) => ({ ...prev, state: abbr, propertyTaxRate: s?.propertyTaxRate ?? prev.propertyTaxRate }))
  }

  const handleCreditScoreChange = (score: CreditScoreRange) => {
    const estimated = getEstimatedRate(score, inputs.loanTermYears)
    setInputs((prev) => ({
      ...prev,
      creditScoreRange: score,
      mortgageRate: prev.useCustomRate ? prev.mortgageRate : estimated,
    }))
  }

  const handleTermChange = (term: LoanTerm) => {
    const estimated = getEstimatedRate(inputs.creditScoreRange, term)
    setInputs((prev) => ({
      ...prev,
      loanTermYears: term,
      mortgageRate: prev.useCustomRate ? prev.mortgageRate : estimated,
    }))
  }

  const result = useMemo(() => calculateHouseAffordability(inputs), [inputs])

  if (snapshotLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  const downPaymentDollars = result.effectiveMaxPrice * (inputs.downPaymentPct / 100)
  const isMarried = inputs.filingStatus === 'married_joint'

  // Sensitivity chart reference lines use qualifying income (includes 75% of roommate income)
  const frontEndMonthlyLimit = (result.qualifyingMonthlyIncome * inputs.frontEndRatioTarget) / 100
  const backEndMonthlyLimit = Math.max(0, (result.qualifyingMonthlyIncome * inputs.backEndRatioTarget) / 100 - inputs.monthlyDebt)

  // Multiple of income for effective max
  const incomeMultiple = result.annualIncome > 0 ? result.effectiveMaxPrice / result.annualIncome : 0

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">House Affordability Calculator</h1>
        <p className="text-slate-500 text-sm mt-1">
          Find out how much home you can comfortably afford based on your income, debts, savings, and location.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* ── Left: Inputs ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Household Income */}
          <InputCard icon={Users} title="Household Income" color="bg-emerald-50 text-emerald-600" collapsible>
            <div>
              <label htmlFor="house-filing" className="label">Filing Status</label>
              <select
                id="house-filing"
                className="input"
                value={inputs.filingStatus}
                onChange={(e) => set('filingStatus', e.target.value as FilingStatus)}
              >
                <option value="single">Single</option>
                <option value="married_joint">Married — Filing Jointly</option>
                <option value="head_of_household">Head of Household</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={isMarried ? 'Income (Primary)' : 'Annual Gross Income'}
                value={inputs.annualIncome1}
                onChange={(v) => set('annualIncome1', v)}
                prefix="$"
                step={5000}
                hint="Your annual gross (pre-tax) income before deductions."
              />
              <Field
                label="Income (Secondary)"
                value={inputs.annualIncome2}
                onChange={(v) => set('annualIncome2', v)}
                prefix="$"
                step={5000}
                disabled={!isMarried}
                hint="Spouse or partner income (only counted for married filing jointly)."
              />
            </div>
            <Field
              label="Monthly Debt Payments"
              value={inputs.monthlyDebt}
              onChange={(v) => set('monthlyDebt', v)}
              prefix="$"
              step={50}
              hint="Monthly minimum payments on car loans, student loans, credit cards, and other recurring debts. Do not include future housing costs."
            />
            {result.annualIncome > 0 && (
              <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
                <div>
                  Annual income: <span className="font-semibold text-slate-600">{formatCurrencyFull(result.annualIncome)}</span>
                  &nbsp;·&nbsp; Monthly: <span className="font-semibold text-slate-600">{formatCurrencyFull(result.grossMonthlyIncome)}</span>
                </div>
                {result.roommateMonthlyIncome > 0 && (
                  <div className="text-indigo-500">
                    + rental income (75%): <span className="font-semibold">{formatCurrencyFull(result.roommateMonthlyIncome * 0.75)}/mo</span>
                    &nbsp;→&nbsp; qualifying income: <span className="font-semibold text-indigo-700">{formatCurrencyFull(result.qualifyingMonthlyIncome)}/mo</span>
                  </div>
                )}
              </div>
            )}
          </InputCard>

          {/* Savings & Down Payment */}
          <InputCard icon={PiggyBank} title="Savings & Down Payment" color="bg-sky-50 text-sky-600" collapsible>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Total Available Savings"
                value={inputs.availableSavings}
                onChange={(v) => set('availableSavings', v)}
                prefix="$"
                step={5000}
                hint="Total liquid savings you could draw from (checking, HYSA, taxable brokerage). Do not include retirement accounts."
              />
              <Field
                label="Emergency Fund to Keep"
                value={inputs.cashReserves}
                onChange={(v) => set('cashReserves', v)}
                prefix="$"
                step={1000}
                hint="Cash you want to keep after buying — typically 3–6 months of expenses. This reduces what's available for your down payment."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Down Payment"
                value={inputs.downPaymentPct}
                onChange={(v) => set('downPaymentPct', v)}
                suffix="%"
                step={1}
                min={3}
                max={50}
                hint="Percentage of the home price you'll put down. 20% avoids PMI. Lower down payments mean smaller cash requirements but higher monthly costs and PMI."
              />
              <Field
                label="Gift Funds"
                value={inputs.giftFundsAmount}
                onChange={(v) => set('giftFundsAmount', v)}
                prefix="$"
                step={5000}
                hint="Money gifted by parents or family toward your down payment. Lenders allow this with a gift letter. Counted separately from your savings so you can track both."
              />
            </div>
            <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Personal savings available:</span>
              <span className="font-semibold text-slate-600 text-right">{formatCurrencyFull(Math.max(0, inputs.availableSavings - inputs.cashReserves))}</span>
              {inputs.giftFundsAmount > 0 && (
                <>
                  <span>Gift funds:</span>
                  <span className="font-semibold text-emerald-600 text-right">+ {formatCurrencyFull(inputs.giftFundsAmount)}</span>
                  <span className="font-medium text-slate-500">Total available for purchase:</span>
                  <span className="font-semibold text-slate-700 text-right">{formatCurrencyFull(Math.max(0, inputs.availableSavings + inputs.giftFundsAmount - inputs.cashReserves))}</span>
                </>
              )}
              {inputs.downPaymentPct < 20 && (
                <span className="col-span-2 text-amber-600 font-medium">PMI will apply — put down 20%+ to avoid it</span>
              )}
            </div>
          </InputCard>

          {/* Location */}
          <InputCard icon={MapPin} title="Location" color="bg-violet-50 text-violet-600" collapsible>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="house-state" className="label flex items-center gap-1">
                  State
                  <HintTooltip hint="Selects the state's effective property tax rate. You can override it below." />
                </label>
                <select
                  id="house-state"
                  className="input"
                  value={inputs.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                >
                  {STATE_DATA.map((s) => (
                    <option key={s.abbr} value={s.abbr}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Field
                label="Property Tax Rate"
                value={inputs.propertyTaxRate}
                onChange={(v) => set('propertyTaxRate', v)}
                suffix="% /yr"
                step={0.1}
                min={0}
                max={5}
                hint="Annual effective property tax as a % of home value. Defaults from your selected state — adjust for your specific county or city."
              />
            </div>
          </InputCard>

          {/* Mortgage */}
          <InputCard icon={Building2} title="Mortgage" color="bg-fire-50 text-fire-600" collapsible>
            <div>
              <label htmlFor="house-credit" className="label flex items-center gap-1">
                Credit Score Range
                <HintTooltip hint="Your credit score affects the mortgage rate lenders will offer. A higher score means a lower rate and lower monthly payments." />
              </label>
              <select
                id="house-credit"
                className="input"
                value={inputs.creditScoreRange}
                onChange={(e) => handleCreditScoreChange(e.target.value as CreditScoreRange)}
              >
                {(Object.entries(CREDIT_SCORE_LABELS) as [CreditScoreRange, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label htmlFor="house-mortgage-rate" className="label flex items-center gap-1">
                  Mortgage Rate
                  <HintTooltip hint="Annual interest rate. If you have a rate locked in, enable the override. Otherwise we estimate from your credit score." />
                </label>
                <div className="relative">
                  <input
                    id="house-mortgage-rate"
                    type="number"
                    className={`input pr-12 ${!inputs.useCustomRate ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
                    value={inputs.mortgageRate}
                    step={0.125}
                    min={2}
                    max={15}
                    disabled={!inputs.useCustomRate}
                    onChange={(e) => set('mortgageRate', Number(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">% /yr</span>
                </div>
              </div>
              <div className="pb-0.5">
                <button
                  onClick={() => {
                    const next = !inputs.useCustomRate
                    setInputs((prev) => ({
                      ...prev,
                      useCustomRate: next,
                      mortgageRate: next ? prev.mortgageRate : getEstimatedRate(prev.creditScoreRange, prev.loanTermYears),
                    }))
                  }}
                  className={`w-full py-2 rounded-lg text-sm font-medium border transition-colors ${
                    inputs.useCustomRate
                      ? 'bg-fire-50 border-fire-200 text-fire-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {inputs.useCustomRate ? 'Custom rate ✓' : 'Use estimated rate'}
                </button>
              </div>
            </div>

            {!inputs.useCustomRate && (
              <p className="text-xs text-slate-400">
                Estimated rate for <span className="font-medium">{CREDIT_SCORE_LABELS[inputs.creditScoreRange]}</span>
                : <span className="font-semibold text-slate-600">{result.estimatedRate.toFixed(2)}%</span>
              </p>
            )}

            <div>
              <p className="label">Loan Term</p>
              <div role="group" aria-label="Loan term" className="flex gap-2">
                {([15, 20, 30] as LoanTerm[]).map((term) => (
                  <button
                    key={term}
                    onClick={() => handleTermChange(term)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      inputs.loanTermYears === term
                        ? 'bg-fire-500 border-fire-500 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {term} yr
                  </button>
                ))}
              </div>
            </div>
          </InputCard>

          {/* Monthly Costs */}
          <InputCard icon={Receipt} title="Monthly Housing Costs" color="bg-teal-50 text-teal-600" collapsible>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field
                label="HOA Fee"
                value={inputs.hoaMonthly}
                onChange={(v) => set('hoaMonthly', v)}
                prefix="$"
                step={50}
                hint="Monthly homeowners association fee. Enter 0 if none. Included in lender DTI calculations."
              />
              <Field
                label="Home Insurance"
                value={inputs.homeInsuranceAnnual}
                onChange={(v) => set('homeInsuranceAnnual', v)}
                prefix="$"
                suffix="/yr"
                step={100}
                hint="Annual homeowners insurance. Rule of thumb: 0.5–1% of home value per year. Included in lender DTI."
              />
              <Field
                label="Maintenance"
                value={inputs.maintenancePct}
                onChange={(v) => set('maintenancePct', v)}
                suffix="%/yr"
                step={0.1}
                min={0}
                max={5}
                hint="Annual maintenance budget as % of home value. The 1% rule is common (some use 1–2% for older homes). Not included in lender DTI but shown in your true monthly cost."
              />
            </div>
          </InputCard>

          {/* Roommates / Rental Income */}
          <InputCard icon={Users} title="Roommates & Rental Income (Optional)" color="bg-indigo-50 text-indigo-600" collapsible defaultOpen={false}>
            <p className="text-xs text-slate-400 -mt-1">
              Planning to rent out room(s)? Rental income reduces your net monthly housing cost and can make a more expensive home viable.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="label flex items-center gap-1">
                  Number of Roommates
                  <HintTooltip hint="How many roommates you plan to have. Each pays the monthly rent amount below." />
                </p>
                <div role="group" aria-label="Number of roommates" className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => set('roommateCount', n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        inputs.roommateCount === n
                          ? 'bg-indigo-500 border-indigo-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Rent per Roommate / mo"
                value={inputs.roommateRentMonthly}
                onChange={(v) => set('roommateRentMonthly', v)}
                prefix="$"
                step={50}
                disabled={inputs.roommateCount === 0}
                hint="Monthly rent you'd charge each roommate. Market rents vary widely — research comparable rooms in your area."
              />
            </div>
            {inputs.roommateCount > 0 && (
              <div className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-indigo-700 font-medium">Total roommate income</span>
                  <span className="font-bold text-indigo-800">{formatCurrencyFull(result.roommateMonthlyIncome)}/mo</span>
                </div>
                <p className="text-indigo-500">
                  This offsets your net out-of-pocket housing cost. Lenders may count up to 75% as qualifying income with documented rental history.
                </p>
              </div>
            )}
          </InputCard>

          {/* Analyze a Specific Home */}
          <InputCard icon={Target} title="Analyze a Specific Home (Optional)" color="bg-amber-50 text-amber-600" collapsible defaultOpen={false}>
            <Field
              label="Target Home Price"
              value={inputs.targetHomePrice}
              onChange={(v) => set('targetHomePrice', v)}
              prefix="$"
              step={10000}
              min={0}
              hint="Enter a specific price to see if you can afford it and get a detailed monthly breakdown. Leave at 0 to skip."
            />
            {inputs.targetHomePrice > 0 && result.targetVerdict && (
              <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                result.targetVerdict === 'comfortable' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                result.targetVerdict === 'stretched'   ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {result.targetVerdict === 'comfortable' && <CheckCircle2 size={14} />}
                {result.targetVerdict === 'stretched'   && <AlertCircle size={14} />}
                {result.targetVerdict === 'unaffordable' && <XCircle size={14} />}
                <span>
                  {result.targetVerdict === 'comfortable'  && 'Within your comfortable budget'}
                  {result.targetVerdict === 'stretched'    && 'Possible but stretching your budget'}
                  {result.targetVerdict === 'unaffordable' && 'Exceeds your recommended budget'}
                </span>
              </div>
            )}
          </InputCard>

          {/* Advanced */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <span className="font-semibold text-slate-700 text-sm">Advanced Assumptions</span>
              {showAdvanced ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {showAdvanced && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="PMI Rate"
                    value={inputs.pmiRate}
                    onChange={(v) => set('pmiRate', v)}
                    suffix="%/yr"
                    step={0.05}
                    min={0}
                    hint="Private mortgage insurance annual rate. Applied when down payment < 20%. Typically 0.5–1.5% of loan amount per year."
                  />
                  <Field
                    label="Closing Costs"
                    value={inputs.closingCostsPct}
                    onChange={(v) => set('closingCostsPct', v)}
                    suffix="% of price"
                    step={0.25}
                    min={0}
                    hint="Typical buyer closing costs: 2–5% of home price. Includes lender fees, title insurance, escrow, and prepaid items."
                  />
                  <Field
                    label="Front-End DTI Target"
                    value={inputs.frontEndRatioTarget}
                    onChange={(v) => set('frontEndRatioTarget', v)}
                    suffix="% of income"
                    step={1}
                    min={10}
                    max={50}
                    hint="Maximum housing costs as a % of gross monthly income. Most lenders prefer ≤28%. FHA allows up to 31%."
                  />
                  <Field
                    label="Back-End DTI Target"
                    value={inputs.backEndRatioTarget}
                    onChange={(v) => set('backEndRatioTarget', v)}
                    suffix="% of income"
                    step={1}
                    min={20}
                    max={60}
                    hint="Maximum total monthly debts (housing + all other debts) as a % of gross income. Most lenders prefer ≤36–43%. FHA allows up to 43–50%."
                  />
                  <Field
                    label="Home Appreciation"
                    value={inputs.homeAppreciation}
                    onChange={(v) => set('homeAppreciation', v)}
                    suffix="%/yr"
                    step={0.5}
                    min={0}
                    hint="Expected annual home value appreciation. US historical average: ~3–4%. Varies significantly by location."
                  />
                  <Field
                    label="Opportunity Return"
                    value={inputs.opportunityReturn}
                    onChange={(v) => set('opportunityReturn', v)}
                    suffix="%/yr"
                    step={0.5}
                    min={0}
                    hint="Expected annual return if down payment were invested instead. Used to show opportunity cost context."
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              if (!user) { navigate('/auth'); return }
              setSaveError(null)
              const summaryData = {
                maxAffordablePrice: result.maxPriceByFrontEnd,
                maxPriceByBackEnd: result.maxPriceByBackEnd,
                monthlyPayment: result.monthlyAtMax.totalLenderDTI,
                downPaymentDollars: result.maxPriceByFrontEnd * (inputs.downPaymentPct / 100),
                effectiveRate: result.effectiveRate,
                state: inputs.state,
                filingStatus: inputs.filingStatus,
              }
              try {
                if (snapshotId) {
                  await updateSnapshot(snapshotId, {
                    inputs: inputs as unknown as Record<string, unknown>,
                    summary: summaryData,
                  })
                } else {
                  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  await saveSnapshot('house_affordability', `House Affordability — ${date}`, inputs as unknown as Record<string, unknown>, summaryData)
                }
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : 'Save failed — try again')
                setTimeout(() => setSaveError(null), 5000)
              }
            }}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 flex items-center justify-center gap-2 ${
              saved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : saveError ? 'bg-red-50 border-red-200 text-red-700' : 'btn-secondary'
            }`}
          >
            {saved ? <CheckCircle size={14} /> : null}
            {saved
              ? (snapshotId ? 'Updated' : 'Saved to dashboard')
              : saveError ? 'Save failed'
              : (snapshotId ? 'Update snapshot' : 'Save to dashboard')}
          </button>
          {saveError && (
            <p className="text-xs text-red-600 mt-1.5 text-center">{saveError}</p>
          )}
        </div>

        {/* ── Right: Results ── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Affordability Banner */}
          <div className="card overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0">
            <div className="px-6 py-5">
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">Comfortable Maximum</p>
              <p className="text-4xl font-bold">{formatCurrency(result.maxPriceByFrontEnd)}</p>
              <p className="text-emerald-200 text-sm mt-1">
                Based on {inputs.frontEndRatioTarget}% housing-to-income ratio · {formatCurrencyFull(result.monthlyAtMax.totalLenderDTI)}/mo PITI
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="bg-white/10 rounded-lg px-3 py-2 text-sm">
                  <span className="text-emerald-200 text-xs">Down payment</span>
                  <p className="font-semibold">{formatCurrencyFull(downPaymentDollars)}</p>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 text-sm">
                  <span className="text-emerald-200 text-xs">Income multiple</span>
                  <p className="font-semibold">{incomeMultiple.toFixed(1)}× annual</p>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2 text-sm">
                  <span className="text-emerald-200 text-xs">{inputs.loanTermYears}-yr rate</span>
                  <p className="font-semibold">{result.effectiveRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 gap-4">
            <StatBox
              label={`Max Price (${inputs.frontEndRatioTarget}% Front-End DTI)`}
              value={formatCurrency(result.maxPriceByFrontEnd)}
              sub="Comfortable — most lenders prefer this"
              accent
            />
            <StatBox
              label={`Max Price (${inputs.backEndRatioTarget}% Back-End DTI)`}
              value={formatCurrency(result.maxPriceByBackEnd)}
              sub="Absolute ceiling with all your debts"
            />
            <StatBox
              label="Max Price by Savings"
              value={result.maxPriceByDownPayment > 5e6 ? 'Not limiting' : formatCurrency(result.maxPriceByDownPayment)}
              sub={`${inputs.downPaymentPct}% down + ${inputs.closingCostsPct}% closing costs`}
            />
            <StatBox
              label="Monthly PITI at Comfortable Max"
              value={formatCurrencyFull(result.monthlyAtMax.totalLenderDTI)}
              sub={`+ ${formatCurrencyFull(result.monthlyAtMax.maintenance)}/mo estimated maintenance`}
            />
          </div>

          {/* DTI Analysis */}
          <div className="card px-5 py-4 space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm">Debt-to-Income Ratios at Comfortable Max</h3>
            <DTIBar
              label="Front-End DTI (housing only)"
              value={result.frontEndRatioAtMax}
              target={inputs.frontEndRatioTarget}
              hint="Monthly housing costs (P&I + tax + insurance + PMI + HOA) divided by gross monthly income. Most lenders want this under 28%."
            />
            <DTIBar
              label="Back-End DTI (all debts)"
              value={result.backEndRatioAtMax}
              target={inputs.backEndRatioTarget}
              hint="All monthly debt payments (housing + car, student loans, credit cards, etc.) divided by gross income. Most conventional loans require under 43–45%."
            />
            <p className="text-xs text-slate-400">
              Note: These DTI ratios are at your <em>comfortable</em> max ({inputs.frontEndRatioTarget}% front-end). The <em>absolute</em> max ({inputs.backEndRatioTarget}% back-end) is {formatCurrency(result.maxPriceByBackEnd)}.
              {result.roommateMonthlyIncome > 0 && (
                <span className="text-indigo-400"> Qualifying income includes 75% of roommate rent ({formatCurrencyFull(result.roommateMonthlyIncome * 0.75)}/mo), per standard lender guidelines.</span>
              )}
            </p>
          </div>

          {/* Affordability Tiers */}
          <div className="card px-5 py-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Affordability by Income Multiple</h3>
            <div className="space-y-2.5">
              {result.tiers.map((tier) => {
                const tierMonthly = calculateHouseAffordability({ ...inputs, targetHomePrice: tier.price }).targetMonthly
                const isCurrentTier = incomeMultiple >= tier.multiple - 0.5 && incomeMultiple < tier.multiple + 0.5
                return (
                  <div
                    key={tier.label}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${isCurrentTier ? tier.colorBg : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tier.colorBg} ${tier.color}`}>
                        {tier.tag}
                      </span>
                      <span className={`font-semibold text-sm ${isCurrentTier ? tier.color : 'text-slate-700'}`}>
                        {tier.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-sm">{formatCurrency(tier.price)}</p>
                      {tierMonthly && (
                        <p className="text-xs text-slate-400">{formatCurrencyFull(tierMonthly.totalLenderDTI)}/mo</p>
                      )}
                    </div>
                  </div>
                )
              })}
              {/* DTI-constrained max */}
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-fire-50 border-fire-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-fire-50 border-fire-200 text-fire-700">
                    {incomeMultiple.toFixed(1)}× income
                  </span>
                  <span className="font-semibold text-sm text-fire-700">Your Comfortable Max</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-fire-700 text-sm">{formatCurrency(result.maxPriceByFrontEnd)}</p>
                  <p className="text-xs text-fire-400">{inputs.frontEndRatioTarget}% front-end DTI</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown at Comfortable Max */}
          <div className="card px-5 py-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">
              Monthly Cost Breakdown at {formatCurrency(result.maxPriceByFrontEnd)}
            </h3>
            <BreakdownBar breakdown={result.monthlyAtMax} />
            {result.roommateMonthlyIncome > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                    <Users size={13} />
                    Roommate income ({inputs.roommateCount} × {formatCurrencyFull(inputs.roommateRentMonthly)})
                  </span>
                  <span className="font-semibold text-indigo-700">− {formatCurrencyFull(result.roommateMonthlyIncome)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold bg-indigo-50 rounded-lg px-3 py-2">
                  <span className="text-indigo-800">Net out-of-pocket / month</span>
                  <span className="text-indigo-900">
                    {formatCurrencyFull(Math.max(0, result.monthlyAtMax.totalWithMaintenance - result.roommateMonthlyIncome))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upfront Costs */}
          <div className="card px-5 py-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Upfront Costs at Comfortable Max</h3>
            <div className="space-y-2 text-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cash Needed</p>
              {[
                { label: `Down payment (${inputs.downPaymentPct}%)`, value: result.upfrontCosts.downPayment },
                { label: `Closing costs (~${inputs.closingCostsPct}%)`, value: result.upfrontCosts.closingCosts },
                { label: 'Emergency fund / reserves kept', value: result.upfrontCosts.cashReserves },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-800">{formatCurrencyFull(value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5 font-semibold">
                <span className="text-slate-700">Total Cash Required</span>
                <span className="text-slate-900">{formatCurrencyFull(result.upfrontCosts.totalRequired)}</span>
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-1">Sources</p>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Personal Savings</span>
                <span className="font-semibold text-slate-700">{formatCurrencyFull(result.upfrontCosts.availableSavings)}</span>
              </div>
              {result.upfrontCosts.giftFunds > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Gift size={13} />
                    Gift Funds
                  </span>
                  <span className="font-semibold text-emerald-700">+ {formatCurrencyFull(result.upfrontCosts.giftFunds)}</span>
                </div>
              )}
              <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 mt-1 ${
                result.upfrontCosts.surplus >= 0
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <span className={`font-semibold text-sm ${result.upfrontCosts.surplus >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {result.upfrontCosts.surplus >= 0 ? 'Surplus after purchase' : 'Shortfall'}
                </span>
                <span className={`font-bold ${result.upfrontCosts.surplus >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {result.upfrontCosts.surplus >= 0 ? '+' : ''}{formatCurrencyFull(result.upfrontCosts.surplus)}
                </span>
              </div>
              {result.upfrontCosts.surplus < 0 && (
                <p className="text-xs text-red-500">
                  You may need to reduce the down payment, lower your target price, increase savings, or seek additional gift funds before buying at this price point.
                </p>
              )}
            </div>
          </div>

          {/* Price Sensitivity Chart */}
          <div className="card px-5 py-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-1">Monthly Payment Sensitivity</h3>
            <p className="text-xs text-slate-400 mb-4">How your monthly PITI changes across a range of home prices</p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={result.sensitivityData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="price"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  width={52}
                />
                <Tooltip content={<SensitivityTooltip hasRoommates={result.roommateMonthlyIncome > 0} />} />
                <ReferenceLine
                  y={frontEndMonthlyLimit}
                  stroke="#10b981"
                  strokeDasharray="5 3"
                  label={{ value: `${inputs.frontEndRatioTarget}% front-end`, position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
                />
                <ReferenceLine
                  y={backEndMonthlyLimit}
                  stroke="#f59e0b"
                  strokeDasharray="5 3"
                  label={{ value: `${inputs.backEndRatioTarget}% back-end`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
                />
                {inputs.targetHomePrice > 0 && result.targetMonthly && (
                  <ReferenceLine
                    x={inputs.targetHomePrice}
                    stroke="#6366f1"
                    strokeDasharray="4 2"
                    label={{ value: 'Target', position: 'top', fontSize: 10, fill: '#6366f1' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="monthly"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={false}
                  name="Monthly PITI"
                />
                {result.roommateMonthlyIncome > 0 && (
                  <Line
                    type="monotone"
                    dataKey="netMonthly"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Net (after roommates)"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 bg-fire-500" />Monthly PITI
              </span>
              {result.roommateMonthlyIncome > 0 && (
                <span className="flex items-center gap-1.5 text-indigo-500">
                  <span className="inline-block w-5" style={{ borderTop: '2px dashed #6366f1' }} />Net after roommates
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 bg-emerald-500 border-dashed" style={{ borderTop: '2px dashed #10b981', background: 'none' }} />{inputs.frontEndRatioTarget}% front-end limit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 bg-amber-400 border-dashed" style={{ borderTop: '2px dashed #f59e0b', background: 'none' }} />{inputs.backEndRatioTarget}% back-end limit
              </span>
            </div>
          </div>

          {/* Target Home Analysis */}
          {inputs.targetHomePrice > 0 && result.targetMonthly && result.targetVerdict && (
            <div className={`card overflow-hidden border-2 ${
              result.targetVerdict === 'comfortable'  ? 'border-emerald-300' :
              result.targetVerdict === 'stretched'    ? 'border-amber-300'   :
              'border-red-300'
            }`}>
              <div className={`px-5 py-4 flex items-center gap-3 ${
                result.targetVerdict === 'comfortable'  ? 'bg-emerald-50' :
                result.targetVerdict === 'stretched'    ? 'bg-amber-50'   :
                'bg-red-50'
              }`}>
                {result.targetVerdict === 'comfortable'  && <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />}
                {result.targetVerdict === 'stretched'    && <AlertCircle  size={20} className="text-amber-600 flex-shrink-0" />}
                {result.targetVerdict === 'unaffordable' && <XCircle      size={20} className="text-red-600 flex-shrink-0" />}
                <div>
                  <p className={`font-semibold text-sm ${
                    result.targetVerdict === 'comfortable'  ? 'text-emerald-800' :
                    result.targetVerdict === 'stretched'    ? 'text-amber-800'   :
                    'text-red-800'
                  }`}>
                    {formatCurrency(inputs.targetHomePrice)} — {
                      result.targetVerdict === 'comfortable'  ? 'Within your comfortable budget' :
                      result.targetVerdict === 'stretched'    ? 'Possible, but stretching your budget' :
                      'Exceeds your recommended budget'
                    }
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Front-end DTI: <strong>{result.targetFrontEndRatio.toFixed(1)}%</strong>
                    &nbsp;·&nbsp; Back-end DTI: <strong>{result.targetBackEndRatio.toFixed(1)}%</strong>
                  </p>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Monthly Breakdown at Target Price</p>
                <BreakdownBar breakdown={result.targetMonthly} />
              </div>
              <div className="px-5 pb-4">
                <div className="space-y-2">
                  <DTIBar label="Front-End DTI" value={result.targetFrontEndRatio} target={inputs.frontEndRatioTarget} />
                  <DTIBar label="Back-End DTI" value={result.targetBackEndRatio} target={inputs.backEndRatioTarget} />
                </div>
              </div>
            </div>
          )}

          {/* Methodology note */}
          <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 space-y-1 border border-slate-200">
            <p className="font-semibold text-slate-500">How this is calculated</p>
            <p>
              <strong>Front-end DTI</strong> = (P&I + property tax + insurance + PMI + HOA) ÷ gross monthly income.
              <strong> Back-end DTI</strong> adds your other monthly debts. Most conventional lenders require back-end DTI ≤ 43–45%.
              Maintenance is shown for personal budgeting but is <em>not</em> counted in lender DTI.
            </p>
            <p>Figures are estimates. Actual loan approval depends on credit history, asset reserves, loan type, and lender criteria.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
