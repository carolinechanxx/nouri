import type { ChatMessage, Experiment, Habit, Squad, UserProfile } from '../types'

const STORAGE_KEYS = {
  profile: 'nouri_user_profile',
  experiments: 'nouri_experiments',
  currentExperiment: 'nouri_current_experiment',
  experimentOptions: 'nouri_experiment_options',
  habits: 'nouri_habits',
  squad: 'nouri_squad',
  chatHistory: 'nouri_chat_history',
  onboardingComplete: 'nouri_onboarding_complete',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const storage = {
  keys: STORAGE_KEYS,
  readProfile: () => read<UserProfile | null>(STORAGE_KEYS.profile, null),
  writeProfile: (profile: UserProfile) => write(STORAGE_KEYS.profile, profile),
  readExperiments: () => read<Experiment[]>(STORAGE_KEYS.experiments, []),
  writeExperiments: (experiments: Experiment[]) => write(STORAGE_KEYS.experiments, experiments),
  readCurrentExperiment: () => read<string | null>(STORAGE_KEYS.currentExperiment, null),
  writeCurrentExperiment: (id: string) => write(STORAGE_KEYS.currentExperiment, id),
  readExperimentOptions: () => read<Experiment[]>(STORAGE_KEYS.experimentOptions, []),
  writeExperimentOptions: (experiments: Experiment[]) => write(STORAGE_KEYS.experimentOptions, experiments),
  readHabits: () => read<Habit[]>(STORAGE_KEYS.habits, []),
  writeHabits: (habits: Habit[]) => write(STORAGE_KEYS.habits, habits),
  readSquad: () => read<Squad | null>(STORAGE_KEYS.squad, null),
  writeSquad: (squad: Squad) => write(STORAGE_KEYS.squad, squad),
  readChatHistory: () => read<ChatMessage[]>(STORAGE_KEYS.chatHistory, []).slice(-50),
  writeChatHistory: (messages: ChatMessage[]) => write(STORAGE_KEYS.chatHistory, messages.slice(-50)),
  readOnboardingComplete: () => read<boolean>(STORAGE_KEYS.onboardingComplete, false),
  writeOnboardingComplete: (done: boolean) => write(STORAGE_KEYS.onboardingComplete, done),
}
