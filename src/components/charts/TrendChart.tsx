import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CheckIn } from '../../types'

export function TrendChart({ checkIns, height = 220 }: { checkIns: CheckIn[]; height?: number }) {
  const data = checkIns.map((checkIn) => ({
    day: `D${checkIn.day}`,
    energy: checkIn.scores.energy,
    clarity: checkIn.scores.clarity,
    mood: checkIn.scores.mood,
  }))

  if (!data.length) {
    return <p className="muted">Check-ins will appear here once you start logging.</p>
  }

  return (
    <div className="chart-shell" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nouri-mist)" />
          <XAxis dataKey="day" />
          <YAxis domain={[1, 10]} />
          <Tooltip />
          <Line type="monotone" dataKey="energy" stroke="#8FAF8A" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="clarity" stroke="#6B4F3A" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="mood" stroke="#C6875B" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
