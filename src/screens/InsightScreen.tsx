import { Link, Navigate } from 'react-router-dom'
import { ShareCard } from '../components/ShareCard'
import { useUser } from '../context/UserContext'
import { speakText } from '../lib/openai'

export function InsightScreen() {
  const { currentExperiment, supportHabits, lastInsight, squad } = useUser()

  if (!currentExperiment || !lastInsight) return <Navigate to="/home" replace />

  return (
    <main className="mobile-shell stack">
      <section className="card stack">
        <h1>Here is what your data shows</h1>
        <p className="muted">{supportHabits.length === 0 ? 'Confidence: High (single active variable)' : 'Confidence: Medium (support habits may influence results)'}</p>
        <p>{lastInsight}</p>
        <button onClick={() => speakText(lastInsight)}>Hear this</button>
      </section>

      <ShareCard variant="insight" experiment={currentExperiment} insight={lastInsight} />
      <ShareCard variant="result" experiment={currentExperiment} />
      <ShareCard variant="squad" experiment={currentExperiment} squadCode={squad?.code} />

      <Link className="button-link" to="/home">
        Back to home
      </Link>
    </main>
  )
}
