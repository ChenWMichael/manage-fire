import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string
  subtext?: string
  icon: LucideIcon
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function StatCard({ label, value, subtext, icon: Icon, iconColor = 'text-fire-500', trend }: Props) {
  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
          {subtext && (
            <p className={`text-xs mt-1 ${trend === 'up' ? 'text-fire-600' : trend === 'down' ? 'text-red-500' : 'text-slate-500'}`}>
              {subtext}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 ml-3 ${iconColor.replace('text-', 'border-').replace('-500', '-100').replace('-600', '-100')} border`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
    </div>
  )
}
