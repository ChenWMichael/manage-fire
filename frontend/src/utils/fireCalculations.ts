import type { FireInputs, FireResult, YearlyProjection } from '../types'

function findMilestoneAge(
  projections: YearlyProjection[],
  targetAmount: number,
  startInvestments: number,
): { age: number | null; year: number | null } {
  if (startInvestments >= targetAmount) {
    return { age: projections[0]?.age ?? null, year: 0 }
  }
  for (const p of projections) {
    if (p.investments >= targetAmount) return { age: p.age, year: p.year }
  }
  return { age: null, year: null }
}

export function calculateFire(inputs: FireInputs): FireResult {
  const {
    currentAge, retirementAge,
    currentSavings, savingsGrowthRate,
    currentInvestments, contributionAmount, contributionFrequency,
    annualExpenses, expectedAnnualReturn, withdrawalRate,
    events,
  } = inputs

  // Normalize contribution to monthly
  const baseMonthlyContrib = contributionFrequency === 'biweekly'
    ? (contributionAmount * 26) / 12
    : contributionAmount

  const rInvMonthly = expectedAnnualReturn / 100 / 12
  const rSavMonthly = savingsGrowthRate / 100 / 12

  // FIRE milestone targets — lean/fat derived from annual expenses
  const fiNumber = annualExpenses * (100 / withdrawalRate)

  const isAlreadyFi = currentInvestments >= fiNumber
  const progressPercentage = fiNumber > 0 ? Math.min(100, (currentInvestments / fiNumber) * 100) : 0

  // Projection loop — apply events at the start of each age year
  const projections: YearlyProjection[] = []
  let investments = currentInvestments
  let savings = currentSavings
  let effectiveMonthly = baseMonthlyContrib
  const maxYears = Math.min(60, 100 - currentAge)

  for (let year = 0; year <= maxYears; year++) {
    const age = currentAge + year

    // Events fire at the beginning of the age year they're set on
    for (const event of events.filter((e) => e.age === age)) {
      if (event.type === 'windfall') {
        if (event.destination === 'investments') investments += event.amount
        else savings += event.amount
      } else if (event.type === 'home_purchase') {
        if (event.source === 'investments') {
          investments = Math.max(0, investments - event.downpayment)
        } else {
          savings = Math.max(0, savings - event.downpayment)
        }
        effectiveMonthly = Math.max(0, effectiveMonthly - event.monthlyContribReduction)
      }
    }

    projections.push({
      year,
      age,
      investments: Math.round(investments),
      savings: Math.round(savings),
    })

    // Compound forward one year with monthly periods
    for (let m = 0; m < 12; m++) {
      investments = investments * (1 + rInvMonthly) + effectiveMonthly
      savings = savings * (1 + rSavMonthly)
    }
  }

  // CoastFIRE number: how much invested today grows to fiNumber by retirement with no contributions
  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const rInvAnnual = expectedAnnualReturn / 100
  const coastFireNumber =
    yearsToRetirement > 0 && rInvAnnual > 0
      ? fiNumber / Math.pow(1 + rInvAnnual, yearsToRetirement)
      : fiNumber

  const milestones: FireResult['milestones'] = {
    coast:   { label: 'CoastFIRE', fiNumber: Math.round(coastFireNumber),  ...findMilestoneAge(projections, coastFireNumber, currentInvestments), color: '#2563eb' },
    regular: { label: 'FIRE',      fiNumber: Math.round(fiNumber),         ...findMilestoneAge(projections, fiNumber,        currentInvestments), color: '#059669' },
  }

  // Monthly contribution needed to reach fiNumber by retirement age (ignoring events)
  const monthsToRetirement = yearsToRetirement * 12
  let monthlyNeededForTarget: number | null = null
  if (monthsToRetirement > 0) {
    if (rInvMonthly > 0) {
      const fvCurrent = currentInvestments * Math.pow(1 + rInvMonthly, monthsToRetirement)
      const remaining = fiNumber - fvCurrent
      monthlyNeededForTarget =
        remaining <= 0 ? 0 : (remaining * rInvMonthly) / (Math.pow(1 + rInvMonthly, monthsToRetirement) - 1)
    } else {
      monthlyNeededForTarget = Math.max(0, (fiNumber - currentInvestments) / monthsToRetirement)
    }
  }

  return {
    fiNumber: Math.round(fiNumber),
    yearsToFire: milestones.regular.year,
    fireAge: milestones.regular.age,
    coastFireNumber: Math.round(coastFireNumber),
    monthlyNeededForTarget: monthlyNeededForTarget !== null ? Math.round(monthlyNeededForTarget) : null,
    effectiveMonthlyContrib: Math.round(baseMonthlyContrib),
    projections,
    isAlreadyFi,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
    milestones,
  }
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
