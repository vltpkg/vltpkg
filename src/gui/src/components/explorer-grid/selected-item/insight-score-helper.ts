type Variant = 'default' | 'neutral' | 'warning' | 'error' | 'success'

export const getScoreColor = (score: number): Variant => {
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
