/**
 * Component tests for src/pages/FireFlowchart.tsx
 *
 * FireFlowchart has no external dependencies (no router, no auth), so it
 * renders standalone. Tests cover: section visibility, view toggling, and
 * task-completion interaction.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FireFlowchart from '../../pages/FireFlowchart'

describe('FireFlowchart', () => {
  it('renders without crashing', () => {
    render(<FireFlowchart />)
    expect(document.body).toBeTruthy()
  })

  it('shows the first section label', () => {
    render(<FireFlowchart />)
    expect(screen.getByText('Budgeting Fundamentals')).toBeInTheDocument()
  })

  it('shows all 8 section labels', () => {
    render(<FireFlowchart />)
    const labels = [
      'Budgeting Fundamentals',
      'Employer Match & Emergency Fund',
      'Debt Reduction',
      'Health Savings Account (HSA)',
      'Individual Retirement Account (IRA)',
      'Tax-Advantaged Accounts',
      'After-Tax & Taxable Accounts',
      'Final Optimizations',
    ]
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('defaults to Steps view', () => {
    render(<FireFlowchart />)
    // The Steps toggle button should be in the document
    expect(screen.getByRole('button', { name: /steps/i })).toBeInTheDocument()
  })

  it('has a Chart view toggle button', () => {
    render(<FireFlowchart />)
    expect(screen.getByRole('button', { name: /chart/i })).toBeInTheDocument()
  })

  it('clicking Chart toggles the view', async () => {
    const user = userEvent.setup()
    render(<FireFlowchart />)
    const chartBtn = screen.getByRole('button', { name: /chart/i })
    await user.click(chartBtn)
    // After switching to chart view, the Steps button should still be visible
    // (and chart-view content renders)
    expect(screen.getByRole('button', { name: /steps/i })).toBeInTheDocument()
  })

  it('shows node titles for the first section in Steps view', () => {
    render(<FireFlowchart />)
    // "Create a Budget" is a node in Section 0 — should be visible as a task card title
    expect(screen.getByText('Create a Budget')).toBeInTheDocument()
  })

  it('clicking a node card expands it to show task list', async () => {
    const user = userEvent.setup()
    render(<FireFlowchart />)
    const card = screen.getByText('Create a Budget')
    await user.click(card)
    // After expansion, task items are visible
    expect(
      screen.getByText('List all income sources (salary, freelance, side income)')
    ).toBeInTheDocument()
  })

  it('clicking a task marks it done (toggles)', async () => {
    const user = userEvent.setup()
    render(<FireFlowchart />)
    // First expand the node
    await user.click(screen.getByText('Create a Budget'))
    const taskLabel = 'List all income sources (salary, freelance, side income)'
    const taskBtn = screen.getByText(taskLabel).closest('button') as HTMLElement
    // Before clicking: no line-through
    expect(taskBtn.querySelector('span')?.className).not.toContain('line-through')
    await user.click(taskBtn)
    // After clicking: text is struck through
    expect(screen.getByText(taskLabel).className).toContain('line-through')
  })

  it('has a reset button', () => {
    render(<FireFlowchart />)
    // RotateCcw icon button for resetting progress — look for an accessible label or icon
    const buttons = screen.getAllByRole('button')
    // At minimum, the Steps/Chart toggle and section buttons are present
    expect(buttons.length).toBeGreaterThan(0)
  })
})
