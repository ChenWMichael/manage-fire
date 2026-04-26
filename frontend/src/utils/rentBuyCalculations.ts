// ─── State data ───────────────────────────────────────────────────────────────

export interface StateData {
  name: string
  abbr: string
  propertyTaxRate: number  // effective annual % of home value
  stateTaxRate: number     // top marginal income tax rate %
}

export const STATE_DATA: StateData[] = [
  { name: 'Alabama',        abbr: 'AL', propertyTaxRate: 0.41, stateTaxRate: 5.00 },
  { name: 'Alaska',         abbr: 'AK', propertyTaxRate: 1.04, stateTaxRate: 0    },
  { name: 'Arizona',        abbr: 'AZ', propertyTaxRate: 0.62, stateTaxRate: 2.50 },
  { name: 'Arkansas',       abbr: 'AR', propertyTaxRate: 0.61, stateTaxRate: 4.40 },
  { name: 'California',     abbr: 'CA', propertyTaxRate: 0.75, stateTaxRate: 9.30 },
  { name: 'Colorado',       abbr: 'CO', propertyTaxRate: 0.51, stateTaxRate: 4.40 },
  { name: 'Connecticut',    abbr: 'CT', propertyTaxRate: 2.14, stateTaxRate: 6.99 },
  { name: 'Delaware',       abbr: 'DE', propertyTaxRate: 0.57, stateTaxRate: 6.60 },
  { name: 'Florida',        abbr: 'FL', propertyTaxRate: 0.89, stateTaxRate: 0    },
  { name: 'Georgia',        abbr: 'GA', propertyTaxRate: 0.92, stateTaxRate: 5.49 },
  { name: 'Hawaii',         abbr: 'HI', propertyTaxRate: 0.28, stateTaxRate: 11.0 },
  { name: 'Idaho',          abbr: 'ID', propertyTaxRate: 0.69, stateTaxRate: 5.80 },
  { name: 'Illinois',       abbr: 'IL', propertyTaxRate: 2.27, stateTaxRate: 4.95 },
  { name: 'Indiana',        abbr: 'IN', propertyTaxRate: 0.85, stateTaxRate: 3.05 },
  { name: 'Iowa',           abbr: 'IA', propertyTaxRate: 1.57, stateTaxRate: 6.00 },
  { name: 'Kansas',         abbr: 'KS', propertyTaxRate: 1.41, stateTaxRate: 5.70 },
  { name: 'Kentucky',       abbr: 'KY', propertyTaxRate: 0.86, stateTaxRate: 4.00 },
  { name: 'Louisiana',      abbr: 'LA', propertyTaxRate: 0.55, stateTaxRate: 4.25 },
  { name: 'Maine',          abbr: 'ME', propertyTaxRate: 1.09, stateTaxRate: 7.15 },
  { name: 'Maryland',       abbr: 'MD', propertyTaxRate: 1.09, stateTaxRate: 5.75 },
  { name: 'Massachusetts',  abbr: 'MA', propertyTaxRate: 1.23, stateTaxRate: 5.00 },
  { name: 'Michigan',       abbr: 'MI', propertyTaxRate: 1.54, stateTaxRate: 4.25 },
  { name: 'Minnesota',      abbr: 'MN', propertyTaxRate: 1.12, stateTaxRate: 9.85 },
  { name: 'Mississippi',    abbr: 'MS', propertyTaxRate: 0.65, stateTaxRate: 4.70 },
  { name: 'Missouri',       abbr: 'MO', propertyTaxRate: 1.01, stateTaxRate: 5.40 },
  { name: 'Montana',        abbr: 'MT', propertyTaxRate: 0.84, stateTaxRate: 6.75 },
  { name: 'Nebraska',       abbr: 'NE', propertyTaxRate: 1.73, stateTaxRate: 5.84 },
  { name: 'Nevada',         abbr: 'NV', propertyTaxRate: 0.60, stateTaxRate: 0    },
  { name: 'New Hampshire',  abbr: 'NH', propertyTaxRate: 2.18, stateTaxRate: 0    },
  { name: 'New Jersey',     abbr: 'NJ', propertyTaxRate: 2.49, stateTaxRate: 10.75},
  { name: 'New Mexico',     abbr: 'NM', propertyTaxRate: 0.80, stateTaxRate: 5.90 },
  { name: 'New York',       abbr: 'NY', propertyTaxRate: 1.72, stateTaxRate: 6.85 },
  { name: 'North Carolina', abbr: 'NC', propertyTaxRate: 0.84, stateTaxRate: 4.50 },
  { name: 'North Dakota',   abbr: 'ND', propertyTaxRate: 0.98, stateTaxRate: 2.50 },
  { name: 'Ohio',           abbr: 'OH', propertyTaxRate: 1.59, stateTaxRate: 3.99 },
  { name: 'Oklahoma',       abbr: 'OK', propertyTaxRate: 0.90, stateTaxRate: 4.75 },
  { name: 'Oregon',         abbr: 'OR', propertyTaxRate: 0.97, stateTaxRate: 9.90 },
  { name: 'Pennsylvania',   abbr: 'PA', propertyTaxRate: 1.58, stateTaxRate: 3.07 },
  { name: 'Rhode Island',   abbr: 'RI', propertyTaxRate: 1.63, stateTaxRate: 5.99 },
  { name: 'South Carolina', abbr: 'SC', propertyTaxRate: 0.57, stateTaxRate: 6.50 },
  { name: 'South Dakota',   abbr: 'SD', propertyTaxRate: 1.31, stateTaxRate: 0    },
  { name: 'Tennessee',      abbr: 'TN', propertyTaxRate: 0.71, stateTaxRate: 0    },
  { name: 'Texas',          abbr: 'TX', propertyTaxRate: 1.80, stateTaxRate: 0    },
  { name: 'Utah',           abbr: 'UT', propertyTaxRate: 0.58, stateTaxRate: 4.65 },
  { name: 'Vermont',        abbr: 'VT', propertyTaxRate: 1.90, stateTaxRate: 8.75 },
  { name: 'Virginia',       abbr: 'VA', propertyTaxRate: 0.82, stateTaxRate: 5.75 },
  { name: 'Washington',     abbr: 'WA', propertyTaxRate: 0.93, stateTaxRate: 0    },
  { name: 'West Virginia',  abbr: 'WV', propertyTaxRate: 0.59, stateTaxRate: 5.12 },
  { name: 'Wisconsin',      abbr: 'WI', propertyTaxRate: 1.85, stateTaxRate: 7.65 },
  { name: 'Wyoming',        abbr: 'WY', propertyTaxRate: 0.61, stateTaxRate: 0    },
  { name: 'Washington D.C.', abbr: 'DC', propertyTaxRate: 0.56, stateTaxRate: 8.50 },
]

export function getState(abbr: string): StateData {
  return STATE_DATA.find((s) => s.abbr === abbr) ?? STATE_DATA[42] // TX fallback
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RentBuyInputs {
  // Location
  state: string

  // Property
  homePrice: number
  downPaymentPct: number      // % of home price
  homeAppreciation: number    // annual %

  // Mortgage
  mortgageRate: number        // annual %
  loanTermYears: 15 | 30

  // Rental alternative
  monthlyRent: number
  annualRentIncrease: number  // annual %
  rentersInsuranceAnnual: number

  // Analysis
  yearsToAnalyze: number
  investmentReturn: number    // annual % (opportunity cost)

  // Property costs
  propertyTaxRate: number          // annual % of home value (overridable, defaults from state)
  annualPropertyTaxIncrease: number // annual % increase in property tax bill
  homeInsuranceAnnual: number
  hoaMonthly: number
  maintenancePct: number      // annual % of home value
  pmiRate: number             // annual % of original loan (if down < 20%)
  closingCostsPct: number     // % of purchase price
  sellingCostsPct: number     // % of sale price at end of horizon

  // Tax
  federalTaxBracket: number   // marginal rate %
  stateTaxRate: number        // marginal rate % (overridable, defaults from state)
  filingStatus: 'single' | 'married_joint'
}

export interface YearlySnapshot {
  year: number

  // Buyer
  buyNetWorth: number         // home equity (net of selling costs) + side portfolio
  buyHomeValue: number
  buyRemainingMortgage: number
  buyHomeEquity: number       // homeValue - mortgage (pre-selling costs)
  buyMonthlyCost: number      // average monthly cost this year (P&I + taxes + etc)
  buyInterestPaid: number     // interest paid this year
  buyPrincipalPaid: number
  buyTaxSavings: number       // mortgage interest deduction benefit this year

  // Renter
  rentNetWorth: number        // investment portfolio value
  rentMonthlyCost: number     // rent this year
  cumulativeBuyOutOfPocket: number
  cumulativeRentPaid: number
}

export interface RentBuyResult {
  // Summary
  breakEvenYear: number | null
  recommendation: 'buy' | 'rent' | 'neutral'

  // Final numbers (at end of horizon)
  buyFinalNetWorth: number
  rentFinalNetWorth: number
  netWorthDifference: number  // positive = buy better, negative = rent better

  // Year 1 monthly costs
  buyMonthlyYear1: number
  rentMonthlyYear1: number
  pmiIncluded: boolean

  // Upfront
  downPayment: number
  closingCosts: number
  totalUpfront: number

  // First-year interest + tax
  firstYearInterest: number
  firstYearTaxSavings: number

  yearlyData: YearlySnapshot[]
}

// ─── Core calculation ─────────────────────────────────────────────────────────

export function calculateRentVsBuy(inputs: RentBuyInputs): RentBuyResult {
  const {
    homePrice, downPaymentPct, homeAppreciation,
    mortgageRate, loanTermYears,
    monthlyRent, annualRentIncrease, rentersInsuranceAnnual,
    yearsToAnalyze, investmentReturn,
    propertyTaxRate, annualPropertyTaxIncrease, homeInsuranceAnnual, hoaMonthly,
    maintenancePct, pmiRate, closingCostsPct, sellingCostsPct,
    federalTaxBracket, stateTaxRate, filingStatus,
  } = inputs

  const downPayment = homePrice * (downPaymentPct / 100)
  const loanAmount = homePrice - downPayment
  const closingCosts = homePrice * (closingCostsPct / 100)
  const totalUpfront = downPayment + closingCosts

  const monthlyMortgageRate = (mortgageRate / 100) / 12
  const nPayments = loanTermYears * 12

  // Monthly P&I payment
  const monthlyPaymentPI =
    loanAmount > 0 && monthlyMortgageRate > 0
      ? (loanAmount *
          (monthlyMortgageRate * Math.pow(1 + monthlyMortgageRate, nPayments))) /
        (Math.pow(1 + monthlyMortgageRate, nPayments) - 1)
      : loanAmount / nPayments  // 0% edge case

  const monthlyInvestRate = (investmentReturn / 100) / 12

  // Standard deduction 2025 values
  const standardDeduction = filingStatus === 'married_joint' ? 30_000 : 15_000
  const marginalTaxRate = (federalTaxBracket + stateTaxRate) / 100

  // PMI: applies when down < 20%, removed when LTV < 80% of original purchase price
  const basePmiMonthly =
    downPaymentPct < 20 ? (loanAmount * (pmiRate / 100)) / 12 : 0
  const pmiIncluded = downPaymentPct < 20

  const rentersInsuranceMonthly = rentersInsuranceAnnual / 12

  // Fixed monthly non-mortgage buy costs
  const monthlyInsurance = homeInsuranceAnnual / 12
  const monthlyMaintenance = (homePrice * (maintenancePct / 100)) / 12

  // Portfolio tracking
  let mortgageBalance = loanAmount
  let rentersPortfolio = totalUpfront  // renter invests the upfront costs the buyer spent
  let buyerSidePortfolio = 0           // buyer's cash savings when rent > housing cost

  const yearlyData: YearlySnapshot[] = []
  let breakEvenYear: number | null = null

  let cumulativeBuyOutOfPocket = totalUpfront
  let cumulativeRentPaid = 0

  let firstYearInterest = 0
  let firstYearTaxSavings = 0

  for (let year = 1; year <= yearsToAnalyze; year++) {
    // Rent grows annually
    const currentRentMonthly =
      monthlyRent * Math.pow(1 + annualRentIncrease / 100, year - 1)
    const homeValue = homePrice * Math.pow(1 + homeAppreciation / 100, year)

    let yearInterest = 0
    let yearPrincipal = 0
    let yearBuyTotal = 0
    let yearRentTotal = 0

    // Property tax grows annually from the year-1 base
    const annualPropertyTax =
      homePrice * (propertyTaxRate / 100) *
      Math.pow(1 + annualPropertyTaxIncrease / 100, year - 1)
    const monthlyPropertyTax = annualPropertyTax / 12

    for (let month = 1; month <= 12; month++) {
      const absMonth = (year - 1) * 12 + month

      let interest = 0
      let principal = 0

      if (absMonth <= nPayments && mortgageBalance > 0) {
        interest = mortgageBalance * monthlyMortgageRate
        principal = Math.min(mortgageBalance, monthlyPaymentPI - interest)
        mortgageBalance = Math.max(0, mortgageBalance - principal)
      }

      yearInterest += interest
      yearPrincipal += principal

      // PMI removed once LTV (vs original purchase price) drops below 80%
      const currentLtv = loanAmount > 0 ? mortgageBalance / homePrice : 0
      const pmiThisMonth = currentLtv > 0.80 ? basePmiMonthly : 0

      const housingMonthly =
        (absMonth <= nPayments ? monthlyPaymentPI : 0) +
        monthlyPropertyTax +
        monthlyInsurance +
        hoaMonthly +
        monthlyMaintenance +
        pmiThisMonth

      const rentThisMonth = currentRentMonthly + rentersInsuranceMonthly

      yearBuyTotal += housingMonthly
      yearRentTotal += rentThisMonth

      // Grow both portfolios, then apply monthly housing cost difference
      rentersPortfolio *= 1 + monthlyInvestRate
      buyerSidePortfolio *= 1 + monthlyInvestRate

      const surplus = housingMonthly - rentThisMonth
      if (surplus > 0) {
        // Housing more expensive → renter has extra to invest
        rentersPortfolio += surplus
      } else {
        // Rent more expensive → buyer has extra to invest in side portfolio
        buyerSidePortfolio += -surplus
      }
    }

    cumulativeBuyOutOfPocket += yearBuyTotal
    cumulativeRentPaid += yearRentTotal

    // Mortgage interest deduction: itemize only if (interest + capped property tax) > standard deduction
    const saltDeductible = Math.min(annualPropertyTax, 10_000)
    const totalItemized = yearInterest + saltDeductible
    const yearTaxSavings =
      Math.max(0, totalItemized - standardDeduction) * marginalTaxRate

    // Buyer reinvests tax savings (cash refund at year end, then invested)
    buyerSidePortfolio += yearTaxSavings

    // Net worth snapshot
    const sellingCosts = homeValue * (sellingCostsPct / 100)
    const buyHomeEquity = homeValue - mortgageBalance
    const buyNetWorth =
      homeValue - mortgageBalance - sellingCosts + buyerSidePortfolio
    const rentNetWorth = rentersPortfolio

    if (breakEvenYear === null && buyNetWorth >= rentNetWorth) {
      breakEvenYear = year
    }

    if (year === 1) {
      firstYearInterest = yearInterest
      firstYearTaxSavings = yearTaxSavings
    }

    yearlyData.push({
      year,
      buyNetWorth,
      buyHomeValue: homeValue,
      buyRemainingMortgage: mortgageBalance,
      buyHomeEquity,
      buyMonthlyCost: yearBuyTotal / 12,
      buyInterestPaid: yearInterest,
      buyPrincipalPaid: yearPrincipal,
      buyTaxSavings: yearTaxSavings,
      rentNetWorth,
      rentMonthlyCost: currentRentMonthly,
      cumulativeBuyOutOfPocket,
      cumulativeRentPaid,
    })
  }

  const last = yearlyData[yearlyData.length - 1]
  const diff = last.buyNetWorth - last.rentNetWorth
  const recommendation: 'buy' | 'rent' | 'neutral' =
    diff > last.rentNetWorth * 0.05
      ? 'buy'
      : diff < -last.rentNetWorth * 0.05
      ? 'rent'
      : 'neutral'

  return {
    breakEvenYear,
    recommendation,
    buyFinalNetWorth: last.buyNetWorth,
    rentFinalNetWorth: last.rentNetWorth,
    netWorthDifference: diff,
    buyMonthlyYear1: yearlyData[0]?.buyMonthlyCost ?? 0,
    rentMonthlyYear1: monthlyRent,
    pmiIncluded,
    downPayment,
    closingCosts,
    totalUpfront,
    firstYearInterest,
    firstYearTaxSavings,
    yearlyData,
  }
}

// ─── Monthly cost breakdown (year 1) ─────────────────────────────────────────

export interface MonthlyCostBreakdown {
  principalAndInterest: number
  propertyTax: number
  homeInsurance: number
  hoa: number
  maintenance: number
  pmi: number
  totalBuy: number
  rent: number
  rentersInsurance: number
  totalRent: number
}

export function getMonthlyCostBreakdown(inputs: RentBuyInputs): MonthlyCostBreakdown {
  const loanAmount = inputs.homePrice * (1 - inputs.downPaymentPct / 100)
  const monthlyMortgageRate = (inputs.mortgageRate / 100) / 12
  const nPayments = inputs.loanTermYears * 12

  const principalAndInterest =
    loanAmount > 0 && monthlyMortgageRate > 0
      ? (loanAmount *
          (monthlyMortgageRate * Math.pow(1 + monthlyMortgageRate, nPayments))) /
        (Math.pow(1 + monthlyMortgageRate, nPayments) - 1)
      : loanAmount / nPayments

  const propertyTax = (inputs.homePrice * (inputs.propertyTaxRate / 100)) / 12
  const homeInsurance = inputs.homeInsuranceAnnual / 12
  const hoa = inputs.hoaMonthly
  const maintenance = (inputs.homePrice * (inputs.maintenancePct / 100)) / 12
  const pmi =
    inputs.downPaymentPct < 20
      ? (loanAmount * (inputs.pmiRate / 100)) / 12
      : 0

  const totalBuy =
    principalAndInterest + propertyTax + homeInsurance + hoa + maintenance + pmi
  const rentersInsurance = inputs.rentersInsuranceAnnual / 12

  return {
    principalAndInterest,
    propertyTax,
    homeInsurance,
    hoa,
    maintenance,
    pmi,
    totalBuy,
    rent: inputs.monthlyRent,
    rentersInsurance,
    totalRent: inputs.monthlyRent + rentersInsurance,
  }
}
