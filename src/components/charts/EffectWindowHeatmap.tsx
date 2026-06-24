import { DOMAIN_META, labelForDomain } from '../../lib/domains'
import type { CheckIn, Experiment } from '../../types'
import { Fragment } from 'react'

const WINDOWS: Array<NonNullable<CheckIn['effectWindow']>> = ['morning', '2h-after-meal', 'afternoon', 'evening', 'before-bed', 'all-day']

function scoreForCheckIn(checkIn: CheckIn) {
  return (checkIn.scores.energy + checkIn.scores.clarity + checkIn.scores.mood) / 3
}

function heatForWindow(experiment: Experiment, window: NonNullable<CheckIn['effectWindow']>) {
  const matches = experiment.checkIns.filter((checkIn) => (checkIn.effectWindow ?? 'all-day') === window)
  if (!matches.length) return { avg: 0, count: 0 }
  const avg = matches.reduce((sum, checkIn) => sum + scoreForCheckIn(checkIn), 0) / matches.length
  return { avg, count: matches.length }
}

function bgColor(domain: Experiment['domain'], avg: number, count: number) {
  if (!count) return 'rgba(44,44,44,0.05)'
  const base = DOMAIN_META[domain].color
  const alpha = Math.min(0.92, 0.22 + ((avg - 1) / 9) * 0.55 + Math.min(count, 5) * 0.03)

  const hex = base.replace('#', '')
  const bigint = Number.parseInt(hex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function EffectWindowHeatmap({ experiments }: { experiments: Experiment[] }) {
  if (!experiments.length) {
    return (
      <section className="card stack">
        <h2>Effect Timing Heatmap</h2>
        <p className="muted">Add check-ins to see where each habit hits hardest across the day.</p>
      </section>
    )
  }

  return (
    <section className="card stack">
      <div className="row">
        <h2>Effect Timing Heatmap</h2>
        <p className="muted">Darker = stronger impact</p>
      </div>

      <div className="heat-grid">
        <div className="heat-head" />
        {WINDOWS.map((window) => (
          <div key={window} className="heat-head">
            {window === '2h-after-meal' ? '2h post meal' : window}
          </div>
        ))}

        {experiments.map((experiment) => (
          <Fragment key={experiment.id}>
            <div key={`${experiment.id}-label`} className="heat-label">
              <span className="heat-dot" style={{ background: DOMAIN_META[experiment.domain].color }} />
              <span>{experiment.title}</span>
              <span className="muted">{experiment.mode === 'primary' ? 'Primary' : `Support - ${labelForDomain(experiment.domain)}`}</span>
            </div>
            {WINDOWS.map((window) => {
              const { avg, count } = heatForWindow(experiment, window)
              return (
                <div
                  key={`${experiment.id}-${window}`}
                  className="heat-cell"
                  style={{ background: bgColor(experiment.domain, avg, count) }}
                  title={count ? `${experiment.title}: ${window}, avg impact ${avg.toFixed(1)}/10 from ${count} logs` : `${experiment.title}: no logs for ${window}`}
                >
                  {count ? avg.toFixed(1) : '-'}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </section>
  )
}
