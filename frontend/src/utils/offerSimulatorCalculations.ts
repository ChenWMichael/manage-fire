// ─── Types ────────────────────────────────────────────────────────────────────

export type FilingStatus = 'single' | 'married'
export type RsuSchedule = '4yr-equal' | '4yr-backloaded' | '3yr-equal' | '2yr-equal' | '1yr-cliff'
export type Bracket = [number, number] // [upTo, rate]

export interface Offer {
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

export interface YearBreakdown {
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

export const FED_SINGLE: Bracket[] = [
  [11_925, 0.10], [48_475, 0.12], [103_350, 0.22],
  [197_300, 0.24], [250_525, 0.32], [626_350, 0.35], [Infinity, 0.37],
]
export const FED_MARRIED: Bracket[] = [
  [23_850, 0.10], [96_950, 0.12], [206_700, 0.22],
  [394_600, 0.24], [501_050, 0.32], [751_600, 0.35], [Infinity, 0.37],
]
export const STD_DEDUCTION: Record<FilingStatus, number> = { single: 15_000, married: 30_000 }
export const SS_WAGE_BASE = 176_100
export const K401_LIMIT = 23_500

export const STATE_BRACKETS: Record<string, Bracket[]> = {
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

// ─── Pure calculation functions ───────────────────────────────────────────────

export function applyBrackets(income: number, brackets: Bracket[]): number {
  if (income <= 0 || brackets.length === 0) return 0
  let tax = 0, prev = 0
  for (const [upTo, rate] of brackets) {
    if (income <= prev) break
    tax += (Math.min(income, upTo) - prev) * rate
    prev = upTo
  }
  return tax
}

export function calcFederalTax(taxable: number, status: FilingStatus): number {
  return applyBrackets(Math.max(0, taxable), status === 'single' ? FED_SINGLE : FED_MARRIED)
}

export function calcStateTax(income: number, state: string): number {
  return applyBrackets(Math.max(0, income), STATE_BRACKETS[state] ?? [])
}

export function calcFica(gross: number): number {
  const ss = Math.min(gross, SS_WAGE_BASE) * 0.062
  const med = gross * 0.0145 + Math.max(0, gross - 200_000) * 0.009
  return ss + med
}

export function rsuVest(total: number, schedule: RsuSchedule, year: 1 | 2 | 3 | 4): number {
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

export function calcYear(offer: Offer, year: 1 | 2 | 3 | 4, status: FilingStatus): YearBreakdown {
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
