import { getState, STATE_DATA } from './rentBuyCalculations'
export { STATE_DATA }

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilingStatus = 'single' | 'married_joint' | 'head_of_household'
export type CreditScoreRange = 'excellent' | 'very_good' | 'good' | 'fair' | 'poor'
export type LoanTerm = 15 | 20 | 30

export interface HouseAffordabilityInputs {
  filingStatus: FilingStatus
  annualIncome1: number
  annualIncome2: number
  monthlyDebt: number

  availableSavings: number
  cashReserves: number
  downPaymentPct: number
  giftFundsAmount: number

  state: string
  propertyTaxRate: number

  creditScoreRange: CreditScoreRange
  useCustomRate: boolean
  mortgageRate: number
  loanTermYears: LoanTerm

  hoaMonthly: number
  homeInsuranceAnnual: number
  maintenancePct: number

  roommateCount: number
  roommateRentMonthly: number

  targetHomePrice: number

  // Advanced
  pmiRate: number
  closingCostsPct: number
  homeAppreciation: number
  opportunityReturn: number
  frontEndRatioTarget: number
  backEndRatioTarget: number
}

export interface MonthlyBreakdown {
  principalAndInterest: number
  propertyTax: number
  homeInsurance: number
  pmi: number
  hoa: number
  maintenance: number
  totalWithMaintenance: number
  totalLenderDTI: number  // excludes maintenance (per lender convention)
}

export interface UpfrontCosts {
  downPayment: number
  closingCosts: number
  cashReserves: number
  giftFunds: number
  totalRequired: number
  availableSavings: number
  surplus: number
}

export interface AffordabilityTier {
  label: string
  price: number
  multiple: number
  color: string
  colorBg: string
  tag: string
}

export interface SensitivityPoint {
  price: number
  monthly: number
  netMonthly: number
  frontEndDTI: number
  backEndDTI: number
}

export interface HouseAffordabilityResult {
  grossMonthlyIncome: number
  annualIncome: number
  roommateMonthlyIncome: number
  qualifyingMonthlyIncome: number

  estimatedRate: number
  effectiveRate: number

  maxPriceByFrontEnd: number
  maxPriceByBackEnd: number
  maxPriceByDownPayment: number
  effectiveMaxPrice: number

  monthlyAtMax: MonthlyBreakdown
  frontEndRatioAtMax: number
  backEndRatioAtMax: number

  targetMonthly: MonthlyBreakdown | null
  targetFrontEndRatio: number
  targetBackEndRatio: number
  targetVerdict: 'comfortable' | 'stretched' | 'unaffordable' | null

  tiers: AffordabilityTier[]
  upfrontCosts: UpfrontCosts
  sensitivityData: SensitivityPoint[]
}

// ─── Credit score → rate tables ───────────────────────────────────────────────

const ESTIMATED_RATES: Record<LoanTerm, Record<CreditScoreRange, number>> = {
  30: { excellent: 6.50, very_good: 6.75, good: 7.00, fair: 7.50, poor: 8.25 },
  20: { excellent: 6.25, very_good: 6.50, good: 6.75, fair: 7.25, poor: 8.00 },
  15: { excellent: 5.90, very_good: 6.15, good: 6.40, fair: 6.90, poor: 7.65 },
}

export const CREDIT_SCORE_LABELS: Record<CreditScoreRange, string> = {
  excellent: 'Excellent (760+)',
  very_good: 'Very Good (720–759)',
  good: 'Good (680–719)',
  fair: 'Fair (640–679)',
  poor: 'Poor (below 640)',
}

export function getEstimatedRate(score: CreditScoreRange, term: LoanTerm): number {
  return ESTIMATED_RATES[term][score]
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

function piRatioFactor(annualRatePct: number, termYears: number): number {
  const r = annualRatePct / 100 / 12
  const n = termYears * 12
  if (r === 0) return 1 / n
  return (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function calcMonthlyBreakdown(homePrice: number, inputs: HouseAffordabilityInputs, rate: number): MonthlyBreakdown {
  const downFrac = inputs.downPaymentPct / 100
  const loanAmount = homePrice * (1 - downFrac)
  const piFactor = piRatioFactor(rate, inputs.loanTermYears)
  const principalAndInterest = loanAmount * piFactor
  const propertyTax = (homePrice * inputs.propertyTaxRate) / 100 / 12
  const homeInsurance = inputs.homeInsuranceAnnual / 12
  const pmi = downFrac < 0.2 ? (homePrice * inputs.pmiRate) / 100 / 12 : 0
  const hoa = inputs.hoaMonthly
  const maintenance = (homePrice * inputs.maintenancePct) / 100 / 12
  const totalLenderDTI = principalAndInterest + propertyTax + homeInsurance + pmi + hoa
  const totalWithMaintenance = totalLenderDTI + maintenance
  return { principalAndInterest, propertyTax, homeInsurance, pmi, hoa, maintenance, totalLenderDTI, totalWithMaintenance }
}

// Solve algebraically for max home price given a monthly housing budget
function maxPriceForBudget(
  maxMonthlyHousing: number,
  inputs: HouseAffordabilityInputs,
  rate: number,
): number {
  if (maxMonthlyHousing <= 0) return 0
  const downFrac = inputs.downPaymentPct / 100
  const piFactor = piRatioFactor(rate, inputs.loanTermYears)
  const pmiMultiplier = downFrac < 0.2 ? 1 : 0

  // costs per dollar of home price (excluding fixed: HOA, insurance)
  const variableCostPerDollar =
    (1 - downFrac) * piFactor +
    inputs.propertyTaxRate / 100 / 12 +
    (pmiMultiplier * inputs.pmiRate) / 100 / 12

  const fixedMonthly = inputs.hoaMonthly + inputs.homeInsuranceAnnual / 12
  const availableForVariable = maxMonthlyHousing - fixedMonthly

  if (availableForVariable <= 0 || variableCostPerDollar <= 0) return 0
  return availableForVariable / variableCostPerDollar
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function calculateHouseAffordability(inputs: HouseAffordabilityInputs): HouseAffordabilityResult {
  const annualIncome = inputs.annualIncome1 + (inputs.filingStatus === 'married_joint' ? inputs.annualIncome2 : 0)
  const grossMonthlyIncome = annualIncome / 12

  const estimatedRate = getEstimatedRate(inputs.creditScoreRange, inputs.loanTermYears)
  const effectiveRate = inputs.useCustomRate ? inputs.mortgageRate : estimatedRate

  // Roommate income: lenders count 75% of documented rental toward qualifying income
  const roommateMonthlyIncome = inputs.roommateCount * inputs.roommateRentMonthly
  const qualifyingMonthlyIncome = grossMonthlyIncome + roommateMonthlyIncome * 0.75

  // Max prices by different constraints
  const maxMonthlyFrontEnd = (qualifyingMonthlyIncome * inputs.frontEndRatioTarget) / 100
  const maxPriceByFrontEnd = maxPriceForBudget(maxMonthlyFrontEnd, inputs, effectiveRate)

  const maxMonthlyBackEnd = (qualifyingMonthlyIncome * inputs.backEndRatioTarget) / 100 - inputs.monthlyDebt
  const maxPriceByBackEnd = maxPriceForBudget(maxMonthlyBackEnd, inputs, effectiveRate)

  const downFrac = inputs.downPaymentPct / 100
  const availableForDown = Math.max(0, inputs.availableSavings + inputs.giftFundsAmount - inputs.cashReserves)
  const maxPriceByDownPayment =
    inputs.closingCostsPct + inputs.downPaymentPct > 0
      ? availableForDown / ((inputs.downPaymentPct + inputs.closingCostsPct) / 100)
      : Infinity

  const effectiveMaxPrice = Math.min(maxPriceByFrontEnd, maxPriceByBackEnd, maxPriceByDownPayment > 1e9 ? Infinity : maxPriceByDownPayment)

  // Monthly breakdown at effective max
  const monthlyAtMax = calcMonthlyBreakdown(effectiveMaxPrice, inputs, effectiveRate)
  const frontEndRatioAtMax = qualifyingMonthlyIncome > 0 ? (monthlyAtMax.totalLenderDTI / qualifyingMonthlyIncome) * 100 : 0
  const backEndRatioAtMax = qualifyingMonthlyIncome > 0 ? ((monthlyAtMax.totalLenderDTI + inputs.monthlyDebt) / qualifyingMonthlyIncome) * 100 : 0

  // Target price analysis
  let targetMonthly: MonthlyBreakdown | null = null
  let targetFrontEndRatio = 0
  let targetBackEndRatio = 0
  let targetVerdict: HouseAffordabilityResult['targetVerdict'] = null

  if (inputs.targetHomePrice > 0) {
    targetMonthly = calcMonthlyBreakdown(inputs.targetHomePrice, inputs, effectiveRate)
    targetFrontEndRatio = qualifyingMonthlyIncome > 0 ? (targetMonthly.totalLenderDTI / qualifyingMonthlyIncome) * 100 : 0
    targetBackEndRatio = qualifyingMonthlyIncome > 0 ? ((targetMonthly.totalLenderDTI + inputs.monthlyDebt) / qualifyingMonthlyIncome) * 100 : 0

    if (targetFrontEndRatio <= inputs.frontEndRatioTarget && targetBackEndRatio <= inputs.backEndRatioTarget) {
      targetVerdict = 'comfortable'
    } else if (targetFrontEndRatio <= inputs.frontEndRatioTarget + 5 && targetBackEndRatio <= inputs.backEndRatioTarget + 5) {
      targetVerdict = 'stretched'
    } else {
      targetVerdict = 'unaffordable'
    }
  }

  // Income multiple tiers
  const tiers: AffordabilityTier[] = [
    { label: 'Conservative',  multiple: 2.5, price: annualIncome * 2.5, color: 'text-emerald-700', colorBg: 'bg-emerald-50 border-emerald-200', tag: '2.5× income' },
    { label: 'Moderate',      multiple: 3,   price: annualIncome * 3,   color: 'text-sky-700',     colorBg: 'bg-sky-50 border-sky-200',         tag: '3× income'   },
    { label: 'Comfortable',   multiple: 4,   price: annualIncome * 4,   color: 'text-violet-700',  colorBg: 'bg-violet-50 border-violet-200',   tag: '4× income'   },
    { label: 'Aggressive',    multiple: 5,   price: annualIncome * 5,   color: 'text-orange-700',  colorBg: 'bg-orange-50 border-orange-200',   tag: '5× income'   },
  ]

  // Upfront costs at effective max
  const downPayment = effectiveMaxPrice * downFrac
  const closingCosts = (effectiveMaxPrice * inputs.closingCostsPct) / 100
  const totalRequired = downPayment + closingCosts + inputs.cashReserves
  const upfrontCosts: UpfrontCosts = {
    downPayment,
    closingCosts,
    cashReserves: inputs.cashReserves,
    giftFunds: inputs.giftFundsAmount,
    totalRequired,
    availableSavings: inputs.availableSavings,
    surplus: inputs.availableSavings + inputs.giftFundsAmount - totalRequired,
  }

  // Price sensitivity (50% to 150% of effectiveMax or a capped range)
  const basePrice = Math.min(effectiveMaxPrice, maxPriceByBackEnd) || 500000
  const minPrice = Math.round(basePrice * 0.4 / 50000) * 50000
  const maxPrice = Math.round(basePrice * 1.6 / 50000) * 50000
  const step = Math.round((maxPrice - minPrice) / 10 / 25000) * 25000 || 25000
  const sensitivityData: SensitivityPoint[] = []
  for (let price = minPrice; price <= maxPrice; price += step) {
    const mb = calcMonthlyBreakdown(price, inputs, effectiveRate)
    sensitivityData.push({
      price,
      monthly: mb.totalLenderDTI,
      netMonthly: Math.max(0, mb.totalLenderDTI - roommateMonthlyIncome),
      frontEndDTI: qualifyingMonthlyIncome > 0 ? (mb.totalLenderDTI / qualifyingMonthlyIncome) * 100 : 0,
      backEndDTI: qualifyingMonthlyIncome > 0 ? ((mb.totalLenderDTI + inputs.monthlyDebt) / qualifyingMonthlyIncome) * 100 : 0,
    })
  }

  return {
    grossMonthlyIncome,
    annualIncome,
    roommateMonthlyIncome,
    qualifyingMonthlyIncome,
    estimatedRate,
    effectiveRate,
    maxPriceByFrontEnd,
    maxPriceByBackEnd,
    maxPriceByDownPayment,
    effectiveMaxPrice,
    monthlyAtMax,
    frontEndRatioAtMax,
    backEndRatioAtMax,
    targetMonthly,
    targetFrontEndRatio,
    targetBackEndRatio,
    targetVerdict,
    tiers,
    upfrontCosts,
    sensitivityData,
  }
}

export function getDefaultPropertyTaxRate(stateAbbr: string): number {
  return getState(stateAbbr).propertyTaxRate
}
