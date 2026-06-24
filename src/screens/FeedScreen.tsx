import { Navigate } from 'react-router-dom'
import { BottomNav } from '../components/shared/BottomNav'
import { useUser } from '../context/UserContext'

export function FeedScreen() {
  const { profile, experiments, squad } = useUser()

  if (!profile) return <Navigate to="/onboarding" replace />

  const myPosts = experiments
    .flatMap((experiment) =>
      experiment.checkIns
        .filter((checkIn) => {
          const visibility = checkIn.postVisibility ?? 'private'
          return visibility !== 'private' && (checkIn.media?.dataUrl || checkIn.note || checkIn.detailedNote)
        })
        .map((checkIn) => ({
          id: `${experiment.id}-${checkIn.day}`,
          name: profile.name,
          domain: experiment.domain,
          title: experiment.title,
          caption: checkIn.media?.caption || checkIn.note || checkIn.detailedNote || '',
          dataUrl: checkIn.media?.dataUrl || '',
          kind: checkIn.media?.kind || 'text',
          visibility: checkIn.postVisibility ?? 'private',
          date: checkIn.date,
        })),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const squadTextPosts =
    squad?.members
      .filter((member) => member.name !== 'You')
      .map((member, index) => ({
        id: `mock-${member.name}-${index}`,
        name: member.name,
        domain: ['sleep', 'nutrition', 'stress', 'exercise'][index % 4],
        title: ['Screen Sunset', 'Protein First', '2-Minute Reset', 'Move Snack'][index % 4],
        caption:
          [
            'Feeling less groggy in morning classes this week.',
            'Ate protein first at hawker lunch. Afternoon crash was milder.',
            '2-minute reset helped after meetings.',
            'Quick walk before work made me less restless.',
          ][index % 4],
        dataUrl: '',
        kind: 'text' as const,
        visibility: 'friends' as const,
        date: new Date(Date.now() - (index + 1) * 3 * 60 * 60 * 1000).toISOString(),
      })) ?? []

  const publicOnly = profile.accountVisibility === 'public'
  const myVisiblePosts = publicOnly ? myPosts.filter((post) => post.visibility === 'public') : myPosts
  const feed = [...myVisiblePosts, ...squadTextPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <main className="mobile-shell stack has-nav">
      <section className="card stack">
        <h1>Feed</h1>
        <p className="muted">
          {profile.accountVisibility === 'public'
            ? 'Public profile: your public posts are visible on feed.'
            : 'Private profile: you control each post visibility (private/friends/public).'}
        </p>
      </section>

      {feed.length === 0 && (
        <section className="card stack">
          <p>No posts yet. Add a photo/video during your next check-in to start the feed.</p>
        </section>
      )}

      {feed.map((post) => (
        <article key={post.id} className="card stack">
          <div className="row">
            <strong>{post.name}</strong>
            <p className="caps">{post.domain}</p>
          </div>
          <p className="muted">{post.title + (post.visibility ? ` - ${post.visibility}` : '')}</p>

          {post.kind === 'image' && post.dataUrl && <img src={post.dataUrl} alt={`${post.name} check-in`} className="feed-media" />}
          {post.kind === 'video' && post.dataUrl && <video src={post.dataUrl} controls className="feed-media" />}

          <p>{post.caption}</p>
          <p className="muted">{new Date(post.date).toLocaleString()}</p>
        </article>
      ))}

      <BottomNav />
    </main>
  )
}
