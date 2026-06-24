import { Link } from 'react-router-dom'
import { EffectWindowHeatmap } from '../components/charts/EffectWindowHeatmap'
import { TrendChart } from '../components/charts/TrendChart'
import { BottomNav } from '../components/shared/BottomNav'
import { useUser } from '../context/UserContext'
import { DOMAIN_META, DOMAIN_ORDER, groupByDomain, labelForDomain } from '../lib/domains'

export function ExperimentScreen() {
  const { activeExperiments } = useUser()
  const activeByDomain = groupByDomain(activeExperiments)

  return (
    <main className="mobile-shell stack has-nav">
      <section className="card stack">
        <h1>Experiment Dashboard</h1>
        <p className="muted">Tap a domain to open recommendations and manage options.</p>
      </section>

      <EffectWindowHeatmap experiments={activeExperiments} />

      {DOMAIN_ORDER.map((domain) => {
        const active = activeByDomain[domain][0]
        return (
          <section key={domain} className="card stack" style={{ borderColor: DOMAIN_META[domain].color }}>
            <div className="row">
              <h2>{labelForDomain(domain)}</h2>
              <Link className="button-link secondary" to={`/experiment/domain/${domain}`}>
                View recommendations
              </Link>
            </div>

            {active ? (
              <>
                <div className="row">
                  <div>
                    <p className="caps">{active.mode === 'primary' ? 'Primary experiment' : 'Support habit'}</p>
                    <p>{active.title}</p>
                  </div>
                  <Link className="button-link secondary" to={`/checkin?experimentId=${active.id}`}>
                    Log
                  </Link>
                </div>
                <TrendChart checkIns={active.checkIns} height={140} />
              </>
            ) : (
              <p className="muted">No active experiment yet in this domain.</p>
            )}
          </section>
        )
      })}

      <BottomNav />
    </main>
  )
}
