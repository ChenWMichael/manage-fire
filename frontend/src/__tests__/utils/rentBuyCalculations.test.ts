/**
 * Unit tests for src/utils/rentBuyCalculations.ts
 *
 * All functions are pure. No mocking required.
 */
import { describe, it, expect } from 'vitest'
import {
  getState,
  calculateRentVsBuy,
  getMonthlyCostBreakdown,
} from '../../utils/rentBuyCalculations'
import type { RentBuyInputs } from '../../utils/rentBuyCalculations'

// ─── getState ─────────────────────────────────────────────────────────────────

describe('getState', () => {
  it('returns correct data for a known state', () => {
    const tx = getState('TX')
    expect(tx.name).toBe('Texas')
    expect(tx.propertyTaxRate).toBe(1.80)
    expect(tx.stateTaxRate).toBe(0)
  })

  it('returns correct data for California', () => {
    const ca = getState('CA')
    expect(ca.name).toBe('California')
    expect(ca.stateTaxRate).toBe(9.30)
  })

  it('falls back to Texas for an unknown abbreviation', () => {
    const unknown = getState('XX')
    expect(unknown.abbr).toBe('TX')
  })
})

// ─── getMonthlyCostBreakdown ──────────────────────────────────────────────────

function makeBreakdownInputs(overrides: Partial<RentBuyInputs> = {}): RentBuyInputs {
  return {
    state: 'TX',
    homePrice: 400_000,
    downPaymentPct: 20,
    homeAppreciation: 3,
    mortgageRate: 6.0,
    loanTermYears: 30,
    monthlyRent: 2_000,
    annualRentIncrease: 3,
    rentersInsuranceAnnual: 300,
    yearsToAnalyze: 10,
    investmentReturn: 7,
    propertyTaxRate: 1.80,
    annualPropertyTaxIncrease: 2,
    homeInsuranceAnnual: 1_800,
    hoaMonthly: 0,
    maintenancePct: 1,
    pmiRate: 0.5,
    closingCostsPct: 3,
    sellingCostsPct: 6,
    federalTaxBracket: 22,
    stateTaxRate: 0,
    filingStatus: 'single',
    ...overrides,
  }
}

describe('getMonthlyCostBreakdown', () => {
  it('computes P&I close to the standard mortgage formula', () => {
    // 320,000 loan @ 6% / 12 = 0.5% / month, 360 payments
    // PI = 320000 * (0.005 * 1.005^360) / (1.005^360 - 1) ≈ 1918.56
    const breakdown = getMonthlyCostBreakdown(makeBreakdownInputs())
    expect(breakdown.principalAndInterest).toBeCloseTo(1918.56, 0)
  })

  it('no PMI when down payment >= 20%', () => {
    const breakdown = getMonthlyCostBreakdown(makeBreakdownInputs({ downPaymentPct: 20 }))
    expect(breakdown.pmi).toBe(0)
  })

  it('includes PMI when down payment < 20%', () => {
    const breakdown = getMonthlyCostBreakdown(makeBreakdownInputs({ downPaymentPct: 10 }))
    expect(breakdown.pmi).toBeGreaterThan(0)
  })

  it('totalBuy includes all cost components', () => {
    const b = getMonthlyCostBreakdown(makeBreakdownInputs())
    const expected = b.principalAndInterest + b.propertyTax + b.homeInsurance + b.hoa + b.maintenance + b.pmi
    expect(b.totalBuy).toBeCloseTo(expected, 2)
  })

  it('totalRent = rent + renters insurance', () => {
    const inputs = makeBreakdownInputs({ monthlyRent: 2_000, rentersInsuranceAnnual: 300 })
    const b = getMonthlyCostBreakdown(inputs)
    expect(b.totalRent).toBeCloseTo(2_000 + 300 / 12, 2)
  })
})

// ─── calculateRentVsBuy ───────────────────────────────────────────────────────

function makeRentBuyInputs(overrides: Partial<RentBuyInputs> = {}): RentBuyInputs {
  return makeBreakdownInputs({ yearsToAnalyze: 30, ...overrides })
}

describe('calculateRentVsBuy', () => {
  it('computes downPayment correctly', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs({ homePrice: 400_000, downPaymentPct: 20 }))
    expect(result.downPayment).toBe(80_000)
  })

  it('computes closingCosts correctly', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs({ homePrice: 400_000, closingCostsPct: 3 }))
    expect(result.closingCosts).toBe(12_000)
  })

  it('totalUpfront = downPayment + closingCosts', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs())
    expect(result.totalUpfront).toBeCloseTo(result.downPayment + result.closingCosts, 2)
  })

  it('pmiIncluded is false when down >= 20%', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs({ downPaymentPct: 20 }))
    expect(result.pmiIncluded).toBe(false)
  })

  it('pmiIncluded is true when down < 20%', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs({ downPaymentPct: 10 }))
    expect(result.pmiIncluded).toBe(true)
  })

  it('yearlyData length matches yearsToAnalyze', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs({ yearsToAnalyze: 15 }))
    expect(result.yearlyData).toHaveLength(15)
  })

  it('home value grows with appreciation over time', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs({ homePrice: 400_000, homeAppreciation: 3 }))
    const lastYear = result.yearlyData[result.yearlyData.length - 1]
    expect(lastYear.buyHomeValue).toBeGreaterThan(400_000)
  })

  it('cumulative rent paid increases each year', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs())
    const rents = result.yearlyData.map(y => y.cumulativeRentPaid)
    for (let i = 1; i < rents.length; i++) {
      expect(rents[i]).toBeGreaterThan(rents[i - 1])
    }
  })

  it('recommendation is one of buy | rent | neutral', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs())
    expect(['buy', 'rent', 'neutral']).toContain(result.recommendation)
  })

  it('netWorthDifference = buyFinalNetWorth - rentFinalNetWorth', () => {
    const result = calculateRentVsBuy(makeRentBuyInputs())
    expect(result.netWorthDifference).toBeCloseTo(
      result.buyFinalNetWorth - result.rentFinalNetWorth, 0
    )
  })
})
