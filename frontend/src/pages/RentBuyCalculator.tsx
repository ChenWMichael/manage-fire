import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Home,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HintTooltip from '../components/HintTooltip'
import { useAuth } from '../hooks/useAuth'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { getSnapshot, saveSnapshot, updateSnapshot } from '../lib/api'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RentBuyInputs } from '../utils/rentBuyCalculations'
import {
  STATE_DATA,
  calculateRentVsBuy,
  getMonthlyCostBreakdown,
  getState,
} from '../utils/rentBuyCalculations'
import { formatCurrency, formatCurrencyFull } from '../utils/fireCalculations'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STATE = 'TX'
const txState = STATE_DATA.find((s) => s.abbr === DEFAULT_STATE)!

const DEFAULT_INPUTS: RentBuyInputs = {
  state: DEFAULT_STATE,
  homePrice: 400_000,
  downPaymentPct: 20,
  homeAppreciation: 3,
  mortgageRate: 7.0,
  loanTermYears: 30,
  monthlyRent: 2_200,
  annualRentIncrease: 3,
  rentersInsuranceAnnual: 200,
  yearsToAnalyze: 30,
  investmentReturn: 7,
  propertyTaxRate: txState.propertyTaxRate,
  annualPropertyTaxIncrease: 2,
  homeInsuranceAnnual: 2_000,
  hoaMonthly: 0,
  maintenancePct: 1,
  pmiRate: 0.5,
  closingCostsPct: 2.5,
  sellingCostsPct: 6,
  federalTaxBracket: 22,
  stateTaxRate: txState.stateTaxRate,
  filingStatus: 'single',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, prefix, suffix,
  min = 0, max, step = 1, hint, small, disabled,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; min?: number; max?: number
  step?: number; hint?: string; small?: boolean; disabled?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1">
        {label}
        {hint && <HintTooltip hint={hint} />}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{prefix}</span>
        )}
        <input
          id={id}
          type="number"
          className={`input ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''} ${small ? 'py-1.5 text-sm' : ''} ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{suffix}</span>
        )}
      </div>
    </div>
  )
}

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

function StatBox({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; dataKey: string; color: string }[]; label?: number
}) {
  if (!active || !payload?.length) return null
  const buy = payload.find((p) => p.dataKey === 'buyNetWorth')
  const rent = payload.find((p) => p.dataKey === 'rentNetWorth')
  const diff = (buy?.value ?? 0) - (rent?.value ?? 0)
  return (
    <div className="card px-4 py-3 shadow-lg text-sm min-w-[210px]">
      <p className="font-semibold text-slate-800 mb-2">Year {label}</p>
      {buy && (
        <div className="flex justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span className="text-slate-600">Buy net worth</span>
          </div>
          <span className="font-semibold">{formatCurrency(buy.value)}</span>
        </div>
      )}
      {rent && (
        <div className="flex justify-between gap-6 mt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-600">Rent net worth</span>
          </div>
          <span className="font-semibold">{formatCurrency(rent.value)}</span>
        </div>
      )}
      {buy && rent && (
        <div className={`mt-2 pt-2 border-t border-slate-100 text-xs font-semibold ${diff >= 0 ? 'text-violet-600' : 'text-sky-600'}`}>
          {diff >= 0 ? 'Buying ahead by ' : 'Renting ahead by '}
          {formatCurrency(Math.abs(diff))}
        </div>
      )}
    </div>
  )
}

// ─── Monthly cost chart tooltip ───────────────────────────────────────────────

function CostTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; dataKey: string }[]; label?: number
}) {
  if (!active || !payload?.length) return null
  const buy = payload.find((p) => p.dataKey === 'buyMonthlyCost')
  const rent = payload.find((p) => p.dataKey === 'rentMonthlyCost')
  return (
    <div className="card px-4 py-3 shadow-lg text-sm min-w-[185px]">
      <p className="font-semibold text-slate-800 mb-2">Year {label}</p>
      {buy && (
        <div className="flex justify-between gap-6">
          <span className="text-slate-500">Buy (avg monthly)</span>
          <span className="font-semibold">{formatCurrencyFull(Math.round(buy.value))}</span>
        </div>
      )}
      {rent && (
        <div className="flex justify-between gap-6 mt-0.5">
          <span className="text-slate-500">Rent</span>
          <span className="font-semibold">{formatCurrencyFull(Math.round(rent.value))}</span>
        </div>
      )}
    </div>
  )
}

// ─── Year-by-year table ───────────────────────────────────────────────────────

function YearTable({ data }: { data: ReturnType<typeof calculateRentVsBuy>['yearlyData'] }) {
  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <tr>
            <th className="text-left font-semibold text-slate-500 px-3 py-2">Yr</th>
            <th className="text-right font-semibold text-violet-600 px-3 py-2">Buy NW</th>
            <th className="text-right font-semibold text-slate-400 px-3 py-2 hidden sm:table-cell">Home Value</th>
            <th className="text-right font-semibold text-slate-400 px-3 py-2 hidden md:table-cell">Mortgage</th>
            <th className="text-right font-semibold text-sky-600 px-3 py-2">Rent NW</th>
            <th className="text-right font-semibold text-slate-400 px-3 py-2 hidden lg:table-cell">Buy /mo</th>
            <th className="text-right font-semibold text-slate-400 px-3 py-2 hidden lg:table-cell">Rent /mo</th>
            <th className="text-right font-semibold text-slate-500 px-3 py-2">Advantage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const diff = row.buyNetWorth - row.rentNetWorth
            const buyAhead = diff >= 0
            const rowBg = buyAhead
              ? 'bg-violet-50/40'
              : i % 2 === 0 ? '' : 'bg-slate-50/50'
            return (
              <tr key={row.year} className={`border-b border-slate-50 ${rowBg}`}>
                <td className="px-3 py-1.5 font-medium text-slate-600">{row.year}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-violet-700">{formatCurrency(row.buyNetWorth)}</td>
                <td className="px-3 py-1.5 text-right text-slate-500 hidden sm:table-cell">{formatCurrency(row.buyHomeValue)}</td>
                <td className="px-3 py-1.5 text-right text-slate-400 hidden md:table-cell">{formatCurrency(row.buyRemainingMortgage)}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-sky-600">{formatCurrency(row.rentNetWorth)}</td>
                <td className="px-3 py-1.5 text-right text-slate-400 hidden lg:table-cell">{formatCurrencyFull(Math.round(row.buyMonthlyCost))}</td>
                <td className="px-3 py-1.5 text-right text-slate-400 hidden lg:table-cell">{formatCurrencyFull(Math.round(row.rentMonthlyCost))}</td>
                <td className="px-3 py-1.5 text-right">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${buyAhead ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
                    {buyAhead ? 'BUY' : 'RENT'} +{formatCurrency(Math.abs(diff))}
                  </span>
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

export default function RentBuyCalculator() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputs, setInputs] = useLocalStorage<RentBuyInputs>('mf-rentbuy-inputs', DEFAULT_INPUTS)
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(() => !!searchParams.get('snapshot'))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [chartView, setChartView] = useState<'networth' | 'monthly'>('networth')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('snapshot')
    if (!id) return
    getSnapshot(id)
      .then((snap) => {
        setInputs(snap.inputs as unknown as RentBuyInputs)
        setSnapshotId(snap.id)
      })
      .catch(() => setSearchParams({}, { replace: true }))
      .finally(() => setSnapshotLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof RentBuyInputs>(key: K, value: RentBuyInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }))

  const handleStateChange = (abbr: string) => {
    const s = getState(abbr)
    setInputs((prev) => ({
      ...prev,
      state: abbr,
      propertyTaxRate: s.propertyTaxRate,
      stateTaxRate: s.stateTaxRate,
    }))
  }

  const result = useMemo(() => calculateRentVsBuy(inputs), [inputs])
  const breakdown = useMemo(() => getMonthlyCostBreakdown(inputs), [inputs])

  const downPayment = inputs.homePrice * (inputs.downPaymentPct / 100)

  // Chart data
  const chartData = useMemo(
    () =>
      result.yearlyData.map((d) => ({
        year: d.year,
        buyNetWorth: Math.round(d.buyNetWorth),
        rentNetWorth: Math.round(d.rentNetWorth),
        buyMonthlyCost: Math.round(d.buyMonthlyCost),
        rentMonthlyCost: Math.round(d.rentMonthlyCost),
      })),
    [result],
  )

  const yMaxNetWorth = useMemo(() => {
    const max = Math.max(
      result.buyFinalNetWorth,
      result.rentFinalNetWorth,
    )
    return max * 1.25
  }, [result])

  const yMaxMonthly = useMemo(() => {
    const max = Math.max(
      ...result.yearlyData.map((d) => Math.max(d.buyMonthlyCost, d.rentMonthlyCost)),
    )
    return max * 1.2
  }, [result])

  if (snapshotLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    )
  }

  const { recommendation, breakEvenYear, buyFinalNetWorth, rentFinalNetWorth } = result
  const recColors = {
    buy:     { banner: 'bg-violet-50 border-violet-200', text: 'text-violet-700', badge: 'bg-violet-600' },
    rent:    { banner: 'bg-sky-50 border-sky-200',       text: 'text-sky-700',    badge: 'bg-sky-600' },
    neutral: { banner: 'bg-amber-50 border-amber-200',   text: 'text-amber-700',  badge: 'bg-amber-600' },
  }[recommendation]

  const recMessage = {
    buy:     `Buying builds ${formatCurrency(Math.abs(result.netWorthDifference))} more wealth over ${inputs.yearsToAnalyze} years.`,
    rent:    `Renting builds ${formatCurrency(Math.abs(result.netWorthDifference))} more wealth over ${inputs.yearsToAnalyze} years.`,
    neutral: `Buying and renting produce roughly equivalent wealth over ${inputs.yearsToAnalyze} years.`,
  }[recommendation]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rent vs. Buy Calculator</h1>
        <p className="text-slate-500 mt-1">
          Compares long-term wealth: home equity vs. investing the down payment.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* ── LEFT: Inputs ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Location & Property */}
          <InputCard icon={Home} title="Property" color="bg-violet-50 text-violet-600">
            <div>
              <label htmlFor="rent-buy-state" className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <select
                id="rent-buy-state"
                className="input"
                value={inputs.state}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {STATE_DATA.map((s) => (
                  <option key={s.abbr} value={s.abbr}>
                    {s.name} — prop. tax {s.propertyTaxRate}%{s.stateTaxRate === 0 ? ' · no income tax' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field
                  label="Home Price"
                  value={inputs.homePrice}
                  onChange={(v) => set('homePrice', v)}
                  prefix="$"
                  step={5_000}
                  hint="The purchase price of the home you're considering."
                />
              </div>
              <div>
                <Field
                  label="Down Payment"
                  value={inputs.downPaymentPct}
                  onChange={(v) => set('downPaymentPct', v)}
                  suffix="%"
                  step={1}
                  max={100}
                  hint="Less than 20% triggers PMI. Higher down payment reduces loan amount and monthly payment."
                />
                <p className="text-xs text-slate-400 mt-1">= {formatCurrencyFull(downPayment)}</p>
              </div>
              <Field
                label="Home Appreciation"
                value={inputs.homeAppreciation}
                onChange={(v) => set('homeAppreciation', v)}
                suffix="%/yr"
                step={0.25}
                max={15}
                hint="Expected annual home price appreciation. US historical average is ~3–4%. Varies significantly by market."
              />
            </div>
          </InputCard>

          {/* Mortgage */}
          <InputCard icon={TrendingUp} title="Mortgage" color="bg-fire-50 text-fire-600">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Interest Rate"
                value={inputs.mortgageRate}
                onChange={(v) => set('mortgageRate', v)}
                suffix="%"
                step={0.125}
                max={20}
                hint="Current 30-year fixed rates are around 6.5–7.5% (as of 2025). Check Bankrate or your lender for today's rate."
              />
              <div>
                <p className="block text-sm font-medium text-slate-700 mb-1">Loan Term</p>
                <div role="group" aria-label="Loan term" className="flex rounded-lg overflow-hidden border border-slate-200">
                  {([15, 30] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => set('loanTermYears', t)}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                        inputs.loanTermYears === t
                          ? 'bg-fire-500 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {t} yr
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Loan amount</span>
                <span className="font-semibold">{formatCurrencyFull(inputs.homePrice - downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly P&amp;I</span>
                <span className="font-semibold">{formatCurrencyFull(Math.round(breakdown.principalAndInterest))}</span>
              </div>
            </div>
          </InputCard>

          {/* Rental Alternative */}
          <InputCard icon={Home} title="Rental Alternative" color="bg-sky-50 text-sky-600">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Monthly Rent"
                value={inputs.monthlyRent}
                onChange={(v) => set('monthlyRent', v)}
                prefix="$"
                step={50}
                hint="What you would pay to rent a comparable place."
              />
              <Field
                label="Annual Rent Increase"
                value={inputs.annualRentIncrease}
                onChange={(v) => set('annualRentIncrease', v)}
                suffix="%/yr"
                step={0.25}
                max={15}
                hint="Historical US rent growth averages ~3–4% annually. High-demand cities can see 5–8%."
              />
            </div>
          </InputCard>

          {/* Analysis Settings */}
          <InputCard icon={TrendingUp} title="Analysis" color="bg-emerald-50 text-emerald-600">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Years to Analyze"
                value={inputs.yearsToAnalyze}
                onChange={(v) => set('yearsToAnalyze', Math.max(1, Math.min(50, v)))}
                suffix="yrs"
                min={1}
                max={50}
                hint="How long you plan to stay in the home (or hold the investment). Buying typically wins over longer horizons."
              />
              <Field
                label="Investment Return"
                value={inputs.investmentReturn}
                onChange={(v) => set('investmentReturn', v)}
                suffix="%/yr"
                step={0.5}
                max={30}
                hint="Expected annual return if you invested the down payment instead of buying. ~7% is a common inflation-adjusted estimate for a broad index fund."
              />
            </div>
          </InputCard>

          {/* Advanced Section */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-700">Advanced Costs &amp; Taxes</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  HOA, insurance, maintenance, PMI, closing/selling costs, tax bracket
                </p>
              </div>
              {showAdvanced
                ? <ChevronUp size={15} className="text-slate-400" />
                : <ChevronDown size={15} className="text-slate-400" />}
            </button>

            {showAdvanced && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-5">

                {/* Property Costs */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Property Costs</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      small label="Property Tax Rate"
                      value={inputs.propertyTaxRate}
                      onChange={(v) => set('propertyTaxRate', v)}
                      suffix="%/yr"
                      step={0.05}
                      hint={`Effective rate as % of home value. Auto-populated from state (${inputs.state}). Check your county assessor for an exact figure.`}
                    />
                    <Field
                      small label="Tax Bill Growth"
                      value={inputs.annualPropertyTaxIncrease}
                      onChange={(v) => set('annualPropertyTaxIncrease', v)}
                      suffix="%/yr"
                      step={0.25}
                      max={10}
                      hint="Annual increase in your property tax bill. Most states reassess periodically, so taxes grow with assessed value. CA's Prop 13 caps this at 2%/yr; TX and others can see 3–5%/yr increases. Set to 0 to hold taxes flat."
                    />
                    <Field
                      small label="HOA Monthly"
                      value={inputs.hoaMonthly}
                      onChange={(v) => set('hoaMonthly', v)}
                      prefix="$"
                      step={25}
                      hint="Monthly homeowner association fees. $0 if no HOA."
                    />
                    <Field
                      small label="Home Insurance"
                      value={inputs.homeInsuranceAnnual}
                      onChange={(v) => set('homeInsuranceAnnual', v)}
                      prefix="$"
                      suffix="/yr"
                      step={100}
                      hint="Annual homeowner's insurance premium. Typically 0.5–1% of home value."
                    />
                    <Field
                      small label="Maintenance"
                      value={inputs.maintenancePct}
                      onChange={(v) => set('maintenancePct', v)}
                      suffix="%/yr"
                      step={0.1}
                      max={5}
                      hint="Annual maintenance and repairs as % of home value. 1–2% is the rule of thumb; older homes can run higher."
                    />
                    <Field
                      small label="PMI Rate"
                      value={inputs.pmiRate}
                      onChange={(v) => set('pmiRate', v)}
                      suffix="%/yr"
                      step={0.05}
                      max={2}
                      hint={`Private mortgage insurance — only applies if down payment < 20% (yours is ${inputs.downPaymentPct}%). Removed once LTV drops to 80%.`}
                    />
                    <Field
                      small label="Renter's Insurance"
                      value={inputs.rentersInsuranceAnnual}
                      onChange={(v) => set('rentersInsuranceAnnual', v)}
                      prefix="$"
                      suffix="/yr"
                      step={25}
                    />
                  </div>
                </div>

                {/* Transaction Costs */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Transaction Costs</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      small label="Closing Costs"
                      value={inputs.closingCostsPct}
                      onChange={(v) => set('closingCostsPct', v)}
                      suffix="% of price"
                      step={0.25}
                      max={10}
                      hint="Typically 2–5% of purchase price. Includes origination fees, title, escrow, appraisal, etc."
                    />
                    <Field
                      small label="Selling Costs"
                      value={inputs.sellingCostsPct}
                      onChange={(v) => set('sellingCostsPct', v)}
                      suffix="% of sale"
                      step={0.25}
                      max={15}
                      hint="Typically 6–8% of sale price. Includes agent commissions (can be lower with buyers-agent changes post-2024), transfer taxes, title."
                    />
                  </div>
                </div>

                {/* Tax Settings */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Settings</p>
                  <p className="text-xs text-slate-400">
                    Used to calculate the mortgage interest deduction benefit (federal + state combined).
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="rent-buy-tax-bracket" className="block text-sm font-medium text-slate-700 mb-1">Federal Tax Bracket</label>
                      <select
                        id="rent-buy-tax-bracket"
                        className="input py-1.5 text-sm"
                        value={inputs.federalTaxBracket}
                        onChange={(e) => set('federalTaxBracket', Number(e.target.value))}
                      >
                        {[10, 12, 22, 24, 32, 35, 37].map((r) => (
                          <option key={r} value={r}>{r}% bracket</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="rent-buy-filing" className="block text-sm font-medium text-slate-700 mb-1">Filing Status</label>
                      <select
                        id="rent-buy-filing"
                        className="input py-1.5 text-sm"
                        value={inputs.filingStatus}
                        onChange={(e) => set('filingStatus', e.target.value as RentBuyInputs['filingStatus'])}
                      >
                        <option value="single">Single ($15K std. deduction)</option>
                        <option value="married_joint">Married Filing Jointly ($30K)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Field
                        small label="State Income Tax Rate"
                        value={inputs.stateTaxRate}
                        onChange={(v) => set('stateTaxRate', v)}
                        suffix="%"
                        step={0.25}
                        max={15}
                        hint={`Marginal state income tax rate. Auto-populated from ${inputs.state}. Used together with federal bracket to calculate deduction value.`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              if (!user) { navigate('/auth'); return }
              setSaveError(null)
              const summaryData = {
                recommendation,
                breakEvenYear,
                buyFinalNetWorth,
                rentFinalNetWorth,
                netWorthDifference: result.netWorthDifference,
                homePrice: inputs.homePrice,
                monthlyRent: inputs.monthlyRent,
                state: inputs.state,
              }
              try {
                if (snapshotId) {
                  await updateSnapshot(snapshotId, {
                    inputs: inputs as unknown as Record<string, unknown>,
                    summary: summaryData,
                  })
                } else {
                  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  await saveSnapshot('rent_buy', `Rent vs. Buy — ${date}`, inputs as unknown as Record<string, unknown>, summaryData)
                }
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : 'Save failed — try again')
                setTimeout(() => setSaveError(null), 5000)
              }
            }}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 flex items-center justify-center gap-2 ${
              saved ? 'bg-violet-50 border-violet-200 text-violet-700' : saveError ? 'bg-red-50 border-red-200 text-red-700' : 'btn-secondary'
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

        {/* ── RIGHT: Results ────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Recommendation Banner */}
          <div className={`rounded-xl border p-5 ${recColors.banner}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-lg ${recColors.badge}`}>
                    {recommendation === 'buy' ? 'BUY' : recommendation === 'rent' ? 'RENT' : 'NEUTRAL'}
                  </span>
                  <span className={`text-sm font-semibold ${recColors.text}`}>
                    {recommendation === 'buy' ? 'Buying Wins' : recommendation === 'rent' ? 'Renting Wins' : 'Too Close to Call'}
                  </span>
                </div>
                <p className={`text-sm ${recColors.text}`}>{recMessage}</p>
                {breakEvenYear && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Buying becomes more profitable than renting at{' '}
                    <span className="font-semibold">year {breakEvenYear}</span>.
                  </p>
                )}
                {!breakEvenYear && recommendation === 'rent' && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Renting remains ahead for the entire {inputs.yearsToAnalyze}-year period.
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400 mb-0.5">After {inputs.yearsToAnalyze} years</p>
                <p className={`text-2xl font-bold ${recColors.text}`}>
                  {formatCurrency(Math.max(buyFinalNetWorth, rentFinalNetWorth))}
                </p>
                <p className="text-xs text-slate-400">
                  {recommendation === 'rent' ? 'renter net worth' : 'buyer net worth'}
                </p>
              </div>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              label="Break-Even Point"
              value={breakEvenYear ? `Year ${breakEvenYear}` : '> Analysis period'}
              sub={
                breakEvenYear
                  ? `Buying wins after ${breakEvenYear} yr${breakEvenYear === 1 ? '' : 's'}`
                  : 'Renting may be better for shorter horizons'
              }
              accent={breakEvenYear ? 'text-violet-700' : 'text-sky-700'}
            />
            <StatBox
              label="Upfront Cost to Buy"
              value={formatCurrencyFull(result.totalUpfront)}
              sub={`${formatCurrencyFull(result.downPayment)} down + ${formatCurrencyFull(Math.round(result.closingCosts))} closing`}
            />
            <StatBox
              label="Buy Net Worth (final)"
              value={formatCurrency(buyFinalNetWorth)}
              sub={`Home equity + invested surpluses`}
              accent="text-violet-700"
            />
            <StatBox
              label="Rent Net Worth (final)"
              value={formatCurrency(rentFinalNetWorth)}
              sub={`Down payment + monthly savings invested`}
              accent="text-sky-700"
            />
          </div>

          {/* Monthly cost breakdown (Year 1) */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Monthly Costs — Year 1
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Buy breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">Buying</p>
                {[
                  ['Principal & Interest', breakdown.principalAndInterest],
                  ['Property Tax', breakdown.propertyTax],
                  ['Home Insurance', breakdown.homeInsurance],
                  ...(breakdown.hoa > 0 ? [['HOA', breakdown.hoa] as [string, number]] : []),
                  ['Maintenance (est.)', breakdown.maintenance],
                  ...(breakdown.pmi > 0 ? [['PMI', breakdown.pmi] as [string, number]] : []),
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-xs">
                    <span className="text-slate-500">{label as string}</span>
                    <span className="font-medium text-slate-700">{formatCurrencyFull(Math.round(val as number))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 mt-1">
                  <span className="text-violet-700">Total</span>
                  <span className="text-violet-700">{formatCurrencyFull(Math.round(breakdown.totalBuy))}</span>
                </div>
              </div>

              {/* Rent breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-2">Renting</p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Monthly Rent</span>
                  <span className="font-medium text-slate-700">{formatCurrencyFull(Math.round(breakdown.rent))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Renter's Insurance</span>
                  <span className="font-medium text-slate-700">{formatCurrencyFull(Math.round(breakdown.rentersInsurance))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 mt-1">
                  <span className="text-sky-700">Total</span>
                  <span className="text-sky-700">{formatCurrencyFull(Math.round(breakdown.totalRent))}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Monthly gap (buy − rent):
                    <span className={`ml-1.5 font-semibold ${breakdown.totalBuy > breakdown.totalRent ? 'text-violet-600' : 'text-sky-600'}`}>
                      {breakdown.totalBuy > breakdown.totalRent ? '+' : '−'}
                      {formatCurrencyFull(Math.round(Math.abs(breakdown.totalBuy - breakdown.totalRent)))}
                    </span>
                  </p>
                  {result.pmiIncluded && (
                    <p className="text-xs text-amber-600 mt-1">
                      PMI drops off once LTV reaches 80% (saving {formatCurrencyFull(Math.round(breakdown.pmi))}/mo).
                    </p>
                  )}
                  {result.firstYearTaxSavings > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Est. first-year tax savings from itemizing: {formatCurrencyFull(Math.round(result.firstYearTaxSavings))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card p-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">
                {chartView === 'networth' ? 'Net Worth Comparison' : 'Monthly Costs Over Time'}
              </h2>
              <div className="flex rounded-lg overflow-hidden border border-slate-200">
                <button
                  onClick={() => setChartView('networth')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    chartView === 'networth'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Net Worth
                </button>
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    chartView === 'monthly'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Monthly Cost
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={360}>
              {chartView === 'networth' ? (
                <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 8, bottom: 20 }}>
                  <defs>
                    <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="rentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Year', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, yMaxNetWorth]}
                    width={72}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCurrency(v)}
                  />
                  <Tooltip content={(props: any) => <ChartTooltip {...props} />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                    formatter={(value: string) =>
                      value === 'buyNetWorth' ? 'Buy (net worth)' : 'Rent (portfolio)'
                    }
                  />
                  {breakEvenYear && (
                    <ReferenceLine
                      x={breakEvenYear}
                      stroke="#a78bfa"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                      label={{ value: `Break-even yr ${breakEvenYear}`, position: 'top', fill: '#7c3aed', fontSize: 10 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="buyNetWorth"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#buyGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
                    legendType="line"
                  />
                  <Area
                    type="monotone"
                    dataKey="rentNetWorth"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fill="url(#rentGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#0284c7', strokeWidth: 0 }}
                    legendType="line"
                  />
                </ComposedChart>
              ) : (
                <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 8, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Year', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, yMaxMonthly]}
                    width={72}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCurrencyFull(v)}
                  />
                  <Tooltip content={(props: any) => <CostTooltip {...props} />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                    formatter={(value: string) =>
                      value === 'buyMonthlyCost' ? 'Buy (avg monthly)' : 'Rent (monthly)'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="buyMonthlyCost"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
                    legendType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="rentMonthlyCost"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#0284c7', strokeWidth: 0 }}
                    legendType="line"
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>

            <p className="text-xs text-slate-400 mt-3">
              {chartView === 'networth'
                ? 'Net worth assumes selling the home at end of period (net of selling costs). Renter portfolio starts with the down payment + closing costs invested.'
                : 'Buy monthly cost includes P&I, property tax, insurance, HOA, maintenance, and PMI if applicable. Rent grows annually.'}
            </p>
          </div>

          {/* Year-by-year table */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowTable((v) => !v)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="text-left">
                <h2 className="text-sm font-semibold text-slate-700">Year-by-Year Comparison</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Net worth, home value, mortgage balance, and monthly costs per year
                </p>
              </div>
              <ChevronDown
                size={15}
                className={`text-slate-400 transition-transform duration-200 ${showTable ? 'rotate-180' : ''}`}
              />
            </button>
            {showTable && (
              <div className="border-t border-slate-100">
                <YearTable data={result.yearlyData} />
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center pb-2">
        Simulation runs monthly for {inputs.yearsToAnalyze} years. Assumes constant appreciation and investment returns.
        Tax deduction uses {inputs.filingStatus === 'married_joint' ? '$30,000' : '$15,000'} standard deduction (2025) with $10,000 SALT cap.
        Renter's portfolio starts with the down payment + closing costs invested at {inputs.investmentReturn}%/yr.
        Not financial advice — consult a fee-only financial planner.
      </p>
    </div>
  )
}
