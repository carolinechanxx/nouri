import html2canvas from 'html2canvas'
import { useRef } from 'react'
import type { Experiment } from '../types'

interface ShareCardProps {
  variant: 'result' | 'insight' | 'squad'
  experiment: Experiment
  insight?: string
  squadCode?: string
}

export function ShareCard({ variant, experiment, insight, squadCode }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const download = async () => {
    if (!cardRef.current) return
    const canvas = await html2canvas(cardRef.current)
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `nouri-${variant}.png`
    link.href = url
    link.click()
  }

  return (
    <div className="card share-wrap">
      <div ref={cardRef} className={`share-card ${variant}`}>
        <h3>Nouri</h3>
        {variant === 'result' && (
          <>
            <p>I ran a 7-day {experiment.domain} experiment.</p>
            <p>{experiment.title}</p>
          </>
        )}
        {variant === 'insight' && (
          <>
            <p>Turns out I'm someone whose:</p>
            <p>{insight || 'body responds best to consistent routines.'}</p>
          </>
        )}
        {variant === 'squad' && (
          <>
            <p>We ran a health experiment together.</p>
            <p>Join us: nouri.app/squad/{squadCode || 'NOURI7'}</p>
          </>
        )}
      </div>
      <button onClick={download}>Download {variant} card</button>
    </div>
  )
}
