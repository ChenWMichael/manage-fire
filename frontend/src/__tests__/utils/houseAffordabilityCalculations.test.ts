/**
 * Unit tests for src/utils/houseAffordabilityCalculations.ts
 *
 * All functions are pure. No mocking required.
 */
import { describe, it, expect } from 'vitest'
import {
  getEstimatedRate,
  getDefaultPropertyTaxRate,
  calculateHouseAffordability,
} from '../../utils/houseAffordabilityCalculations'
import type { HouseAffordabilityInputs } from '../../utils/houseAffordabilityCalculations'

// ─── getEstimatedRate ─────────────────────────────────────────────────────────

describe('getEstimatedRate', () => {
  it('returns correct rate for excellent credit on 30-year term', () => {
    expect(getEstimatedRate('excellent', 30)).toBe(6.50)
  })

  it('returns correct rate for poor credit on 30-year term', () => {
    expect(getEstimatedRate('poor', 30)).toBe(8.25)
  })

  it('returns correct rate for excellent credit on 15-year term', () => {
    expect(getEstimatedRate('excellent', 15)).toBe(5.90)
  })

  it('returns correct rate for good credit on 20-year term', () => {
    expect(getEstimatedRate('good', 20)).toBe(6.75)
  })

  it('15-year rates are lower than 30-year for the same credit score', () => {
    expect(getEstimatedRate('excellent', 15)).toBeLessThan(getEstimatedRate('excellent', 30))
    expect(getEstimatedRate('good', 15)).toBeLessThan(getEstimatedRate('good', 30))
  })
})

// ─── getDefaultPropertyTaxRate ────────────────────────────────────────────────

describe('getDefaultPropertyTaxRate', () => {
  it('returns Texas property tax rate', () => {
    expect(getDefaultPropertyTaxRate('TX')).toBe(1.80)
  })

  it('returns California property tax rate', () => {
    expect(getDefaultPropertyTaxRate('CA')).toBe(0.75)
  })

  it('falls back to Texas for unknown state', () => {
    expect(getDefaultPropertyTaxRate('ZZ')).toBe(1.80)
  })
})

// ─── calculateHouseAffordability — helpers ────────────────────────────────────

function makeInputs(overrides: Partial<HouseAffordabilityInputs> = {}): HouseAffordabilityInputs {
  return {
    filingStatus: 'single',
    annualIncome1: 120_000,
    annualIncome2: 0,
    monthlyDebt: 500,
    availableSavings: 100_000,
    cashReserves: 10_000,
    downPaymentPct: 20,
    giftFundsAmount: 0,
    state: 'TX',
    propertyTaxRate: 1.80,
    creditScoreRange: 'good',
    useCustomRate: false,
    mortgageRate: 7.0,
    loanTermYears: 30,
    hoaMonthly: 0,
    homeInsuranceAnnual: 1_800,
    maintenancePct: 1,
    roommateCount: 0,
    roommateRentMonthly: 0,
    targetHomePrice: 0,
    pmiRate: 0.5,
    closingCostsPct: 3,
    homeAppreciation: 3,
    opportunityReturn: 7,
    frontEndRatioTarget: 28,
    backEndRatioTarget: 36,
    ...overrides,
  }
}

// ─── Income computation ───────────────────────────────────────────────────────

describe('calculateHouseAffordability — income', () => {
  it('grossMonthlyIncome = annualIncome1 / 12 for single filer', () => {
    const result = calculateHouseAffordability(makeInputs({ annualIncome1: 120_000 }))
    expect(result.grossMonthlyIncome).toBeCloseTo(10_000, 2)
  })

  it('includes annualIncome2 for married_joint', () => {
    const result = calculateHouseAffordability(makeInputs({
      filingStatus: 'married_joint',
      annualIncome1: 100_000,
      annualIncome2: 80_000,
    }))
    expect(result.annualIncome).toBe(180_000)
    expect(result.grossMonthlyIncome).toBeCloseTo(15_000, 2)
  })

  it('excludes annualIncome2 for single filer', () => {
    const result = calculateHouseAffordability(makeInputs({
      filingStatus: 'single',
      annualIncome1: 100_000,
      annualIncome2: 80_000,
    }))
    expect(result.annualIncome).toBe(100_000)
  })

  it('roommate income counted at 75% toward qualifying income', () => {
    const without = calculateHouseAffordability(makeInputs({ roommateCount: 0 }))
    const withRoommate = calculateHouseAffordability(makeInputs({
      roommateCount: 1,
      roommateRentMonthly: 1_000,
    }))
    // qualifyingMonthlyIncome += 1000 * 0.75 = 750
    expect(withRoommate.qualifyingMonthlyIncome).toBeCloseTo(
      without.qualifyingMonthlyIncome + 750, 2
    )
  })
})

// ─── Rate selection ───────────────────────────────────────────────────────────

describe('calculateHouseAffordability — rate', () => {
  it('uses estimated rate when useCustomRate is false', () => {
    const result = calculateHouseAffordability(makeInputs({
      creditScoreRange: 'good',
      loanTermYears: 30,
      useCustomRate: false,
    }))
    expect(result.effectiveRate).toBe(7.00)
  })

  it('uses custom rate when useCustomRate is true', () => {
    const result = calculateHouseAffordability(makeInputs({
      useCustomRate: true,
      mortgageRate: 5.5,
    }))
    expect(result.effectiveRate).toBe(5.5)
  })
})

// ─── Affordability tiers ──────────────────────────────────────────────────────

describe('calculateHouseAffordability — tiers', () => {
  it('produces exactly 4 tiers', () => {
    const result = calculateHouseAffordability(makeInputs())
    expect(result.tiers).toHaveLength(4)
  })

  it('tier prices are 2.5x, 3x, 4x, and 5x annual income', () => {
    const income = 120_000
    const result = calculateHouseAffordability(makeInputs({ annualIncome1: income }))
    const multiples = result.tiers.map(t => t.multiple)
    expect(multiples).toEqual([2.5, 3, 4, 5])
    result.tiers.forEach(tier => {
      expect(tier.price).toBeCloseTo(income * tier.multiple, 0)
    })
  })
})

// ─── Target price verdict ─────────────────────────────────────────────────────

describe('calculateHouseAffordability — target verdict', () => {
  it('verdict is null when targetHomePrice is 0', () => {
    const result = calculateHouseAffordability(makeInputs({ targetHomePrice: 0 }))
    expect(result.targetVerdict).toBeNull()
  })

  it('verdict is comfortable for a clearly affordable price', () => {
    // $100,000 home on $120,000 salary should be very comfortable
    const result = calculateHouseAffordability(makeInputs({ targetHomePrice: 100_000 }))
    expect(result.targetVerdict).toBe('comfortable')
  })

  it('verdict is unaffordable for an extreme price relative to income', () => {
    // $3,000,000 home on $120,000 salary should be unaffordable
    const result = calculateHouseAffordability(makeInputs({ targetHomePrice: 3_000_000 }))
    expect(result.targetVerdict).toBe('unaffordable')
  })

  it('targetMonthly is not null when targetHomePrice > 0', () => {
    const result = calculateHouseAffordability(makeInputs({ targetHomePrice: 400_000 }))
    expect(result.targetMonthly).not.toBeNull()
  })
})

// ─── Upfront costs ────────────────────────────────────────────────────────────

describe('calculateHouseAffordability — upfrontCosts', () => {
  it('totalRequired = downPayment + closingCosts + cashReserves', () => {
    const result = calculateHouseAffordability(makeInputs())
    const { downPayment, closingCosts, cashReserves, totalRequired } = result.upfrontCosts
    expect(totalRequired).toBeCloseTo(downPayment + closingCosts + cashReserves, 0)
  })

  it('surplus = availableSavings + giftFunds - totalRequired', () => {
    const inputs = makeInputs({ availableSavings: 100_000, giftFundsAmount: 20_000 })
    const result = calculateHouseAffordability(inputs)
    const { surplus, totalRequired } = result.upfrontCosts
    expect(surplus).toBeCloseTo(100_000 + 20_000 - totalRequired, 0)
  })
})

// ─── Max price constraints ────────────────────────────────────────────────────

describe('calculateHouseAffordability — effectiveMaxPrice', () => {
  it('effectiveMaxPrice is the minimum of all three constraints', () => {
    const result = calculateHouseAffordability(makeInputs())
    expect(result.effectiveMaxPrice).toBe(
      Math.min(result.maxPriceByFrontEnd, result.maxPriceByBackEnd, result.maxPriceByDownPayment)
    )
  })

  it('effectiveMaxPrice decreases when monthlyDebt increases', () => {
    const r1 = calculateHouseAffordability(makeInputs({ monthlyDebt: 0 }))
    const r2 = calculateHouseAffordability(makeInputs({ monthlyDebt: 1_000 }))
    expect(r2.effectiveMaxPrice).toBeLessThan(r1.effectiveMaxPrice)
  })

  it('effectiveMaxPrice increases with higher income', () => {
    const r1 = calculateHouseAffordability(makeInputs({ annualIncome1: 80_000 }))
    const r2 = calculateHouseAffordability(makeInputs({ annualIncome1: 160_000 }))
    expect(r2.effectiveMaxPrice).toBeGreaterThan(r1.effectiveMaxPrice)
  })
})
