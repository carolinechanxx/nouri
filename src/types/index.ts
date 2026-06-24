export type Domain =
  | 'nutrition'
  | 'sleep'
  | 'stress'
  | 'exercise'
  | 'recovery'
  | 'mental-wellbeing'
  | 'digital-hygiene'
  | 'hydration'
  | 'sunlight-circadian'
  | 'social-connection'
export type ChatTone = 'gentle' | 'coach' | 'direct'
export type EffectWindow = 'morning' | '2h-after-meal' | 'afternoon' | 'evening' | 'before-bed' | 'all-day'
export type Visibility = 'private' | 'friends' | 'public'

export interface GeneratedHealthProfile {
  domains: {
    domain: Domain
    status: 'needs-attention' | 'moderate' | 'good'
    summary: string
  }[]
  primaryFocus: Domain
  educationSnippet: string
}

export interface UserProfile {
  id: string
  name: string
  ageRange: '18-24' | '25-32'
  ethnicity: string
  gender: string
  eatingPattern: string
  sleepSchedule: string
  stressLevel: string
  baseline: {
    energy: number
    sleep: number
    clarity: number
  }
  baselineUpdatedAt?: string
  assessmentAnswers: Record<string, string>
  healthProfile: GeneratedHealthProfile
  preferredInputMode: 'text' | 'voice'
  chatTone: ChatTone
  accountVisibility: 'private' | 'public'
  defaultPostVisibility: Visibility
  createdAt: string
}

export interface CheckIn {
  day: number
  date: string
  completed: boolean
  completionLevel: 'yes' | 'partial' | 'no'
  scores: {
    energy: number
    clarity: number
    mood: number
  }
  note?: string
  detailedNote?: string
  effectWindow?: EffectWindow
  voiceTranscript?: string
  aiInsight?: string
  media?: {
    kind: 'image' | 'video'
    dataUrl: string
    caption?: string
  }
  postVisibility?: Visibility
}

export interface InsightReport {
  experimentId: string
  generatedAt: string
  trendSummary: string
  bodyExplanation: string
  verdict: 'worked' | 'somewhat' | 'did-not-work'
  verdictReason: string
  takeaway: string
  nextExperimentDomain: Domain
  nextExperimentReason: string
  nextExperimentSuggestion: string
}

export interface Experiment {
  id: string
  domain: Domain
  mode: 'primary' | 'support'
  title: string
  hypothesis: string
  dailyAction: string
  whyItWorks: string
  asianContextNote: string
  trackedMetrics: string[]
  startDate: string
  endDate: string
  status: 'active' | 'completed' | 'abandoned'
  checkIns: CheckIn[]
  day7Report?: InsightReport
}

export interface SquadMember {
  name: string
  todayCheckedIn: boolean
  streak: number
}

export interface Squad {
  id: string
  code: string
  members: SquadMember[]
  currentExperiment?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Habit {
  id: string
  fromExperimentId: string
  title: string
  domain: Domain
  dailyAction: string
  whyItWorks: string
  createdAt: string
  completionDates: string[]
}
