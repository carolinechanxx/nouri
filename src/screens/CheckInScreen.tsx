import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useVoiceRecorder } from '../components/voice/useVoiceRecorder'
import { useUser } from '../context/UserContext'
import { extractCheckinFromVoice, playRewardSound, transcribeAudio } from '../lib/openai'
import type { CheckIn } from '../types'

export function CheckInScreen() {
  const { profile, primaryExperiment, activeExperiments, submitCheckIn } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder()
  const [mode, setMode] = useState<'text' | 'voice'>(profile?.preferredInputMode ?? 'text')
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')

  const [completionLevel, setCompletionLevel] = useState<'yes' | 'partial' | 'no'>('yes')
  const [scores, setScores] = useState({ energy: 5, clarity: 5, mood: 5 })
  const [note, setNote] = useState('')
  const [detailedNote, setDetailedNote] = useState('')
  const [effectWindow, setEffectWindow] = useState<CheckIn['effectWindow']>('all-day')
  const [media, setMedia] = useState<{ kind: 'image' | 'video'; dataUrl: string; caption: string } | null>(null)
  const [postVisibility, setPostVisibility] = useState<CheckIn['postVisibility']>(profile?.defaultPostVisibility ?? 'friends')

  const targetExperiment =
    activeExperiments.find((experiment) => experiment.id === searchParams.get('experimentId')) ?? primaryExperiment

  if (!profile || !targetExperiment) return <Navigate to="/home" replace />

  const submit = async (voiceTranscript?: string) => {
    setLoading(true)
    const checkIn: CheckIn = {
      day: targetExperiment.checkIns.length + 1,
      date: new Date().toISOString(),
      completed: completionLevel !== 'no',
      completionLevel,
      scores,
      note: note.slice(0, 100),
      detailedNote: detailedNote.slice(0, 800),
      effectWindow,
      voiceTranscript,
      media: media ? { kind: media.kind, dataUrl: media.dataUrl, caption: media.caption.slice(0, 100) } : undefined,
      postVisibility,
    }

    const result = await submitCheckIn(checkIn, targetExperiment.id)
    void playRewardSound(result.reportReady || completionLevel === 'yes' ? 'streak' : 'checkin')
    setLoading(false)

    if (result.reportReady) {
      navigate('/report')
      return
    }
    navigate(targetExperiment.mode === 'primary' ? '/insight' : '/home')
  }

  const handleVoiceToggle = async () => {
    if (!isRecording) {
      await startRecording()
      return
    }

    setLoading(true)
    const audio = await stopRecording()
    const text = await transcribeAudio(audio)
    setTranscript(text)
    const extracted = await extractCheckinFromVoice(text, targetExperiment)

    if (extracted.completionLevel) {
      setCompletionLevel(extracted.completionLevel as 'yes' | 'partial' | 'no')
    }
    setScores({
      energy: extracted.energy ?? 5,
      clarity: extracted.clarity ?? 5,
      mood: extracted.mood ?? 5,
    })
    setNote((extracted.note ?? '').slice(0, 100))
    setLoading(false)
  }

  const handleMediaFile = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      const kind: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image'
      setMedia((prev) => ({ kind, dataUrl, caption: prev?.caption ?? '' }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <main className="mobile-shell stack">
      <section className="card stack">
        <div className="row">
          <h1>Daily Check-in</h1>
          <button className="small" onClick={() => navigate('/home')}>
            x
          </button>
        </div>
        <p className="muted">
          {targetExperiment.title} ({targetExperiment.domain})
        </p>
        <div className="chip-wrap">
          <button className={mode === 'text' ? 'chip active' : 'chip'} onClick={() => setMode('text')}>
            Text
          </button>
          <button className={mode === 'voice' ? 'chip active' : 'chip'} onClick={() => setMode('voice')}>
            Voice
          </button>
        </div>
      </section>

      {mode === 'text' ? (
        <section className="card stack">
          <h2>Did you do today's action?</h2>
          <div className="chip-wrap">
            {(['yes', 'partial', 'no'] as const).map((level) => (
              <button key={level} className={completionLevel === level ? 'chip active' : 'chip'} onClick={() => setCompletionLevel(level)}>
                {level}
              </button>
            ))}
          </div>

          <SliderRating label="Energy" value={scores.energy} onChange={(value) => setScores((prev) => ({ ...prev, energy: value }))} />
          <SliderRating label="Clarity" value={scores.clarity} onChange={(value) => setScores((prev) => ({ ...prev, clarity: value }))} />
          <SliderRating label="Mood" value={scores.mood} onChange={(value) => setScores((prev) => ({ ...prev, mood: value }))} />
          <label>
            When was the effect most evident?
            <select value={effectWindow} onChange={(event) => setEffectWindow(event.target.value as CheckIn['effectWindow'])}>
              <option value="morning">Morning</option>
              <option value="2h-after-meal">2 hours after meal</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="before-bed">Before bed</option>
              <option value="all-day">All day</option>
            </select>
          </label>

          <label>
            Anything to note?
            <input maxLength={100} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. felt tired after lunch" />
          </label>
          <label>
            Brain dump / long note (optional)
            <textarea
              rows={4}
              maxLength={800}
              value={detailedNote}
              onChange={(event) => setDetailedNote(event.target.value)}
              placeholder="What changed, when did it happen, and why do you think it happened?"
            />
          </label>

          <label>
            Add photo or video (optional)
            <input type="file" accept="image/*,video/*" onChange={(event) => handleMediaFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="stack compact">
            <p className="muted">Feed privacy</p>
            <div className="chip-wrap">
              {(['private', 'friends', 'public'] as const)
                .filter((visibility) => !(profile.accountVisibility === 'private' && visibility === 'public'))
                .map((visibility) => (
                  <button
                    key={visibility}
                    className={postVisibility === visibility ? 'chip active' : 'chip'}
                    onClick={() => setPostVisibility(visibility)}
                  >
                    {visibility}
                  </button>
                ))}
            </div>
            <p className="muted">
              {postVisibility === 'private'
                ? 'Private: only you can see this check-in.'
                : postVisibility === 'friends'
                  ? 'Friends: visible in squad feed.'
                  : 'Public: visible on public feed.'}
            </p>
          </div>
          {media && (
            <div className="subcard stack">
              <p className="muted">Preview</p>
              {media.kind === 'image' ? (
                <img src={media.dataUrl} alt="Check-in upload preview" className="media-preview" />
              ) : (
                <video src={media.dataUrl} controls className="media-preview" />
              )}
              <input
                maxLength={100}
                value={media.caption}
                onChange={(event) => setMedia((prev) => (prev ? { ...prev, caption: event.target.value } : prev))}
                placeholder="Caption for your feed"
              />
            </div>
          )}

          <button disabled={loading} onClick={() => submit()}>
            {loading ? 'Submitting...' : 'Submit check-in'}
          </button>
        </section>
      ) : (
        <section className="card stack">
          <h2>Voice check-in</h2>
          <p>Tell Nouri how today went, and how your energy, clarity, and mood felt.</p>
          <button className={isRecording ? 'danger' : ''} onClick={handleVoiceToggle}>
            {isRecording ? 'Stop recording' : 'Start recording'}
          </button>
          {transcript && (
            <>
              <h3>Transcript</h3>
              <p className="subcard">{transcript}</p>
            </>
          )}
          <SliderRating label="Energy" value={scores.energy} onChange={(value) => setScores((prev) => ({ ...prev, energy: value }))} />
          <SliderRating label="Clarity" value={scores.clarity} onChange={(value) => setScores((prev) => ({ ...prev, clarity: value }))} />
          <SliderRating label="Mood" value={scores.mood} onChange={(value) => setScores((prev) => ({ ...prev, mood: value }))} />
          <label>
            When was the effect most evident?
            <select value={effectWindow} onChange={(event) => setEffectWindow(event.target.value as CheckIn['effectWindow'])}>
              <option value="morning">Morning</option>
              <option value="2h-after-meal">2 hours after meal</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="before-bed">Before bed</option>
              <option value="all-day">All day</option>
            </select>
          </label>
          <label>
            Brain dump / long note (optional)
            <textarea
              rows={4}
              maxLength={800}
              value={detailedNote}
              onChange={(event) => setDetailedNote(event.target.value)}
              placeholder="Add context so AI can infer how timing and effect are linked."
            />
          </label>
          <label>
            Add photo or video (optional)
            <input type="file" accept="image/*,video/*" onChange={(event) => handleMediaFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="stack compact">
            <p className="muted">Feed privacy</p>
            <div className="chip-wrap">
              {(['private', 'friends', 'public'] as const)
                .filter((visibility) => !(profile.accountVisibility === 'private' && visibility === 'public'))
                .map((visibility) => (
                  <button
                    key={visibility}
                    className={postVisibility === visibility ? 'chip active' : 'chip'}
                    onClick={() => setPostVisibility(visibility)}
                  >
                    {visibility}
                  </button>
                ))}
            </div>
          </div>
          {media && (
            <div className="subcard stack">
              {media.kind === 'image' ? (
                <img src={media.dataUrl} alt="Check-in upload preview" className="media-preview" />
              ) : (
                <video src={media.dataUrl} controls className="media-preview" />
              )}
              <input
                maxLength={100}
                value={media.caption}
                onChange={(event) => setMedia((prev) => (prev ? { ...prev, caption: event.target.value } : prev))}
                placeholder="Caption for your feed"
              />
            </div>
          )}
          <button disabled={loading || !transcript} onClick={() => submit(transcript)}>
            Confirm and submit
          </button>
        </section>
      )}
    </main>
  )
}

function SliderRating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
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
