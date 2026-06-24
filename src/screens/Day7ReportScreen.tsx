import { Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { TrendChart } from '../components/charts/TrendChart'
import { ShareCard } from '../components/ShareCard'
import { useUser } from '../context/UserContext'
import { speakText } from '../lib/openai'

export function Day7ReportScreen() {
  const { experiments, promoteExperimentToHabit } = useUser()
  const [promoted, setPromoted] = useState(false)
  const latest = experiments.find((exp) => exp.day7Report)

  if (!latest?.day7Report) return <Navigate to="/home" replace />
  const report = latest.day7Report

  const completion = latest.checkIns.filter((checkIn) => checkIn.completed).length

  return (
    <main className="mobile-shell stack">
      <section className="card stack">
        <h1>Your {latest.title} Results</h1>
        <TrendChart checkIns={latest.checkIns} />
        <p>Completion rate: {completion}/7 days</p>
      </section>

      <section className="card stack">
        <h2>What your data shows</h2>
        <p>{report.trendSummary}</p>
        <h2>What likely happened in your body</h2>
        <p>{report.bodyExplanation}</p>
        <p className="subcard">Verdict: {report.verdict}</p>
        <p>{report.takeaway}</p>
        <button onClick={() => speakText(`${report.trendSummary} ${report.bodyExplanation}`)}>
          Hear your report
        </button>
      </section>

      <section className="card stack">
        <h3>Your next experiment</h3>
        <p>{report.nextExperimentSuggestion}</p>
        <button
          onClick={() => {
            promoteExperimentToHabit(latest.id)
            setPromoted(true)
          }}
        >
          Promote to Habit Vault
        </button>
        {promoted && <p className="muted">Saved to Habit Vault.</p>}
      </section>

      <ShareCard variant="result" experiment={latest} />
      <Link className="button-link" to="/home">
        Back to dashboard
      </Link>
    </main>
  )
}
