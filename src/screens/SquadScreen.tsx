import { BottomNav } from '../components/shared/BottomNav'
import { useUser } from '../context/UserContext'

export function SquadScreen() {
  const { squad } = useUser()

  if (!squad) return null

  const checkedIn = squad.members.filter((member) => member.todayCheckedIn).length

  const nudge = () => {
    if (navigator.share) {
      navigator.share({
        text: 'Hey! Your Nouri squad is thinking of you. Did you do today\'s experiment?',
      })
    }
  }

  return (
    <main className="mobile-shell stack has-nav">
      <section className="card stack">
        <h1>Squad {squad.code}</h1>
        <p>
          {checkedIn}/{squad.members.length} checked in today
        </p>
        <div className="row">
          {squad.members.map((member) => (
            <div key={member.name} className="subcard compact">
              <p>{member.name}</p>
              <p>{member.todayCheckedIn ? 'Checked in' : 'Pending'}</p>
              <p>Streak: {member.streak}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Feed</h2>
        <p>Alya completed Day 6</p>
        <p>Ravi said: Fell asleep much faster tonight.</p>
        <button onClick={nudge}>Nudge a friend</button>
      </section>

      <BottomNav />
    </main>
  )
}
