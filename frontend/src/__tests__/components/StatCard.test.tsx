/**
 * Component tests for src/components/StatCard.tsx
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from '../../components/StatCard'

// Minimal mock icon that satisfies the LucideIcon type
const MockIcon = () => <svg data-testid="mock-icon" />

describe('StatCard', () => {
  it('renders the label', () => {
    render(<StatCard label="Net Worth" value="$1.5M" icon={MockIcon as any} />)
    expect(screen.getByText('Net Worth')).toBeInTheDocument()
  })

  it('renders the value', () => {
    render(<StatCard label="Net Worth" value="$1.5M" icon={MockIcon as any} />)
    expect(screen.getByText('$1.5M')).toBeInTheDocument()
  })

  it('renders subtext when provided', () => {
    render(
      <StatCard label="FIRE Progress" value="50%" subtext="Halfway there" icon={MockIcon as any} />
    )
    expect(screen.getByText('Halfway there')).toBeInTheDocument()
  })

  it('does not render subtext when not provided', () => {
    render(<StatCard label="Label" value="Value" icon={MockIcon as any} />)
    // The subtext element should not exist
    expect(screen.queryByText('Halfway there')).toBeNull()
  })

  it('applies up-trend color class to subtext', () => {
    render(
      <StatCard label="L" value="V" subtext="Going up" icon={MockIcon as any} trend="up" />
    )
    const subtext = screen.getByText('Going up')
    expect(subtext.className).toContain('text-fire-600')
  })

  it('applies down-trend color class to subtext', () => {
    render(
      <StatCard label="L" value="V" subtext="Going down" icon={MockIcon as any} trend="down" />
    )
    const subtext = screen.getByText('Going down')
    expect(subtext.className).toContain('text-red-500')
  })

  it('applies neutral color class to subtext when trend is neutral', () => {
    render(
      <StatCard label="L" value="V" subtext="Flat" icon={MockIcon as any} trend="neutral" />
    )
    const subtext = screen.getByText('Flat')
    expect(subtext.className).toContain('text-slate-500')
  })

  it('renders the icon', () => {
    render(<StatCard label="L" value="V" icon={MockIcon as any} />)
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
  })
})
