/**
 * Unit tests for src/utils/offerSimulatorCalculations.ts
 *
 * All functions are pure. No mocking required.
 */
import { describe, it, expect } from 'vitest'
import {
  applyBrackets,
  calcFederalTax,
  calcStateTax,
  calcFica,
  rsuVest,
  calcYear,
  k401AnnualLimit,
  FED_SINGLE,
  SS_WAGE_BASE,
  K401_BASE,
  K401_CATCHUP_50,
  K401_CATCHUP_60,
  type Offer,
} from '../../utils/offerSimulatorCalculations'

// ─── applyBrackets ────────────────────────────────────────────────────────────

describe('applyBrackets', () => {
  it('returns 0 for zero income', () => {
    expect(applyBrackets(0, FED_SINGLE)).toBe(0)
  })

  it('returns 0 for empty brackets (no-tax state)', () => {
    expect(applyBrackets(100_000, [])).toBe(0)
  })

  it('applies single bracket correctly (income fully within first bracket)', () => {
    // first FED_SINGLE bracket: up to $11,925 at 10%
    expect(applyBrackets(10_000, FED_SINGLE)).toBeCloseTo(1_000, 2)
  })

  it('applies progressive brackets correctly (income spanning two brackets)', () => {
    // $11,925 @ 10% + $75 @ 12% = 1192.5 + 9 = 1201.5
    expect(applyBrackets(12_000, FED_SINGLE)).toBeCloseTo(1_201.5, 1)
  })

  it('returns 0 for negative income', () => {
    expect(applyBrackets(-500, FED_SINGLE)).toBe(0)
  })

  it('applies flat-rate bracket correctly', () => {
    // CO flat rate: 4.4%
    const CO_BRACKETS: [number, number][] = [[Infinity, 0.044]]
    expect(applyBrackets(100_000, CO_BRACKETS)).toBeCloseTo(4_400, 2)
  })
})

// ─── calcFederalTax ───────────────────────────────────────────────────────────

describe('calcFederalTax', () => {
  it('returns 0 for zero taxable income', () => {
    expect(calcFederalTax(0, 'single')).toBe(0)
  })

  it('clamps negative taxable income to 0', () => {
    expect(calcFederalTax(-1_000, 'single')).toBe(0)
  })

  it('single filer: 10% bracket', () => {
    // $10,000 @ 10% = $1,000
    expect(calcFederalTax(10_000, 'single')).toBeCloseTo(1_000, 2)
  })

  it('married filer pays less tax than single at same income due to wider brackets', () => {
    const single = calcFederalTax(100_000, 'single')
    const married = calcFederalTax(100_000, 'married')
    expect(married).toBeLessThan(single)
  })

  it('higher income produces higher tax', () => {
    expect(calcFederalTax(200_000, 'single')).toBeGreaterThan(calcFederalTax(100_000, 'single'))
  })
})

// ─── calcStateTax ─────────────────────────────────────────────────────────────

describe('calcStateTax', () => {
  it('returns 0 for Texas (no income tax)', () => {
    expect(calcStateTax(200_000, 'TX')).toBe(0)
  })

  it('returns 0 for Florida (no income tax)', () => {
    expect(calcStateTax(200_000, 'FL')).toBe(0)
  })

  it('returns 0 for unknown state (falls back to empty brackets)', () => {
    expect(calcStateTax(100_000, 'ZZ')).toBe(0)
  })

  it('applies Colorado flat rate of 4.4%', () => {
    expect(calcStateTax(100_000, 'CO')).toBeCloseTo(4_400, 2)
  })

  it('applies California progressive brackets', () => {
    // CA first bracket: up to $10,412 at 1%
    const tax = calcStateTax(10_000, 'CA')
    expect(tax).toBeCloseTo(100, 1)
  })

  it('clamps negative income to 0', () => {
    expect(calcStateTax(-5_000, 'CA')).toBe(0)
  })
})

// ─── calcFica ─────────────────────────────────────────────────────────────────

describe('calcFica', () => {
  it('calculates SS + Medicare for income below SS wage base', () => {
    // SS: 100,000 * 0.062 = 6,200 | Medicare: 100,000 * 0.0145 = 1,450 | Total: 7,650
    expect(calcFica(100_000)).toBeCloseTo(7_650, 1)
  })

  it('caps Social Security at SS_WAGE_BASE — extra income only adds Medicare', () => {
    // Stay below $200k to avoid the additional Medicare surtax (keeps the math clean)
    const atBase = calcFica(SS_WAGE_BASE)        // 176,100
    const slightlyAbove = calcFica(180_000)       // 180,000 — above SS cap but below $200k
    const extra = 180_000 - SS_WAGE_BASE          // 3,900 extra income above SS cap
    // SS is fully capped; only Medicare (1.45%) should grow
    expect(slightlyAbove - atBase).toBeCloseTo(extra * 0.0145, 1)
  })

  it('includes additional 0.9% Medicare surtax above $200,000', () => {
    const at200k = calcFica(200_000)
    const at250k = calcFica(250_000)
    // Extra 50,000 adds: 50,000 * 0.0145 Medicare + 50,000 * 0.009 surtax = 725 + 450 = 1,175
    expect(at250k - at200k).toBeCloseTo(1_175, 1)
  })

  it('returns a positive value for any positive income', () => {
    expect(calcFica(50_000)).toBeGreaterThan(0)
  })
})

// ─── rsuVest ──────────────────────────────────────────────────────────────────

describe('rsuVest', () => {
  it('returns 0 when total grant is 0', () => {
    expect(rsuVest(0, '4yr-equal', 1)).toBe(0)
  })

  it('4yr-equal: vests 25% each year', () => {
    expect(rsuVest(100_000, '4yr-equal', 1)).toBe(25_000)
    expect(rsuVest(100_000, '4yr-equal', 2)).toBe(25_000)
    expect(rsuVest(100_000, '4yr-equal', 3)).toBe(25_000)
    expect(rsuVest(100_000, '4yr-equal', 4)).toBe(25_000)
  })

  it('4yr-backloaded: vests 5/15/40/40% (Amazon schedule)', () => {
    expect(rsuVest(100_000, '4yr-backloaded', 1)).toBeCloseTo(5_000, 2)
    expect(rsuVest(100_000, '4yr-backloaded', 2)).toBeCloseTo(15_000, 2)
    expect(rsuVest(100_000, '4yr-backloaded', 3)).toBeCloseTo(40_000, 2)
    expect(rsuVest(100_000, '4yr-backloaded', 4)).toBeCloseTo(40_000, 2)
  })

  it('1yr-cliff: vests 100% in year 1, nothing after', () => {
    expect(rsuVest(100_000, '1yr-cliff', 1)).toBe(100_000)
    expect(rsuVest(100_000, '1yr-cliff', 2)).toBe(0)
    expect(rsuVest(100_000, '1yr-cliff', 3)).toBe(0)
    expect(rsuVest(100_000, '1yr-cliff', 4)).toBe(0)
  })

  it('3yr-equal: year 4 vests nothing', () => {
    expect(rsuVest(90_000, '3yr-equal', 4)).toBe(0)
  })

  it('2yr-equal: vests 50% per year', () => {
    expect(rsuVest(100_000, '2yr-equal', 1)).toBeCloseTo(50_000, 2)
    expect(rsuVest(100_000, '2yr-equal', 2)).toBeCloseTo(50_000, 2)
    expect(rsuVest(100_000, '2yr-equal', 3)).toBe(0)
  })
})

// ─── calcYear ─────────────────────────────────────────────────────────────────

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'test-offer',
    label: 'Test Co',
    title: 'Engineer',
    state: 'TX',
    baseSalary: 120_000,
    annualBonusPct: 10,
    signingBonus: 20_000,
    rsuTotalGrant: 100_000,
    rsuSchedule: '4yr-equal',
    k401Pct: 10,
    ...overrides,
  }
}

describe('k401AnnualLimit', () => {
  it('returns base limit for age under 50', () => {
    expect(k401AnnualLimit(30)).toBe(K401_BASE)
    expect(k401AnnualLimit(49)).toBe(K401_BASE)
  })

  it('returns base + catch-up for age 50-59', () => {
    expect(k401AnnualLimit(50)).toBe(K401_BASE + K401_CATCHUP_50)
    expect(k401AnnualLimit(59)).toBe(K401_BASE + K401_CATCHUP_50)
  })

  it('returns base + super catch-up for age 60-63 (SECURE 2.0)', () => {
    expect(k401AnnualLimit(60)).toBe(K401_BASE + K401_CATCHUP_60)
    expect(k401AnnualLimit(63)).toBe(K401_BASE + K401_CATCHUP_60)
  })

  it('returns base + regular catch-up for age 64+', () => {
    expect(k401AnnualLimit(64)).toBe(K401_BASE + K401_CATCHUP_50)
    expect(k401AnnualLimit(70)).toBe(K401_BASE + K401_CATCHUP_50)
  })

  it('super catch-up is larger than regular catch-up', () => {
    expect(K401_CATCHUP_60).toBeGreaterThan(K401_CATCHUP_50)
  })
})

describe('calcYear', () => {
  it('grossBase equals base salary', () => {
    const r = calcYear(makeOffer(), 1, 'single', 30)
    expect(r.grossBase).toBe(120_000)
  })

  it('year 1 includes signing bonus', () => {
    const r = calcYear(makeOffer({ signingBonus: 20_000 }), 1, 'single', 30)
    expect(r.grossSigning).toBe(20_000)
  })

  it('year 2+ does not include signing bonus', () => {
    const r = calcYear(makeOffer({ signingBonus: 20_000 }), 2, 'single', 30)
    expect(r.grossSigning).toBe(0)
  })

  it('401(k) is capped at base limit for age < 50', () => {
    // baseSalary 400,000 at 10% = 40,000, capped at K401_BASE
    const r = calcYear(makeOffer({ baseSalary: 400_000, k401Pct: 10 }), 1, 'single', 30)
    expect(r.k401).toBe(K401_BASE)
  })

  it('401(k) uses catch-up limit for age 50-59', () => {
    const r = calcYear(makeOffer({ baseSalary: 400_000, k401Pct: 10 }), 1, 'single', 55)
    expect(r.k401).toBe(K401_BASE + K401_CATCHUP_50)
  })

  it('401(k) uses super catch-up limit for age 60-63', () => {
    const r = calcYear(makeOffer({ baseSalary: 400_000, k401Pct: 10 }), 1, 'single', 62)
    expect(r.k401).toBe(K401_BASE + K401_CATCHUP_60)
  })

  it('netIncome = grossTotal - k401 - totalTax', () => {
    const r = calcYear(makeOffer(), 1, 'single', 30)
    expect(r.netIncome).toBeCloseTo(r.grossTotal - r.k401 - r.totalTax, 1)
  })

  it('no-tax state produces stateTax of 0', () => {
    const r = calcYear(makeOffer({ state: 'TX' }), 1, 'single', 30)
    expect(r.stateTax).toBe(0)
  })

  it('high-tax state produces stateTax > 0', () => {
    const r = calcYear(makeOffer({ state: 'CA' }), 1, 'single', 30)
    expect(r.stateTax).toBeGreaterThan(0)
  })

  it('effectiveTaxRate = totalTax / grossTotal', () => {
    const r = calcYear(makeOffer(), 1, 'single', 30)
    expect(r.effectiveTaxRate).toBeCloseTo(r.totalTax / r.grossTotal, 6)
  })

  it('totalTax = federalTax + stateTax + ficaTax', () => {
    const r = calcYear(makeOffer(), 1, 'single', 30)
    expect(r.totalTax).toBeCloseTo(r.federalTax + r.stateTax + r.ficaTax, 2)
  })
})
