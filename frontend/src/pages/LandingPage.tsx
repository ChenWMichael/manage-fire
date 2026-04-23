import { ArrowRight, BarChart3, Calculator, CheckCircle, Flame, Shield, Waves, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: Calculator,
    title: 'FIRE Calculator',
    description: 'Input your savings, contributions, and expenses to see exactly when you\'ll reach financial independence.',
    color: 'bg-fire-50 text-fire-600',
  },
  {
    icon: Waves,
    title: 'CoastFIRE',
    description: 'Discover how much you need saved today so your investments grow to your FI number—no further contributions needed.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Portfolio Projections',
    description: 'Interactive year-by-year charts showing your portfolio growth vs. your FI number over time.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Shield,
    title: 'Multiple FIRE Paths',
    description: 'Whether it\'s LeanFIRE, FatFIRE, CoastFIRE, or classic FIRE — we tailor calculations to your lifestyle.',
    color: 'bg-amber-50 text-amber-600',
  },
]

const fireTypes = [
  { name: 'LeanFIRE', description: '< $40k/yr', badge: 'bg-teal-100 text-teal-700' },
  { name: 'FIRE', description: '$40k–$80k/yr', badge: 'bg-fire-100 text-fire-700' },
  { name: 'FatFIRE', description: '> $100k/yr', badge: 'bg-amber-100 text-amber-700' },
  { name: 'CoastFIRE', description: 'Save now, coast later', badge: 'bg-blue-100 text-blue-700' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-fire-500 rounded-lg flex items-center justify-center">
              <Flame className="text-white" size={16} />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">ManageFIRE</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link to="/auth" className="btn-primary text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-fire-900/40" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 60%, #10b981 0%, transparent 50%), radial-gradient(circle at 75% 40%, #059669 0%, transparent 50%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-fire-500/10 border border-fire-500/20 rounded-full px-4 py-1.5 mb-6">
            <Zap size={12} className="text-fire-400" />
            <span className="text-fire-300 text-xs font-semibold tracking-wide uppercase">Financial Independence Platform</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
            Your journey to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire-400 to-fire-300">
              Financial Independence
            </span>{' '}
            starts here
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Calculate your FIRE number, project your path, and track your progress — whether you're chasing LeanFIRE,
            FatFIRE, CoastFIRE, or the classic FIRE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 bg-fire-500 hover:bg-fire-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-150 shadow-lg shadow-fire-500/25 text-base"
            >
              Start Your Journey
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/app/calculator"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/10 transition-colors duration-150 text-base"
            >
              Try Calculator — no account needed
            </Link>
          </div>

          {/* FIRE type pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-12">
            {fireTypes.map((t) => (
              <span key={t.name} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${t.badge}`}>
                {t.name} <span className="opacity-70">• {t.description}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need on your FIRE journey</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Powerful tools, clean design, and honest projections to help you reach financial independence.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="card p-6 hover:shadow-md transition-shadow duration-200">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color.replace('text-', 'bg-').split(' ')[0]} ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Simple. Powerful. Free.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up in seconds with your email. No credit card required.' },
              { step: '02', title: 'Enter your numbers', desc: 'Input your current savings, contributions, expenses, and retirement age.' },
              { step: '03', title: 'See your FIRE date', desc: 'Get instant projections, your FI number, and a chart showing your path to freedom.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-fire-500 text-white font-bold text-sm flex items-center justify-center mx-auto mb-4 shadow-lg shadow-fire-500/20">
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to ignite your FIRE?</h2>
        <p className="text-slate-500 mb-8 text-lg">Join people taking control of their financial future.</p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 bg-fire-500 hover:bg-fire-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-150 shadow-lg shadow-fire-500/20 text-base"
        >
          Get started for free <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-fire-500" />
            <span className="text-slate-500 text-sm font-medium">ManageFIRE</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <CheckCircle size={12} className="text-fire-500" />
            <span>Not financial advice. Always consult a professional.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
