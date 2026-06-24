import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BottomNav } from '../components/shared/BottomNav'
import { HealthTwin } from '../components/shared/HealthTwin'
import { useUser } from '../context/UserContext'
import { countByDomain, DOMAIN_META, DOMAIN_ORDER, labelForDomain } from '../lib/domains'
import { speakText } from '../lib/openai'
import type { Experiment } from '../types'

export function HomeScreen() {
  const {
    profile,
    primaryExperiment,
    supportHabits,
    activeExperiments,
    dailySupportInsights,
    squad,
    updateExperiment,
    deleteExperiment,
    createCustomExperiment,
  } = useUser()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', dailyAction: '', hypothesis: '' })
  const [customDraft, setCustomDraft] = useState<{ domain: Experiment['domain']; title: string; dailyAction: string; hypothesis: string }>({
    domain: 'nutrition',
    title: '',
    dailyAction: '',
    hypothesis: '',
  })

  const activeCountByDomain = useMemo(() => countByDomain(activeExperiments), [activeExperiments])
  const confidence =
    primaryExperiment && supportHabits.length === 0 ? 'High attribution confidence' : primaryExperiment ? 'Medium attribution confidence' : 'Low attribution confidence'

  if (!profile) return <Navigate to="/onboarding" replace />

  const startEdit = (experiment: Experiment) => {
    setEditingId(experiment.id)
    setEditDraft({
      title: experiment.title,
      dailyAction: experiment.dailyAction,
      hypothesis: experiment.hypothesis,
    })
  }

  const saveEdit = () => {
    if (!editingId) return
    updateExperiment(editingId, {
      title: editDraft.title,
      dailyAction: editDraft.dailyAction,
      hypothesis: editDraft.hypothesis,
    })
    setEditingId(null)
  }

  const addCustom = () => {
    if (!customDraft.title.trim() || !customDraft.dailyAction.trim()) return
    createCustomExperiment(customDraft)
    setCustomDraft({ domain: customDraft.domain, title: '', dailyAction: '', hypothesis: '' })
  }

  return (
    <main className="mobile-shell stack has-nav">
      <section className="card stack">
        <h1>Good morning, {profile.name}</h1>
        <p>{primaryExperiment ? `Day ${primaryExperiment.checkIns.length + 1} of your primary experiment` : 'Create a primary experiment to begin.'}</p>
        <p className="muted">{confidence}</p>
      </section>

      <section className="card stack">
        <div className="row">
          <h2>Domain Board</h2>
          <p className="muted">Scroll</p>
        </div>
        <div className="domain-deck">
          {DOMAIN_ORDER.map((domain) => (
            <article key={domain} className="domain-square" style={{ background: DOMAIN_META[domain].color }}>
              <p className="caps">{labelForDomain(domain)}</p>
              <h3>{activeCountByDomain[domain]}</h3>
              <p className="muted">active</p>
            </article>
          ))}
        </div>
      </section>

      {primaryExperiment && <HealthTwin profile={profile} experiments={activeExperiments} />}

      <section className="card stack">
        <p className="caps">Daily Micro Insights</p>
        {dailySupportInsights.length === 0 && <p className="muted">Support-habit insights will appear here after you log context-rich check-ins.</p>}
        {dailySupportInsights.map((item) => (
          <article key={item.id} className="subcard stack compact">
            <p>{item.insight}</p>
            <p className="muted">{new Date(item.date).toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="card stack">
        <p className="caps">Primary Experiment</p>
        {!primaryExperiment && <p className="muted">No primary experiment active.</p>}
        {primaryExperiment && (
          <article key={primaryExperiment.id} className="subcard stack">
            <div className="row">
              <h2>{primaryExperiment.title}</h2>
              <p className="caps">{labelForDomain(primaryExperiment.domain)}</p>
            </div>
            {editingId === primaryExperiment.id ? (
              <div className="stack">
                <label>
                  Title
                  <input value={editDraft.title} onChange={(event) => setEditDraft((prev) => ({ ...prev, title: event.target.value }))} />
                </label>
                <label>
                  Daily action
                  <input
                    value={editDraft.dailyAction}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, dailyAction: event.target.value }))}
                  />
                </label>
                <label>
                  Hypothesis
                  <input
                    value={editDraft.hypothesis}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, hypothesis: event.target.value }))}
                  />
                </label>
                <div className="row">
                  <button className="small" onClick={saveEdit}>
                    Save
                  </button>
                  <button className="small" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>Today's action: {primaryExperiment.dailyAction}</p>
                <div className="row">
                  <Link className="button-link" to={`/checkin?experimentId=${primaryExperiment.id}`}>
                    Log primary
                  </Link>
                  <button className="small" onClick={() => void speakText(`Today, your primary action is: ${primaryExperiment.dailyAction}`)}>
                    Hear action
                  </button>
                  <button className="small" onClick={() => startEdit(primaryExperiment)}>
                    Edit
                  </button>
                  <button className="small danger" onClick={() => deleteExperiment(primaryExperiment.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        )}
      </section>

      <section className="card stack">
        <p className="caps">Support Habits (Max 2)</p>
        {supportHabits.length === 0 && <p className="muted">No support habits active.</p>}
        {supportHabits.map((experiment) => (
          <article key={experiment.id} className="subcard stack">
            <div className="row">
              <h2>{experiment.title}</h2>
              <p className="caps">{labelForDomain(experiment.domain)}</p>
            </div>

            {editingId === experiment.id ? (
              <div className="stack">
                <label>
                  Title
                  <input value={editDraft.title} onChange={(event) => setEditDraft((prev) => ({ ...prev, title: event.target.value }))} />
                </label>
                <label>
                  Daily action
                  <input
                    value={editDraft.dailyAction}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, dailyAction: event.target.value }))}
                  />
                </label>
                <label>
                  Hypothesis
                  <input
                    value={editDraft.hypothesis}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, hypothesis: event.target.value }))}
                  />
                </label>
                <div className="row">
                  <button className="small" onClick={saveEdit}>
                    Save
                  </button>
                  <button className="small" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>Today's action: {experiment.dailyAction}</p>
                <div className="row">
                  <Link className="button-link" to={`/checkin?experimentId=${experiment.id}`}>
                    Log support
                  </Link>
                  <button className="small" onClick={() => startEdit(experiment)}>
                    Edit
                  </button>
                  <button className="small danger" onClick={() => deleteExperiment(experiment.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </section>

      <section className="card stack">
        <h3>Add Custom Experiment</h3>
        <label>
          Domain
          <select
            value={customDraft.domain}
            onChange={(event) => setCustomDraft((prev) => ({ ...prev, domain: event.target.value as Experiment['domain'] }))}
          >
            {DOMAIN_ORDER.map((domain) => (
              <option key={domain} value={domain}>
                {labelForDomain(domain)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Experiment title
          <input value={customDraft.title} onChange={(event) => setCustomDraft((prev) => ({ ...prev, title: event.target.value }))} />
        </label>
        <label>
          Daily action
          <input value={customDraft.dailyAction} onChange={(event) => setCustomDraft((prev) => ({ ...prev, dailyAction: event.target.value }))} />
        </label>
        <label>
          Hypothesis (optional)
          <input value={customDraft.hypothesis} onChange={(event) => setCustomDraft((prev) => ({ ...prev, hypothesis: event.target.value }))} />
        </label>
        <button onClick={addCustom}>Add Custom Experiment</button>
      </section>

      <section className="card row">
        <div>
          <p className="muted">Your streak</p>
          <h3>{primaryExperiment?.checkIns.length ?? 0} days primary</h3>
        </div>
        <div>
          <p className="muted">Support</p>
          <h3>{supportHabits.length}/2 active</h3>
        </div>
      </section>

      {squad && (
        <section className="card stack">
          <h3>Squad</h3>
          <p>
            {squad.members.filter((member) => member.todayCheckedIn).length}/{squad.members.length} checked in today
          </p>
          <Link className="button-link secondary" to="/squad">
            Open squad dashboard
          </Link>
        </section>
      )}

      <Link className="button-link" to="/chat">
        Chat with Nouri
      </Link>

      <BottomNav />
    </main>
  )
}
