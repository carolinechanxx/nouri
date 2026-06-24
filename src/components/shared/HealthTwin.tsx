import { useState } from 'react'
import { DOMAIN_META, DOMAIN_ORDER, labelForDomain } from '../../lib/domains'
import { getHealthTwinViews } from '../../lib/healthTwin'
import type { Experiment, UserProfile } from '../../types'

export function HealthTwin({ profile, experiments }: { profile: UserProfile; experiments: Experiment[] }) {
  const [view, setView] = useState<'current' | 'future'>('future')
  const views = getHealthTwinViews(profile, experiments)
  const twin = view === 'current' ? views.current : views.future
  const improvedFuture = view === 'future' && views.future.score >= views.current.score
  const displayTraits = improvedFuture
    ? {
        ...twin.traits,
        eyeBags: twin.traits.eyeBags && twin.domainScores.sleep < 46,
        tiredEyes: twin.traits.tiredEyes && twin.domainScores['digital-hygiene'] < 44,
        wrinkles: twin.traits.wrinkles && twin.domainScores.stress < 42,
        muscleAche: twin.traits.muscleAche && twin.domainScores.recovery < 42,
        brainOverload: twin.traits.brainOverload && twin.domainScores['mental-wellbeing'] < 40,
      }
    : twin.traits

  const gender = profile.gender.toLowerCase()
  const isFemale = gender.includes('female')
  const isMale = gender.includes('male') && !gender.includes('female')

  const moodScore = improvedFuture ? Math.max(twin.score, views.current.score + 2) : twin.score
  const eyeOpen = displayTraits.tiredEyes ? 4.2 : 6.8
  const smileCurve = moodScore >= 72 ? 8 : moodScore >= 52 ? 2 : -5
  const skinTone = displayTraits.glow ? '#f7ddb9' : '#e3bf9f'
  const auraTone = displayTraits.auraLevel === 'high' ? '#8faf8a' : displayTraits.auraLevel === 'mid' ? '#d4c283' : '#d59b7e'
  const hairTone = isMale ? '#3a2f28' : isFemale ? '#4a3428' : '#3f352d'
  const shirtTone = isFemale ? '#c987a8' : isMale ? '#7397c9' : '#8fa6ad'

  const strongest = [...DOMAIN_ORDER]
    .sort((a, b) => twin.domainScores[b] - twin.domainScores[a])
    .slice(0, 3)

  return (
    <section className="card stack twin-card">
      <div className="row">
        <p className="caps">Your Twin</p>
        <div className="chip-wrap">
          <button className={view === 'current' ? 'chip active' : 'chip'} onClick={() => setView('current')}>
            Current self
          </button>
          <button className={view === 'future' ? 'chip active' : 'chip'} onClick={() => setView('future')}>
            Future self
          </button>
        </div>
      </div>
      <div className="row twin-layout-full">
        <div className="stack compact">
          <h2>
            {view === 'current'
              ? twin.label === 'thriving'
                ? 'Current you looks strong'
                : twin.label === 'steady'
                  ? 'Current you is stabilising'
                  : 'Current you needs support'
              : twin.label === 'thriving'
                ? 'Future you is thriving'
                : twin.label === 'steady'
                  ? 'Future you is stabilising'
                  : 'Future you needs a reset'}
          </h2>
          <p>
            Body score: <strong>{twin.score}</strong>/100
          </p>
          <p>
            {view === 'current' ? 'Current trajectory' : '4-week forecast'}: <strong>{twin.trajectory}</strong>/100
          </p>
          <p className="muted">
            Trend {twin.trend >= 0 ? '+' : ''}
            {twin.trend} | Streak {twin.streak} day{twin.streak === 1 ? '' : 's'} | Consistency {twin.completionRate}%
          </p>
          <p className="muted">
            Aura: {displayTraits.auraLevel === 'high' ? 'Green = strong resilience' : displayTraits.auraLevel === 'mid' ? 'Yellow = moderate stability' : 'Clay = needs support'}
          </p>
        </div>

        <svg viewBox="0 0 260 300" className="twin-body" role="img" aria-label="Future self body twin">
          <defs>
            <linearGradient id="nouriTwinBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={auraTone} stopOpacity="0.42" />
              <stop offset="100%" stopColor={auraTone} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          <rect x="14" y="16" width="232" height="268" rx="28" fill="url(#nouriTwinBg)" />

          <g transform={`translate(130 72) scale(${displayTraits.bodyScale}) translate(-130 -72)`}>
            {isFemale ? (
              <path d="M88 48 Q96 20 130 22 Q164 20 172 48 L170 98 Q150 120 130 121 Q110 120 90 98 Z" fill={hairTone} />
            ) : isMale ? (
              <path d="M98 42 Q110 22 130 22 Q150 22 162 42 L162 62 Q148 54 130 54 Q112 54 98 62 Z" fill={hairTone} />
            ) : (
              <path d="M94 44 Q108 24 130 24 Q152 24 166 44 L164 86 Q150 98 130 100 Q110 98 96 86 Z" fill={hairTone} />
            )}

            <circle cx="130" cy="72" r="30" fill={skinTone} />

            <ellipse cx="119" cy="70" rx="8" ry="6" fill="#ffffff" />
            <ellipse cx="141" cy="70" rx="8" ry="6" fill="#ffffff" />
            <ellipse cx="119" cy="70" rx="3.8" ry={eyeOpen} fill="#2c2c2c" />
            <ellipse cx="141" cy="70" rx="3.8" ry={eyeOpen} fill="#2c2c2c" />

            {displayTraits.tiredEyes && (
              <>
                <path d="M109 65 Q119 60 129 65" stroke="#9f6e6e" strokeWidth="1.6" fill="none" opacity="0.8" />
                <path d="M131 65 Q141 60 151 65" stroke="#9f6e6e" strokeWidth="1.6" fill="none" opacity="0.8" />
              </>
            )}

            {displayTraits.eyeBags && (
              <>
                <ellipse cx="119" cy="79" rx="8" ry="3.4" fill="#8f6c73" opacity="0.5" />
                <ellipse cx="141" cy="79" rx="8" ry="3.4" fill="#8f6c73" opacity="0.5" />
              </>
            )}

            {displayTraits.wrinkles && (
              <>
                <path d="M116 49 Q130 45 144 49" stroke="#b87f63" strokeWidth="1.8" fill="none" />
                <path d="M117 54 Q130 50 143 54" stroke="#b87f63" strokeWidth="1.4" fill="none" opacity="0.8" />
              </>
            )}

            <path d={`M110 92 Q130 ${98 - smileCurve} 150 92`} stroke="#6b4f3a" strokeWidth="3.8" fill="none" strokeLinecap="round" />

            <rect x="118" y="100" width="24" height="28" rx="10" fill={skinTone} />

            <path d={isFemale ? 'M80 138 Q130 114 180 138 L168 220 Q130 238 92 220 Z' : 'M84 136 Q130 112 176 136 L170 220 Q130 236 90 220 Z'} fill={shirtTone} />
            <rect x="70" y="142" width="18" height="74" rx="9" fill={skinTone} />
            <rect x="172" y="142" width="18" height="74" rx="9" fill={skinTone} />
            <rect x="108" y="220" width="18" height="46" rx="8" fill={skinTone} />
            <rect x="134" y="220" width="18" height="46" rx="8" fill={skinTone} />

            <path
              d="M126 150 C120 140 108 142 106 153 C104 164 113 170 126 178 C139 170 148 164 146 153 C144 142 132 140 126 150 Z"
              fill="#df6f7e"
              stroke="#bc4f63"
              strokeWidth="1.2"
              transform={`translate(126 160) scale(${0.45 + displayTraits.heartScale * 0.28}) translate(-126 -160)`}
            />

            {displayTraits.glow && <circle cx="130" cy="72" r="39" fill="#fff6c5" opacity="0.28" />}
          </g>

          <g>
            <rect x="22" y="206" width="26" height="56" rx="8" fill="#96c7f0" opacity="0.32" />
            <rect x="22" y={206 + (1 - displayTraits.hydrationLevel) * 56} width="26" height={56 * displayTraits.hydrationLevel} rx="8" fill="#4f9cde" />
            <text x="18" y="276" fontSize="10" fill="#2c2c2c">
              H2O
            </text>
          </g>

          {displayTraits.muscleAche && <text x="190" y="228" fontSize="16">ouch</text>}

          {displayTraits.brainOverload && (
            <g>
              <ellipse cx="206" cy="52" rx="32" ry="18" fill="#fff4d9" stroke="#dfc58f" />
              <text x="183" y="56" fontSize="11" fill="#7a5531">
                overload
              </text>
              <path d="M205 70 L198 86 L210 83 L204 98" stroke="#cf7f39" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </g>
          )}

          {displayTraits.sunlightPrompt && (
            <>
              <rect x="176" y="240" width="60" height="34" rx="10" fill="#ffffff" stroke="#e5d9c8" />
              <text x="181" y="254" fontSize="8" fill="#2c2c2c">
                Go outside
              </text>
              <text x="181" y="264" fontSize="8" fill="#2c2c2c">
                for sunlight
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="twin-domain-strip">
        {strongest.map((domain) => (
          <article key={domain} className="twin-domain-pill" style={{ borderColor: DOMAIN_META[domain].color }}>
            <strong>{labelForDomain(domain)}</strong>
            <span>{twin.domainScores[domain]}/100</span>
          </article>
        ))}
      </div>
    </section>
  )
}
