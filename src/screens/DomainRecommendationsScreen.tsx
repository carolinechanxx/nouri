import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BottomNav } from '../components/shared/BottomNav'
import { useUser } from '../context/UserContext'
import { DOMAIN_META, groupByDomain, isDomain, labelForDomain } from '../lib/domains'

export function DomainRecommendationsScreen() {
  const {
    experimentOptions,
    activeExperiments,
    refreshDomainRecommendations,
    switchExperiment,
    addSupportExperiment,
    updateExperiment,
    deleteExperiment,
    createCustomExperiment,
  } = useUser()
  const { domain: domainParam } = useParams<{ domain: string }>()

  const domain = domainParam && isDomain(domainParam) ? domainParam : null
  const optionsByDomain = useMemo(() => groupByDomain(experimentOptions), [experimentOptions])
  const activeByDomain = useMemo(() => groupByDomain(activeExperiments), [activeExperiments])

  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [optionDraft, setOptionDraft] = useState({ title: '', dailyAction: '', hypothesis: '' })
  const [customDraft, setCustomDraft] = useState({ title: '', dailyAction: '', hypothesis: '' })
  const [supportMsg, setSupportMsg] = useState('')

  if (!domain) return <Navigate to="/experiment" replace />

  const recommendations = optionsByDomain[domain].slice(0, 3)
  const active = activeByDomain[domain][0]

  const beginEdit = (id: string, title: string, dailyAction: string, hypothesis: string) => {
    setEditingOptionId(id)
    setOptionDraft({ title, dailyAction, hypothesis })
  }

  const saveEdit = (id: string) => {
    updateExperiment(id, optionDraft)
    setEditingOptionId(null)
  }

  const addCustom = () => {
    if (!customDraft.title.trim() || !customDraft.dailyAction.trim()) return
    createCustomExperiment({
      domain,
      title: customDraft.title,
      dailyAction: customDraft.dailyAction,
      hypothesis: customDraft.hypothesis,
    })
    setCustomDraft({ title: '', dailyAction: '', hypothesis: '' })
  }

  return (
    <main className="mobile-shell stack has-nav">
      <section className="card stack" style={{ borderColor: DOMAIN_META[domain].color }}>
        <div className="row">
          <h1>{labelForDomain(domain)}</h1>
          <Link className="button-link secondary" to="/experiment">
            Back
          </Link>
        </div>
        <p className="muted">Choose from 3 recommendations or add your own.</p>
        <button className="small" onClick={() => void refreshDomainRecommendations(domain)}>
          Refresh
        </button>
      </section>

      {active && (
        <section className="card stack">
          <p className="caps">Current active</p>
          <h3>{active.title}</h3>
          <p>{active.dailyAction}</p>
          <Link className="button-link secondary" to={`/checkin?experimentId=${active.id}`}>
            Log this domain
          </Link>
        </section>
      )}

      <section className="card stack">
        <h2>Recommendations</h2>
        {recommendations.length === 0 && <p className="muted">No recommendations yet. Tap Refresh.</p>}

        {recommendations.map((option) => (
          <article key={option.id} className="subcard stack">
            {editingOptionId === option.id ? (
              <>
                <input value={optionDraft.title} onChange={(event) => setOptionDraft((prev) => ({ ...prev, title: event.target.value }))} />
                <input
                  value={optionDraft.dailyAction}
                  onChange={(event) => setOptionDraft((prev) => ({ ...prev, dailyAction: event.target.value }))}
                />
                <input
                  value={optionDraft.hypothesis}
                  onChange={(event) => setOptionDraft((prev) => ({ ...prev, hypothesis: event.target.value }))}
                />
                <div className="row">
                  <button className="small" onClick={() => saveEdit(option.id)}>
                    Save
                  </button>
                  <button className="small" onClick={() => setEditingOptionId(null)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>{option.title}</h3>
                <p>{option.dailyAction}</p>
                <div className="row">
                  <button className="small" onClick={() => switchExperiment(option.id)}>
                    Set As Primary
                  </button>
                  <button
                    className="small"
                    onClick={() => {
                      const ok = addSupportExperiment(option.id)
                      setSupportMsg(ok ? 'Added as support habit.' : 'Support habits maxed at 2.')
                    }}
                  >
                    Add Support
                  </button>
                  <button className="small" onClick={() => beginEdit(option.id, option.title, option.dailyAction, option.hypothesis)}>
                    Edit
                  </button>
                  <button className="small danger" onClick={() => deleteExperiment(option.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </section>

      {supportMsg && (
        <section className="card">
          <p className="muted">{supportMsg}</p>
        </section>
      )}

      <section className="card stack">
        <h3>Add Your Own</h3>
        <input
          placeholder="Custom experiment title"
          value={customDraft.title}
          onChange={(event) => setCustomDraft((prev) => ({ ...prev, title: event.target.value }))}
        />
        <input
          placeholder="Daily action"
          value={customDraft.dailyAction}
          onChange={(event) => setCustomDraft((prev) => ({ ...prev, dailyAction: event.target.value }))}
        />
        <input
          placeholder="Hypothesis (optional)"
          value={customDraft.hypothesis}
          onChange={(event) => setCustomDraft((prev) => ({ ...prev, hypothesis: event.target.value }))}
        />
        <button className="small" onClick={addCustom}>
          Add custom {labelForDomain(domain)} experiment
        </button>
        <button
          className="small"
          onClick={() =>
            createCustomExperiment({
              domain,
              title: `${labelForDomain(domain)} Support Habit`,
              dailyAction: 'Do one tiny support action and log completion.',
              mode: 'support',
            })
          }
        >
          Quick add support habit
        </button>
      </section>

      <BottomNav />
    </main>
  )
}
