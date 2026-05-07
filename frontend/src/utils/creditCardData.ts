import type { CreditCard, CreditCardPortfolio, CustomCard, SpendingCategory } from '../types'

export const SPENDING_CATEGORIES: { key: SpendingCategory; label: string; emoji: string }[] = [
  { key: 'dining',         label: 'Dining',          emoji: '🍽️' },
  { key: 'groceries',      label: 'Groceries',       emoji: '🛒' },
  { key: 'gas',            label: 'Gas',             emoji: '⛽' },
  { key: 'flights',        label: 'Flights',         emoji: '✈️' },
  { key: 'hotels',         label: 'Hotels',          emoji: '🏨' },
  { key: 'streaming',      label: 'Streaming',       emoji: '📺' },
  { key: 'drugstore',      label: 'Drugstore',       emoji: '💊' },
  { key: 'transit',        label: 'Transit',         emoji: '🚌' },
  { key: 'onlineShopping', label: 'Online Shopping', emoji: '🛍️' },
  { key: 'utilities',      label: 'Utilities',       emoji: '💡' },
  { key: 'entertainment',  label: 'Entertainment',   emoji: '🎭' },
  { key: 'warehouse',      label: 'Warehouse Clubs', emoji: '🏪' },
  { key: 'base',           label: 'Everything Else', emoji: '💳' },
]

export const CARD_CATALOG: CreditCard[] = [
  {
    id: 'csp',
    name: 'Sapphire Preferred',
    issuer: 'Chase',
    rewardType: 'points',
    annualFee: 95,
    rewards: { dining: 3, groceries: 3, gas: 1, flights: 2, hotels: 2, streaming: 3, drugstore: 1, transit: 1, onlineShopping: 3, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
  },
  {
    id: 'csr',
    name: 'Sapphire Reserve',
    issuer: 'Chase',
    rewardType: 'points',
    annualFee: 550,
    rewards: { dining: 3, groceries: 1, gas: 1, flights: 3, hotels: 3, streaming: 1, drugstore: 1, transit: 3, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
  },
  {
    id: 'amex-gold',
    name: 'Gold Card',
    issuer: 'American Express',
    rewardType: 'points',
    annualFee: 250,
    rewards: { dining: 4, groceries: 4, gas: 1, flights: 3, hotels: 1, streaming: 1, drugstore: 1, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
  },
  {
    id: 'amex-platinum',
    name: 'Platinum Card',
    issuer: 'American Express',
    rewardType: 'points',
    annualFee: 695,
    rewards: { dining: 1, groceries: 1, gas: 1, flights: 5, hotels: 5, streaming: 1, drugstore: 1, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
  },
  {
    id: 'citi-double-cash',
    name: 'Double Cash',
    issuer: 'Citi',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 2, groceries: 2, gas: 2, flights: 2, hotels: 2, streaming: 2, drugstore: 2, transit: 2, onlineShopping: 2, utilities: 2, entertainment: 2, warehouse: 2, base: 2 },
  },
  {
    id: 'cfu',
    name: 'Freedom Unlimited',
    issuer: 'Chase',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 3, groceries: 1.5, gas: 1.5, flights: 1.5, hotels: 1.5, streaming: 1.5, drugstore: 3, transit: 1.5, onlineShopping: 1.5, utilities: 1.5, entertainment: 1.5, warehouse: 1.5, base: 1.5 },
  },
  {
    id: 'cff',
    name: 'Freedom Flex',
    issuer: 'Chase',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 3, groceries: 1, gas: 1, flights: 1, hotels: 1, streaming: 1, drugstore: 3, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
    note: '+5% on quarterly rotating categories (up to $1,500/quarter)',
  },
  {
    id: 'discover-it',
    name: 'Discover it Cash Back',
    issuer: 'Discover',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 1, groceries: 1, gas: 1, flights: 1, hotels: 1, streaming: 1, drugstore: 1, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
    note: '+5% on quarterly rotating categories (up to $1,500/quarter)',
  },
  {
    id: 'venture-x',
    name: 'Venture X',
    issuer: 'Capital One',
    rewardType: 'points',
    annualFee: 395,
    rewards: { dining: 2, groceries: 2, gas: 2, flights: 2, hotels: 2, streaming: 2, drugstore: 2, transit: 2, onlineShopping: 2, utilities: 2, entertainment: 2, warehouse: 2, base: 2 },
  },
  {
    id: 'bcp',
    name: 'Blue Cash Preferred',
    issuer: 'American Express',
    rewardType: 'cashback',
    annualFee: 95,
    rewards: { dining: 1, groceries: 6, gas: 3, flights: 1, hotels: 1, streaming: 6, drugstore: 1, transit: 3, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
    note: 'Grocery rate applies to US supermarkets up to $6,000/year',
  },
  {
    id: 'bce',
    name: 'Blue Cash Everyday',
    issuer: 'American Express',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 1, groceries: 3, gas: 3, flights: 1, hotels: 1, streaming: 1, drugstore: 1, transit: 1, onlineShopping: 3, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
    note: 'Grocery rate applies to US supermarkets up to $6,000/year',
  },
  {
    id: 'savor-one',
    name: 'SavorOne',
    issuer: 'Capital One',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 3, groceries: 3, gas: 1, flights: 1, hotels: 1, streaming: 3, drugstore: 1, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 3, warehouse: 1, base: 1 },
  },
  {
    id: 'active-cash',
    name: 'Active Cash',
    issuer: 'Wells Fargo',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 2, groceries: 2, gas: 2, flights: 2, hotels: 2, streaming: 2, drugstore: 2, transit: 2, onlineShopping: 2, utilities: 2, entertainment: 2, warehouse: 2, base: 2 },
  },
  {
    id: 'altitude-connect',
    name: 'Altitude Connect',
    issuer: 'US Bank',
    rewardType: 'points',
    annualFee: 95,
    rewards: { dining: 2, groceries: 2, gas: 4, flights: 4, hotels: 4, streaming: 1, drugstore: 1, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
    note: 'Annual fee waived first year',
  },
  {
    id: 'citi-custom-cash',
    name: 'Custom Cash',
    issuer: 'Citi',
    rewardType: 'cashback',
    annualFee: 0,
    rewards: { dining: 1, groceries: 1, gas: 1, flights: 1, hotels: 1, streaming: 1, drugstore: 1, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
    note: 'Earns 5% on your #1 spend category per billing cycle (up to $500) — tap ✏️ to set your 5% category. Have a 2nd PCed copy? Use "Create custom card" to add it.',
  },
  {
    id: 'citi-strata-premier',
    name: 'Strata Premier',
    issuer: 'Citi',
    rewardType: 'points',
    annualFee: 95,
    rewards: { dining: 3, groceries: 3, gas: 3, flights: 3, hotels: 3, streaming: 1, drugstore: 1, transit: 1, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
  },
  {
    id: 'wf-autograph',
    name: 'Autograph',
    issuer: 'Wells Fargo',
    rewardType: 'points',
    annualFee: 0,
    rewards: { dining: 3, groceries: 1, gas: 3, flights: 3, hotels: 3, streaming: 3, drugstore: 1, transit: 3, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
  },
  {
    id: 'wf-autograph-journey',
    name: 'Autograph Journey',
    issuer: 'Wells Fargo',
    rewardType: 'points',
    annualFee: 95,
    rewards: { dining: 3, groceries: 1, gas: 1, flights: 4, hotels: 5, streaming: 1, drugstore: 1, transit: 3, onlineShopping: 1, utilities: 1, entertainment: 1, warehouse: 1, base: 1 },
  },
]

export const ISSUER_COLORS: Record<string, string> = {
  'Chase':            'bg-blue-50 border-blue-200 text-blue-700',
  'American Express': 'bg-slate-100 border-slate-300 text-slate-700',
  'Citi':             'bg-red-50 border-red-200 text-red-700',
  'Capital One':      'bg-red-50 border-red-200 text-red-700',
  'Wells Fargo':      'bg-amber-50 border-amber-200 text-amber-700',
  'Discover':         'bg-orange-50 border-orange-200 text-orange-700',
  'US Bank':          'bg-purple-50 border-purple-200 text-purple-700',
  'Custom':           'bg-emerald-50 border-emerald-200 text-emerald-700',
}

export const ISSUER_BADGE_COLORS: Record<string, string> = {
  'Chase':            'bg-blue-100 text-blue-600',
  'American Express': 'bg-slate-200 text-slate-600',
  'Citi':             'bg-red-100 text-red-600',
  'Capital One':      'bg-red-100 text-red-600',
  'Wells Fargo':      'bg-amber-100 text-amber-700',
  'Discover':         'bg-orange-100 text-orange-600',
  'US Bank':          'bg-purple-100 text-purple-600',
  'Custom':           'bg-emerald-100 text-emerald-700',
}

export function getCardById(id: string): CreditCard | undefined {
  return CARD_CATALOG.find(c => c.id === id)
}

export function getCardOrCustomById(
  id: string,
  customCards: CustomCard[],
): CreditCard | CustomCard | undefined {
  return CARD_CATALOG.find(c => c.id === id) || customCards.find(c => c.id === id)
}

export interface CategoryCoverage {
  rate: number
  cardId: string | null
  rewardType: 'cashback' | 'points' | null
}

export function computeCoverage(
  walletIds: string[],
  customCards: CustomCard[],
  rateOverrides: Record<string, Record<string, number>>,
  categoryKeys: string[],
): Record<string, CategoryCoverage> {
  const walletCards = walletIds
    .map(id => getCardOrCustomById(id, customCards))
    .filter(Boolean) as (CreditCard | CustomCard)[]

  const result: Record<string, CategoryCoverage> = {}

  for (const key of categoryKeys) {
    let best: CategoryCoverage = { rate: 0, cardId: null, rewardType: null }

    for (const card of walletCards) {
      const rate = rateOverrides[card.id]?.[key] ?? card.rewards[key] ?? 0
      if (rate > best.rate) {
        best = { rate, cardId: card.id, rewardType: card.rewardType }
      }
    }

    result[key] = best.rate === 0 ? { rate: 1, cardId: null, rewardType: null } : best
  }

  return result
}

export function getGapCategories(
  coverage: Record<string, CategoryCoverage>,
  categoryKeys: string[],
  threshold: number,
): string[] {
  return categoryKeys.filter(key => (coverage[key]?.rate ?? 0) < threshold)
}

export function getRecommendations(
  walletIds: string[],
  wishlistIds: string[],
  customCards: CustomCard[],
  rateOverrides: Record<string, Record<string, number>>,
  gaps: string[],
): Record<string, (CreditCard | CustomCard)[]> {
  const owned = new Set([...walletIds, ...wishlistIds])
  const candidates: (CreditCard | CustomCard)[] = [
    ...CARD_CATALOG.filter(c => !owned.has(c.id)),
    ...customCards.filter(c => !owned.has(c.id)),
  ]

  const result: Record<string, (CreditCard | CustomCard)[]> = {}

  for (const cat of gaps) {
    const sorted = [...candidates].sort((a, b) => {
      const rA = rateOverrides[a.id]?.[cat] ?? a.rewards[cat] ?? 0
      const rB = rateOverrides[b.id]?.[cat] ?? b.rewards[cat] ?? 0
      return rB - rA
    })
    result[cat] = sorted.slice(0, 3)
  }

  return result
}

export const DEFAULT_PORTFOLIO: CreditCardPortfolio = {
  wallet: [],
  wishlist: [],
  customCategories: [],
  customCards: [],
  rateOverrides: {},
  coverageThreshold: 3,
}

export interface EcosystemPreset {
  id: string
  name: string
  ecosystem: string
  cardIds: string[]
  description: string
}

export const ECOSYSTEM_PRESETS: EcosystemPreset[] = [
  {
    id: 'chase-trifecta',
    name: 'Chase Trifecta',
    ecosystem: 'Chase',
    cardIds: ['csp', 'cfu', 'cff'],
    description: 'Sapphire Preferred · Freedom Unlimited · Freedom Flex',
  },
  {
    id: 'chase-trifecta-premium',
    name: 'Chase Trifecta+',
    ecosystem: 'Chase',
    cardIds: ['csr', 'cfu', 'cff'],
    description: 'Sapphire Reserve · Freedom Unlimited · Freedom Flex',
  },
  {
    id: 'amex-trifecta',
    name: 'Amex Trifecta',
    ecosystem: 'American Express',
    cardIds: ['amex-platinum', 'amex-gold', 'bcp'],
    description: 'Platinum · Gold · Blue Cash Preferred',
  },
  {
    id: 'capital-one-duo',
    name: 'Capital One Duo',
    ecosystem: 'Capital One',
    cardIds: ['venture-x', 'savor-one'],
    description: 'Venture X · SavorOne',
  },
  {
    id: 'citi-trifecta',
    name: 'Citi Trifecta',
    ecosystem: 'Citi',
    cardIds: ['citi-strata-premier', 'citi-custom-cash', 'citi-double-cash'],
    description: 'Strata Premier · Custom Cash · Double Cash',
  },
  {
    id: 'wf-duo',
    name: 'WF Duo',
    ecosystem: 'Wells Fargo',
    cardIds: ['wf-autograph', 'active-cash'],
    description: 'Autograph · Active Cash',
  },
  {
    id: 'wf-trifecta',
    name: 'WF Trifecta',
    ecosystem: 'Wells Fargo',
    cardIds: ['wf-autograph-journey', 'wf-autograph', 'active-cash'],
    description: 'Autograph Journey · Autograph · Active Cash',
  },
]
