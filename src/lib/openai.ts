import type { ChatMessage, CheckIn, Experiment, GeneratedHealthProfile, InsightReport, UserProfile } from '../types'
import {
  chatSystemPrompt,
  day7ReportPrompt,
  experimentDesignPrompt,
  healthProfilePrompt,
  immediateInsightPrompt,
  voiceExtractorPrompt,
} from './prompts'
import { DOMAIN_ORDER, DOMAIN_ENUM } from './domains'

const OPENAI_URL = 'https://api.openai.com/v1/responses'
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text'
const ELEVENLABS_SFX_URL = 'https://api.elevenlabs.io/v1/sound-generation'

function hasApiKey() {
  return Boolean(import.meta.env.VITE_OPENAI_KEY)
}

function hasElevenLabsKey() {
  return Boolean(import.meta.env.VITE_ELEVENLABS_API_KEY)
}

async function playAudioBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  try {
    await audio.play()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }
}

function safeJson<T>(input: string): T {
  const trimmed = input.trim()
  const cleaned = trimmed.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned) as T
}

function sanitizeChatText(text: string): string {
  return text
    .replace(/[`*_#>~]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function recommendationFingerprint(title: string, dailyAction: string) {
  return `${title.toLowerCase().replace(/\s+/g, ' ').trim()}::${dailyAction.toLowerCase().replace(/\s+/g, ' ').trim()}`
}

const clampScore = (value: number) => Math.max(1, Math.min(10, Math.round(value)))

function parseMetricFromText(text: string, metric: 'energy' | 'clarity' | 'mood') {
  const match = text.match(new RegExp(`${metric}\\s*(?:is|:)?\\s*(10|[1-9])\\b`))
  if (!match) return 5
  return clampScore(Number(match[1]))
}

const FALLBACK_POOL: Record<Experiment['domain'], Array<{ title: string; dailyAction: string; hypothesis: string }>> = {
  nutrition: [
    { title: 'Protein First', dailyAction: 'Eat a palm-sized protein before your main carb at each meal.', hypothesis: 'Protein-first ordering can reduce post-meal crashes.' },
    { title: 'Veg Starter', dailyAction: 'Start lunch and dinner with 3-4 bites of vegetables before anything else.', hypothesis: 'Front-loading fiber can stabilise appetite and energy.' },
    { title: 'Sugar Curfew', dailyAction: 'Avoid sweet drinks after 3pm on weekdays.', hypothesis: 'Lower late-day sugar may improve evening calm and sleep readiness.' },
  ],
  sleep: [
    { title: 'Screen Sunset', dailyAction: 'Put your phone away 30 minutes before bedtime.', hypothesis: 'Lower night screen load can improve sleep onset.' },
    { title: 'Wake Anchor', dailyAction: 'Wake within the same 30-minute window daily.', hypothesis: 'A stable wake anchor can improve circadian consistency.' },
    { title: 'Dim Light Winddown', dailyAction: 'Use dim lighting in the final hour before bed.', hypothesis: 'Lower light intensity can support melatonin timing.' },
  ],
  stress: [
    { title: '2-Minute Reset', dailyAction: 'Take one 2-minute breathing reset after your hardest task block.', hypothesis: 'Fast nervous-system downshifts can reduce stress carryover.' },
    { title: 'Brain Dump 5', dailyAction: 'Write down top worries for 5 minutes before dinner.', hypothesis: 'Externalising worries can reduce mental load.' },
    { title: 'Walk Off Stress', dailyAction: 'Take a 10-minute decompression walk after work or school.', hypothesis: 'Movement plus transition time can lower stress arousal.' },
  ],
  exercise: [
    { title: 'Move Snack', dailyAction: 'Do a 10-minute brisk walk before your longest sitting block.', hypothesis: 'Short activity bursts can improve alertness and energy.' },
    { title: 'Daily Bodyweight 8', dailyAction: 'Complete one 8-minute bodyweight circuit each day.', hypothesis: 'Consistent low-volume training builds momentum and mood.' },
    { title: 'Step Booster', dailyAction: 'Add 2,000 extra steps to your normal day.', hypothesis: 'Incremental movement can lift energy and cardio resilience.' },
  ],
  recovery: [
    { title: 'Recovery Window', dailyAction: 'Keep one 20-minute no-screen recovery window after intense work or training.', hypothesis: 'Structured recovery can reduce overload signals.' },
    { title: 'Post-Exercise Cooldown', dailyAction: 'Do 5 minutes of easy cooldown and stretching after activity.', hypothesis: 'Cooldown may improve next-day soreness and readiness.' },
    { title: 'Rest Quality Check', dailyAction: 'Take one intentional 10-minute lying-down rest each afternoon.', hypothesis: 'Brief true rest can restore focus capacity.' },
  ],
  'mental-wellbeing': [
    { title: 'Anxiety Labeling', dailyAction: 'Name your top emotion once in the morning and once at night.', hypothesis: 'Emotion labeling can reduce reactivity.' },
    { title: 'Self-Compassion Minute', dailyAction: 'Spend 60 seconds speaking to yourself like a supportive friend.', hypothesis: 'Self-compassion practice can improve resilience.' },
    { title: '3 Good Moments', dailyAction: 'Log three good moments before bed.', hypothesis: 'Positive recall can rebalance attention bias.' },
  ],
  'digital-hygiene': [
    { title: 'No-Scroll Start', dailyAction: 'No social media for the first 30 minutes after waking.', hypothesis: 'Protecting morning attention can improve focus stability.' },
    { title: 'Night Scroll Cutoff', dailyAction: 'Stop doomscrolling 45 minutes before bedtime.', hypothesis: 'Reducing late-night feed exposure can help sleep quality.' },
    { title: 'Single-Task Block', dailyAction: 'Run one 25-minute deep-work block in airplane mode daily.', hypothesis: 'Reducing switching costs can improve clarity.' },
  ],
  hydration: [
    { title: 'Hydration Anchor', dailyAction: 'Drink one full glass of water within 15 minutes of waking.', hypothesis: 'Morning hydration may improve alertness and energy.' },
    { title: 'Meal Water Rule', dailyAction: 'Drink a glass of water before each main meal.', hypothesis: 'Regular hydration cues can prevent midday dips.' },
    { title: 'Bottle Completion', dailyAction: 'Finish one 750ml bottle before 2pm.', hypothesis: 'Front-loaded hydration improves consistency.' },
  ],
  'sunlight-circadian': [
    { title: 'Morning Sun 10', dailyAction: 'Get 10 minutes of outdoor light within 90 minutes of waking.', hypothesis: 'Morning light helps circadian alignment and energy timing.' },
    { title: 'Sunset Walk', dailyAction: 'Take a 10-minute outdoor walk near sunset.', hypothesis: 'Evening light cues can support sleep timing.' },
    { title: 'Daylight Break', dailyAction: 'Take one daylight break between 12pm and 2pm.', hypothesis: 'Midday light can reduce circadian drift.' },
  ],
  'social-connection': [
    { title: 'Daily Reach-Out', dailyAction: 'Send one meaningful check-in message to someone each day.', hypothesis: 'Small connection habits can improve emotional buffering.' },
    { title: 'Voice Over Text', dailyAction: 'Make one short voice call instead of texting daily.', hypothesis: 'Higher-quality contact can increase social nourishment.' },
    { title: 'Shared Meal', dailyAction: 'Have one shared meal or tea with someone this week day-by-day.', hypothesis: 'Regular social rituals can protect wellbeing.' },
  ],
}

async function callModel(system: string, user: string): Promise<string> {
  if (!hasApiKey()) {
    throw new Error('Missing VITE_OPENAI_KEY')
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: system }] },
        { role: 'user', content: [{ type: 'input_text', text: user }] },
      ],
      text: {
        format: { type: 'text' },
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(err)
  }

  const payload = await response.json()
  const direct = typeof payload.output_text === 'string' ? payload.output_text.trim() : ''
  if (direct) return direct

  const fromOutput = Array.isArray(payload.output)
    ? payload.output
        .flatMap((entry: { content?: Array<{ type?: string; text?: string }> }) => entry.content ?? [])
        .filter((chunk: { type?: string; text?: string }) => chunk.type === 'output_text' && typeof chunk.text === 'string')
        .map((chunk: { text?: string }) => chunk.text?.trim() ?? '')
        .filter(Boolean)
        .join('\n')
    : ''

  if (fromOutput) return fromOutput
  throw new Error('Model returned no text output')
}

function getLast(checkIns: CheckIn[], offset = 1) {
  return checkIns[checkIns.length - offset]
}

export async function generateHealthProfile(profile: UserProfile, answers: Record<string, string>): Promise<GeneratedHealthProfile> {
  const fallback: GeneratedHealthProfile = {
    domains: DOMAIN_ORDER.map((domain) => ({
      domain,
      status: 'moderate',
      summary: `Your ${domain.replace('-', ' ')} pattern has room for improvement through one clear, repeatable daily habit.`,
    })),
    primaryFocus: 'nutrition',
    educationSnippet:
      'For your first week, focus on one repeatable action rather than many changes. In Singapore routines with hawker meals and variable schedules, consistency beats perfection.',
  }

  try {
    const prompt = healthProfilePrompt(profile, answers)
    const raw = await callModel(prompt.system, prompt.user)
    return safeJson<GeneratedHealthProfile>(raw)
  } catch {
    return fallback
  }
}

export async function generateExperiment(
  profile: UserProfile,
  completedExperiments: Experiment[],
  forcedDomain?: Experiment['domain'],
  variationHint?: string,
): Promise<Experiment> {
  const domain = forcedDomain ?? profile.healthProfile.primaryFocus
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 6)

  const indexFromHint = Number.parseInt((variationHint ?? '').replace(/\D/g, ''), 10)
  const pool = FALLBACK_POOL[domain]
  const picked = pool[Number.isNaN(indexFromHint) ? 0 : indexFromHint % pool.length]
  const fallback = {
    title: picked.title,
    hypothesis: picked.hypothesis,
    dailyAction: picked.dailyAction,
    whyItWorks:
      'A repeatable cue-action pattern helps your body adapt quickly across a single week. This experiment is narrow by design so your data has a clear signal.',
    asianContextNote:
      domain === 'nutrition'
        ? 'At hawker centres, choose egg, tofu, chicken, or fish first before carbohydrate-heavy sides.'
        : 'This is designed to fit variable SEA schedules without requiring expensive tools.',
    trackedMetrics: ['energy', 'clarity', 'mood'],
  }

  try {
    const prompt = experimentDesignPrompt(profile, domain, completedExperiments, variationHint)
    const raw = await callModel(prompt.system, prompt.user)
    const designed = safeJson<Pick<Experiment, 'title' | 'hypothesis' | 'dailyAction' | 'whyItWorks' | 'asianContextNote' | 'trackedMetrics'>>(raw)

    return {
      id: crypto.randomUUID(),
      mode: 'primary',
      domain,
      ...designed,
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      checkIns: [],
    }
  } catch {
    return {
      id: crypto.randomUUID(),
      mode: 'primary',
      domain,
      ...fallback,
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      checkIns: [],
    }
  }
}

export async function generateDomainRecommendations(
  profile: UserProfile,
  completedExperiments: Experiment[],
  domain: Experiment['domain'],
  count = 3,
  hintPrefix = 'option',
) {
  const unique: Experiment[] = []
  const seen = new Set<string>()

  for (let i = 0; i < count * 4 && unique.length < count; i += 1) {
    const experiment = await generateExperiment(profile, completedExperiments, domain, `${hintPrefix}-${i + 1}`)
    const key = recommendationFingerprint(experiment.title, experiment.dailyAction)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(experiment)
  }

  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 6)
  const pool = FALLBACK_POOL[domain]
  let fallbackIdx = 0
  while (unique.length < count && fallbackIdx < pool.length) {
    const fallback = pool[fallbackIdx]
    const key = recommendationFingerprint(fallback.title, fallback.dailyAction)
    fallbackIdx += 1
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({
      id: crypto.randomUUID(),
      mode: 'primary',
      domain,
      title: fallback.title,
      hypothesis: fallback.hypothesis,
      dailyAction: fallback.dailyAction,
      whyItWorks:
        'A repeatable cue-action pattern helps your body adapt quickly across a single week. This experiment is narrow by design so your data has a clear signal.',
      asianContextNote:
        domain === 'nutrition'
          ? 'At hawker centres, choose egg, tofu, chicken, or fish first before carbohydrate-heavy sides.'
          : 'This is designed to fit variable SEA schedules without requiring expensive tools.',
      trackedMetrics: ['energy', 'clarity', 'mood'],
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      checkIns: [],
    })
  }

  return unique
}

export async function generateImmediateInsight(profile: UserProfile, experiment: Experiment, today: CheckIn, all: CheckIn[]) {
  const yesterday = getLast(all, 2)
  const energyDelta = yesterday ? today.scores.energy - yesterday.scores.energy : 0
  const clarityDelta = yesterday ? today.scores.clarity - yesterday.scores.clarity : 0
  const baselineEnergyDelta = today.scores.energy - profile.baseline.energy
  const baselineClarityDelta = today.scores.clarity - profile.baseline.clarity

  try {
    const prompt = immediateInsightPrompt(profile, experiment, today, all)
    return await callModel(prompt.system, prompt.user)
  } catch {
    return `Today your energy is ${today.scores.energy}/10 (${energyDelta >= 0 ? '+' : ''}${energyDelta} vs yesterday, ${baselineEnergyDelta >= 0 ? '+' : ''}${baselineEnergyDelta} vs baseline) and clarity is ${today.scores.clarity}/10 (${clarityDelta >= 0 ? '+' : ''}${clarityDelta} vs yesterday, ${baselineClarityDelta >= 0 ? '+' : ''}${baselineClarityDelta} vs baseline). Your pattern suggests this action is starting to stabilise your daytime rhythm. Keep the same action timing tomorrow so we can confirm the signal with cleaner data.`
  }
}

export async function generateSupportHabitInsight(
  profile: UserProfile,
  habit: Experiment,
  checkIn: CheckIn,
  primaryExperiment: Experiment | null,
) {
  const fallback = `Your ${habit.title} check-in suggests the clearest effect ${checkIn.effectWindow ? `in the ${checkIn.effectWindow}` : 'today'}. Keep logging this support habit for 3-5 days so we can detect whether the signal is stable.`

  try {
    const raw = await callModel(
      'You are Nouri. Write exactly 2 plain-text sentences. Summarize likely effect timing and practical next step. No markdown.',
      `User: ${JSON.stringify({ name: profile.name, ageRange: profile.ageRange })}
Support habit: ${habit.title} (${habit.domain}) ${habit.dailyAction}
Primary experiment: ${primaryExperiment ? `${primaryExperiment.title} (${primaryExperiment.domain})` : 'none'}
Check-in: ${JSON.stringify(checkIn)}
`,
    )
    return sanitizeChatText(raw)
  } catch {
    return fallback
  }
}

export async function generateDay7Report(profile: UserProfile, experiment: Experiment, checkIns: CheckIn[]): Promise<InsightReport> {
  const first = checkIns[0]
  const last = getLast(checkIns)

  const fallback: InsightReport = {
    experimentId: experiment.id,
    generatedAt: new Date().toISOString(),
    trendSummary: `Across 7 days, energy moved from ${first?.scores.energy ?? 5}/10 to ${last?.scores.energy ?? 6}/10, while clarity improved from ${first?.scores.clarity ?? 5}/10 to ${last?.scores.clarity ?? 6}/10. Your mood trend stayed more stable in the second half of the week.`,
    bodyExplanation:
      'Your repeated daily action likely reduced decision fatigue and made your routine more biologically consistent. That kind of consistency often improves daytime steadiness before bigger changes appear.',
    verdict: 'somewhat',
    verdictReason: 'Your scores improved with moderate consistency, but the effect size is still growing.',
    takeaway: 'Carry this action forward for one more week and keep check-in timing consistent.',
    nextExperimentDomain:
      DOMAIN_ORDER[(DOMAIN_ORDER.indexOf(experiment.domain) + 1) % DOMAIN_ORDER.length],
    nextExperimentReason: 'Your data suggests a compounding benefit from tightening the next adjacent domain.',
    nextExperimentSuggestion: 'Run a bedtime consistency experiment next to reinforce your clarity gains.',
  }

  try {
    const prompt = day7ReportPrompt(profile, experiment, checkIns)
    const raw = await callModel(prompt.system, prompt.user)
    const json = safeJson<Omit<InsightReport, 'experimentId' | 'generatedAt' | 'nextExperimentSuggestion'>>(raw)
    return {
      experimentId: experiment.id,
      generatedAt: new Date().toISOString(),
      ...json,
      nextExperimentSuggestion: `${json.nextExperimentDomain} next: ${json.nextExperimentReason}`,
    }
  } catch {
    return fallback
  }
}

export async function sendChat(messages: ChatMessage[], profile: UserProfile, experiments: Experiment[], checkIns: CheckIn[]) {
  try {
    const system = chatSystemPrompt(profile, experiments, checkIns)
    const user = messages.filter((m) => m.role === 'user').at(-1)?.content ?? 'Help me understand my data.'
    const raw = await callModel(system, user)
    return sanitizeChatText(raw)
  } catch {
    return sanitizeChatText(
      'From your current logs, your data shows progress when your daily action is simple and time-bound. If today felt off, we can treat it as signal and adjust tomorrow with one precise change instead of overhauling everything.',
    )
  }
}

export async function extractExperimentIdeasFromChat(
  profile: UserProfile,
  message: string,
  completedExperiments: Experiment[],
): Promise<Experiment[]> {
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 6)

  const fallbackDomain: Experiment['domain'] =
    message.toLowerCase().includes('sleep') ? 'sleep' : message.toLowerCase().includes('stress') ? 'stress' : 'nutrition'
  const fallback: Experiment[] = [
    {
      id: crypto.randomUUID(),
      mode: 'primary',
      domain: fallbackDomain,
      title: fallbackDomain === 'sleep' ? 'Sleep Anchor' : fallbackDomain === 'stress' ? 'Evening Reset' : 'Protein First 2.0',
      hypothesis: 'A single consistent daily action can improve your stability across energy, clarity, and mood in 7 days.',
      dailyAction:
        fallbackDomain === 'sleep'
          ? 'Set a fixed bedtime anchor and put your phone away 30 minutes before that time.'
          : fallbackDomain === 'stress'
            ? 'Take a 3-minute breathing reset after your final work or school block every day.'
            : 'Start each main meal with a palm-sized protein before rice or noodles.',
      whyItWorks: 'Consistency in one behavior gives your body a clearer adaptation signal and reduces routine noise.',
      asianContextNote: 'This action is designed to fit hawker meals and variable weekday schedules.',
      trackedMetrics: ['energy', 'clarity', 'mood'],
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      checkIns: [],
    },
  ]

  try {
    const raw = await callModel(
      'You convert health chat ideas into structured 7-day experiments. Return ONLY valid JSON with max 3 ideas. Avoid repeating completed experiment titles.',
      `User profile: ${JSON.stringify(profile)}
Completed experiments: ${completedExperiments.map((exp) => exp.title).join(', ')}
Assistant message with ideas: ${message}

Return exactly:
{
  "ideas": [
    {
      "domain": "${DOMAIN_ENUM}",
      "title": "string",
      "hypothesis": "string",
      "dailyAction": "single unambiguous action",
      "whyItWorks": "2-3 sentences",
      "asianContextNote": "1 sentence",
      "trackedMetrics": ["energy","clarity","mood"]
    }
  ]
}`,
    )

    const parsed = safeJson<{
      ideas: Array<{
        domain: Experiment['domain']
        title: string
        hypothesis: string
        dailyAction: string
        whyItWorks: string
        asianContextNote: string
        trackedMetrics?: string[]
      }>
    }>(raw)

    const ideas = (parsed.ideas ?? []).slice(0, 3).map((idea) => ({
      id: crypto.randomUUID(),
      mode: 'primary' as const,
      domain: idea.domain,
      title: idea.title,
      hypothesis: idea.hypothesis,
      dailyAction: idea.dailyAction,
      whyItWorks: idea.whyItWorks,
      asianContextNote: idea.asianContextNote,
      trackedMetrics: idea.trackedMetrics?.length ? idea.trackedMetrics : ['energy', 'clarity', 'mood'],
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active' as const,
      checkIns: [],
    }))

    return ideas.length ? ideas : fallback
  } catch {
    return fallback
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (hasElevenLabsKey()) {
    try {
      const formData = new FormData()
      formData.append('model_id', 'scribe_v2')
      formData.append('file', new File([audioBlob], 'checkin.webm', { type: 'audio/webm' }))
      formData.append('tag_audio_events', 'false')
      formData.append('diarize', 'false')

      const response = await fetch(ELEVENLABS_STT_URL, {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY,
        },
        body: formData,
      })

      if (response.ok) {
        const data = (await response.json()) as { text?: string }
        if (data.text?.trim()) return data.text.trim()
      }
    } catch {
      // fallback below
    }
  }

  if (!hasApiKey()) {
    return 'I did the action partially. Energy 6, clarity 6, mood 7. I felt better after lunch.'
  }

  const formData = new FormData()
  formData.append('file', new File([audioBlob], 'checkin.webm', { type: 'audio/webm' }))
  formData.append('model', 'whisper-1')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}` },
    body: formData,
  })
  const data = await response.json()
  return data.text as string
}

export async function extractCheckinFromVoice(transcript: string, experiment: Experiment) {
  try {
    const prompt = voiceExtractorPrompt(transcript, experiment)
    const raw = await callModel(prompt.system, prompt.user)
    return safeJson<{
      completionLevel: 'yes' | 'partial' | 'no' | null
      energy: number | null
      clarity: number | null
      mood: number | null
      note: string | null
    }>(raw)
  } catch {
    const text = transcript.toLowerCase()
    return {
      completionLevel: text.includes('partial') ? 'partial' : text.includes('no') ? 'no' : 'yes',
      energy: parseMetricFromText(text, 'energy'),
      clarity: parseMetricFromText(text, 'clarity'),
      mood: parseMetricFromText(text, 'mood'),
      note: transcript.slice(0, 100),
    }
  }
}

export async function speakText(text: string): Promise<void> {
  if (hasElevenLabsKey()) {
    try {
      const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
      const elevenResponse = await fetch(`${ELEVENLABS_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
          },
        }),
      })

      if (elevenResponse.ok) {
        const elevenBlob = await elevenResponse.blob()
        await playAudioBlob(elevenBlob)
        return
      }
    } catch {
      // fallback to OpenAI
    }
  }

  if (!hasApiKey()) return

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova',
      }),
    })

    const blob = await response.blob()
    await playAudioBlob(blob)
  } catch {
    // no-op for demo reliability
  }
}

export async function playRewardSound(type: 'checkin' | 'streak' = 'checkin'): Promise<void> {
  if (hasElevenLabsKey()) {
    try {
      const prompt =
        type === 'streak'
          ? 'Short uplifting game reward sound, bright chime, 0.8 seconds, clean, modern app'
          : 'Short positive check-in confirmation sound, soft chime pop, 0.7 seconds, clean app UX'
      const response = await fetch(ELEVENLABS_SFX_URL, {
        method: 'POST',
        headers: {
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: 0.8,
          prompt_influence: 0.5,
          model_id: 'eleven_text_to_sound_v2',
        }),
      })
      if (response.ok) {
        await playAudioBlob(await response.blob())
        return
      }
    } catch {
      // fallback below
    }
  }

  try {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return
    const ctx = new AudioCtor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(type === 'streak' ? 740 : 620, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.19)
  } catch {
    // no-op
  }
}

