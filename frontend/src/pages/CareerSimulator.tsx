import { useMemo, useState } from 'react'
import { Briefcase, Plus, Trash2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilingStatus = 'single' | 'married'
type RsuSchedule = '4yr-equal' | '4yr-backloaded' | '3yr-equal' | '2yr-equal' | '1yr-cliff'

interface Offer {
  id: string
  label: string
  title: string
  state: string
  baseSalary: number
  annualBonusPct: number
  signingBonus: number
  rsuTotalGrant: number
  rsuSchedule: RsuSchedule
  k401Pct: number
}

interface YearBreakdown {
  year: number
  grossBase: number
  grossBonus: number
  grossSigning: number
  grossRsu: number
  k401: number
  grossTotal: number
  federalTax: number
  stateTax: number
  ficaTax: number
  totalTax: number
  netIncome: number
  effectiveTaxRate: number
}

// ─── Tax constants ─────────────────────────────────────────────────────────────

type Bracket = [number, number] // [upTo, rate]

const FED_SINGLE: Bracket[] = [
  [11_925, 0.10], [48_475, 0.12], [103_350, 0.22],
  [197_300, 0.24], [250_525, 0.32], [626_350, 0.35], [Infinity, 0.37],
]
const FED_MARRIED: Bracket[] = [
  [23_850, 0.10], [96_950, 0.12], [206_700, 0.22],
  [394_600, 0.24], [501_050, 0.32], [751_600, 0.35], [Infinity, 0.37],
]
const STD_DEDUCTION = { single: 15_000, married: 30_000 }
const SS_WAGE_BASE = 176_100
const K401_LIMIT = 23_500

const STATE_BRACKETS: Record<string, Bracket[]> = {
  AK: [], FL: [], NV: [], SD: [], TX: [], WA: [], WY: [],
  AZ: [[Infinity, 0.025]],
  CO: [[Infinity, 0.044]],
  GA: [[Infinity, 0.0549]],
  IL: [[Infinity, 0.0495]],
  MA: [[Infinity, 0.05]],
  MI: [[Infinity, 0.0425]],
  NC: [[Infinity, 0.0475]],
  PA: [[Infinity, 0.0307]],
  UT: [[Infinity, 0.0465]],
  CA: [
    [10_412, 0.01], [24_684, 0.02], [38_959, 0.04], [54_081, 0.06],
    [68_350, 0.08], [349_137, 0.093], [418_961, 0.103], [698_274, 0.113],
    [Infinity, 0.123],
  ],
  CT: [
    [10_000, 0.02], [50_000, 0.045], [100_000, 0.055],
    [200_000, 0.06], [250_000, 0.065], [500_000, 0.069], [Infinity, 0.0699],
  ],
  MD: [
    [1_000, 0.02], [2_000, 0.03], [3_000, 0.04], [100_000, 0.0475],
    [125_000, 0.05], [150_000, 0.0525], [250_000, 0.055], [Infinity, 0.0575],
  ],
  MN: [
    [31_690, 0.0535], [104_090, 0.068], [193_240, 0.0785], [Infinity, 0.0985],
  ],
  NJ: [
    [20_000, 0.014], [35_000, 0.0175], [40_000, 0.035],
    [75_000, 0.05525], [500_000, 0.0637], [1_000_000, 0.0897], [Infinity, 0.1075],
  ],
  NY: [
    [17_150, 0.04], [23_600, 0.045], [27_900, 0.0525],
    [161_550, 0.0585], [323_200, 0.0625], [2_155_350, 0.0685], [Infinity, 0.0965],
  ],
  OH: [[26_050, 0], [100_000, 0.0275], [Infinity, 0.035]],
  OR: [
    [18_400, 0.0475], [46_200, 0.0675], [250_000, 0.0875], [Infinity, 0.099],
  ],
  VA: [
    [3_000, 0.02], [5_000, 0.03], [17_000, 0.05], [Infinity, 0.0575],
  ],
  WI: [
    [14_320, 0.035], [28_640, 0.044], [315_310, 0.053], [Infinity, 0.0765],
  ],
}

const STATES: { code: string; name: string }[] = [
  { code: 'AK', name: 'Alaska (no tax)' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'FL', name: 'Florida (no tax)' },
  { code: 'GA', name: 'Georgia' },
  { code: 'IL', name: 'Illinois' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NV', name: 'Nevada (no tax)' },
  { code: 'NY', name: 'New York' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'SD', name: 'South Dakota (no tax)' },
  { code: 'TX', name: 'Texas (no tax)' },
  { code: 'UT', name: 'Utah' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington (no tax)' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming (no tax)' },
]

const RSU_SCHEDULES: { value: RsuSchedule; label: string }[] = [
  { value: '4yr-equal', label: '4-Year Equal (25% / yr)' },
  { value: '4yr-backloaded', label: '4-Year Backloaded — Amazon (5/15/40/40%)' },
  { value: '3yr-equal', label: '3-Year Equal (~33% / yr)' },
  { value: '2yr-equal', label: '2-Year Equal (50% / yr)' },
  { value: '1yr-cliff', label: '1-Year Cliff (100% Year 1)' },
]

const OFFER_COLORS = [
  { accent: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400' },
  { accent: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' },
  { accent: '#7c3aed', bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', bar: 'bg-violet-400' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
const pct = (n: number) => (n * 100).toFixed(1) + '%'

function applyBrackets(income: number, brackets: Bracket[]): number {
  if (income <= 0 || brackets.length === 0) return 0
  let tax = 0, prev = 0
  for (const [upTo, rate] of brackets) {
    if (income <= prev) break
    tax += (Math.min(income, upTo) - prev) * rate
    prev = upTo
  }
  return tax
}

function calcFederalTax(taxable: number, status: FilingStatus): number {
  return applyBrackets(Math.max(0, taxable), status === 'single' ? FED_SINGLE : FED_MARRIED)
}

function calcStateTax(income: number, state: string): number {
  return applyBrackets(Math.max(0, income), STATE_BRACKETS[state] ?? [])
}

function calcFica(gross: number): number {
  const ss = Math.min(gross, SS_WAGE_BASE) * 0.062
  const med = gross * 0.0145 + Math.max(0, gross - 200_000) * 0.009
  return ss + med
}

function rsuVest(total: number, schedule: RsuSchedule, year: 1 | 2 | 3 | 4): number {
  if (total === 0) return 0
  const table: Record<RsuSchedule, number[]> = {
    '4yr-equal':      [0.25, 0.25, 0.25, 0.25],
    '4yr-backloaded': [0.05, 0.15, 0.40, 0.40],
    '3yr-equal':      [1/3,  1/3,  1/3,  0],
    '2yr-equal':      [0.5,  0.5,  0,    0],
    '1yr-cliff':      [1.0,  0,    0,    0],
  }
  return total * (table[schedule][year - 1] ?? 0)
}

function calcYear(offer: Offer, year: 1 | 2 | 3 | 4, status: FilingStatus): YearBreakdown {
  const grossBase = offer.baseSalary
  const grossBonus = offer.baseSalary * (offer.annualBonusPct / 100)
  const grossSigning = year === 1 ? offer.signingBonus : 0
  const grossRsu = rsuVest(offer.rsuTotalGrant, offer.rsuSchedule, year)
  const grossTotal = grossBase + grossBonus + grossSigning + grossRsu

  const k401 = Math.min(offer.baseSalary * (offer.k401Pct / 100), K401_LIMIT)
  const deduction = STD_DEDUCTION[status]

  const federalTaxable = Math.max(0, grossTotal - k401 - deduction)
  const stateTaxable = Math.max(0, grossTotal - k401)

  const federalTax = calcFederalTax(federalTaxable, status)
  const stateTax = calcStateTax(stateTaxable, offer.state)
  const ficaTax = calcFica(grossTotal)
  const totalTax = federalTax + stateTax + ficaTax

  const netIncome = grossTotal - k401 - totalTax
  const effectiveTaxRate = grossTotal > 0 ? totalTax / grossTotal : 0

  return {
    year, grossBase, grossBonus, grossSigning, grossRsu, k401,
    grossTotal, federalTax, stateTax, ficaTax, totalTax, netIncome, effectiveTaxRate,
  }
}

const DEFAULT_OFFER = (): Offer => ({
  id: genId(),
  label: 'Company',
  title: 'Software Engineer',
  state: 'CA',
  baseSalary: 150_000,
  annualBonusPct: 15,
  signingBonus: 0,
  rsuTotalGrant: 200_000,
  rsuSchedule: '4yr-equal',
  k401Pct: 10,
})

// ─── Small field components ────────────────────────────────────────────────────

function TField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input text-sm py-1.5"
      />
    </div>
  )
}

function NField({
  label, value, onChange, prefix, suffix, step = 1000, hint,
}: {
  label: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {hint && <span className="ml-1 text-slate-400 font-normal">({hint})</span>}
      </label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={0}
          step={step}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className={`input text-sm py-1.5 ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">{suffix}</span>}
      </div>
    </div>
  )
}

function SField<T extends string>({
  label, value, onChange, options,
}: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="input text-sm py-1.5"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── OfferCard ────────────────────────────────────────────────────────────────

function OfferCard({
  offer, index, colors, onChange, onRemove, canRemove,
}: {
  offer: Offer
  index: number
  colors: typeof OFFER_COLORS[0]
  onChange: (o: Offer) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const set = <K extends keyof Offer>(key: K, val: Offer[K]) => onChange({ ...offer, [key]: val })

  return (
    <div className="card p-5 space-y-3" style={{ borderTop: `3px solid ${colors.accent}` }}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors.badge}`}>
          Offer {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <TField label="Company" value={offer.label} onChange={v => set('label', v)} />
      <TField label="Job Title" value={offer.title} onChange={v => set('title', v)} />
      <SField
        label="Location (State)"
        value={offer.state}
        onChange={v => set('state', v)}
        options={STATES.map(s => ({ value: s.code, label: s.name }))}
      />

      <div className="border-t border-slate-100 pt-3 space-y-3">
        <NField label="Base Salary" value={offer.baseSalary} onChange={v => set('baseSalary', v)} prefix="$" />
        <NField label="Annual Bonus" value={offer.annualBonusPct} onChange={v => set('annualBonusPct', v)} suffix="% of base" step={1} />
        <NField label="Signing Bonus" value={offer.signingBonus} onChange={v => set('signingBonus', v)} prefix="$" hint="Year 1 only" />
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-3">
        <NField label="RSU Total Grant" value={offer.rsuTotalGrant} onChange={v => set('rsuTotalGrant', v)} prefix="$" hint="full 4-yr value" />
        <SField
          label="Vesting Schedule"
          value={offer.rsuSchedule}
          onChange={v => set('rsuSchedule', v)}
          options={RSU_SCHEDULES}
        />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <NField label="401(k) Contribution" value={offer.k401Pct} onChange={v => set('k401Pct', v)} suffix="% of base" step={1} hint="pre-tax, max $23,500" />
      </div>
    </div>
  )
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function Row({ label, value, bold, dim }: { label: string; value: string; bold?: boolean; dim?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={`text-xs ${dim ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-xs font-mono tabular-nums ${bold ? 'font-bold text-slate-800' : dim ? 'text-slate-400' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  )
}

function ResultCard({
  offer, breakdown, colors,
}: {
  offer: Offer
  breakdown: YearBreakdown
  colors: typeof OFFER_COLORS[0]
}) {
  const stateName = STATES.find(s => s.code === offer.state)?.name ?? offer.state

  return (
    <div className="card p-5" style={{ borderTop: `3px solid ${colors.accent}` }}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <Briefcase size={13} style={{ color: colors.accent }} />
          <p className="font-bold text-slate-800 text-sm">{offer.label}</p>
        </div>
        <p className="text-xs text-slate-500">{offer.title} · {stateName}</p>
      </div>

      {/* Gross income */}
      <div className="space-y-0.5 mb-3">
        <Row label="Base Salary" value={fmt(breakdown.grossBase)} />
        <Row label={`Bonus (${offer.annualBonusPct}%)`} value={fmt(breakdown.grossBonus)} />
        {breakdown.grossSigning > 0 && <Row label="Signing Bonus" value={fmt(breakdown.grossSigning)} />}
        {breakdown.grossRsu > 0 && <Row label="RSU Vesting" value={fmt(breakdown.grossRsu)} />}
        <div className="border-t border-slate-100 my-1" />
        <Row label="Gross Total" value={fmt(breakdown.grossTotal)} bold />
      </div>

      {/* Deductions & taxes */}
      <div className="space-y-0.5 mb-4">
        {breakdown.k401 > 0 && <Row label="401(k) Pre-Tax" value={`– ${fmt(breakdown.k401)}`} dim />}
        <Row label="Federal Income Tax" value={`– ${fmt(breakdown.federalTax)}`} dim />
        <Row label="State Income Tax" value={`– ${fmt(breakdown.stateTax)}`} dim />
        <Row label="FICA (SS + Medicare)" value={`– ${fmt(breakdown.ficaTax)}`} dim />
      </div>

      {/* Net */}
      <div className={`rounded-xl p-3.5 ${colors.bg} border ${colors.border}`}>
        <div className="flex justify-between items-baseline mb-1">
          <span className={`text-xs font-semibold ${colors.text}`}>Net Take-Home</span>
          <span className={`text-lg font-bold ${colors.text}`}>{fmt(breakdown.netIncome)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Effective tax rate</span>
          <span className="text-xs font-semibold text-slate-600">{pct(breakdown.effectiveTaxRate)}</span>
        </div>
        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bar}`}
            style={{ width: `${Math.min(100, breakdown.effectiveTaxRate * 100 * 3)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Year-by-year summary table ───────────────────────────────────────────────

function YearTable({
  offers, filingStatus, colors,
}: {
  offers: Offer[]
  filingStatus: FilingStatus
  colors: typeof OFFER_COLORS
}) {
  const years = [1, 2, 3, 4] as const
  const data = offers.map(o => years.map(y => calcYear(o, y, filingStatus)))
  const allNets = data.flatMap(rows => rows.map(r => r.netIncome))
  const maxNet = Math.max(...allNets)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-800">Year-by-Year Net Take-Home</p>
        <span className="text-xs text-slate-400">After tax, after 401(k)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-2.5 font-semibold text-slate-500 w-36">Offer</th>
              {years.map(y => (
                <th key={y} className="text-right px-4 py-2.5 font-semibold text-slate-500">Year {y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offers.map((offer, oi) => (
              <tr key={offer.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[oi].accent }} />
                    <span className="font-medium text-slate-700 truncate max-w-[100px]">{offer.label}</span>
                  </div>
                </td>
                {data[oi].map((bd, yi) => (
                  <td key={yi} className="px-4 py-3 text-right">
                    <div className="font-semibold text-slate-800 tabular-nums">{fmt(bd.netIncome)}</div>
                    {/* Mini bar */}
                    <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-20 ml-auto">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxNet > 0 ? (bd.netIncome / maxNet) * 100 : 0}%`,
                          backgroundColor: colors[oi].accent,
                        }}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function CareerSimulator() {
  const [offers, setOffers] = useState<Offer[]>([DEFAULT_OFFER()])
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single')
  const [selectedYear, setSelectedYear] = useState<1 | 2 | 3 | 4>(1)

  const addOffer = () => {
    if (offers.length < 3) setOffers(prev => [...prev, DEFAULT_OFFER()])
  }
  const removeOffer = (id: string) => setOffers(prev => prev.filter(o => o.id !== id))
  const updateOffer = (id: string, updated: Offer) =>
    setOffers(prev => prev.map(o => (o.id === id ? updated : o)))

  const breakdowns = useMemo(
    () => offers.map(o => calcYear(o, selectedYear, filingStatus)),
    [offers, selectedYear, filingStatus],
  )

  const colCls = offers.length === 1
    ? 'grid-cols-1 max-w-sm'
    : offers.length === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  const toggleCls = (active: boolean) =>
    `px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Career Offer Simulator</h1>
          <p className="text-slate-500 text-sm mt-1">
            Compare up to 3 offers side-by-side with after-tax income breakdown.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Filing status */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button className={toggleCls(filingStatus === 'single')} onClick={() => setFilingStatus('single')}>
              Single
            </button>
            <button className={toggleCls(filingStatus === 'married')} onClick={() => setFilingStatus('married')}>
              Married
            </button>
          </div>
          {/* Add offer */}
          {offers.length < 3 && (
            <button
              onClick={addOffer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Plus size={12} />
              Add Offer
            </button>
          )}
        </div>
      </div>

      {/* Offer input cards */}
      <div className={`grid gap-4 mb-6 ${colCls}`}>
        {offers.map((offer, i) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            index={i}
            colors={OFFER_COLORS[i]}
            onChange={updated => updateOffer(offer.id, updated)}
            onRemove={() => removeOffer(offer.id)}
            canRemove={offers.length > 1}
          />
        ))}
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-700">Year:</span>
        {([1, 2, 3, 4] as const).map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedYear === y
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Year {y}
          </button>
        ))}
      </div>

      <div className={`grid gap-4 mb-6 ${colCls}`}>
        {offers.map((offer, i) => (
          <ResultCard
            key={offer.id}
            offer={offer}
            breakdown={breakdowns[i]}
            colors={OFFER_COLORS[i]}
          />
        ))}
      </div>

      {/* Year-by-year table */}
      <div className="mb-6">
        <YearTable offers={offers} filingStatus={filingStatus} colors={OFFER_COLORS} />
      </div>

      <p className="text-xs text-slate-400 text-center">
        2025 federal brackets · Simplified state income tax rates · For general planning only — consult a tax professional for personalized advice.
      </p>
    </div>
  )
}
