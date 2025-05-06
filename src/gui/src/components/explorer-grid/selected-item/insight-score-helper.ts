import type { ProgressCircleVariant } from '@/components/ui/progress-circle.tsx'

type ScoreVariant = Exclude<ProgressCircleVariant, undefined>

type Color =
  /** neutral - blue */
  | 'oklch(55.1% 0.027 264.364)'
  /** default - gray */
  | 'oklch(62.3% 0.214 259.815)'
  /** warning - amber */
  | 'oklch(76.9% 0.188 70.08)'
  /** error - red */
  | 'oklch(63.7% 0.237 25.331)'
  /** success - emerald */
  | 'oklch(69.6% 0.17 162.48)'

export const getScoreColor = (score: number): ScoreVariant => {
  if (score >= 80) {
    return 'success'
  } else if (score >= 60) {
    return 'default'
  } else if (score >= 40) {
    return 'warning'
  } else if (score >= 20) {
    return 'error'
  } else {
    return 'neutral'
  }
}

export const scoreColors: Record<ScoreVariant, Color> = {
  default: 'oklch(62.3% 0.214 259.815)',
  neutral: 'oklch(55.1% 0.027 264.364)',
  warning: 'oklch(76.9% 0.188 70.08)',
  error: 'oklch(63.7% 0.237 25.331)',
  success: 'oklch(69.6% 0.17 162.48)',
}
