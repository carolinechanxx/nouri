import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BottomNav } from '../components/shared/BottomNav'
import { useUser } from '../context/UserContext'

export function ProfileScreen() {
  const {
    profile,
    experiments,
    habits,
    setPreferredMode,
    setChatTone,
    setAccountVisibility,
    setDefaultPostVisibility,
    updateBaseline,
    baselineNeedsRefresh,
    toggleHabitDoneToday,
  } = useUser()
  const [baselineDraft, setBaselineDraft] = useState({ energy: 5, sleep: 5, clarity: 5 })

  useEffect(() => {
    if (!profile) return
    setBaselineDraft(profile.baseline)
  }, [profile])

  if (!profile) return <Navigate to="/onboarding" replace />

  return (
    <main className="mobile-shell stack has-nav">
      <section className="card stack">
        <h1>{profile.name}</h1>
        <p>Experiments completed: {experiments.filter((exp) => exp.status === 'completed').length}</p>
      </section>

      <section className="card stack">
        <h2>Domain history</h2>
        {experiments.map((experiment) => (
          <article key={experiment.id} className="subcard row">
            <div>
              <p>{experiment.domain}</p>
              <p>{experiment.title}</p>
            </div>
            <strong>{experiment.day7Report?.verdict ?? experiment.status}</strong>
          </article>
        ))}
      </section>

      <section className="card stack">
        <h2>Voice preference</h2>
        <div className="chip-wrap">
          <button className={profile.preferredInputMode === 'text' ? 'chip active' : 'chip'} onClick={() => setPreferredMode('text')}>
            Text mode
          </button>
          <button className={profile.preferredInputMode === 'voice' ? 'chip active' : 'chip'} onClick={() => setPreferredMode('voice')}>
            Voice mode
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>Chat tone</h2>
        <p className="muted">Choose how Nouri speaks to you.</p>
        <div className="chip-wrap">
          <button className={profile.chatTone === 'gentle' ? 'chip active' : 'chip'} onClick={() => setChatTone('gentle')}>
            Gentle
          </button>
          <button className={profile.chatTone === 'coach' ? 'chip active' : 'chip'} onClick={() => setChatTone('coach')}>
            Coach
          </button>
          <button className={profile.chatTone === 'direct' ? 'chip active' : 'chip'} onClick={() => setChatTone('direct')}>
            Direct
          </button>
        </div>
      </section>

      <section className="card stack">
        <h2>Privacy & Feed</h2>
        <p className="muted">Control whether your check-ins are private, friends-only, or public by default.</p>
        <div className="chip-wrap">
          <button className={profile.accountVisibility === 'private' ? 'chip active' : 'chip'} onClick={() => setAccountVisibility('private')}>
            Private account
          </button>
          <button className={profile.accountVisibility === 'public' ? 'chip active' : 'chip'} onClick={() => setAccountVisibility('public')}>
            Public account
          </button>
        </div>
        <p className="muted">Default post visibility</p>
        <div className="chip-wrap">
          {(['private', 'friends', 'public'] as const)
            .filter((visibility) => !(profile.accountVisibility === 'private' && visibility === 'public'))
            .map((visibility) => (
              <button
                key={visibility}
                className={profile.defaultPostVisibility === visibility ? 'chip active' : 'chip'}
                onClick={() => setDefaultPostVisibility(visibility)}
              >
                {visibility}
              </button>
            ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Baseline Calibration</h2>
        <p className="muted">
          {baselineNeedsRefresh ? 'Your baseline is over 7 days old. Refresh it to keep comparisons fair.' : 'Keep this updated weekly for fairer baseline comparisons.'}
        </p>
        <SliderRow
          label="Typical daily energy"
          value={baselineDraft.energy}
          onChange={(value) => setBaselineDraft((prev) => ({ ...prev, energy: value }))}
        />
        <SliderRow
          label="Typical sleep quality"
          value={baselineDraft.sleep}
          onChange={(value) => setBaselineDraft((prev) => ({ ...prev, sleep: value }))}
        />
        <SliderRow
          label="Typical mental clarity"
          value={baselineDraft.clarity}
          onChange={(value) => setBaselineDraft((prev) => ({ ...prev, clarity: value }))}
        />
        <button onClick={() => updateBaseline(baselineDraft)}>Refresh baseline</button>
        <p className="muted">Last updated: {new Date(profile.baselineUpdatedAt ?? profile.createdAt).toLocaleDateString()}</p>
      </section>

      <section className="card stack">
        <h2>Habit Vault</h2>
        {habits.length === 0 && <p className="muted">Promote a worked experiment from your Day 7 report to save it here.</p>}
        {habits.map((habit) => {
          const today = new Date().toISOString().slice(0, 10)
          const doneToday = habit.completionDates.includes(today)
          return (
            <article key={habit.id} className="subcard stack">
              <div className="row">
                <strong>{habit.title}</strong>
                <p className="caps">{habit.domain}</p>
              </div>
              <p>{habit.dailyAction}</p>
              <p className="muted">{habit.whyItWorks}</p>
              <button className="small" onClick={() => toggleHabitDoneToday(habit.id)}>
                {doneToday ? 'Mark not done today' : 'Mark done today'}
              </button>
            </article>
          )
        })}
      </section>

      <BottomNav />
    </main>
  )
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <div className="range-row">
        <input type="range" min={1} max={10} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <span>{value}</span>
      </div>
    </label>
  )
}
