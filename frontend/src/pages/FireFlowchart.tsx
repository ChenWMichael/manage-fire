import { Fragment } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { CheckCircle2, Circle, GitBranch, HelpCircle, ChevronDown, ChevronRight, List, RotateCcw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task { id: string; label: string }
interface FlowNode { id: string; title: string; description: string; tasks: Task[]; tip?: string }
interface Branch { label: string; items: FlowItem[] }
type FlowItem =
  | { kind: 'node'; nodeId: string }
  | { kind: 'decision'; decisionId: string; question: string; note?: string; branches: Branch[] }

interface SectionColors { bg: string; border: string; text: string; badge: string; line: string; hex: string }
interface Section { id: string; label: string; number: number; items: FlowItem[]; colors: SectionColors }

// ─── Node Data ────────────────────────────────────────────────────────────────

const NODES: Record<string, FlowNode> = {
  'create-budget': {
    id: 'create-budget',
    title: 'Create a Budget',
    description: 'Understanding where your money is going is the foundation of sound financial footing. Track all income sources and categorize your spending.',
    tasks: [
      { id: 't1', label: 'List all income sources (salary, freelance, side income)' },
      { id: 't2', label: 'Categorize all monthly expenses' },
      { id: 't3', label: 'Set up a budgeting tool (YNAB, Monarch Money, spreadsheet)' },
      { id: 't4', label: 'Schedule a monthly budget review' },
    ],
  },
  'pay-rent': {
    id: 'pay-rent',
    title: 'Pay Rent / Mortgage',
    description: 'Housing is the highest priority. This includes renters or homeowners insurance.',
    tasks: [
      { id: 't1', label: 'Set up autopay for rent or mortgage' },
      { id: 't2', label: 'Verify renters/homeowners insurance is active' },
    ],
  },
  'buy-groceries': {
    id: 'buy-groceries',
    title: 'Buy Food & Groceries',
    description: 'Prioritize home groceries over dining out. Depending on severity of your situation, you may wish to prioritize utilities first.',
    tasks: [
      { id: 't1', label: 'Set a weekly grocery budget' },
      { id: 't2', label: 'Meal prep to reduce food waste and dining costs' },
    ],
  },
  'pay-essentials': {
    id: 'pay-essentials',
    title: 'Pay Essential Items',
    description: 'Utilities, power, water, heat, toiletries — items required for basic living.',
    tasks: [
      { id: 't1', label: 'Set up autopay for utilities' },
      { id: 't2', label: 'Audit subscriptions and cancel unnecessary ones' },
    ],
  },
  'pay-income-expenses': {
    id: 'pay-income-expenses',
    title: 'Pay Income-Earning Expenses',
    description: 'Necessary transportation costs, professional certifications, phone — anything required to continue earning income.',
    tasks: [
      { id: 't1', label: 'Identify which expenses are necessary for earning income' },
      { id: 't2', label: 'Explore employer reimbursement programs' },
    ],
  },
  'pay-healthcare': {
    id: 'pay-healthcare',
    title: 'Pay Health Care',
    description: 'Health insurance premiums and out-of-pocket health care expenses.',
    tasks: [
      { id: 't1', label: 'Verify health insurance is active' },
      { id: 't2', label: 'Review your plan during open enrollment' },
      { id: 't3', label: 'Set aside funds for potential out-of-pocket costs' },
    ],
  },
  'min-debt-payments': {
    id: 'min-debt-payments',
    title: 'Make Minimum Debt Payments',
    description: 'Pay the minimum on all debts — student loans, credit cards, car loans — to avoid penalties and credit damage.',
    tasks: [
      { id: 't1', label: 'List all debts with their minimums and interest rates' },
      { id: 't2', label: 'Set up autopay for all minimum payments' },
    ],
  },

  'small-emergency-fund': {
    id: 'small-emergency-fund',
    title: 'Build Small Emergency Fund',
    description: 'Either $1,000 or one month\'s expenses — whichever is greater. Use a High Yield Savings Account (HYSA).',
    tasks: [
      { id: 't1', label: 'Open a High Yield Savings Account (HYSA)' },
      { id: 't2', label: 'Deposit $1,000 or one month of expenses' },
      { id: 't3', label: 'Automate recurring transfers to HYSA' },
    ],
  },
  'track-expenses': {
    id: 'track-expenses',
    title: 'Track All Expenses',
    description: 'This helps you understand where your money is going and identify where to cut.',
    tasks: [
      { id: 't1', label: 'Categorize every expense for 30 days' },
      { id: 't2', label: 'Identify 3 categories to reduce spending' },
    ],
  },
  'evaluate-nonessentials': {
    id: 'evaluate-nonessentials',
    title: 'Evaluate Non-Essentials',
    description: 'Reduce non-essential spending. Pay any non-essential bills in full (cable, internet, phone, etc.).',
    tasks: [
      { id: 't1', label: 'List all non-essential subscriptions' },
      { id: 't2', label: 'Cancel or downgrade services where possible' },
      { id: 't3', label: 'Negotiate bills — internet, phone, insurance' },
    ],
  },
  'high-interest-debt': {
    id: 'high-interest-debt',
    title: 'Pay All High Interest Debt',
    description: 'Pay all debts at or above the prime interest rate. This typically includes high-interest credit cards.',
    tasks: [
      { id: 't1', label: 'List all debts at or above the prime rate' },
      { id: 't2', label: 'Direct all extra payments to the highest-rate debt first' },
      { id: 't3', label: 'Consider balance transfer to 0% APR card if eligible' },
    ],
  },
  'employer-match-contribute': {
    id: 'employer-match-contribute',
    title: 'Contribute for Full Employer Match',
    description: 'Contribute the minimum amount needed to get the full employer match — this is free money and an instant return on investment.',
    tasks: [
      { id: 't1', label: 'Find out your employer\'s match percentage and vesting schedule' },
      { id: 't2', label: 'Set contribution to at least capture full match' },
      { id: 't3', label: 'Confirm contributions are being matched in your account' },
    ],
  },
  'make-ips': {
    id: 'make-ips',
    title: 'Create an Investment Policy Statement (IPS)',
    description: 'An IPS defines your investment goals, risk tolerance, and asset allocation. It helps you stay disciplined during market volatility.',
    tasks: [
      { id: 't1', label: 'Define your risk tolerance (conservative / moderate / aggressive)' },
      { id: 't2', label: 'Set target asset allocation (stocks / bonds / cash %)' },
      { id: 't3', label: 'Write down your investment philosophy and rebalancing rules' },
    ],
  },
  'stable-emergency-fund': {
    id: 'stable-emergency-fund',
    title: 'Build 3-Month Emergency Fund',
    description: 'For stable job prospects — grow your emergency fund to 3 months of living expenses. Keep it in a FDIC-insured HYSA.',
    tasks: [
      { id: 't1', label: 'Calculate your 3-month living expense target' },
      { id: 't2', label: 'Grow HYSA to the 3-month target amount' },
      { id: 't3', label: 'Verify account is FDIC-insured' },
    ],
  },
  'unstable-emergency-fund': {
    id: 'unstable-emergency-fund',
    title: 'Build 6–12 Month Emergency Fund',
    description: 'For unstable job prospects — grow to 6–12 months of expenses. Use a FDIC-insured HYSA or multiple rotating CDs.',
    tasks: [
      { id: 't1', label: 'Calculate your 12-month living expense target' },
      { id: 't2', label: 'Grow HYSA toward 6–12 month target' },
      { id: 't3', label: 'Consider a CD ladder for better yields' },
    ],
  },

  'reduce-interest-rate': {
    id: 'reduce-interest-rate',
    title: 'Reduce Interest Rates Where Possible',
    description: 'Try to move moderate-interest debt to a lower rate through balance transfers, refinancing, or personal loans.',
    tasks: [
      { id: 't1', label: 'Check 0% intro APR balance transfer card offers' },
      { id: 't2', label: 'Compare personal loan refinancing rates' },
      { id: 't3', label: 'Call creditors directly to request a lower rate' },
    ],
  },
  'payoff-moderate-debt': {
    id: 'payoff-moderate-debt',
    title: 'Pay Off Moderate Interest Debt',
    description: 'Pay the highest interest rate debt first (debt avalanche), then move down the list.',
    tasks: [
      { id: 't1', label: 'Sort remaining debts by interest rate (highest first)' },
      { id: 't2', label: 'Direct all extra funds to the highest-rate debt' },
      { id: 't3', label: 'Set a target payoff date and track progress' },
    ],
  },

  'evaluate-insurance': {
    id: 'evaluate-insurance',
    title: 'Evaluate Your Health Insurance Type',
    description: 'In the USA there are 4 major insurance plans: PPOs, POS, HMOs, and EPOs. Evaluate which is best for your wellbeing and frequency of health-related visits.',
    tasks: [
      { id: 't1', label: 'Compare PPO vs HMO vs HDHP premiums and deductibles' },
      { id: 't2', label: 'Estimate your expected annual medical expenses' },
      { id: 't3', label: 'If under 26, check if parent\'s plan is cheaper' },
    ],
  },
  'contribute-hsa': {
    id: 'contribute-hsa',
    title: 'Contribute to an HSA',
    description: 'Contributing through your employer is tax-deductible for FICA. Keep all receipts and proof of purchase for qualified medical expenses.',
    tip: 'HSA has a triple tax advantage: contributions are pre-tax, growth is tax-free, and qualified withdrawals are tax-free.',
    tasks: [
      { id: 't1', label: 'Open or verify your HSA account is active' },
      { id: 't2', label: 'Max contribution ($4,300 single / $8,550 family in 2025)' },
      { id: 't3', label: 'Save all medical receipts for future reimbursement' },
      { id: 't4', label: 'Invest HSA funds once balance exceeds the minimum threshold' },
    ],
  },
  'hsa-employer-good': {
    id: 'hsa-employer-good',
    title: 'Keep HSA in Employer Account',
    description: 'Keep HSA contributions in your employer\'s account. Enroll in the investing portion when you reach the minimum balance.',
    tasks: [
      { id: 't1', label: 'Verify employer HSA fee structure is acceptable' },
      { id: 't2', label: 'Enroll in the investment portion once eligible' },
    ],
  },
  'hsa-rollover': {
    id: 'hsa-rollover',
    title: 'Roll Over HSA to Low-Fee Brokerage',
    description: 'If your employer\'s HSA has high fees, roll it over to a low-fee HSA provider like Fidelity or Lively. Allowed once per year.',
    tasks: [
      { id: 't1', label: 'Research low-fee HSA providers (Fidelity, Lively, HSA Bank)' },
      { id: 't2', label: 'Initiate HSA rollover (1 allowed per 12-month period)' },
      { id: 't3', label: 'Invest HSA in low-cost index funds' },
    ],
  },

  'contribute-ira': {
    id: 'contribute-ira',
    title: 'Contribute to an IRA',
    description: 'Contribute to an Individual Retirement Account. First, calculate your Modified Adjusted Gross Income (MAGI) to determine which type is best for you.',
    tasks: [
      { id: 't1', label: 'Calculate your MAGI for the current year' },
      { id: 't2', label: 'Open an IRA if you don\'t have one (Fidelity, Vanguard, Schwab)' },
    ],
  },
  'backdoor-roth': {
    id: 'backdoor-roth',
    title: 'Backdoor Roth IRA',
    description: 'Max out a traditional IRA and convert it to Roth. Used when income exceeds Roth IRA contribution limits. Be aware of the pro-rata rule if you have other pre-tax IRA funds.',
    tip: 'The backdoor Roth is not to be confused with the "mega backdoor Roth" which uses after-tax 401(k) contributions.',
    tasks: [
      { id: 't1', label: 'Contribute to traditional IRA (non-deductible, $7,000 in 2025)' },
      { id: 't2', label: 'Convert traditional IRA balance to Roth IRA' },
      { id: 't3', label: 'File Form 8606 with your taxes to report non-deductible contribution' },
      { id: 't4', label: 'Understand the pro-rata rule if you have other traditional IRA funds' },
    ],
  },
  'max-roth-ira': {
    id: 'max-roth-ira',
    title: 'Max Out Roth IRA',
    description: 'Contribute the maximum to your Roth IRA ($7,000 in 2025, $8,000 if 50+). Roth IRA grows tax-free and qualified withdrawals are tax-free.',
    tasks: [
      { id: 't1', label: 'Open a Roth IRA if you don\'t have one' },
      { id: 't2', label: 'Set contributions to $7,000/year ($583/month)' },
      { id: 't3', label: 'Invest in low-cost index funds (e.g., VTI, VXUS)' },
      { id: 't4', label: 'Automate monthly contributions' },
    ],
  },
  'max-traditional-ira': {
    id: 'max-traditional-ira',
    title: 'Max Out Traditional IRA',
    description: 'Contribute the maximum to your Traditional IRA ($7,000 in 2025, $8,000 if 50+). May be tax-deductible depending on income and whether you have a workplace retirement plan.',
    tasks: [
      { id: 't1', label: 'Open a Traditional IRA if you don\'t have one' },
      { id: 't2', label: 'Set contributions to $7,000/year' },
      { id: 't3', label: 'Determine if contributions are deductible based on your income' },
      { id: 't4', label: 'Invest in low-cost index funds' },
    ],
  },

  'evaluate-espp': {
    id: 'evaluate-espp',
    title: 'Evaluate ESPP',
    description: 'If there\'s a 15% discount and it\'s immediately vested, it\'s generally encouraged to buy and sell immediately for a guaranteed ~17.6% return. If not immediately vested, evaluate more carefully.',
    tasks: [
      { id: 't1', label: 'Check ESPP discount percentage' },
      { id: 't2', label: 'Understand the vesting/offering period schedule' },
      { id: 't3', label: 'Evaluate selling immediately to avoid concentration risk' },
    ],
  },
  'save-for-large-purchase': {
    id: 'save-for-large-purchase',
    title: 'Save for a Large Near-Term Purchase',
    description: 'Keep this money liquid in a HYSA. If education-related, consider a 529 or Coverdell ESA. Examples: college, certifications, car, down payment.',
    tasks: [
      { id: 't1', label: 'Estimate total cost and timeline' },
      { id: 't2', label: 'Open a dedicated HYSA or 529/ESA for the goal' },
      { id: 't3', label: 'Automate monthly contributions toward the target' },
    ],
  },
  'max-401k-w2': {
    id: 'max-401k-w2',
    title: 'Max Out 401(k) — W2 Employee',
    description: 'Max out your employer\'s 401(k) or 403(b). Limit is $23,500 in 2025 ($31,000 if 50+). Prefer pre-tax to lower current taxes, then convert in low-income years.',
    tip: 'While 401(k) has fewer investment choices than an IRA, the higher limit and pre-tax benefit make it very valuable.',
    tasks: [
      { id: 't1', label: 'Increase 401(k) contribution to the annual maximum' },
      { id: 't2', label: 'Choose Traditional 401(k) (pre-tax) vs Roth 401(k) based on tax situation' },
      { id: 't3', label: 'Select low-cost index funds available in your plan' },
    ],
  },
  'max-solo-401k': {
    id: 'max-solo-401k',
    title: 'Max Out Solo 401(k) — Self-Employed',
    description: 'Solo 401(k) allows up to $70,000 in 2025 (employee + employer contributions). More flexible than a SEP-IRA for high-income self-employed individuals.',
    tasks: [
      { id: 't1', label: 'Open a Solo 401(k) account (Fidelity, Vanguard, Schwab)' },
      { id: 't2', label: 'Calculate max employee contribution ($23,500)' },
      { id: 't3', label: 'Calculate max employer contribution (25% of net self-employment income)' },
      { id: 't4', label: 'Consult a tax professional for the optimal contribution split' },
    ],
  },

  'mega-backdoor-roth': {
    id: 'mega-backdoor-roth',
    title: 'Mega Backdoor Roth',
    description: 'Make after-tax 401(k) contributions beyond the standard limit (up to $70,000 total) and immediately roll them into a Roth IRA or do an in-plan Roth conversion.',
    tip: 'This only works if your 401(k) plan supports after-tax contributions AND in-service withdrawals or in-plan Roth conversions.',
    tasks: [
      { id: 't1', label: 'Confirm your 401(k) plan allows after-tax contributions' },
      { id: 't2', label: 'Confirm plan allows in-service withdrawals or in-plan Roth conversions' },
      { id: 't3', label: 'Contribute after-tax up to $70k total limit (2025)' },
      { id: 't4', label: 'Immediately roll over to Roth IRA or convert in-plan' },
    ],
  },
  'educational-expenses-529': {
    id: 'educational-expenses-529',
    title: 'Contribute to 529 / ESA for Education',
    description: 'Search for 529 plans by state for tax deductions. SECURE 2.0 Act permits a $35k lifetime rollover from unused 529 funds to a Roth IRA.',
    tasks: [
      { id: 't1', label: 'Research your state\'s 529 plan for available tax deductions' },
      { id: 't2', label: 'Open a 529 account for the beneficiary' },
      { id: 't3', label: 'Set up recurring contributions' },
    ],
  },
  'taxable-brokerage': {
    id: 'taxable-brokerage',
    title: 'Invest in Taxable Brokerage',
    description: 'Contribute to a taxable brokerage or extra to a Roth IRA. Taxable accounts have no contribution limits and no withdrawal restrictions — great for early retirement.',
    tasks: [
      { id: 't1', label: 'Open a taxable brokerage account (Fidelity, Vanguard, Schwab)' },
      { id: 't2', label: 'Automate monthly contributions' },
      { id: 't3', label: 'Focus on tax-efficient funds (VTI, VXUS, muni bonds)' },
    ],
  },
  'tax-harvesting': {
    id: 'tax-harvesting',
    title: 'Evaluate Tax-Loss Harvesting',
    description: 'Sell investments at a loss to offset capital gains. Be careful to avoid the wash-sale rule (don\'t buy back the same security within 30 days).',
    tasks: [
      { id: 't1', label: 'Review portfolio for unrealized losses' },
      { id: 't2', label: 'Understand the wash-sale rule (30-day window)' },
      { id: 't3', label: 'Execute tax-loss harvesting before year-end if applicable' },
    ],
  },

  'payoff-low-interest-debt': {
    id: 'payoff-low-interest-debt',
    title: 'Evaluate Paying Off Low-Interest Debt',
    description: 'Low-interest debt (below the prime rate) often has a lower cost than expected investment returns. The math may favor investing, but the psychological peace of debt freedom is real.',
    tasks: [
      { id: 't1', label: 'List all remaining low-interest debts' },
      { id: 't2', label: 'Compare each interest rate vs expected investment returns' },
      { id: 't3', label: 'Decide based on personal risk tolerance and preference' },
    ],
  },
  'donor-advised-fund': {
    id: 'donor-advised-fund',
    title: 'Evaluate Charitable Contributions',
    description: 'A Donor Advised Fund (DAF) lets you donate appreciated assets, take an immediate tax deduction, and grant money to charities over time.',
    tasks: [
      { id: 't1', label: 'Research DAF providers (Fidelity Charitable, Schwab Charitable)' },
      { id: 't2', label: 'Evaluate "bunching" charitable contributions for larger deductions' },
      { id: 't3', label: 'Consider donating appreciated securities instead of cash' },
    ],
  },
  'rebalance-portfolio': {
    id: 'rebalance-portfolio',
    title: 'Rebalance Portfolio',
    description: 'Rebalance portfolio\'s asset allocations according to your IPS. Prefer rebalancing with new contributions first to minimize taxable events.',
    tasks: [
      { id: 't1', label: 'Review current asset allocation vs your IPS target' },
      { id: 't2', label: 'Rebalance using new contributions first to avoid selling' },
      { id: 't3', label: 'Schedule an annual rebalancing review' },
      { id: 't4', label: 'Be mindful of capital gains tax in taxable accounts' },
    ],
  },
}

// ─── Section Flow Data ────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 's0',
    label: 'Budgeting Fundamentals',
    number: 0,
    colors: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700', line: 'bg-blue-300', hex: '#60a5fa' },
    items: [
      { kind: 'node', nodeId: 'create-budget' },
      { kind: 'node', nodeId: 'pay-rent' },
      { kind: 'node', nodeId: 'buy-groceries' },
      { kind: 'node', nodeId: 'pay-essentials' },
      { kind: 'node', nodeId: 'pay-income-expenses' },
      { kind: 'node', nodeId: 'pay-healthcare' },
      { kind: 'node', nodeId: 'min-debt-payments' },
    ],
  },
  {
    id: 's1',
    label: 'Employer Match & Emergency Fund',
    number: 1,
    colors: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800', badge: 'bg-red-100 text-red-700', line: 'bg-red-300', hex: '#f87171' },
    items: [
      { kind: 'node', nodeId: 'small-emergency-fund' },
      { kind: 'node', nodeId: 'track-expenses' },
      { kind: 'node', nodeId: 'evaluate-nonessentials' },
      { kind: 'node', nodeId: 'high-interest-debt' },
      {
        kind: 'decision',
        decisionId: 'd-employer-match',
        question: 'Does your employer offer a retirement account with employer match?',
        branches: [
          { label: 'Yes — employer offers match', items: [{ kind: 'node', nodeId: 'employer-match-contribute' }] },
          { label: 'No match offered', items: [] },
        ],
      },
      { kind: 'node', nodeId: 'make-ips' },
      {
        kind: 'decision',
        decisionId: 'd-job-stability',
        question: 'Are your job prospects stable or unstable?',
        branches: [
          { label: 'Stable job', items: [{ kind: 'node', nodeId: 'stable-emergency-fund' }] },
          { label: 'Unstable job', items: [{ kind: 'node', nodeId: 'unstable-emergency-fund' }] },
        ],
      },
    ],
  },
  {
    id: 's2',
    label: 'Debt Reduction',
    number: 2,
    colors: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700', line: 'bg-orange-300', hex: '#fb923c' },
    items: [
      {
        kind: 'decision',
        decisionId: 'd-moderate-debt',
        question: 'Do you have any moderate interest debt (remaining debt above the prime interest rate)?',
        branches: [
          { label: 'Yes — I have moderate debt', items: [
            { kind: 'node', nodeId: 'reduce-interest-rate' },
            { kind: 'node', nodeId: 'payoff-moderate-debt' },
          ]},
          { label: 'No — debt is paid off or below prime', items: [] },
        ],
      },
    ],
  },
  {
    id: 's3',
    label: 'Health Savings Account (HSA)',
    number: 3,
    colors: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700', line: 'bg-purple-300', hex: '#c084fc' },
    items: [
      { kind: 'node', nodeId: 'evaluate-insurance' },
      {
        kind: 'decision',
        decisionId: 'd-hsa-eligible',
        question: 'Do you have an HSA-qualified High-Deductible Health Plan (HDHP) and are eligible for an investable HSA?',
        note: 'In general, if you are a healthy individual with little to no frequent health-related visits, an HDHP plan might be preferable.',
        branches: [
          { label: 'Yes — HSA eligible (HDHP)', items: [
            { kind: 'node', nodeId: 'contribute-hsa' },
            {
              kind: 'decision',
              decisionId: 'd-hsa-fees',
              question: 'Does your employer\'s HSA account have high fees?',
              branches: [
                { label: 'Yes — high fees', items: [{ kind: 'node', nodeId: 'hsa-rollover' }] },
                { label: 'No — fees are acceptable', items: [{ kind: 'node', nodeId: 'hsa-employer-good' }] },
              ],
            },
          ]},
          { label: 'No — not HSA eligible', items: [] },
        ],
      },
    ],
  },
  {
    id: 's4',
    label: 'Individual Retirement Account (IRA)',
    number: 4,
    colors: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700', line: 'bg-emerald-300', hex: '#34d399' },
    items: [
      {
        kind: 'decision',
        decisionId: 'd-earned-income',
        question: 'Do you have earned income this year?',
        note: 'You can only contribute to an IRA if you have earned income (wages, salary, self-employment income).',
        branches: [
          { label: 'Yes — I have earned income', items: [
            { kind: 'node', nodeId: 'contribute-ira' },
            {
              kind: 'decision',
              decisionId: 'd-magi-level',
              question: 'What is your Modified Adjusted Gross Income (MAGI)?',
              note: '2025 Roth IRA phase-out: Single $150k–$165k, Married $236k–$246k.',
              branches: [
                { label: 'High income — above Roth IRA limit', items: [
                  { kind: 'node', nodeId: 'backdoor-roth' },
                ]},
                { label: 'Low-to-medium income — below Roth IRA limit', items: [
                  {
                    kind: 'decision',
                    decisionId: 'd-future-income',
                    question: 'Do you expect your future income to be greater than the IRS Roth IRA threshold?',
                    branches: [
                      { label: 'Yes — expect higher income later', items: [{ kind: 'node', nodeId: 'max-roth-ira' }] },
                      { label: 'No — expect same or lower income', items: [{ kind: 'node', nodeId: 'max-traditional-ira' }] },
                    ],
                  },
                ]},
              ],
            },
          ]},
          { label: 'No earned income', items: [] },
        ],
      },
    ],
  },
  {
    id: 's5',
    label: 'Tax-Advantaged Accounts',
    number: 5,
    colors: { bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-800', badge: 'bg-cyan-100 text-cyan-700', line: 'bg-cyan-300', hex: '#22d3ee' },
    items: [
      {
        kind: 'decision',
        decisionId: 'd-espp',
        question: 'Does your employer offer an Employee Stock Purchase Plan (ESPP)?',
        branches: [
          { label: 'Yes — ESPP available', items: [{ kind: 'node', nodeId: 'evaluate-espp' }] },
          { label: 'No ESPP', items: [] },
        ],
      },
      {
        kind: 'decision',
        decisionId: 'd-large-purchase',
        question: 'Are you expecting a large required purchase in the near future (3–5 years)?',
        note: 'e.g. college, certifications, car, home down payment.',
        branches: [
          { label: 'Yes — large purchase coming', items: [{ kind: 'node', nodeId: 'save-for-large-purchase' }] },
          { label: 'No near-term large purchase', items: [
            {
              kind: 'decision',
              decisionId: 'd-employment-type',
              question: 'Are you a W2 employee or self-employed?',
              branches: [
                { label: 'W2 Employee', items: [{ kind: 'node', nodeId: 'max-401k-w2' }] },
                { label: 'Self-Employed', items: [{ kind: 'node', nodeId: 'max-solo-401k' }] },
              ],
            },
          ]},
        ],
      },
    ],
  },
  {
    id: 's6',
    label: 'After-Tax & Taxable Accounts',
    number: 6,
    colors: { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-700', line: 'bg-rose-300', hex: '#fb7185' },
    items: [
      {
        kind: 'decision',
        decisionId: 'd-aftertax-401k',
        question: 'Does your 401(k) plan allow after-tax contributions with immediate Roth rollover (Mega Backdoor Roth)?',
        branches: [
          { label: 'Yes — Mega Backdoor available', items: [{ kind: 'node', nodeId: 'mega-backdoor-roth' }] },
          { label: 'No', items: [{ kind: 'node', nodeId: 'educational-expenses-529' }] },
        ],
      },
      { kind: 'node', nodeId: 'taxable-brokerage' },
      { kind: 'node', nodeId: 'tax-harvesting' },
    ],
  },
  {
    id: 's7',
    label: 'Final Optimizations',
    number: 7,
    colors: { bg: 'bg-slate-50', border: 'border-slate-400', text: 'text-slate-700', badge: 'bg-slate-200 text-slate-600', line: 'bg-slate-300', hex: '#94a3b8' },
    items: [
      { kind: 'node', nodeId: 'payoff-low-interest-debt' },
      { kind: 'node', nodeId: 'donor-advised-fund' },
      { kind: 'node', nodeId: 'rebalance-portfolio' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countSectionTasks(
  items: FlowItem[],
  decisions: Record<string, number>,
  tasksDone: Record<string, Set<string>>,
): { done: number; total: number } {
  let done = 0
  let total = 0
  const walk = (flowItems: FlowItem[]) => {
    for (const item of flowItems) {
      if (item.kind === 'node') {
        const node = NODES[item.nodeId]
        if (!node) continue
        total += node.tasks.length
        done += tasksDone[item.nodeId]?.size ?? 0
      } else {
        const chosen = decisions[item.decisionId]
        if (chosen !== undefined) {
          walk(item.branches[chosen]?.items ?? [])
        } else {
          for (const branch of item.branches) walk(branch.items)
        }
      }
    }
  }
  walk(items)
  return { done, total }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NodeCard({
  node,
  colors,
  expanded,
  onToggle,
  tasksDone,
  onToggleTask,
}: {
  node: FlowNode
  colors: SectionColors
  expanded: boolean
  onToggle: () => void
  tasksDone: Set<string>
  onToggleTask: (taskId: string) => void
}) {
  const done = tasksDone.size
  const total = node.tasks.length
  const allDone = total > 0 && done === total

  return (
    <div
      className={`border rounded-lg transition-all cursor-pointer ${
        expanded ? 'border-slate-300 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {allDone ? (
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
        ) : done > 0 ? (
          <CheckCircle2 size={16} className="text-slate-300 flex-shrink-0" />
        ) : (
          <Circle size={16} className="text-slate-300 flex-shrink-0" />
        )}
        <span className={`text-sm font-medium flex-1 ${allDone ? 'text-slate-400' : 'text-slate-700'}`}>
          {node.title}
        </span>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {total > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
              allDone ? 'bg-green-100 text-green-600' : done > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {done}/{total}
            </span>
          )}
          {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-300" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">{node.description}</p>
          {node.tip && (
            <div className={`mb-3 px-3 py-2 rounded-md border text-xs leading-relaxed ${colors.bg} ${colors.border} ${colors.text}`}>
              <strong>Tip:</strong> {node.tip}
            </div>
          )}
          <div className="space-y-2">
            {node.tasks.map(task => {
              const isDone = tasksDone.has(task.id)
              return (
                <button
                  key={task.id}
                  onClick={() => onToggleTask(task.id)}
                  className="w-full flex items-start gap-2.5 text-left group"
                >
                  {isDone ? (
                    <CheckCircle2 size={14} className="mt-0.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle size={14} className="mt-0.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                  )}
                  <span className={`text-xs leading-relaxed ${isDone ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                    {task.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function DecisionCard({
  item,
  colors,
  chosen,
  onChoose,
  renderItems,
}: {
  item: Extract<FlowItem, { kind: 'decision' }>
  colors: SectionColors
  chosen: number | undefined
  onChoose: (idx: number) => void
  renderItems: (items: FlowItem[]) => React.ReactNode
}) {
  return (
    <div>
      <div className={`border-2 rounded-lg p-4 ${colors.border} ${colors.bg}`}>
        <div className="flex items-start gap-2.5">
          <HelpCircle size={15} className={`${colors.text} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${colors.text} leading-snug mb-1`}>{item.question}</p>
            {item.note && <p className="text-xs text-slate-500 mb-2">{item.note}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.branches.map((branch, bi) => {
                const isChosen = chosen === bi
                const isOther = chosen !== undefined && chosen !== bi
                return (
                  <button
                    key={bi}
                    onClick={() => onChoose(bi)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isChosen
                        ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                        : isOther
                        ? 'bg-white border-slate-200 text-slate-300 line-through cursor-default'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-800'
                    }`}
                    disabled={isOther}
                  >
                    {branch.label}
                  </button>
                )
              })}
              {chosen !== undefined && (
                <button
                  onClick={(e) => { e.stopPropagation(); onChoose(-1) }}
                  className="px-2 py-1.5 rounded-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ↩ change
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {chosen !== undefined && chosen >= 0 && (
        <div className="mt-3 ml-5 pl-4 border-l-2 border-slate-200">
          {item.branches[chosen].items.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">Continue to next section →</p>
          ) : (
            renderItems(item.branches[chosen].items)
          )}
        </div>
      )}
    </div>
  )
}

// ─── Chart View Sub-components ────────────────────────────────────────────────

function FlowchartNodeBox({
  node,
  colors,
  expanded,
  onToggle,
  tasksDone,
  onToggleTask,
}: {
  node: FlowNode
  colors: SectionColors
  expanded: boolean
  onToggle: () => void
  tasksDone: Set<string>
  onToggleTask: (taskId: string) => void
}) {
  const done = tasksDone.size
  const total = node.tasks.length
  const allDone = total > 0 && done === total

  return (
    <div
      className={`border border-slate-200 rounded-lg cursor-pointer transition-all w-full sm:w-64 bg-white ${
        expanded ? 'shadow-md' : 'hover:shadow-sm hover:border-slate-300'
      }`}
      style={{ borderLeftColor: colors.hex, borderLeftWidth: '3px' }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {allDone ? (
          <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
        ) : done > 0 ? (
          <CheckCircle2 size={13} className="text-slate-300 flex-shrink-0" />
        ) : (
          <Circle size={13} className="text-slate-300 flex-shrink-0" />
        )}
        <span className={`text-xs font-medium flex-1 min-w-0 ${allDone ? 'text-slate-400' : 'text-slate-700'}`}>
          {node.title}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {total > 0 && (
            <span className={`text-xs px-1 py-0.5 rounded font-mono ${
              allDone ? 'bg-green-100 text-green-600' : done > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {done}/{total}
            </span>
          )}
          {expanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-300" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 pt-2" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-slate-500 leading-relaxed mb-2">{node.description}</p>
          {node.tip && (
            <div className={`mb-2 px-2 py-1.5 rounded border text-xs leading-relaxed ${colors.bg} ${colors.border} ${colors.text}`}>
              <strong>Tip:</strong> {node.tip}
            </div>
          )}
          <div className="space-y-1.5">
            {node.tasks.map(task => {
              const isDone = tasksDone.has(task.id)
              return (
                <button
                  key={task.id}
                  onClick={() => onToggleTask(task.id)}
                  className="w-full flex items-start gap-2 text-left group"
                >
                  {isDone ? (
                    <CheckCircle2 size={12} className="mt-0.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle size={12} className="mt-0.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                  )}
                  <span className={`text-xs leading-relaxed ${isDone ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                    {task.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function FlowchartDecisionFork({
  item,
  colors,
  chosen,
  onChoose,
  renderChartItems,
}: {
  item: Extract<FlowItem, { kind: 'decision' }>
  colors: SectionColors
  chosen: number | undefined
  onChoose: (idx: number) => void
  renderChartItems: (items: FlowItem[]) => React.ReactNode
}) {
  const N = item.branches.length

  return (
    <div className="flex flex-col items-center w-full">
      {/* Decision box — diamond marker + question */}
      <div className={`border-2 rounded-lg p-3 w-full sm:w-72 ${colors.border} ${colors.bg} shadow-sm`}>
        <div className="flex items-start gap-2">
          <HelpCircle size={14} className={`${colors.text} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${colors.text} leading-snug`}>{item.question}</p>
            {item.note && <p className="text-xs text-slate-500 mt-1 italic">{item.note}</p>}
          </div>
        </div>
        {chosen !== undefined && (
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {item.branches.map((branch, bi) => (
              <button
                key={bi}
                disabled={chosen !== bi}
                className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                  chosen === bi
                    ? 'bg-slate-800 border-slate-800 text-white'
                    : 'border-slate-200 text-slate-300 line-through cursor-default'
                }`}
              >
                {branch.label}
              </button>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); onChoose(-1) }}
              className="px-2 py-0.5 rounded-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ↩ change
            </button>
          </div>
        )}
      </div>

      {/* Branch layout */}
      {chosen === undefined ? (
        <>
          {/* Vertical stub down from decision box */}
          <div className="w-0.5 h-4 bg-gray-300" />
          {/* Branch spread — horizontal on desktop, vertical stack on mobile */}
          <div className="relative w-full flex flex-col sm:flex-row items-center sm:items-start">
            <div
              className="hidden sm:block absolute top-0 h-0.5 bg-gray-300"
              style={{ left: `${50 / N}%`, right: `${50 / N}%` }}
            />
            {item.branches.map((branch, bi) => (
              <div key={bi} className="w-full sm:flex-1 flex flex-col items-center min-w-0">
                {/* Vertical from horizontal bar */}
                <div className="w-0.5 h-4 bg-gray-300" />
                {/* Branch label — clickable */}
                <button
                  onClick={() => onChoose(bi)}
                  className="px-2 py-1 rounded text-xs font-semibold border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-all text-center max-w-[90%] leading-snug"
                >
                  {branch.label}
                </button>
                {/* Preview items — dimmed, non-interactive */}
                {branch.items.length > 0 ? (
                  <div className="opacity-40 pointer-events-none w-full flex flex-col items-center mt-1">
                    <div className="w-0.5 h-3 bg-gray-300" />
                    {renderChartItems(branch.items)}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-2 text-center">—</p>
                )}
              </div>
            ))}
          </div>
        </>
      ) : chosen >= 0 && (
        <>
          <div className="w-0.5 h-4 bg-gray-300" />
          {item.branches[chosen].items.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">Continue to next section →</p>
          ) : (
            <div className="w-full flex flex-col items-center">
              {renderChartItems(item.branches[chosen].items)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FireFlowchart() {
  const [decisions, setDecisions] = useLocalStorage<Record<string, number>>('mf-flowchart-decisions', {})
  const [tasksDone, setTasksDone] = useLocalStorage<Record<string, Set<string>>>(
    'mf-flowchart-tasks',
    {},
    (v) => JSON.stringify(Object.fromEntries(Object.entries(v).map(([k, s]) => [k, [...s]]))),
    (raw) => {
      const parsed = JSON.parse(raw) as Record<string, string[]>
      return Object.fromEntries(Object.entries(parsed).map(([k, arr]) => [k, new Set(arr)]))
    },
  )
  const [expanded, setExpanded] = useLocalStorage<Set<string>>(
    'mf-flowchart-expanded',
    new Set(),
    (v) => JSON.stringify([...v]),
    (raw) => new Set(JSON.parse(raw) as string[]),
  )
  const [view, setView] = useLocalStorage<'steps' | 'chart'>('mf-flowchart-view', 'steps')

  const makeDecision = (decisionId: string, branchIdx: number) => {
    if (branchIdx === -1) {
      setDecisions(prev => {
        const next = { ...prev }
        delete next[decisionId]
        return next
      })
    } else {
      setDecisions(prev => ({ ...prev, [decisionId]: branchIdx }))
    }
  }

  const toggleTask = (nodeId: string, taskId: string) => {
    setTasksDone(prev => {
      const s = new Set(prev[nodeId] ?? [])
      if (s.has(taskId)) s.delete(taskId)
      else s.add(taskId)
      return { ...prev, [nodeId]: s }
    })
  }

  const toggleExpanded = (nodeId: string) => {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(nodeId)) s.delete(nodeId)
      else s.add(nodeId)
      return s
    })
  }

  const totalProgress = SECTIONS.reduce(
    (acc, section) => {
      const { done, total } = countSectionTasks(section.items, decisions, tasksDone)
      return { done: acc.done + done, total: acc.total + total }
    },
    { done: 0, total: 0 },
  )

  const renderItems = (items: FlowItem[], colors: SectionColors): React.ReactNode => {
    return (
      <div className="space-y-2">
        {items.map((item) => {
          if (item.kind === 'node') {
            const node = NODES[item.nodeId]
            if (!node) return null
            return (
              <NodeCard
                key={node.id}
                node={node}
                colors={colors}
                expanded={expanded.has(node.id)}
                onToggle={() => toggleExpanded(node.id)}
                tasksDone={tasksDone[node.id] ?? new Set()}
                onToggleTask={taskId => toggleTask(node.id, taskId)}
              />
            )
          }
          return (
            <DecisionCard
              key={item.decisionId}
              item={item}
              colors={colors}
              chosen={decisions[item.decisionId]}
              onChoose={idx => makeDecision(item.decisionId, idx)}
              renderItems={subItems => renderItems(subItems, colors)}
            />
          )
        })}
      </div>
    )
  }

  const renderChartItems = (items: FlowItem[], colors: SectionColors): React.ReactNode => {
    return (
      <div className="flex flex-col items-center w-full">
        {items.map((item, i) => {
          if (item.kind === 'node') {
            const node = NODES[item.nodeId]
            if (!node) return null
            return (
              <div key={node.id} className="flex flex-col items-center w-full">
                {i > 0 && <div className="w-0.5 h-5 bg-gray-300" />}
                <FlowchartNodeBox
                  node={node}
                  colors={colors}
                  expanded={expanded.has(node.id)}
                  onToggle={() => toggleExpanded(node.id)}
                  tasksDone={tasksDone[node.id] ?? new Set()}
                  onToggleTask={taskId => toggleTask(node.id, taskId)}
                />
              </div>
            )
          }
          return (
            <div key={item.decisionId} className="flex flex-col items-center w-full">
              {i > 0 && <div className="w-0.5 h-5 bg-gray-300" />}
              <FlowchartDecisionFork
                item={item}
                colors={colors}
                chosen={decisions[item.decisionId]}
                onChoose={idx => makeDecision(item.decisionId, idx)}
                renderChartItems={subItems => renderChartItems(subItems, colors)}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        {/* Title row — view switcher stays beside title on all screen sizes */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">FIRE Flow Guide</h1>
            <p className="text-slate-500 text-sm mt-1">
              Follow the sections in order. Make decisions to navigate your personal path. Click any card to expand its action checklist.
            </p>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => setView('steps')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                view === 'steps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={12} />
              Steps
            </button>
            <button
              onClick={() => setView('chart')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                view === 'chart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GitBranch size={12} />
              Chart
            </button>
          </div>
        </div>
        {/* Controls row — progress + reset below title */}
        <div className="flex items-center gap-3 mt-3">
          <p className="text-xs text-slate-400 whitespace-nowrap">Overall progress</p>
          <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">{totalProgress.done}/{totalProgress.total} tasks</p>
          <div className="w-20 h-2 rounded-full bg-slate-200 flex-shrink-0">
            <div
              className="h-full rounded-full bg-green-400 transition-all"
              style={{ width: `${totalProgress.total > 0 ? Math.round((totalProgress.done / totalProgress.total) * 100) : 0}%` }}
            />
          </div>
          <button
            onClick={() => { setDecisions({}); setTasksDone({}); setExpanded(new Set()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all ml-auto"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {view === 'steps' ? (
        <div className="space-y-4">
          {SECTIONS.map(section => {
            const { done, total } = countSectionTasks(section.items, decisions, tasksDone)
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const allDone = total > 0 && done === total

            return (
              <div key={section.id} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className={`px-5 py-3 flex items-center justify-between ${section.colors.bg} border-b ${section.colors.border}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${section.colors.badge}`}>
                      Step {section.number}
                    </span>
                    <h2 className={`font-semibold text-sm ${section.colors.text}`}>{section.label}</h2>
                    {allDone && <CheckCircle2 size={14} className="text-green-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{done}/{total}</span>
                    <div className="w-20 h-1.5 rounded-full bg-white/60">
                      <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  {renderItems(section.items, section.colors)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Unified chart canvas */}
          <div className="p-6 overflow-x-auto">
            <div className="flex flex-col items-center w-full sm:min-w-[640px]">
              {SECTIONS.map((section, si) => (
                <Fragment key={section.id}>
                  {si > 0 && <div className="w-0.5 h-8 bg-gray-200" />}
                  {/* Section marker */}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${section.colors.badge} border ${section.colors.border} shadow-sm`}
                  >
                    <span style={{ color: section.colors.hex }}>◆</span>
                    {section.label}
                  </div>
                  <div className="w-0.5 h-4 bg-gray-200" />
                  {renderChartItems(section.items, section.colors)}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400 text-center">
        Based on the r/personalfinance FIRE flowchart v4.3. For general educational purposes only — consult a financial advisor for personalized advice.
      </p>
    </div>
  )
}
