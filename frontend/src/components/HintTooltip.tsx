import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

const TOOLTIP_WIDTH = 224 // matches w-56

export default function HintTooltip({ hint }: { hint: string }) {
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLSpanElement>(null)

  const show = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const GAP = 6
      const above = rect.top > 100
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8))
      setStyle({
        position: 'fixed',
        top: above ? rect.top - GAP : rect.bottom + GAP,
        left,
        transform: above ? 'translateY(-100%)' : 'none',
        width: TOOLTIP_WIDTH,
        zIndex: 9999,
      })
    }
    setVisible(true)
  }

  return (
    <span ref={ref} className="inline-flex" onMouseEnter={show} onMouseLeave={() => setVisible(false)}>
      <Info size={11} className="text-slate-400 cursor-help" />
      {visible && createPortal(
        <span
          className="pointer-events-none bg-slate-800 text-white text-xs rounded-lg px-2.5 py-2 leading-relaxed shadow-xl"
          style={style}
        >
          {hint}
        </span>,
        document.body,
      )}
    </span>
  )
}
