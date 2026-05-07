import { ArrowRight, Briefcase, Calculator, Flame, GitBranch, Home, Target } from 'lucide-react'
import { Link } from 'react-router-dom'

const tools = [
  {
    icon: Calculator,
    title: 'FIRE Calculator',
    description: 'Project portfolio growth, find your FI number, and estimate your FIRE date. Includes CoastFIRE support.',
    color: 'bg-fire-50 text-fire-600',
    to: '/app/calculator',
  },
  {
    icon: Home,
    title: 'Rent vs. Buy',
    description: 'Compare long-term wealth between buying a home and investing your down payment, year by year.',
    color: 'bg-violet-50 text-violet-600',
    to: '/app/rent-vs-buy',
  },
  {
    icon: Target,
    title: 'House Affordability',
    description: 'Estimate a comfortable max home price based on your income, debt load, and local tax rates.',
    color: 'bg-emerald-50 text-emerald-600',
    to: '/app/house-affordability',
  },
  {
    icon: Briefcase,
    title: 'Offer Simulator',
    description: 'Compare job offers side-by-side with after-tax income, RSU vesting schedules, and 4-year totals.',
    color: 'bg-slate-100 text-slate-600',
    to: '/app/offer',
  },
  {
    icon: GitBranch,
    title: 'FIRE Flowchart',
    description: 'A step-by-step checklist for building financial independence — from budgeting basics to early retirement.',
    color: 'bg-sky-50 text-sky-600',
    to: '/app/flowchart',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-fire-500 rounded-lg flex items-center justify-center">
              <Flame size={14} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">ManageFIRE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link to="/auth" className="btn-primary text-sm">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-12 sm:py-20">
          <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-snug max-w-xl">
            Tools for thinking through your financial independence
          </h1>
          <p className="text-slate-500 text-lg mb-8">Calculators for FIRE planning, housing decisions, and job offers.</p>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="btn-primary">
              Create an account
            </Link>
            <Link to="/app/calculator" className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1">
              Try a calculator first <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="max-w-5xl mx-auto px-6 py-14 flex-1">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Available tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map(({ icon: Icon, title, description, color, to }) => (
            <Link
              key={title}
              to={to}
              className="card p-6 hover:shadow-md transition-shadow duration-150 group flex items-start gap-4"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-fire-700 transition-colors">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-fire-400 transition-colors shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* Suggest a tool */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-medium text-slate-700 mb-0.5">Missing something?</p>
            <p className="text-sm text-slate-500">If there's a calculator or tool you'd find useful, send a suggestion.</p>
          </div>
          <a
            href="mailto:chenwm@alumni.upenn.edu?subject=ManageFIRE%20tool%20suggestion"
            className="shrink-0 text-sm font-medium text-fire-600 hover:text-fire-700 transition-colors"
          >
            Send a suggestion →
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-fire-400" />
            <span>ManageFIRE</span>
          </div>
          <span className="sm:text-right">Not financial advice. Consult a professional for your situation.</span>
        </div>
      </footer>
    </div>
  )
}
