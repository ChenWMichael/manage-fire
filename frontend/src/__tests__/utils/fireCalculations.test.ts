/**
 * Unit tests for src/utils/fireCalculations.ts
 *
 * All calculation functions are pure (no side effects, no external deps),
 * so no mocking is required. Monte Carlo is disabled in all tests to keep
 * assertions deterministic.
 */
import { describe, it, expect } from 'vitest'
import {
  accountEffectiveMonthly,
  calculateFire,
  formatCurrency,
  formatCurrencyFull,
} from '../../utils/fireCalculations'
import type { Account, FireInputs } from '../../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Brokerage',
    taxType: 'taxable',
    currentBalance: 50_000,
    contributionAmount: 1_000,
    contributionFrequency: 'monthly',
    annualCap: null,
    ...overrides,
  }
}

function makeInputs(overrides: Partial<FireInputs> = {}): FireInputs {
  return {
    currentAge: 30,
    retirementAge: 65,
    accounts: [makeAccount()],
    annualExpenses: 60_000,
    expectedAnnualReturn: 7,
    withdrawalRate: 4,
    events: [],
    monteCarloEnabled: false,
    returnStdDev: 10,
    ...overrides,
  }
}

// ─── accountEffectiveMonthly ──────────────────────────────────────────────────

describe('accountEffectiveMonthly', () => {
  it('monthly frequency: contributionAmount * 12 / 12 = contributionAmount', () => {
    const acc = makeAccount({ contributionAmount: 1_000, contributionFrequency: 'monthly', annualCap: null })
    expect(accountEffectiveMonthly(acc)).toBeCloseTo(1_000, 4)
  })

  it('semi-monthly frequency: contributionAmount * 24 / 12', () => {
    const acc = makeAccount({ contributionAmount: 500, contributionFrequency: 'semi-monthly', annualCap: null })
    expect(accountEffectiveMonthly(acc)).toBeCloseTo(1_000, 4)
  })

  it('biweekly frequency: contributionAmount * 26 / 12', () => {
    const acc = makeAccount({ contributionAmount: 500, contributionFrequency: 'biweekly', annualCap: null })
    expect(accountEffectiveMonthly(acc)).toBeCloseTo((500 * 26) / 12, 4)
  })

  it('annual cap limits effective monthly contribution', () => {
    // $1000/mo * 12 = $12,000/yr; cap at $6,000 → effective $500/mo
    const acc = makeAccount({ contributionAmount: 1_000, contributionFrequency: 'monthly', annualCap: 6_000 })
    expect(accountEffectiveMonthly(acc)).toBeCloseTo(500, 4)
  })

  it('annual cap above actual contribution has no effect', () => {
    const acc = makeAccount({ contributionAmount: 500, contributionFrequency: 'monthly', annualCap: 100_000 })
    expect(accountEffectiveMonthly(acc)).toBeCloseTo(500, 4)
  })
})

// ─── calculateFire — FI Number ────────────────────────────────────────────────

describe('calculateFire — FI number', () => {
  it('FI number = annualExpenses * (100 / withdrawalRate)', () => {
    const result = calculateFire(makeInputs({ annualExpenses: 60_000, withdrawalRate: 4 }))
    expect(result.fiNumber).toBe(1_500_000)
  })

  it('FI number scales linearly with annual expenses', () => {
    const r1 = calculateFire(makeInputs({ annualExpenses: 40_000 }))
    const r2 = calculateFire(makeInputs({ annualExpenses: 80_000 }))
    expect(r2.fiNumber).toBe(r1.fiNumber * 2)
  })
})

// ─── calculateFire — Already FI ───────────────────────────────────────────────

describe('calculateFire — already FI', () => {
  it('isAlreadyFi true when total balance >= FI number', () => {
    const result = calculateFire(makeInputs({
      accounts: [makeAccount({ currentBalance: 2_000_000 })],
    }))
    expect(result.isAlreadyFi).toBe(true)
  })

  it('isAlreadyFi false when total balance < FI number', () => {
    const result = calculateFire(makeInputs({
      accounts: [makeAccount({ currentBalance: 50_000 })],
    }))
    expect(result.isAlreadyFi).toBe(false)
  })

  it('progress capped at 100 when overfunded', () => {
    const result = calculateFire(makeInputs({
      accounts: [makeAccount({ currentBalance: 5_000_000 })],
    }))
    expect(result.progressPercentage).toBe(100)
  })
})

// ─── calculateFire — Progress Percentage ─────────────────────────────────────

describe('calculateFire — progress percentage', () => {
  it('50% progress when savings is half FI number', () => {
    // fi_number = 1,500,000; balance = 750,000 → 50%
    const result = calculateFire(makeInputs({
      accounts: [makeAccount({ currentBalance: 750_000 })],
      annualExpenses: 60_000,
      withdrawalRate: 4,
    }))
    expect(result.progressPercentage).toBeCloseTo(50, 1)
  })
})

// ─── calculateFire — Projections ─────────────────────────────────────────────

describe('calculateFire — projections', () => {
  it('produces 61 entries for age 30 (years 0–60)', () => {
    const result = calculateFire(makeInputs({ currentAge: 30 }))
    expect(result.projections).toHaveLength(61)
  })

  it('produces 51 entries for age 50 (capped at 100-50=50 years)', () => {
    const result = calculateFire(makeInputs({ currentAge: 50 }))
    expect(result.projections).toHaveLength(51)
  })

  it('year-0 investments equal total account balances', () => {
    const result = calculateFire(makeInputs({
      accounts: [makeAccount({ currentBalance: 75_000 })],
    }))
    expect(result.projections[0].investments).toBe(75_000)
  })

  it('year-0 age matches currentAge', () => {
    const result = calculateFire(makeInputs({ currentAge: 32 }))
    expect(result.projections[0].age).toBe(32)
  })

  it('portfolio grows over time with positive contributions and return', () => {
    const result = calculateFire(makeInputs({
      accounts: [makeAccount({ currentBalance: 10_000, contributionAmount: 500 })],
      expectedAnnualReturn: 7,
    }))
    const last = result.projections[result.projections.length - 1]
    expect(last.investments).toBeGreaterThan(10_000)
  })
})

// ─── calculateFire — CoastFIRE ────────────────────────────────────────────────

describe('calculateFire — coastFireNumber', () => {
  it('coast number < FI number when retirement is in the future', () => {
    const result = calculateFire(makeInputs({ currentAge: 30, retirementAge: 65 }))
    expect(result.coastFireNumber).toBeLessThan(result.fiNumber)
  })

  it('coast number equals FI number when retirement is now', () => {
    const result = calculateFire(makeInputs({ currentAge: 65, retirementAge: 65 }))
    expect(result.coastFireNumber).toBe(result.fiNumber)
  })

  it('coast number formula: fiNumber / (1 + r) ^ yearsToRetirement', () => {
    const result = calculateFire(makeInputs({
      currentAge: 30, retirementAge: 65,
      annualExpenses: 60_000, withdrawalRate: 4,
      expectedAnnualReturn: 7,
    }))
    const expected = Math.round(1_500_000 / Math.pow(1.07, 35))
    expect(result.coastFireNumber).toBe(expected)
  })
})

// ─── calculateFire — One-Time Events ─────────────────────────────────────────

describe('calculateFire — events', () => {
  it('windfall at age 31 increases investments in that year', () => {
    const withoutWindfall = calculateFire(makeInputs({ currentAge: 30 }))
    const withWindfall = calculateFire(makeInputs({
      currentAge: 30,
      events: [{ id: 'e1', type: 'windfall', label: 'Bonus', age: 31, amount: 100_000 }],
    }))
    // Year 1 is age 31
    expect(withWindfall.projections[1].investments).toBeGreaterThan(
      withoutWindfall.projections[1].investments
    )
  })

  it('contribution_change event updates monthly contribution going forward', () => {
    const base = calculateFire(makeInputs({ currentAge: 30 }))
    const withChange = calculateFire(makeInputs({
      currentAge: 30,
      events: [{
        id: 'e1', type: 'contribution_change', label: 'Raise',
        age: 35, newMonthlyAmount: 5_000,
      }],
    }))
    // After the change kicks in, portfolio should grow faster
    const lastBase = base.projections[base.projections.length - 1].investments
    const lastChanged = withChange.projections[withChange.projections.length - 1].investments
    expect(lastChanged).toBeGreaterThan(lastBase)
  })
})

// ─── calculateFire — Monthly Needed ──────────────────────────────────────────

describe('calculateFire — monthlyNeededForTarget', () => {
  it('is null when retirementAge equals currentAge', () => {
    const result = calculateFire(makeInputs({ currentAge: 65, retirementAge: 65 }))
    expect(result.monthlyNeededForTarget).toBeNull()
  })

  it('is 0 when savings alone will reach FI number by retirement', () => {
    const result = calculateFire(makeInputs({
      accounts: [makeAccount({ currentBalance: 5_000_000, contributionAmount: 0 })],
    }))
    expect(result.monthlyNeededForTarget).toBe(0)
  })
})

// ─── calculateFire — Monte Carlo disabled ────────────────────────────────────

describe('calculateFire — monteCarloResult', () => {
  it('monteCarloResult is null when disabled', () => {
    const result = calculateFire(makeInputs({ monteCarloEnabled: false }))
    expect(result.monteCarloResult).toBeNull()
  })

  it('monteCarloResult is present when enabled', () => {
    const result = calculateFire(makeInputs({ monteCarloEnabled: true }))
    expect(result.monteCarloResult).not.toBeNull()
    expect(result.monteCarloResult!.successRate).toBeGreaterThanOrEqual(0)
    expect(result.monteCarloResult!.successRate).toBeLessThanOrEqual(100)
    expect(result.monteCarloResult!.bands.length).toBeGreaterThan(0)
  })
})

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats millions with two decimal places', () => {
    expect(formatCurrency(1_500_000)).toBe('$1.50M')
  })

  it('formats thousands with no decimal places', () => {
    expect(formatCurrency(75_000)).toBe('$75K')
  })

  it('formats small values as plain dollars', () => {
    expect(formatCurrency(500)).toBe('$500')
  })

  it('formats exactly 1 million', () => {
    expect(formatCurrency(1_000_000)).toBe('$1.00M')
  })
})

// ─── formatCurrencyFull ───────────────────────────────────────────────────────

describe('formatCurrencyFull', () => {
  it('returns USD-formatted string with no decimals', () => {
    expect(formatCurrencyFull(1_500_000)).toBe('$1,500,000')
  })

  it('includes thousands separator', () => {
    expect(formatCurrencyFull(10_000)).toBe('$10,000')
  })
})

// ─── Performance ─────────────────────────────────────────────────────────────

describe('calculateFire — performance', () => {
  it('completes in under 10ms', () => {
    const start = performance.now()
    calculateFire(makeInputs())
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(10)
  })
})
