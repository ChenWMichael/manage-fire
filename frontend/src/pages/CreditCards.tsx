import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, CreditCard,
  Info, LayoutGrid, Pencil, Plus, Star, Tag, Trash2, X,
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { CreditCard as CreditCardData, CreditCardPortfolio, CustomCard, RewardType } from '../types'
import {
  CARD_CATALOG,
  DEFAULT_PORTFOLIO,
  ECOSYSTEM_PRESETS,
  ISSUER_BADGE_COLORS,
  ISSUER_COLORS,
  SPENDING_CATEGORIES,
  computeCoverage,
  getCardById,
  getCardOrCustomById,
  getGapCategories,
  getRecommendations,
  type CategoryCoverage,
  type EcosystemPreset,
} from '../utils/creditCardData'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rateLabel(rate: number, rewardType: 'cashback' | 'points' | null): string {
  if (rewardType === 'points') return `${rate}x`
  return `${rate}%`
}

function coverageTextColor(rate: number, threshold: number): string {
  if (rate >= threshold + 1) return 'text-emerald-600'
  if (rate >= threshold)     return 'text-fire-600'
  if (rate > 1)              return 'text-amber-600'
  return 'text-slate-400'
}

function coverageCellClass(rate: number, threshold: number): string {
  if (rate >= threshold + 1) return 'bg-emerald-50 border-emerald-200'
  if (rate >= threshold)     return 'bg-fire-50 border-fire-200'
  if (rate > 1)              return 'bg-amber-50 border-amber-200'
  return 'bg-slate-50 border-slate-200'
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[85vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ─── EditRatesModal ───────────────────────────────────────────────────────────

function EditRatesModal({
  card,
  allCategories,
  existingOverrides,
  onSave,
  onDelete,
  onClose,
}: {
  card: CreditCardData | CustomCard
  allCategories: { key: string; label: string; emoji: string }[]
  existingOverrides: Record<string, number>
  onSave: (overrides: Record<string, number>) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const cat of allCategories) {
      if (existingOverrides[cat.key] !== undefined) {
        init[cat.key] = String(existingOverrides[cat.key])
      }
    }
    return init
  })

  function handleChange(key: string, value: string) {
    setOverrides(prev => {
      if (value === '') {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }

  function handleSave() {
    const result: Record<string, number> = {}
    for (const [key, val] of Object.entries(overrides)) {
      const num = parseFloat(val)
      if (!isNaN(num) && num >= 0) result[key] = num
    }
    onSave(result)
    onClose()
  }

  const isCustom = 'isCustom' in card

  return (
    <Modal title={`Edit Rates — ${card.name}`} onClose={onClose}>
      <p className="text-xs text-slate-500 mb-4">
        Override the earning rate for this card per category. Leave blank to use the card's base rate.
      </p>
      <div className="space-y-1.5">
        {allCategories.map(cat => {
          const baseRate = card.rewards[cat.key] ?? 1
          const hasOverride = overrides[cat.key] !== undefined
          return (
            <div key={cat.key} className="flex items-center gap-3">
              <span className="text-base w-6 text-center flex-shrink-0">{cat.emoji}</span>
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{cat.label}</span>
              <span className="text-xs text-slate-400 w-12 text-right flex-shrink-0 tabular-nums">
                base: {baseRate}{card.rewardType === 'points' ? 'x' : '%'}
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={overrides[cat.key] ?? ''}
                onChange={e => handleChange(cat.key, e.target.value)}
                placeholder={`${baseRate}`}
                className={`w-20 flex-shrink-0 px-2 py-1 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-fire-500 transition-shadow ${
                  hasOverride
                    ? 'border-fire-400 bg-fire-50 text-fire-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOverrides({})}
            className="btn-secondary text-xs py-1.5"
          >
            Reset all
          </button>
          {isCustom && onDelete && (
            <button
              onClick={() => { onDelete(); onClose() }}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
            >
              <Trash2 size={12} />
              Delete card
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary text-sm py-1.5">Cancel</button>
          <button onClick={handleSave} className="btn-primary text-sm py-1.5">Save</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── CustomCardModal ──────────────────────────────────────────────────────────

function CustomCardModal({
  allCategories,
  onSave,
  onClose,
}: {
  allCategories: { key: string; label: string; emoji: string }[]
  onSave: (card: CustomCard) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [rewardType, setRewardType] = useState<RewardType>('cashback')
  const [annualFee, setAnnualFee] = useState('0')
  const [rates, setRates] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')

  function handleSave() {
    if (!name.trim()) return
    const rewards: Record<string, number> = {}
    for (const cat of allCategories) {
      const val = parseFloat(rates[cat.key] ?? '')
      rewards[cat.key] = isNaN(val) || val < 0 ? (cat.key === 'base' ? 1 : 1) : val
    }
    const newCard: CustomCard = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      issuer: issuer.trim() || 'Custom',
      rewardType,
      annualFee: Math.max(0, parseFloat(annualFee) || 0),
      rewards,
      note: note.trim() || undefined,
      isCustom: true,
    }
    onSave(newCard)
    onClose()
  }

  return (
    <Modal title="Create Custom Card" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Card Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Costco Anywhere Visa"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label">Issuer</label>
            <input
              value={issuer}
              onChange={e => setIssuer(e.target.value)}
              placeholder="e.g. Citi"
              className="input text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Reward Type</label>
            <select
              value={rewardType}
              onChange={e => setRewardType(e.target.value as RewardType)}
              className="input text-sm"
            >
              <option value="cashback">Cash Back (%)</option>
              <option value="points">Points (x)</option>
            </select>
          </div>
          <div>
            <label className="label">Annual Fee ($)</label>
            <input
              type="number"
              min="0"
              value={annualFee}
              onChange={e => setAnnualFee(e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>

        <div>
          <label className="label">Earning Rates</label>
          <div className="space-y-1.5 mt-1">
            {allCategories.map(cat => (
              <div key={cat.key} className="flex items-center gap-3">
                <span className="text-base w-6 text-center flex-shrink-0">{cat.emoji}</span>
                <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{cat.label}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={rates[cat.key] ?? ''}
                  onChange={e => setRates(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  placeholder="1"
                  className="w-20 flex-shrink-0 px-2 py-1 border border-slate-200 bg-white rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-fire-500 transition-shadow"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Costco membership required"
            className="input text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary text-sm py-1.5">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} className="btn-primary text-sm py-1.5">
            Create Card
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── CardChip ─────────────────────────────────────────────────────────────────

function CardChip({
  cardId,
  customCards,
  onRemove,
  onEditRates,
}: {
  cardId: string
  customCards: CustomCard[]
  onRemove: () => void
  onEditRates: () => void
}) {
  const card = getCardOrCustomById(cardId, customCards)
  if (!card) return null
  const colorClass = ISSUER_COLORS[card.issuer] ?? 'bg-slate-100 border-slate-300 text-slate-700'
  const isCustom = 'isCustom' in card
  return (
    <div className={`inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg border text-sm font-medium ${colorClass}`}>
      <CreditCard size={13} className="flex-shrink-0 opacity-60" />
      <span className="leading-tight">{card.name}</span>
      <span className="text-xs opacity-50 font-normal hidden sm:inline">{card.issuer}</span>
      {isCustom && (
        <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-200 text-emerald-700 font-semibold">Custom</span>
      )}
      {card.note && (
        <span className="relative group flex-shrink-0 cursor-help">
          <Info size={11} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] leading-snug rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none z-50 whitespace-normal">
            {card.note}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </div>
        </span>
      )}
      <button
        onClick={onEditRates}
        className="ml-0.5 rounded p-0.5 opacity-50 hover:opacity-100 hover:bg-black/10 transition-all flex-shrink-0"
        aria-label="Edit rates"
        title="Customize rates"
      >
        <Pencil size={11} />
      </button>
      <button
        onClick={onRemove}
        className="rounded p-0.5 opacity-50 hover:opacity-100 hover:bg-black/10 transition-all flex-shrink-0"
        aria-label="Remove"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── AddCardSearch ────────────────────────────────────────────────────────────

function AddCardSearch({
  label,
  excludeIds,
  customCards,
  onAdd,
  onCreateCustom,
}: {
  label: string
  excludeIds: string[]
  customCards: CustomCard[]
  onAdd: (id: string) => void
  onCreateCustom: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filteredCatalog = useMemo(() => {
    const q = query.toLowerCase()
    return CARD_CATALOG.filter(
      c =>
        !excludeIds.includes(c.id) &&
        (q === '' || c.name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q)),
    )
  }, [query, excludeIds])

  const filteredCustom = useMemo(() => {
    const q = query.toLowerCase()
    return customCards.filter(
      c =>
        !excludeIds.includes(c.id) &&
        (q === '' || c.name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q)),
    )
  }, [query, excludeIds, customCards])

  function handleAdd(id: string) {
    onAdd(id)
    setQuery('')
    setOpen(false)
  }

  const hasResults = filteredCatalog.length > 0 || filteredCustom.length > 0

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setOpen(o => !o)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="btn-secondary flex items-center gap-2 text-sm py-1.5"
      >
        <Plus size={14} />
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-72 sm:w-80 card shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by card or issuer…"
              className="input text-sm py-1.5"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {!hasResults && (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">No cards found</div>
            )}
            {filteredCustom.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Your Custom Cards
                </div>
                {filteredCustom.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleAdd(card.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{card.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700">
                          {card.issuer}
                        </span>
                        <span className="text-xs text-slate-400">{card.rewardType === 'cashback' ? 'Cash Back' : 'Points'}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{card.annualFee === 0 ? 'No fee' : `$${card.annualFee}/yr`}</span>
                      </div>
                    </div>
                    <Plus size={13} className="text-slate-300 flex-shrink-0" />
                  </button>
                ))}
                {filteredCatalog.length > 0 && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-50">
                    Card Catalog
                  </div>
                )}
              </>
            )}
            {filteredCatalog.map(card => (
              <button
                key={card.id}
                onClick={() => handleAdd(card.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{card.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${ISSUER_BADGE_COLORS[card.issuer] ?? 'bg-slate-100 text-slate-600'}`}>
                      {card.issuer}
                    </span>
                    <span className="text-xs text-slate-400">{card.rewardType === 'cashback' ? 'Cash Back' : 'Points'}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{card.annualFee === 0 ? 'No fee' : `$${card.annualFee}/yr`}</span>
                  </div>
                </div>
                <Plus size={13} className="text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100">
            <button
              onClick={() => {
                setOpen(false)
                setQuery('')
                onCreateCustom()
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left text-sm text-fire-600 font-medium"
            >
              <Plus size={13} className="flex-shrink-0" />
              Create custom card
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CoverageCell ─────────────────────────────────────────────────────────────

function CoverageCell({
  category,
  coverage,
  cardName,
  threshold,
  fromWishlist,
  isCustom,
  onRemoveCategory,
}: {
  category: { key: string; label: string; emoji: string }
  coverage: CategoryCoverage
  cardName: string | null
  threshold: number
  fromWishlist?: boolean
  isCustom?: boolean
  onRemoveCategory?: () => void
}) {
  return (
    <div className={`relative rounded-xl border p-3 flex flex-col gap-1.5 group ${coverageCellClass(coverage.rate, threshold)} ${fromWishlist ? 'border-dashed' : ''}`}>
      {isCustom && onRemoveCategory && (
        <button
          onClick={onRemoveCategory}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-400 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Remove custom category"
        >
          <X size={8} />
        </button>
      )}
      <div className="flex items-center justify-between gap-1">
        <span className="text-sm leading-none">{category.emoji}</span>
        <span className={`text-base font-bold leading-none ${coverageTextColor(coverage.rate, threshold)}`}>
          {rateLabel(coverage.rate, coverage.rewardType)}
          {fromWishlist && <Star size={8} className="inline ml-0.5 mb-0.5 fill-amber-400 text-amber-400" />}
        </span>
      </div>
      <div className="text-xs font-semibold text-slate-700 leading-tight">{category.label}</div>
      <div className="text-[11px] text-slate-400 truncate leading-tight">
        {cardName ?? 'No card'}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreditCards() {
  const [portfolio, setPortfolio] = useLocalStorage<CreditCardPortfolio>('credit-card-portfolio', DEFAULT_PORTFOLIO)

  // Normalize missing fields from older stored data
  const safe: CreditCardPortfolio = useMemo(() => ({
    wallet: portfolio.wallet ?? [],
    wishlist: portfolio.wishlist ?? [],
    customCategories: portfolio.customCategories ?? [],
    customCards: portfolio.customCards ?? [],
    rateOverrides: portfolio.rateOverrides ?? {},
    coverageThreshold: portfolio.coverageThreshold ?? 3,
  }), [portfolio])

  // Modal state
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [customCardTarget, setCustomCardTarget] = useState<'wallet' | 'wishlist' | null>(null)

  // Preset popover
  const [presetPopover, setPresetPopover] = useState<string | null>(null)

  useEffect(() => {
    if (!presetPopover) return
    function handleClick() { setPresetPopover(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [presetPopover])

  // Add custom category form
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('')

  function updatePortfolio(updater: (prev: CreditCardPortfolio) => CreditCardPortfolio) {
    setPortfolio(raw => updater({
      wallet: raw.wallet ?? [],
      wishlist: raw.wishlist ?? [],
      customCategories: raw.customCategories ?? [],
      customCards: raw.customCards ?? [],
      rateOverrides: raw.rateOverrides ?? {},
      coverageThreshold: raw.coverageThreshold ?? 3,
    }))
  }

  const allCategories: { key: string; label: string; emoji: string }[] = useMemo(() => [
    ...(SPENDING_CATEGORIES as { key: string; label: string; emoji: string }[]),
    ...safe.customCategories.map(c => ({ key: c.id, label: c.label, emoji: c.emoji })),
  ], [safe.customCategories])

  const allCategoryKeys = useMemo(() => allCategories.map(c => c.key), [allCategories])
  const allOwnedIds = useMemo(() => [...safe.wallet, ...safe.wishlist], [safe])

  // Wallet-only coverage: what you actually earn today
  const walletCoverage = useMemo(
    () => computeCoverage(safe.wallet, safe.customCards, safe.rateOverrides, allCategoryKeys),
    [safe.wallet, safe.customCards, safe.rateOverrides, allCategoryKeys],
  )

  // Combined coverage: wallet + wishlist (the "what if I had these" preview)
  const projectedCoverage = useMemo(
    () => computeCoverage([...safe.wallet, ...safe.wishlist], safe.customCards, safe.rateOverrides, allCategoryKeys),
    [safe.wallet, safe.wishlist, safe.customCards, safe.rateOverrides, allCategoryKeys],
  )

  const wishlistIdSet = useMemo(() => new Set(safe.wishlist), [safe.wishlist])

  const threshold = safe.coverageThreshold

  // Gaps are based on wallet-only — what you actually still need
  const gaps = useMemo(
    () => getGapCategories(walletCoverage, allCategoryKeys, threshold),
    [walletCoverage, allCategoryKeys, threshold],
  )

  const recommendations = useMemo(
    () => getRecommendations(safe.wallet, safe.wishlist, safe.customCards, safe.rateOverrides, gaps),
    [safe.wallet, safe.wishlist, safe.customCards, safe.rateOverrides, gaps],
  )

  function getCard(id: string): CreditCardData | CustomCard | undefined {
    return getCardOrCustomById(id, safe.customCards)
  }

  function addToWallet(id: string) {
    updatePortfolio(p => ({
      ...p,
      wallet: [...p.wallet.filter(x => x !== id), id],
      wishlist: p.wishlist.filter(x => x !== id),
    }))
  }

  function addToWishlist(id: string) {
    updatePortfolio(p => ({
      ...p,
      wishlist: [...p.wishlist.filter(x => x !== id), id],
      wallet: p.wallet.filter(x => x !== id),
    }))
  }

  function removeFromWallet(id: string) {
    updatePortfolio(p => ({ ...p, wallet: p.wallet.filter(x => x !== id) }))
  }

  function removeFromWishlist(id: string) {
    updatePortfolio(p => ({ ...p, wishlist: p.wishlist.filter(x => x !== id) }))
  }

  function saveRateOverrides(cardId: string, overrides: Record<string, number>) {
    updatePortfolio(p => ({
      ...p,
      rateOverrides: {
        ...p.rateOverrides,
        [cardId]: Object.keys(overrides).length > 0 ? overrides : undefined as unknown as Record<string, number>,
      },
    }))
  }

  function handleCreateCustomCard(card: CustomCard) {
    updatePortfolio(p => ({
      ...p,
      customCards: [...p.customCards, card],
      ...(customCardTarget === 'wallet'
        ? { wallet: [...p.wallet, card.id] }
        : customCardTarget === 'wishlist'
        ? { wishlist: [...p.wishlist, card.id] }
        : {}),
    }))
    setCustomCardTarget(null)
  }

  function handleDeleteCustomCard(cardId: string) {
    updatePortfolio(p => ({
      ...p,
      customCards: p.customCards.filter(c => c.id !== cardId),
      wallet: p.wallet.filter(id => id !== cardId),
      wishlist: p.wishlist.filter(id => id !== cardId),
      rateOverrides: Object.fromEntries(
        Object.entries(p.rateOverrides).filter(([key]) => key !== cardId),
      ),
    }))
  }

  function handleAddCategory() {
    if (!newCatLabel.trim()) return
    const id = `cat-${Date.now()}`
    updatePortfolio(p => ({
      ...p,
      customCategories: [
        ...p.customCategories,
        { id, label: newCatLabel.trim(), emoji: newCatEmoji.trim() || '🏷️' },
      ],
    }))
    setNewCatLabel('')
    setNewCatEmoji('')
    setShowAddCat(false)
  }

  function handleRemoveCategory(catId: string) {
    updatePortfolio(p => ({
      ...p,
      customCategories: p.customCategories.filter(c => c.id !== catId),
    }))
  }

  function handlePresetClick(presetId: string) {
    if (safe.wallet.length === 0) {
      loadPreset(presetId, 'replace')
    } else {
      setPresetPopover(prev => prev === presetId ? null : presetId)
    }
  }

  function loadPreset(presetId: string, mode: 'replace' | 'add') {
    const preset = ECOSYSTEM_PRESETS.find((p: EcosystemPreset) => p.id === presetId)
    if (!preset) return
    updatePortfolio(p => {
      if (mode === 'replace') {
        return {
          ...p,
          wallet: preset.cardIds,
          wishlist: p.wishlist.filter(id => !preset.cardIds.includes(id)),
        }
      }
      const merged = [...new Set([...p.wallet, ...preset.cardIds])]
      return {
        ...p,
        wallet: merged,
        wishlist: p.wishlist.filter(id => !merged.includes(id)),
      }
    })
    setPresetPopover(null)
  }

  const builtInCatKeys = new Set<string>(SPENDING_CATEGORIES.map(c => c.key))
  const coveredCount = allCategoryKeys.filter(k => (walletCoverage[k]?.rate ?? 0) >= threshold).length
  const projectedCoveredCount = allCategoryKeys.filter(k => (projectedCoverage[k]?.rate ?? 0) >= threshold).length
  const totalCats = allCategoryKeys.length
  const hasCards = safe.wallet.length > 0 || safe.wishlist.length > 0

  const editingCard = editingCardId ? getCard(editingCardId) : null

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {editingCard && editingCardId && (
        <EditRatesModal
          card={editingCard}
          allCategories={allCategories}
          existingOverrides={safe.rateOverrides[editingCardId] ?? {}}
          onSave={overrides => saveRateOverrides(editingCardId, overrides)}
          onDelete={'isCustom' in editingCard ? () => handleDeleteCustomCard(editingCardId) : undefined}
          onClose={() => setEditingCardId(null)}
        />
      )}
      {customCardTarget !== null && (
        <CustomCardModal
          allCategories={allCategories}
          onSave={handleCreateCustomCard}
          onClose={() => setCustomCardTarget(null)}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Credit Card Portfolio</h1>
        <p className="text-slate-500 mt-1">
          Map your rewards coverage across spending categories and find cards that fill the gaps.
        </p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Cards in wallet</p>
          <p className="text-2xl font-bold text-slate-900">{safe.wallet.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${coveredCount === totalCats ? 'bg-fire-50 border-fire-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-medium text-slate-500 mb-1">
            Categories at {threshold}%+ / {threshold}x+
          </p>
          <p className={`text-2xl font-bold ${coveredCount === totalCats ? 'text-fire-600' : 'text-slate-900'}`}>
            {coveredCount}/{totalCats}
          </p>
          {projectedCoveredCount > coveredCount && safe.wishlist.length > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              +{projectedCoveredCount - coveredCount} with wishlist
            </p>
          )}
        </div>
        <div className={`rounded-xl border p-4 ${gaps.length === 0 && safe.wallet.length > 0 ? 'bg-white border-slate-200' : gaps.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-medium text-slate-500 mb-1">Coverage gaps</p>
          <p className={`text-2xl font-bold ${gaps.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{gaps.length}</p>
        </div>
      </div>

      {/* ── Gap Threshold ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Coverage target:</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(t => (
            <button
              key={t}
              onClick={() => updatePortfolio(p => ({ ...p, coverageThreshold: t }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                threshold === t
                  ? 'bg-fire-500 border-fire-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-fire-300 hover:text-fire-600'
              }`}
            >
              {t}x / {t}%
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">— categories below this are flagged as gaps</span>
      </div>

      {/* ── Ecosystem Presets ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 text-slate-500">
            <LayoutGrid size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Ecosystem Presets</h2>
            <p className="text-xs text-slate-400">Quick-load a popular card combination — click to preview, then load to wallet</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {ECOSYSTEM_PRESETS.map(preset => {
              const colorClass = ISSUER_COLORS[preset.ecosystem] ?? 'bg-slate-50 border-slate-200 text-slate-700'
              return (
                <div key={preset.id} className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); handlePresetClick(preset.id) }}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-opacity hover:opacity-75 ${colorClass} ${presetPopover === preset.id ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                  >
                    {preset.name}
                  </button>
                  {presetPopover === preset.id && (
                    <div
                      className="absolute top-full mt-1.5 left-0 z-50 w-64 card shadow-xl"
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800">{preset.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{preset.description}</p>
                      </div>
                      <div className="px-4 py-2.5">
                        <p className="text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Cards included</p>
                        <ul className="space-y-1">
                          {preset.cardIds.map(id => {
                            const card = getCardById(id)
                            return card ? (
                              <li key={id} className="flex items-center gap-1.5 text-xs text-slate-700">
                                <CreditCard size={10} className="text-slate-400 flex-shrink-0" />
                                <span>{card.name}</span>
                                <span className="text-slate-400 text-[10px]">· {card.issuer}</span>
                              </li>
                            ) : null
                          })}
                        </ul>
                      </div>
                      <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => loadPreset(preset.id, 'replace')}
                          className="btn-primary text-xs py-1.5 flex-1"
                        >
                          Replace wallet
                        </button>
                        <button
                          onClick={() => loadPreset(preset.id, 'add')}
                          className="btn-secondary text-xs py-1.5 flex-1"
                        >
                          Add to wallet
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Wallet + Wishlist ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* My Wallet */}
        <div className="card">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-fire-50 text-fire-600">
              <CreditCard size={14} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-800">My Wallet</h2>
              <p className="text-xs text-slate-400">Cards you currently own</p>
            </div>
            {safe.wallet.length > 0 && (
              <button
                onClick={() => updatePortfolio(p => ({ ...p, wallet: [] }))}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                title="Remove all wallet cards"
              >
                <X size={11} />
                Clear
              </button>
            )}
          </div>
          <div className="px-5 py-4 space-y-3">
            {safe.wallet.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No cards added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {safe.wallet.map(id => (
                  <CardChip
                    key={id}
                    cardId={id}
                    customCards={safe.customCards}
                    onRemove={() => removeFromWallet(id)}
                    onEditRates={() => setEditingCardId(id)}
                  />
                ))}
              </div>
            )}
            <AddCardSearch
              label="Add card"
              excludeIds={allOwnedIds}
              customCards={safe.customCards}
              onAdd={addToWallet}
              onCreateCustom={() => setCustomCardTarget('wallet')}
            />
          </div>
        </div>

        {/* Wishlist */}
        <div className="card">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <Star size={14} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-800">Wishlist</h2>
              <p className="text-xs text-slate-400">Simulate adding cards to see coverage impact</p>
            </div>
            {safe.wishlist.length > 0 && (
              <button
                onClick={() => updatePortfolio(p => ({ ...p, wishlist: [] }))}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                title="Remove all wishlist cards"
              >
                <X size={11} />
                Clear
              </button>
            )}
          </div>
          <div className="px-5 py-4 space-y-3">
            {safe.wishlist.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No cards on wishlist.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {safe.wishlist.map(id => (
                  <CardChip
                    key={id}
                    cardId={id}
                    customCards={safe.customCards}
                    onRemove={() => removeFromWishlist(id)}
                    onEditRates={() => setEditingCardId(id)}
                  />
                ))}
              </div>
            )}
            <AddCardSearch
              label="Add to wishlist"
              excludeIds={allOwnedIds}
              customCards={safe.customCards}
              onAdd={addToWishlist}
              onCreateCustom={() => setCustomCardTarget('wishlist')}
            />
          </div>
        </div>
      </div>

      {/* ── Coverage Map ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Coverage Map</h2>
            <p className="text-xs text-slate-400 mt-0.5">Best earning rate per category across your wallet</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0 pt-0.5">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{threshold + 1}x+</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fire-400 inline-block" />{threshold}x</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />below</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />base</span>
              {safe.wishlist.length > 0 && (
                <span className="flex items-center gap-1"><Star size={9} className="fill-amber-400 text-amber-400" />wishlist</span>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          {safe.wallet.length === 0 ? (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
              <Info size={15} className="flex-shrink-0 text-slate-400" />
              Add cards to your wallet to see your coverage map.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {allCategories.map(cat => {
                const cov = projectedCoverage[cat.key] ?? { rate: 1, cardId: null, rewardType: null }
                const cardName = cov.cardId ? (getCard(cov.cardId)?.name ?? null) : null
                const fromWishlist = !!(cov.cardId && wishlistIdSet.has(cov.cardId))
                const isCustomCat = !builtInCatKeys.has(cat.key)
                return (
                  <CoverageCell
                    key={cat.key}
                    category={cat}
                    coverage={cov}
                    cardName={cardName}
                    threshold={threshold}
                    fromWishlist={fromWishlist}
                    isCustom={isCustomCat}
                    onRemoveCategory={isCustomCat ? () => handleRemoveCategory(cat.key) : undefined}
                  />
                )
              })}
            </div>
          )}

          {/* Add custom category */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            {showAddCat ? (
              <div className="flex items-center gap-2">
                <input
                  value={newCatEmoji}
                  onChange={e => setNewCatEmoji(e.target.value)}
                  placeholder="🏷️"
                  className="input text-sm py-1.5 w-16 text-center"
                  maxLength={4}
                />
                <input
                  value={newCatLabel}
                  onChange={e => setNewCatLabel(e.target.value)}
                  placeholder="Category name (e.g. Golf)"
                  className="input text-sm py-1.5 flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  autoFocus
                />
                <button onClick={handleAddCategory} disabled={!newCatLabel.trim()} className="btn-primary text-sm py-1.5">
                  Add
                </button>
                <button onClick={() => { setShowAddCat(false); setNewCatLabel(''); setNewCatEmoji('') }} className="btn-secondary text-sm py-1.5">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCat(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-fire-600 transition-colors py-1"
              >
                <Tag size={12} />
                Add custom category
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Gap Analysis ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
            <AlertTriangle size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Gaps &amp; Recommendations</h2>
            <p className="text-xs text-slate-400 mt-0.5">Categories below {threshold}% / {threshold}x with top cards to fill each gap</p>
          </div>
        </div>
        <div className="px-5 py-4">
          {safe.wallet.length === 0 ? (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
              <Info size={15} className="flex-shrink-0 text-slate-400" />
              Add cards to your wallet to see gap recommendations.
            </div>
          ) : gaps.length === 0 ? (
            <div className="flex items-center gap-2.5 bg-fire-50 border border-fire-200 rounded-xl px-4 py-3 text-sm text-fire-700">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              All categories are earning {threshold}%+ / {threshold}x+. Great coverage!
            </div>
          ) : (
            <div className="space-y-5">
              {gaps.map(catKey => {
                const cat = allCategories.find(c => c.key === catKey)
                if (!cat) return null
                const currentRate = walletCoverage[catKey]?.rate ?? 1
                const currentCardId = walletCoverage[catKey]?.cardId ?? null
                const currentCard = currentCardId ? getCard(currentCardId) : null
                const projCardId = projectedCoverage[catKey]?.cardId ?? null
                const wishlistFills = !!(projCardId && wishlistIdSet.has(projCardId) && (projectedCoverage[catKey]?.rate ?? 0) >= threshold)
                const wishlistCard = wishlistFills && projCardId ? getCard(projCardId) : null
                const recs = recommendations[catKey] ?? []
                return (
                  <div key={catKey}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-sm font-semibold text-slate-800">{cat.label}</span>
                      <span className="text-xs text-slate-400">
                        currently{' '}
                        <span className={`font-semibold ${coverageTextColor(currentRate, threshold)}`}>
                          {rateLabel(currentRate, walletCoverage[catKey]?.rewardType ?? null)}
                        </span>
                        {currentCard ? ` with ${currentCard.name}` : ' (no card)'}
                      </span>
                      {currentRate < 2 && (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Gap
                        </span>
                      )}
                    </div>
                    <div className="pl-6 space-y-1.5">
                      {wishlistFills && wishlistCard ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                          <Star size={12} className="flex-shrink-0 fill-amber-400 text-amber-400" />
                          <span>
                            <span className="font-semibold">{wishlistCard.name}</span> on your wishlist covers this gap — get it to hit your target.
                          </span>
                        </div>
                      ) : recs.length === 0 ? (
                        <p className="text-xs text-slate-400">All top cards are already in your wallet or wishlist.</p>
                      ) : (
                        recs.map(rec => {
                          const rate = safe.rateOverrides[rec.id]?.[catKey] ?? rec.rewards[catKey] ?? 0
                          const colorClass = ISSUER_COLORS[rec.issuer] ?? 'bg-slate-50 border-slate-200 text-slate-700'
                          const badgeClass = ISSUER_BADGE_COLORS[rec.issuer] ?? 'bg-slate-100 text-slate-600'
                          return (
                            <div key={rec.id} className="group relative">
                              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${colorClass}`}>
                                <CreditCard size={14} className="flex-shrink-0 opacity-60" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">{rec.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${badgeClass}`}>
                                      {rec.issuer}
                                    </span>
                                  </div>
                                  <div className="text-xs opacity-60 flex gap-1.5 mt-0.5">
                                    <span>{rec.annualFee === 0 ? 'No annual fee' : `$${rec.annualFee}/yr`}</span>
                                    {rec.note && <><span>·</span><span className="truncate">{rec.note}</span></>}
                                  </div>
                                </div>
                                <div className={`text-sm font-bold flex-shrink-0 ${coverageTextColor(rate, threshold)}`}>
                                  {rateLabel(rate, rec.rewardType)}
                                </div>
                              </div>
                              {/* Mobile: always-visible buttons below the card */}
                              <div className="flex gap-1.5 mt-1.5 sm:hidden">
                                <button
                                  onClick={() => addToWallet(rec.id)}
                                  className="btn-primary text-[11px] px-2.5 py-1 flex items-center gap-1"
                                >
                                  <Plus size={10} /> Wallet
                                </button>
                                <button
                                  onClick={() => addToWishlist(rec.id)}
                                  className="btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1"
                                >
                                  <Star size={10} /> Wishlist
                                </button>
                              </div>
                              {/* Desktop: hover overlay */}
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex gap-1.5">
                                <button
                                  onClick={() => addToWallet(rec.id)}
                                  className="btn-primary text-[11px] px-2.5 py-1 flex items-center gap-1"
                                >
                                  <Plus size={10} /> Wallet
                                </button>
                                <button
                                  onClick={() => addToWishlist(rec.id)}
                                  className="btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1"
                                >
                                  <Star size={10} /> Wishlist
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Rewards Breakdown ─────────────────────────────────────────────── */}
      {hasCards && (
        <div className="card">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Rewards Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">Full rate comparison for every card in your portfolio</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium w-44">Card</th>
                  {allCategories.map(cat => (
                    <th key={cat.key} className="text-center px-2 py-2.5 text-slate-500 font-medium min-w-[52px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{cat.emoji}</span>
                        <span className="text-[10px] leading-tight">{cat.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Fee</th>
                  <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...safe.wallet.map(id => ({ id, tag: 'wallet' as const })),
                  ...safe.wishlist.map(id => ({ id, tag: 'wishlist' as const })),
                ].map(({ id, tag }) => {
                  const card = getCard(id)
                  if (!card) return null
                  const overrides = safe.rateOverrides[id] ?? {}
                  const isCustomCard = 'isCustom' in card
                  return (
                    <tr key={id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800 truncate max-w-[160px]">{card.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${ISSUER_BADGE_COLORS[card.issuer] ?? 'bg-slate-100 text-slate-600'}`}>
                            {card.issuer}
                          </span>
                          {isCustomCard && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Custom</span>
                          )}
                          {tag === 'wishlist' && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">Wishlist</span>
                          )}
                        </div>
                        {card.note && (
                          <div className="text-[10px] text-amber-600 mt-1 max-w-[160px] leading-snug">{card.note}</div>
                        )}
                      </td>
                      {allCategories.map(cat => {
                        const baseRate = card.rewards[cat.key] ?? 1
                        const effectiveRate = overrides[cat.key] ?? baseRate
                        const hasOverride = overrides[cat.key] !== undefined
                        return (
                          <td key={cat.key} className="text-center px-2 py-2.5">
                            <span className={`font-semibold ${coverageTextColor(effectiveRate, threshold)} ${hasOverride ? 'underline decoration-dotted' : ''}`}
                              title={hasOverride ? `Override (base: ${baseRate}${card.rewardType === 'points' ? 'x' : '%'})` : undefined}>
                              {rateLabel(effectiveRate, card.rewardType)}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-slate-600">
                        {card.annualFee === 0
                          ? <span className="text-fire-600 font-medium">Free</span>
                          : `$${card.annualFee}`}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 capitalize">{card.rewardType}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Clear all ─────────────────────────────────────────────────────── */}
      {hasCards && (
        <div className="flex justify-end">
          <button
            onClick={() => setPortfolio(DEFAULT_PORTFOLIO)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={12} />
            Clear all cards
          </button>
        </div>
      )}
    </div>
  )
}
