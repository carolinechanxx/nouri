import type { CheckIn, Domain, Experiment, UserProfile } from '../types'
import { DOMAIN_ORDER } from './domains'

export interface HealthTwinState {
  score: number
  trend: number
  trajectory: number
  streak: number
  completionRate: number
  label: 'rebuilding' | 'steady' | 'thriving'
  domainScores: Record<Domain, number>
  traits: {
    glow: boolean
    eyeBags: boolean
    tiredEyes: boolean
    wrinkles: boolean
    muscleAche: boolean
    brainOverload: boolean
    sunlightPrompt: boolean
    bodyScale: number
    heartScale: number
    hydrationLevel: number
    auraLevel: 'low' | 'mid' | 'high'
  }
}

export interface HealthTwinViews {
  current: HealthTwinState
  future: HealthTwinState
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function averageScore(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 52
  const total = checkIns.reduce((sum, checkIn) => {
    const dayScore = (checkIn.scores.energy + checkIn.scores.clarity + checkIn.scores.mood) / 30
    return sum + dayScore
  }, 0)
  return (total / checkIns.length) * 100
}

function completionWeight(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 0.5
  const weight = checkIns.reduce((sum, checkIn) => {
    if (checkIn.completionLevel === 'yes') return sum + 1
    if (checkIn.completionLevel === 'partial') return sum + 0.6
    return sum
  }, 0)
  return clamp(weight / checkIns.length, 0, 1)
}

function currentStreak(checkIns: CheckIn[]): number {
  let streak = 0
  for (let i = checkIns.length - 1; i >= 0; i -= 1) {
    if (checkIns[i].completionLevel === 'no') break
    streak += 1
  }
  return streak
}

function trendDelta(checkIns: CheckIn[]): number {
  if (checkIns.length < 4) return 0
  const recent = checkIns.slice(-3)
  const prior = checkIns.slice(-6, -3)
  if (!prior.length) return 0

  const recentAvg = averageScore(recent)
  const priorAvg = averageScore(prior)
  return (recentAvg - priorAvg) / 10
}

function domainFromQuestionId(id: string): Domain | null {
  return DOMAIN_ORDER.find((domain) => id.startsWith(`${domain}-`)) ?? null
}

function scoreFromAssessment(profile: UserProfile): Record<Domain, number> {
  const scores = DOMAIN_ORDER.reduce(
    (acc, domain) => {
      acc[domain] = 55
      return acc
    },
    {} as Record<Domain, number>,
  )

  const groups = DOMAIN_ORDER.reduce(
    (acc, domain) => {
      acc[domain] = []
      return acc
    },
    {} as Record<Domain, number[]>,
  )

  Object.entries(profile.assessmentAnswers).forEach(([id, value]) => {
    const domain = domainFromQuestionId(id)
    if (!domain) return
    const raw = value.trim()
    const bucket = /never|always rested|same every day|1hr\+|yes always|2l\+|7-8|8\+|within 30 mins|1hr before|0-30 mins|daily/i.test(raw)
      ? 0
      : /sometimes|1-2x week|1\.5-2l|6-7|30 mins|varies 30 mins|weekly|45-60 mins|few times|some days|most days/i.test(raw)
        ? 1
        : /often|always|not really|in bed|no pattern|<6|60\+ mins|rarely rested|4\+ hours|none|never/i.test(raw)
          ? 3
          : 2
    groups[domain].push(bucket)
  })

  DOMAIN_ORDER.forEach((domain) => {
    const values = groups[domain]
    if (!values.length) return
    const risk = values.reduce((sum, v) => sum + v, 0) / values.length
    scores[domain] = clamp(Math.round(82 - risk * 12), 28, 90)
  })

  return scores
}

function scoreFromExperiments(experiments: Experiment[]): Record<Domain, number> {
  const scores = DOMAIN_ORDER.reduce(
    (acc, domain) => {
      const domainExperiments = experiments.filter((exp) => exp.domain === domain)
      const checkIns = domainExperiments.flatMap((exp) => exp.checkIns)
      if (!checkIns.length) {
        acc[domain] = 55
        return acc
      }
      const avg = averageScore(checkIns)
      const completion = completionWeight(checkIns) * 100
      acc[domain] = clamp(Math.round(avg * 0.7 + completion * 0.3), 20, 96)
      return acc
    },
    {} as Record<Domain, number>,
  )
  return scores
}

function mergeDomainScores(profile: UserProfile, experiments: Experiment[]) {
  const assessment = scoreFromAssessment(profile)
  const logs = scoreFromExperiments(experiments)
  const merged = DOMAIN_ORDER.reduce(
    (acc, domain) => {
      acc[domain] = clamp(Math.round(assessment[domain] * 0.55 + logs[domain] * 0.45), 20, 96)
      return acc
    },
    {} as Record<Domain, number>,
  )

  merged.sleep = clamp(Math.round(merged.sleep * 0.75 + profile.baseline.sleep * 2.5), 20, 96)
  merged.hydration = clamp(Math.round(merged.hydration * 0.78 + profile.baseline.energy * 2.2), 20, 96)
  merged.nutrition = clamp(Math.round(merged.nutrition * 0.82 + profile.baseline.energy * 1.8), 20, 96)
  merged['mental-wellbeing'] = clamp(Math.round(merged['mental-wellbeing'] * 0.78 + profile.baseline.clarity * 2.2), 20, 96)

  return merged
}

function twinFromInputs(
  domainScores: Record<Domain, number>,
  avg: number,
  completion: number,
  streak: number,
  trend: number,
  trajectory: number,
): HealthTwinState {
  const score = clamp(avg * 0.65 + completion * 100 * 0.25 + (Math.min(streak, 7) / 7) * 100 * 0.1, 20, 98)
  const label: HealthTwinState['label'] = score >= 75 ? 'thriving' : score >= 50 ? 'steady' : 'rebuilding'
  const bodyScale = clamp(0.88 + (domainScores.exercise + domainScores.recovery) / 260, 0.86, 1.14)
  const heartScale = clamp(0.72 + domainScores['social-connection'] / 110, 0.72, 1.32)
  const hydrationLevel = clamp(domainScores.hydration / 100, 0.1, 1)

  return {
    score: Math.round(score),
    trend: Number(trend.toFixed(1)),
    trajectory: Math.round(trajectory),
    streak,
    completionRate: Math.round(completion * 100),
    label,
    domainScores,
    traits: {
      glow: domainScores.nutrition >= 66,
      eyeBags: domainScores.sleep < 55,
      tiredEyes: domainScores['digital-hygiene'] < 52,
      wrinkles: domainScores.stress < 50,
      muscleAche: domainScores.recovery < 50,
      brainOverload: domainScores['mental-wellbeing'] < 48,
      sunlightPrompt: domainScores['sunlight-circadian'] < 56,
      bodyScale,
      heartScale,
      hydrationLevel,
      auraLevel: score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low',
    },
  }
}

function projectDomainScores(domainScores: Record<Domain, number>, scoreDelta: number) {
  const influence: Record<Domain, number> = {
    nutrition: 1.0,
    sleep: 1.1,
    stress: 0.9,
    exercise: 1.0,
    recovery: 0.9,
    'mental-wellbeing': 1.0,
    'digital-hygiene': 0.8,
    hydration: 1.0,
    'sunlight-circadian': 0.9,
    'social-connection': 0.75,
  }
  return DOMAIN_ORDER.reduce(
    (acc, domain) => {
      acc[domain] = clamp(domainScores[domain] + scoreDelta * influence[domain], 20, 98)
      return acc
    },
    {} as Record<Domain, number>,
  )
}

export function getHealthTwinViews(profile: UserProfile, experiments: Experiment[]): HealthTwinViews {
  const checkIns = experiments.flatMap((experiment) => experiment.checkIns)
  const recentCheckIns = checkIns.slice(-7)
  const sample = recentCheckIns.length ? recentCheckIns : checkIns
  const avg = averageScore(sample)
  const completion = completionWeight(sample)
  const streak = currentStreak(checkIns)
  const trend = trendDelta(sample)
  const domainScores = mergeDomainScores(profile, experiments)
  const currentTrajectory = clamp(avg + trend * 4 + (completion - 0.65) * 10, 10, 99)
  const current = twinFromInputs(domainScores, avg, completion, streak, trend, currentTrajectory)

  let futureScore = clamp(current.score + trend * 12 + (completion - 0.5) * 8, 10, 99)
  if (trend > 0) {
    futureScore = Math.max(futureScore, current.score + 1)
  }
  const futureDomainScores = projectDomainScores(domainScores, (futureScore - current.score) * 0.55)
  const futureTrajectory = clamp(futureScore + trend * 3, 10, 99)
  const projectedFuture = twinFromInputs(
    futureDomainScores,
    futureScore,
    clamp(completion + trend * 0.08, 0.3, 1),
    clamp(streak + 6, 1, 30),
    trend,
    futureTrajectory,
  )
  const future: HealthTwinState = {
    ...projectedFuture,
    score: Math.round(futureScore),
    label: futureScore >= 75 ? 'thriving' : futureScore >= 50 ? 'steady' : 'rebuilding',
    traits: {
      ...projectedFuture.traits,
      auraLevel: futureScore >= 75 ? 'high' : futureScore >= 50 ? 'mid' : 'low',
    },
  }

  return { current, future }
}

export function getHealthTwinState(profile: UserProfile, experiments: Experiment[]): HealthTwinState {
  return getHealthTwinViews(profile, experiments).future
}
