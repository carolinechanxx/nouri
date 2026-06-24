import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { DOMAIN_ORDER, labelForDomain } from '../lib/domains'
import { assessmentQuestions } from '../lib/questions'
import type { Domain } from '../types'

const QUIZ_START_STEP = 3

function getQuestionDomain(questionId: string): Domain | null {
  return DOMAIN_ORDER.find((domain) => questionId.startsWith(`${domain}-`)) ?? null
}

function playTapFeedback() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const ctx = new AudioCtor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(540, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.09)
  } catch {
    // no-op: feedback is optional
  }
}

export function OnboardingScreen() {
  const { completeOnboarding } = useUser()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    ageRange: '18-24' as '18-24' | '25-32',
    ethnicity: 'Chinese',
    gender: 'Female',
    eatingPattern: 'Hawker-heavy',
    sleepSchedule: 'Regular',
    stressLevel: 'Moderate',
  })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [baseline, setBaseline] = useState({ energy: 5, sleep: 5, clarity: 5 })

  const quizIndex = useMemo(() => Math.max(0, step - QUIZ_START_STEP), [step])
  const baselineStep = QUIZ_START_STEP + assessmentQuestions.length
  const currentQuestion = assessmentQuestions[quizIndex]

  const questionDomain = useMemo(() => {
    const id = currentQuestion?.[0]
    if (!id) return null
    return getQuestionDomain(id)
  }, [currentQuestion])

  const onGenerate = async () => {
    setLoading(true)
    await completeOnboarding({
      ...form,
      baseline,
      assessmentAnswers: answers,
    })
    setLoading(false)
    navigate('/health-profile')
  }

  return (
    <main className="mobile-shell">
      {step === 1 && (
        <section className="card stack onboarding-card">
          <h1 className="display">Nouri</h1>
          <p>Build your future self in 90 seconds. One fast check to personalize your health twin.</p>
          <button
            onClick={() => {
              playTapFeedback()
              setStep(2)
            }}
          >
            Start my health assessment
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="card stack onboarding-card">
          <h2>Basic Profile</h2>
          <label>
            First name
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <SelectField
            label="Age range"
            value={form.ageRange}
            options={['18-24', '25-32']}
            onChange={(value) => setForm((prev) => ({ ...prev, ageRange: value as '18-24' | '25-32' }))}
          />
          <SelectField
            label="Ethnicity"
            value={form.ethnicity}
            options={['Chinese', 'Malay', 'Indian', 'Mixed', 'Other']}
            onChange={(value) => setForm((prev) => ({ ...prev, ethnicity: value }))}
          />
          <SelectField
            label="Gender"
            value={form.gender}
            options={['Female', 'Male', 'Non-binary', 'Prefer not to say']}
            onChange={(value) => setForm((prev) => ({ ...prev, gender: value }))}
          />
          <SelectField
            label="Eating pattern"
            value={form.eatingPattern}
            options={['Hawker-heavy', 'Home-cooked', 'Skip meals often', 'Vegetarian']}
            onChange={(value) => setForm((prev) => ({ ...prev, eatingPattern: value }))}
          />
          <SelectField
            label="Sleep schedule"
            value={form.sleepSchedule}
            options={['Regular', 'Irregular', 'Shift work', 'Student hours']}
            onChange={(value) => setForm((prev) => ({ ...prev, sleepSchedule: value }))}
          />
          <SelectField
            label="Stress level"
            value={form.stressLevel}
            options={['Low', 'Moderate', 'High', 'Burnt out']}
            onChange={(value) => setForm((prev) => ({ ...prev, stressLevel: value }))}
          />
          <button
            disabled={!form.name.trim()}
            onClick={() => {
              playTapFeedback()
              setStep(QUIZ_START_STEP)
            }}
          >
            Continue to assessment
          </button>
        </section>
      )}

      {step >= QUIZ_START_STEP && step < baselineStep && currentQuestion && (
        <section className="card stack onboarding-card">
          <div className="row">
            <p className="muted">
              Question {quizIndex + 1} of {assessmentQuestions.length}
            </p>
            {questionDomain && <p className="caps">{labelForDomain(questionDomain)}</p>}
          </div>
          <progress max={assessmentQuestions.length} value={quizIndex + 1} />
          <h2>{currentQuestion[1]}</h2>
          <div className="chip-wrap">
            {currentQuestion[2].map((option) => (
              <button
                key={option}
                className={answers[currentQuestion[0]] === option ? 'chip active' : 'chip'}
                onClick={() => {
                  playTapFeedback()
                  setAnswers((prev) => ({ ...prev, [currentQuestion[0]]: option }))
                  setStep((prev) => prev + 1)
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === baselineStep && (
        <section className="card stack onboarding-card">
          <h2>Baseline</h2>
          <p className="muted">Quick calibration so your daily comparisons stay fair.</p>
          <SliderRow
            label="How is your energy on a typical day?"
            value={baseline.energy}
            onChange={(value) => setBaseline((prev) => ({ ...prev, energy: value }))}
          />
          <SliderRow
            label="How well are you sleeping?"
            value={baseline.sleep}
            onChange={(value) => setBaseline((prev) => ({ ...prev, sleep: value }))}
          />
          <SliderRow
            label="How mentally clear do you feel?"
            value={baseline.clarity}
            onChange={(value) => setBaseline((prev) => ({ ...prev, clarity: value }))}
          />
          <button
            disabled={loading}
            onClick={() => {
              playTapFeedback()
              void onGenerate()
            }}
          >
            {loading ? 'Generating your profile...' : 'Generate my health profile'}
          </button>
        </section>
      )}
    </main>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
