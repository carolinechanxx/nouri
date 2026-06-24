import { Navigate, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const statusText = {
  'needs-attention': 'Needs attention',
  moderate: 'Moderate',
  good: 'Good',
}

export function HealthProfileScreen() {
  const { profile, currentExperiment } = useUser()
  const navigate = useNavigate()

  if (!profile) return <Navigate to="/onboarding" replace />

  return (
    <main className="mobile-shell stack">
      <section className="card stack">
        <h1>Your Nouri Health Profile, {profile.name}</h1>
        {profile.healthProfile.domains.map((domain) => (
          <article key={domain.domain} className="subcard stack compact">
            <p className="caps">{domain.domain}</p>
            <p className="status">{statusText[domain.status]}</p>
            <p>{domain.summary}</p>
          </article>
        ))}
      </section>

      <section className="card stack">
        <h2>Before your first experiment</h2>
        <p>{profile.healthProfile.educationSnippet}</p>
      </section>

      {currentExperiment && (
        <section className="card stack">
          <h2>Your first experiment is ready</h2>
          <h3>{currentExperiment.title}</h3>
          <p>{currentExperiment.hypothesis}</p>
        </section>
      )}

      <button onClick={() => navigate('/home')}>Start my experiment</button>
    </main>
  )
}
