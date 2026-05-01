import type { Account, FireInputs, FireResult, MonteCarloResult, PercentileBand, YearlyProjection } from '../types'

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

// Box-Muller transform
function sampleNormal(mean: number, stddev: number): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return mean + stddev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function computePercentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

export function accountEffectiveMonthly(acc: Account): number {
  const perYear =
    acc.contributionFrequency === 'monthly' ? acc.contributionAmount * 12
    : acc.contributionFrequency === 'semi-monthly' ? acc.contributionAmount * 24
    : acc.contributionAmount * 26
  const capped = acc.annualCap !== null ? Math.min(perYear, acc.annualCap) : perYear
  return capped / 12
}

function totalEffectiveMonthly(accounts: Account[]): number {
  return accounts.reduce((s, a) => s + accountEffectiveMonthly(a), 0)
}

const MC_RUNS = 1000

function runMonteCarlo(inputs: FireInputs, fiNumber: number): MonteCarloResult {
  const { currentAge, retirementAge, accounts, annualExpenses, expectedAnnualReturn, returnStdDev, events } = inputs

  const baseMonthlyContrib = totalEffectiveMonthly(accounts)
  const currentInvestments = accounts.reduce((s, a) => s + a.currentBalance, 0)
  const monthlyExpense = annualExpenses / 12

  const maxYears = Math.min(60, 100 - currentAge)
  const retirementYear = Math.min(retirementAge - currentAge, maxYears)
  const numPoints = maxYears + 1
  const trajectorysByYear: number[][] = Array.from({ length: numPoints }, () => [])
  let successes = 0

  for (let sim = 0; sim < MC_RUNS; sim++) {
    let investments = currentInvestments
    let effectiveMonthly = baseMonthlyContrib
    let effectiveAnnualReturn = expectedAnnualReturn

    for (let year = 0; year <= maxYears; year++) {
      const age = currentAge + year
      const retired = age >= retirementAge

      for (const event of events.filter((e) => e.age === age)) {
        if (event.type === 'windfall') {
          investments += event.amount
        } else if (event.type === 'home_purchase') {
          investments = Math.max(0, investments - event.downpayment)
          effectiveMonthly = Math.max(0, effectiveMonthly - event.monthlyContribReduction)
        } else if (event.type === 'contribution_change') {
          effectiveMonthly = event.newMonthlyAmount
        } else if (event.type === 'return_change') {
          effectiveAnnualReturn = event.newAnnualReturn
        }
      }

      trajectorysByYear[year].push(investments)
      if (year === retirementYear && investments >= fiNumber) successes++

      // Clamp annual return to avoid extreme negative values blowing up calculations
      const annualReturn = Math.max(-0.9, sampleNormal(effectiveAnnualReturn / 100, returnStdDev / 100))
      const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1
      for (let m = 0; m < 12; m++) {
        if (retired) {
          investments = Math.max(0, investments * (1 + monthlyReturn) - monthlyExpense)
        } else {
          investments = Math.max(0, investments * (1 + monthlyReturn) + effectiveMonthly)
        }
      }
    }
  }

  const bands: PercentileBand[] = trajectorysByYear.map((yearValues, year) => {
    const sorted = [...yearValues].sort((a, b) => a - b)
    return {
      age: currentAge + year,
      p10: Math.round(computePercentile(sorted, 10)),
      p25: Math.round(computePercentile(sorted, 25)),
      p50: Math.round(computePercentile(sorted, 50)),
      p75: Math.round(computePercentile(sorted, 75)),
      p90: Math.round(computePercentile(sorted, 90)),
    }
  })

  return {
    successRate: Math.round((successes / MC_RUNS) * 100),
    bands,
  }
}

export function calculateFire(inputs: FireInputs): FireResult {
  const { currentAge, retirementAge, accounts, annualExpenses, expectedAnnualReturn, withdrawalRate, events, monteCarloEnabled } = inputs

  const currentInvestments = accounts.reduce((s, a) => s + a.currentBalance, 0)
  const baseMonthlyContrib = totalEffectiveMonthly(accounts)

  const rInvMonthlyBase = expectedAnnualReturn / 100 / 12
  let rInvMonthly = rInvMonthlyBase

  const fiNumber = annualExpenses * (100 / withdrawalRate)
  const isAlreadyFi = currentInvestments >= fiNumber
  const progressPercentage = fiNumber > 0 ? Math.min(100, (currentInvestments / fiNumber) * 100) : 0

  const projections: YearlyProjection[] = []
  let investments = currentInvestments
  let effectiveMonthly = baseMonthlyContrib
  const maxYears = Math.min(60, 100 - currentAge)

  const monthlyExpense = annualExpenses / 12

  for (let year = 0; year <= maxYears; year++) {
    const age = currentAge + year
    const retired = age >= retirementAge

    for (const event of events.filter((e) => e.age === age)) {
      if (event.type === 'windfall') {
        investments += event.amount
      } else if (event.type === 'home_purchase') {
        investments = Math.max(0, investments - event.downpayment)
        effectiveMonthly = Math.max(0, effectiveMonthly - event.monthlyContribReduction)
      } else if (event.type === 'contribution_change') {
        effectiveMonthly = event.newMonthlyAmount
      } else if (event.type === 'return_change') {
        rInvMonthly = event.newAnnualReturn / 100 / 12
      }
    }

    projections.push({ year, age, investments: Math.round(investments) })

    for (let m = 0; m < 12; m++) {
      if (retired) {
        investments = Math.max(0, investments * (1 + rInvMonthly) - monthlyExpense)
      } else {
        investments = investments * (1 + rInvMonthly) + effectiveMonthly
      }
    }
  }

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

  const monthsToRetirement = yearsToRetirement * 12
  let monthlyNeededForTarget: number | null = null
  if (monthsToRetirement > 0) {
    if (rInvMonthlyBase > 0) {
      const fvCurrent = currentInvestments * Math.pow(1 + rInvMonthlyBase, monthsToRetirement)
      const remaining = fiNumber - fvCurrent
      monthlyNeededForTarget =
        remaining <= 0 ? 0 : (remaining * rInvMonthlyBase) / (Math.pow(1 + rInvMonthlyBase, monthsToRetirement) - 1)
    } else {
      monthlyNeededForTarget = Math.max(0, (fiNumber - currentInvestments) / monthsToRetirement)
    }
  }

  const accountProjections: Record<string, YearlyProjection[]> = {}
  for (const acc of accounts) {
    const accMonthly = accountEffectiveMonthly(acc)
    let accBal = acc.currentBalance
    const accProj: YearlyProjection[] = []
    for (let year = 0; year <= maxYears; year++) {
      accProj.push({ year, age: currentAge + year, investments: Math.round(accBal) })
      for (let m = 0; m < 12; m++) {
        accBal = accBal * (1 + rInvMonthlyBase) + accMonthly
      }
    }
    accountProjections[acc.id] = accProj
  }

  return {
    fiNumber: Math.round(fiNumber),
    yearsToFire: milestones.regular.year,
    fireAge: milestones.regular.age,
    coastFireNumber: Math.round(coastFireNumber),
    monthlyNeededForTarget: monthlyNeededForTarget !== null ? Math.round(monthlyNeededForTarget) : null,
    effectiveMonthlyContrib: Math.round(baseMonthlyContrib),
    projections,
    accountProjections,
    isAlreadyFi,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
    milestones,
    monteCarloResult: monteCarloEnabled ? runMonteCarlo(inputs, fiNumber) : null,
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
