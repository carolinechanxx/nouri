import type { Domain, Experiment } from '../types'

export const DOMAIN_META: Record<Domain, { label: string; color: string }> = {
  nutrition: { label: 'Nutrition', color: '#F0C68D' },
  sleep: { label: 'Sleep', color: '#B8C7F3' },
  stress: { label: 'Stress', color: '#EAA6A6' },
  exercise: { label: 'Exercise', color: '#9DD8B6' },
  recovery: { label: 'Recovery', color: '#B8E3E5' },
  'mental-wellbeing': { label: 'Mental', color: '#CDB7E9' },
  'digital-hygiene': { label: 'Digital', color: '#F3D2A5' },
  hydration: { label: 'Hydration', color: '#A9D9F5' },
  'sunlight-circadian': { label: 'Sunlight', color: '#F3E19F' },
  'social-connection': { label: 'Social', color: '#F0B8D4' },
}

export const DOMAIN_ORDER: Domain[] = [
  'nutrition',
  'sleep',
  'stress',
  'exercise',
  'recovery',
  'mental-wellbeing',
  'digital-hygiene',
  'hydration',
  'sunlight-circadian',
  'social-connection',
]

export const DOMAIN_ENUM = DOMAIN_ORDER.join('|')

export const labelForDomain = (domain: Domain) => DOMAIN_META[domain].label

export const isDomain = (value: string): value is Domain => DOMAIN_ORDER.includes(value as Domain)

export const groupByDomain = <T extends { domain: Domain }>(items: T[]) =>
  DOMAIN_ORDER.reduce(
    (acc, domain) => {
      acc[domain] = items.filter((item) => item.domain === domain)
      return acc
    },
    {} as Record<Domain, T[]>,
  )

export const countByDomain = (items: Experiment[]) => {
  const grouped = groupByDomain(items)
  return DOMAIN_ORDER.reduce(
    (acc, domain) => {
      acc[domain] = grouped[domain].length
      return acc
    },
    {} as Record<Domain, number>,
  )
}
