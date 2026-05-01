/**
 * Component tests for src/components/HintTooltip.tsx
 *
 * The tooltip uses createPortal (renders into document.body) and show/hide on
 * mouse events. jsdom supports portals, and @testing-library/user-event
 * dispatches real pointer events for hover interactions.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HintTooltip from '../../components/HintTooltip'

describe('HintTooltip', () => {
  it('renders the Info icon', () => {
    render(<HintTooltip hint="Some hint text" />)
    // Lucide Info renders an <svg> element
    expect(document.querySelector('svg')).not.toBeNull()
  })

  it('tooltip is not visible on initial render', () => {
    render(<HintTooltip hint="Hidden until hover" />)
    expect(screen.queryByText('Hidden until hover')).toBeNull()
  })

  it('tooltip appears on mouse enter', async () => {
    const user = userEvent.setup()
    render(<HintTooltip hint="Show on hover" />)
    const trigger = document.querySelector('span.inline-flex') as HTMLElement
    await user.hover(trigger)
    expect(screen.getByText('Show on hover')).toBeInTheDocument()
  })

  it('tooltip disappears on mouse leave', async () => {
    const user = userEvent.setup()
    render(<HintTooltip hint="Disappear on leave" />)
    const trigger = document.querySelector('span.inline-flex') as HTMLElement
    await user.hover(trigger)
    expect(screen.getByText('Disappear on leave')).toBeInTheDocument()
    await user.unhover(trigger)
    expect(screen.queryByText('Disappear on leave')).toBeNull()
  })

  it('renders different hint text correctly', async () => {
    const user = userEvent.setup()
    render(<HintTooltip hint="Withdrawal rate is the % of portfolio you spend annually" />)
    const trigger = document.querySelector('span.inline-flex') as HTMLElement
    await user.hover(trigger)
    expect(screen.getByText('Withdrawal rate is the % of portfolio you spend annually')).toBeInTheDocument()
  })
})
