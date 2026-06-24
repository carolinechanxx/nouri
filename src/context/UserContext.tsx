import { createContext, useContext, useMemo, useState } from 'react'
import type { ChatMessage, CheckIn, Experiment, Habit, Squad, UserProfile } from '../types'
import {
  extractExperimentIdeasFromChat,
  generateDay7Report,
  generateDomainRecommendations,
  generateExperiment,
  generateHealthProfile,
  generateImmediateInsight,
  generateSupportHabitInsight,
  sendChat,
} from '../lib/openai'
import { DOMAIN_ORDER } from '../lib/domains'
import { storage } from '../lib/storage'

interface UserContextValue {
  profile: UserProfile | null
  experiments: Experiment[]
  currentExperiment: Experiment | null
  primaryExperiment: Experiment | null
  supportHabits: Experiment[]
  activeExperiments: Experiment[]
  experimentOptions: Experiment[]
  habits: Habit[]
  dailySupportInsights: Array<{ id: string; insight: string; date: string }>
  chatHistory: ChatMessage[]
  squad: Squad | null
  onboardingComplete: boolean
  lastInsight: string
  setLastInsight: (value: string) => void
  completeOnboarding: (
    draft: Omit<UserProfile, 'id' | 'createdAt' | 'healthProfile' | 'preferredInputMode' | 'chatTone' | 'accountVisibility' | 'defaultPostVisibility'>,
  ) => Promise<void>
  submitCheckIn: (checkIn: CheckIn, experimentId?: string) => Promise<{ insight: string; reportReady: boolean }>
  setPreferredMode: (mode: 'text' | 'voice') => void
  setChatTone: (tone: UserProfile['chatTone']) => void
  setAccountVisibility: (visibility: UserProfile['accountVisibility']) => void
  setDefaultPostVisibility: (visibility: UserProfile['defaultPostVisibility']) => void
  updateBaseline: (baseline: UserProfile['baseline']) => void
  baselineNeedsRefresh: boolean
  sendChatMessage: (content: string) => Promise<string>
  refreshExperimentOptions: () => Promise<void>
  refreshDomainRecommendations: (domain: Experiment['domain']) => Promise<void>
  switchExperiment: (experimentId: string) => void
  addSupportExperiment: (experimentId: string) => boolean
  addExperimentIdeasFromChat: (message: string) => Promise<number>
  promoteExperimentToHabit: (experimentId: string) => void
  toggleHabitDoneToday: (habitId: string) => void
  updateExperiment: (
    experimentId: string,
    updates: Partial<Pick<Experiment, 'title' | 'hypothesis' | 'dailyAction' | 'whyItWorks' | 'asianContextNote'>>,
  ) => void
  deleteExperiment: (experimentId: string) => void
  createCustomExperiment: (input: {
    domain: Experiment['domain']
    title: string
    dailyAction: string
    hypothesis?: string
    mode?: Experiment['mode']
  }) => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

const emptyHealthProfile = {
  domains: DOMAIN_ORDER.map((domain) => ({ domain, status: 'moderate' as const, summary: '' })),
  primaryFocus: 'nutrition' as const,
  educationSnippet: '',
}

const normalizeExperiment = (experiment: Experiment): Experiment => ({
  ...experiment,
  mode: experiment.mode ?? 'primary',
  checkIns: (() => {
    const looksLegacyScale =
      experiment.checkIns.length > 0 &&
      experiment.checkIns.every(
        (checkIn) => checkIn.scores.energy <= 5 && checkIn.scores.clarity <= 5 && checkIn.scores.mood <= 5,
      )
    if (!looksLegacyScale) {
      return experiment.checkIns.map((checkIn) => ({
        ...checkIn,
        scores: {
          energy: clampScore(checkIn.scores.energy),
          clarity: clampScore(checkIn.scores.clarity),
          mood: clampScore(checkIn.scores.mood),
        },
      }))
    }
    return experiment.checkIns.map((checkIn) => ({
      ...checkIn,
      scores: {
        energy: clampScore(checkIn.scores.energy * 2),
        clarity: clampScore(checkIn.scores.clarity * 2),
        mood: clampScore(checkIn.scores.mood * 2),
      },
    }))
  })(),
})

const clampScore = (value: number) => Math.max(1, Math.min(10, Math.round(value)))

function ensurePrimaryConsistency(items: Experiment[]) {
  const active = items.filter((exp) => exp.status === 'active')
  const hasPrimary = active.some((exp) => exp.mode === 'primary')
  if (hasPrimary || !active.length) return items

  const promoteId = active[0].id
  return items.map((exp) => (exp.id === promoteId ? { ...exp, mode: 'primary' as const } : exp))
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const stored = storage.readProfile()
    if (!stored) return null
    return {
      ...stored,
      chatTone: stored.chatTone ?? 'gentle',
      accountVisibility: stored.accountVisibility ?? 'private',
      defaultPostVisibility: stored.defaultPostVisibility ?? 'friends',
      baselineUpdatedAt: stored.baselineUpdatedAt ?? stored.createdAt ?? new Date().toISOString(),
    }
  })
  const [experiments, setExperiments] = useState<Experiment[]>(
    ensurePrimaryConsistency(storage.readExperiments().map((exp) => normalizeExperiment(exp))),
  )
  const [experimentOptions, setExperimentOptions] = useState<Experiment[]>(
    storage.readExperimentOptions().map((exp) => normalizeExperiment(exp)),
  )
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(storage.readChatHistory())
  const [habits, setHabits] = useState<Habit[]>(storage.readHabits())
  const [squad] = useState<Squad | null>(
    storage.readSquad() ?? {
      id: crypto.randomUUID(),
      code: 'NOURI7',
      members: [
        { name: 'You', todayCheckedIn: true, streak: 3 },
        { name: 'Alya', todayCheckedIn: true, streak: 6 },
        { name: 'Jin', todayCheckedIn: false, streak: 2 },
        { name: 'Ravi', todayCheckedIn: true, streak: 5 },
      ],
    },
  )
  const [onboardingComplete, setOnboardingComplete] = useState(storage.readOnboardingComplete())
  const [lastInsight, setLastInsight] = useState('')

  const activeExperiments = useMemo(() => experiments.filter((exp) => exp.status === 'active'), [experiments])
  const primaryExperiment = useMemo(() => activeExperiments.find((exp) => exp.mode === 'primary') ?? null, [activeExperiments])
  const supportHabits = useMemo(() => activeExperiments.filter((exp) => exp.mode === 'support'), [activeExperiments])
  const currentExperiment = primaryExperiment
  const baselineNeedsRefresh = useMemo(() => {
    if (!profile) return false
    const updatedAt = profile.baselineUpdatedAt ?? profile.createdAt
    const ageMs = Date.now() - new Date(updatedAt).getTime()
    return ageMs >= 7 * 24 * 60 * 60 * 1000
  }, [profile])
  const dailySupportInsights = useMemo(
    () =>
      supportHabits
        .flatMap((habit) =>
          habit.checkIns
            .filter((checkIn) => checkIn.aiInsight)
            .map((checkIn) => ({
              id: `${habit.id}-${checkIn.day}`,
              insight: checkIn.aiInsight || '',
              date: checkIn.date,
            })),
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
    [supportHabits],
  )

  const domainOrder: Experiment['domain'][] = DOMAIN_ORDER
  const getDomainsForOptions = (seed: Experiment['domain']) => [seed, ...domainOrder.filter((domain) => domain !== seed)]

  const persistExperiments = (nextExperiments: Experiment[], nextOptions = experimentOptions) => {
    const normalized = ensurePrimaryConsistency(nextExperiments)
    setExperiments(normalized)
    setExperimentOptions(nextOptions)
    storage.writeExperiments(normalized)
    storage.writeExperimentOptions(nextOptions)
    storage.writeCurrentExperiment(normalized.find((exp) => exp.status === 'active' && exp.mode === 'primary')?.id ?? '')
  }

  const buildExperimentOptions = async (targetProfile: UserProfile, baseDomain: Experiment['domain'], existing: Experiment[]) => {
    const completedExperiments = existing.filter((exp) => exp.status === 'completed')
    const domains = getDomainsForOptions(baseDomain).slice(0, 4)
    const generatedPerDomain = await Promise.all(
      domains.map((domain) => generateDomainRecommendations(targetProfile, completedExperiments, domain, 3, 'option')),
    )
    return generatedPerDomain.flat().map((exp) => ({ ...exp, mode: 'primary' as const, status: 'abandoned' as const }))
  }

  const completeOnboarding = async (
    draft: Omit<UserProfile, 'id' | 'createdAt' | 'healthProfile' | 'preferredInputMode' | 'chatTone' | 'accountVisibility' | 'defaultPostVisibility'>,
  ) => {
    const createdAt = new Date().toISOString()
    const base: UserProfile = {
      ...draft,
      id: crypto.randomUUID(),
      healthProfile: emptyHealthProfile,
      preferredInputMode: 'text',
      chatTone: 'gentle',
      accountVisibility: 'private',
      defaultPostVisibility: 'friends',
      baselineUpdatedAt: createdAt,
      createdAt,
    }

    const healthProfile = await generateHealthProfile(base, draft.assessmentAnswers)
    const withHealthProfile = { ...base, healthProfile }

    const experiment = { ...(await generateExperiment(withHealthProfile, [])), mode: 'primary' as const }
    const options = await buildExperimentOptions(withHealthProfile, experiment.domain, [experiment])

    setProfile(withHealthProfile)
    setExperiments([experiment])
    setExperimentOptions(options)
    setOnboardingComplete(true)

    storage.writeProfile(withHealthProfile)
    storage.writeExperiments([experiment])
    storage.writeExperimentOptions(options)
    storage.writeCurrentExperiment(experiment.id)
    storage.writeOnboardingComplete(true)
    storage.writeSquad(squad as Squad)
  }

  const submitCheckIn = async (checkIn: CheckIn, experimentId?: string) => {
    if (!profile) {
      return { insight: '', reportReady: false }
    }

    const targetExperiment = (experimentId ? experiments.find((exp) => exp.id === experimentId) : primaryExperiment) ?? null
    if (!targetExperiment) {
      return { insight: '', reportReady: false }
    }

    const preparedCheckIn: CheckIn = {
      ...checkIn,
      scores: {
        energy: clampScore(checkIn.scores.energy),
        clarity: clampScore(checkIn.scores.clarity),
        mood: clampScore(checkIn.scores.mood),
      },
    }

    const updatedExperiment: Experiment = {
      ...targetExperiment,
      checkIns: [...targetExperiment.checkIns, preparedCheckIn],
    }

    let insight = ''
    let reportReady = false

    if (targetExperiment.mode === 'primary') {
      insight = await generateImmediateInsight(profile, updatedExperiment, preparedCheckIn, updatedExperiment.checkIns)
      updatedExperiment.checkIns[updatedExperiment.checkIns.length - 1].aiInsight = insight

      if (updatedExperiment.checkIns.length >= 7) {
        const report = await generateDay7Report(profile, updatedExperiment, updatedExperiment.checkIns)
        updatedExperiment.day7Report = report
        updatedExperiment.status = 'completed'
        reportReady = true
      }
      setLastInsight(insight)
    } else {
      insight = await generateSupportHabitInsight(profile, updatedExperiment, preparedCheckIn, primaryExperiment)
      updatedExperiment.checkIns[updatedExperiment.checkIns.length - 1].aiInsight = insight
    }

    const next = experiments.map((exp) => (exp.id === updatedExperiment.id ? updatedExperiment : exp))
    persistExperiments(next)

    return { insight, reportReady }
  }

  const setPreferredMode = (mode: 'text' | 'voice') => {
    if (!profile) return
    const next = { ...profile, preferredInputMode: mode }
    setProfile(next)
    storage.writeProfile(next)
  }

  const setChatTone = (tone: UserProfile['chatTone']) => {
    if (!profile) return
    const next = { ...profile, chatTone: tone }
    setProfile(next)
    storage.writeProfile(next)
  }

  const setAccountVisibility = (visibility: UserProfile['accountVisibility']) => {
    if (!profile) return
    const fallbackPostVisibility =
      visibility === 'private' && profile.defaultPostVisibility === 'public' ? 'friends' : profile.defaultPostVisibility
    const next: UserProfile = {
      ...profile,
      accountVisibility: visibility,
      defaultPostVisibility: fallbackPostVisibility,
    }
    setProfile(next)
    storage.writeProfile(next)
  }

  const setDefaultPostVisibility = (visibility: UserProfile['defaultPostVisibility']) => {
    if (!profile) return
    const nextVisibility = profile.accountVisibility === 'private' && visibility === 'public' ? 'friends' : visibility
    const next: UserProfile = {
      ...profile,
      defaultPostVisibility: nextVisibility,
    }
    setProfile(next)
    storage.writeProfile(next)
  }

  const updateBaseline = (baseline: UserProfile['baseline']) => {
    if (!profile) return
    const next: UserProfile = {
      ...profile,
      baseline: {
        energy: clampScore(baseline.energy),
        sleep: clampScore(baseline.sleep),
        clarity: clampScore(baseline.clarity),
      },
      baselineUpdatedAt: new Date().toISOString(),
    }
    setProfile(next)
    storage.writeProfile(next)
  }

  const sendChatMessage = async (content: string) => {
    if (!profile) return ''

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }

    const withUser = [...chatHistory, userMessage]
    setChatHistory(withUser)
    storage.writeChatHistory(withUser)

    const allCheckIns = experiments.flatMap((e) => e.checkIns)
    const reply = await sendChat(withUser, profile, experiments, allCheckIns)
    const safeReply = reply?.trim() || 'I could not fetch a full reply yet, but your recent trend still suggests consistency is helping. Try asking again in one sentence.'

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: safeReply,
      createdAt: new Date().toISOString(),
    }

    const next = [...withUser, assistantMessage].slice(-50)
    setChatHistory(next)
    storage.writeChatHistory(next)
    return safeReply
  }

  const refreshExperimentOptions = async () => {
    if (!profile) return
    const seedDomain = primaryExperiment?.domain ?? profile.healthProfile.primaryFocus
    const options = await buildExperimentOptions(profile, seedDomain, experiments)
    setExperimentOptions(options)
    storage.writeExperimentOptions(options)
  }

  const refreshDomainRecommendations = async (domain: Experiment['domain']) => {
    if (!profile) return
    const completedExperiments = experiments.filter((exp) => exp.status === 'completed')
    const refreshed = await generateDomainRecommendations(profile, completedExperiments, domain, 3, 'refresh')
    const nextOptions = [
      ...experimentOptions.filter((option) => option.domain !== domain),
      ...refreshed.map((exp) => ({ ...exp, mode: 'primary' as const, status: 'abandoned' as const })),
    ]
    setExperimentOptions(nextOptions)
    storage.writeExperimentOptions(nextOptions)
  }

  const switchExperiment = (experimentId: string) => {
    const selected = experimentOptions.find((option) => option.id === experimentId)
    if (!selected) return

    const existing = experiments.find((exp) => exp.id === selected.id)
    const selectedForPrimary: Experiment = {
      ...(existing ?? selected),
      mode: 'primary',
      status: 'active',
      checkIns: existing?.checkIns ?? selected.checkIns,
    }

    const demotedPrimary = experiments.map((exp) =>
      exp.status === 'active' && exp.mode === 'primary' && exp.id !== selectedForPrimary.id ? { ...exp, status: 'abandoned' as const } : exp,
    )
    const upserted = demotedPrimary.some((exp) => exp.id === selectedForPrimary.id)
      ? demotedPrimary.map((exp) => (exp.id === selectedForPrimary.id ? selectedForPrimary : exp))
      : [selectedForPrimary, ...demotedPrimary]

    const nextOptions = experimentOptions.filter((option) => option.id !== experimentId)
    persistExperiments(upserted, nextOptions)
  }

  const addSupportExperiment = (experimentId: string) => {
    const selected = experimentOptions.find((option) => option.id === experimentId)
    if (!selected) return false

    const alreadyActiveSupport = supportHabits.find((habit) => habit.id === selected.id)
    if (alreadyActiveSupport) return true
    if (supportHabits.length >= 2) return false

    const existing = experiments.find((exp) => exp.id === selected.id)
    const support: Experiment = {
      ...(existing ?? selected),
      mode: 'support',
      status: 'active',
      checkIns: existing?.checkIns ?? selected.checkIns,
    }

    const upserted = experiments.some((exp) => exp.id === support.id)
      ? experiments.map((exp) => (exp.id === support.id ? support : exp))
      : [support, ...experiments]

    const nextOptions = experimentOptions.filter((option) => option.id !== experimentId)
    persistExperiments(upserted, nextOptions)
    return true
  }

  const addExperimentIdeasFromChat = async (message: string) => {
    if (!profile) return 0

    const completed = experiments.filter((exp) => exp.status === 'completed')
    const ideas = await extractExperimentIdeasFromChat(profile, message, completed)
    const existingKeys = new Set(
      [...experiments, ...experimentOptions].map((exp) => `${exp.title.toLowerCase()}::${exp.dailyAction.toLowerCase()}`),
    )
    const uniqueIdeas = ideas
      .map((exp) => ({ ...exp, mode: 'primary' as const, status: 'abandoned' as const }))
      .filter((idea) => !existingKeys.has(`${idea.title.toLowerCase()}::${idea.dailyAction.toLowerCase()}`))

    if (!uniqueIdeas.length) return 0

    const nextOptions = [...uniqueIdeas, ...experimentOptions]
    setExperimentOptions(nextOptions)
    storage.writeExperimentOptions(nextOptions)
    return uniqueIdeas.length
  }

  const promoteExperimentToHabit = (experimentId: string) => {
    const experiment = experiments.find((exp) => exp.id === experimentId)
    if (!experiment) return
    if (habits.some((habit) => habit.fromExperimentId === experimentId)) return

    const habit: Habit = {
      id: crypto.randomUUID(),
      fromExperimentId: experiment.id,
      title: experiment.title,
      domain: experiment.domain,
      dailyAction: experiment.dailyAction,
      whyItWorks: experiment.day7Report?.takeaway || experiment.whyItWorks,
      createdAt: new Date().toISOString(),
      completionDates: [],
    }
    const nextHabits = [habit, ...habits]
    setHabits(nextHabits)
    storage.writeHabits(nextHabits)
  }

  const toggleHabitDoneToday = (habitId: string) => {
    const today = new Date().toISOString().slice(0, 10)
    const nextHabits = habits.map((habit) => {
      if (habit.id !== habitId) return habit
      const hasToday = habit.completionDates.includes(today)
      return {
        ...habit,
        completionDates: hasToday ? habit.completionDates.filter((date) => date !== today) : [...habit.completionDates, today],
      }
    })
    setHabits(nextHabits)
    storage.writeHabits(nextHabits)
  }

  const updateExperiment = (
    experimentId: string,
    updates: Partial<Pick<Experiment, 'title' | 'hypothesis' | 'dailyAction' | 'whyItWorks' | 'asianContextNote'>>,
  ) => {
    const patch = (experiment: Experiment) =>
      experiment.id === experimentId
        ? {
            ...experiment,
            ...updates,
            title: updates.title?.trim() || experiment.title,
            dailyAction: updates.dailyAction?.trim() || experiment.dailyAction,
          }
        : experiment

    const nextExperiments = experiments.map(patch)
    const nextOptions = experimentOptions.map(patch)
    persistExperiments(nextExperiments, nextOptions)
  }

  const deleteExperiment = (experimentId: string) => {
    const nextExperiments = experiments.filter((experiment) => experiment.id !== experimentId)
    const nextOptions = experimentOptions.filter((experiment) => experiment.id !== experimentId)
    persistExperiments(nextExperiments, nextOptions)
  }

  const createCustomExperiment = (input: {
    domain: Experiment['domain']
    title: string
    dailyAction: string
    hypothesis?: string
    mode?: Experiment['mode']
  }) => {
    const mode = input.mode ?? 'primary'
    if (mode === 'support' && supportHabits.length >= 2) return

    const custom: Experiment = {
      id: crypto.randomUUID(),
      mode,
      domain: input.domain,
      title: input.title.trim(),
      hypothesis: input.hypothesis?.trim() || `We think this custom ${input.domain} action will improve your consistency this week.`,
      dailyAction: input.dailyAction.trim(),
      whyItWorks: 'This was user-designed for fit and consistency. Repeatability is the primary goal in week one.',
      asianContextNote: 'Designed to fit your routine and local lifestyle.',
      trackedMetrics: ['energy', 'clarity', 'mood'],
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      checkIns: [],
    }

    const updated =
      mode === 'primary'
        ? experiments.map((exp) => (exp.status === 'active' && exp.mode === 'primary' ? { ...exp, status: 'abandoned' as const } : exp))
        : experiments

    persistExperiments([custom, ...updated])
  }

  const value: UserContextValue = {
    profile,
    experiments,
    currentExperiment,
    primaryExperiment,
    supportHabits,
    activeExperiments,
    experimentOptions,
    habits,
    dailySupportInsights,
    chatHistory,
    squad,
    onboardingComplete,
    lastInsight,
    setLastInsight,
    completeOnboarding,
    submitCheckIn,
    setPreferredMode,
    setChatTone,
    setAccountVisibility,
    setDefaultPostVisibility,
    updateBaseline,
    baselineNeedsRefresh,
    sendChatMessage,
    refreshExperimentOptions,
    refreshDomainRecommendations,
    switchExperiment,
    addSupportExperiment,
    addExperimentIdeasFromChat,
    promoteExperimentToHabit,
    toggleHabitDoneToday,
    updateExperiment,
    deleteExperiment,
    createCustomExperiment,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
