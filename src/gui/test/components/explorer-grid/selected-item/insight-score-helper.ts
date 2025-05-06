import {
  getScoreColor,
  scoreColors,
} from '@/components/explorer-grid/selected-item/insight-score-helper.ts'
import { describe, it, expect } from 'vitest'

describe('insight-score-helper', () => {
  describe('getScoreColor', () => {
    it('returns success for scores >= 80', () => {
      expect(getScoreColor(80)).toBe('success')
      expect(getScoreColor(90)).toBe('success')
      expect(getScoreColor(100)).toBe('success')
    })

    it('returns default for scores >= 60 and < 80', () => {
      expect(getScoreColor(60)).toBe('default')
      expect(getScoreColor(70)).toBe('default')
      expect(getScoreColor(79)).toBe('default')
    })

    it('returns warning for scores >= 40 and < 60', () => {
      expect(getScoreColor(40)).toBe('warning')
      expect(getScoreColor(50)).toBe('warning')
      expect(getScoreColor(59)).toBe('warning')
    })

    it('returns error for scores >= 20 and < 40', () => {
      expect(getScoreColor(20)).toBe('error')
      expect(getScoreColor(30)).toBe('error')
      expect(getScoreColor(39)).toBe('error')
    })

    it('returns neutral for scores < 20', () => {
      expect(getScoreColor(0)).toBe('neutral')
      expect(getScoreColor(10)).toBe('neutral')
      expect(getScoreColor(19)).toBe('neutral')
    })
  })

  describe('scoreColors', () => {
    it('contains all required color variants', () => {
      expect(scoreColors).toHaveProperty('default')
      expect(scoreColors).toHaveProperty('neutral')
      expect(scoreColors).toHaveProperty('warning')
      expect(scoreColors).toHaveProperty('error')
      expect(scoreColors).toHaveProperty('success')
    })

    it('has valid OKLCH color values', () => {
      Object.values(scoreColors).forEach(color => {
        expect(color).toMatch(
          /^oklch\(\d+\.\d+% \d+\.\d+ \d+\.\d+\)$/,
        )
      })
    })
  })
})
