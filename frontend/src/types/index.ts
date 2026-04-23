export type FireType = 'regular' | 'coast'
export type ContributionFrequency = 'monthly' | 'biweekly'

export interface HomePurchaseEvent {
  id: string
  type: 'home_purchase'
  label: string
  age: number
  downpayment: number
  monthlyContribReduction: number // amount subtracted from monthly investment contribution after purchase
  source: 'investments' | 'savings'
}

export interface WindfallEvent {
  id: string
  type: 'windfall'
  label: string
  age: number
  amount: number
  destination: 'investments' | 'savings'
}

export type OneTimeEvent = HomePurchaseEvent | WindfallEvent

export interface FireInputs {
  currentAge: number
  retirementAge: number
  // Liquid savings / emergency fund
  currentSavings: number
  savingsGrowthRate: number
  // Investment portfolio (counts toward FIRE)
  currentInvestments: number
  contributionAmount: number
  contributionFrequency: ContributionFrequency
  // Retirement spending (lean/fat are derived: 0.6x and 1.5x)
  annualExpenses: number
  expectedAnnualReturn: number
  withdrawalRate: number
  // Life events
  events: OneTimeEvent[]
}

export interface YearlyProjection {
  year: number
  age: number
  investments: number
  savings: number
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
  isAlreadyFi: boolean
  progressPercentage: number
  milestones: {
    coast: Milestone
    regular: Milestone
  }
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

export const FIRE_TYPE_META: Record<string, { label: string; description: string; color: string }> = {
  regular: { label: 'FIRE', description: 'Standard retirement, $40k–$80k/year', color: 'text-fire-700 bg-fire-50 border-fire-200' },
  coast: { label: 'CoastFIRE', description: 'Save now, let it grow, coast to retirement', color: 'text-blue-600 bg-blue-50 border-blue-200' },
}
