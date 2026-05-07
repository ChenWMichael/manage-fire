export type FireType = 'regular' | 'coast'
export type ContributionFrequency = 'monthly' | 'semi-monthly' | 'biweekly'
export type AccountTaxType = 'taxable' | 'pre-tax' | 'roth'

export interface Account {
  id: string
  name: string
  taxType: AccountTaxType
  currentBalance: number
  contributionAmount: number
  contributionFrequency: ContributionFrequency
  annualCap: number | null
}

export interface HomePurchaseEvent {
  id: string
  type: 'home_purchase'
  label: string
  age: number
  downpayment: number
  monthlyContribReduction: number
}

export interface WindfallEvent {
  id: string
  type: 'windfall'
  label: string
  age: number
  amount: number
}

export interface ContributionChangeEvent {
  id: string
  type: 'contribution_change'
  label: string
  age: number
  newMonthlyAmount: number
}

export interface ReturnChangeEvent {
  id: string
  type: 'return_change'
  label: string
  age: number
  newAnnualReturn: number
}

export type OneTimeEvent = HomePurchaseEvent | WindfallEvent | ContributionChangeEvent | ReturnChangeEvent

export interface FireInputs {
  currentAge: number
  retirementAge: number
  accounts: Account[]
  annualExpenses: number
  expectedAnnualReturn: number
  withdrawalRate: number
  events: OneTimeEvent[]
  monteCarloEnabled: boolean
  returnStdDev: number
}

export interface YearlyProjection {
  year: number
  age: number
  investments: number
}

export interface PercentileBand {
  age: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface MonteCarloResult {
  successRate: number
  bands: PercentileBand[]
}

export interface Milestone {
  label: string
  fiNumber: number
  age: number | null
  year: number | null
  color: string
}

export interface FireResult {
  fiNumber: number
  yearsToFire: number | null
  fireAge: number | null
  coastFireNumber: number
  monthlyNeededForTarget: number | null
  effectiveMonthlyContrib: number
  projections: YearlyProjection[]
  accountProjections: Record<string, YearlyProjection[]>
  isAlreadyFi: boolean
  progressPercentage: number
  milestones: {
    coast: Milestone
    regular: Milestone
  }
  monteCarloResult: MonteCarloResult | null
}

export interface FireScenario {
  id: string
  user_id: string
  name: string
  current_age?: number
  retirement_age?: number
  current_savings?: number
  monthly_contribution?: number
  annual_expenses?: number
  expected_return?: number
  withdrawal_rate?: number
  fire_type?: FireType
  created_at: string
  updated_at: string
}

// ─── Credit Card Portfolio ────────────────────────────────────────────────────

export type RewardType = 'cashback' | 'points'

export type SpendingCategory =
  | 'dining'
  | 'groceries'
  | 'gas'
  | 'flights'
  | 'hotels'
  | 'streaming'
  | 'drugstore'
  | 'transit'
  | 'onlineShopping'
  | 'utilities'
  | 'entertainment'
  | 'warehouse'
  | 'base'

export interface CardRewards {
  dining: number
  groceries: number
  gas: number
  flights: number
  hotels: number
  streaming: number
  drugstore: number
  transit: number
  onlineShopping: number
  utilities: number
  entertainment: number
  warehouse: number
  base: number
  [key: string]: number
}

export interface CreditCard {
  id: string
  name: string
  issuer: string
  rewardType: RewardType
  rewards: CardRewards
  annualFee: number
  note?: string
}

export interface CustomCategory {
  id: string
  label: string
  emoji: string
}

export interface CustomCard {
  id: string
  name: string
  issuer: string
  rewardType: RewardType
  annualFee: number
  rewards: Record<string, number>
  note?: string
  isCustom: true
}

export interface CreditCardPortfolio {
  wallet: string[]
  wishlist: string[]
  customCategories: CustomCategory[]
  customCards: CustomCard[]
  rateOverrides: Record<string, Record<string, number>>
  coverageThreshold: number
}

// ─── FIRE type metadata ───────────────────────────────────────────────────────

export const FIRE_TYPE_META: Record<string, { label: string; description: string; color: string }> = {
  regular: { label: 'FIRE', description: 'Standard retirement based on your annual expenses', color: 'text-fire-700 bg-fire-50 border-fire-200' },
  coast: { label: 'CoastFIRE', description: 'Save now, let it grow, coast to retirement', color: 'text-blue-600 bg-blue-50 border-blue-200' },
}
