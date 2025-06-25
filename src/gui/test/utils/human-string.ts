import { describe, it, expect } from 'vitest'
import { toHumanString } from '@/utils/human-string.ts'
import type { ToHumanStringOptions } from '@/utils/human-string.ts'

describe('toHumanString function', () => {
  describe('default count behavior', () => {
    it('should default count to 1 and return value when no one is provided', () => {
      expect(toHumanString({ value: 'items' })).toBe('items')
    })

    it('should default count to 1 and return one when provided', () => {
      expect(toHumanString({ value: 'books', one: 'book' })).toBe(
        'book',
      )
    })

    it('should default count to 1 and return one even when zero is provided', () => {
      expect(
        toHumanString({
          value: 'tasks',
          one: 'task',
          zero: 'no tasks',
        }),
      ).toBe('task')
    })
  })

  describe('count = 0 scenarios', () => {
    it('should return zero string when count is 0 and zero is provided', () => {
      expect(
        toHumanString({ count: 0, value: 'items', zero: 'no items' }),
      ).toBe('no items')
    })

    it('should return value when count is 0 and zero is not provided', () => {
      expect(toHumanString({ count: 0, value: 'items' })).toBe(
        'items',
      )
    })

    it('should return zero string when count is 0, ignoring one option', () => {
      expect(
        toHumanString({
          count: 0,
          value: 'tasks',
          zero: 'no tasks',
          one: 'task',
        }),
      ).toBe('no tasks')
    })

    it('should return empty zero string when count is 0 and zero is empty string', () => {
      expect(
        toHumanString({ count: 0, value: 'books', zero: '' }),
      ).toBe('')
    })
  })

  describe('count = 1 scenarios', () => {
    it('should return value when count is 1 and no one is provided', () => {
      expect(toHumanString({ count: 1, value: 'items' })).toBe(
        'items',
      )
    })

    it('should return one when count is 1 and one is provided', () => {
      expect(
        toHumanString({ count: 1, value: 'books', one: 'book' }),
      ).toBe('book')
    })

    it('should return one when count is 1, ignoring zero option', () => {
      expect(
        toHumanString({
          count: 1,
          value: 'tasks',
          one: 'task',
          zero: 'no tasks',
        }),
      ).toBe('task')
    })

    it('should return one when count is 1, with all options provided', () => {
      expect(
        toHumanString({
          count: 1,
          value: 'files',
          zero: 'no files',
          one: 'file',
        }),
      ).toBe('file')
    })
  })

  describe('count > 1 scenarios', () => {
    it('should return value (plural) when count is 2', () => {
      expect(
        toHumanString({ count: 2, value: 'items', one: 'item' }),
      ).toBe('items')
    })

    it('should return value (plural) when count is 5', () => {
      expect(
        toHumanString({ count: 5, value: 'books', one: 'book' }),
      ).toBe('books')
    })

    it('should return value when count > 1 and no one is provided', () => {
      expect(toHumanString({ count: 10, value: 'tasks' })).toBe(
        'tasks',
      )
    })

    it('should return value when count > 1, ignoring zero and one options', () => {
      expect(
        toHumanString({
          count: 3,
          value: 'files',
          zero: 'no files',
          one: 'file',
        }),
      ).toBe('files')
    })

    it('should work with large count values', () => {
      expect(
        toHumanString({
          count: 100,
          value: 'documents',
          one: 'document',
        }),
      ).toBe('documents')
    })
  })

  describe('edge cases', () => {
    it('should treat negative count as > 1 and return value (plural)', () => {
      expect(
        toHumanString({ count: -1, value: 'items', one: 'item' }),
      ).toBe('items')
    })

    it('should treat negative count as > 1 and return value if one not provided', () => {
      expect(toHumanString({ count: -1, value: 'items' })).toBe(
        'items',
      )
    })

    it('should treat decimal count > 1 as plural', () => {
      expect(
        toHumanString({ count: 1.5, value: 'items', one: 'item' }),
      ).toBe('items')
    })

    it('should treat decimal count between 0 and 1 as plural', () => {
      expect(
        toHumanString({ count: 0.5, value: 'items', one: 'item' }),
      ).toBe('items')
    })

    it('should treat 0.0 as zero', () => {
      expect(
        toHumanString({
          count: 0.0,
          value: 'items',
          zero: 'no items',
        }),
      ).toBe('no items')
    })
  })

  describe('string variations', () => {
    it('should handle irregular plurals with zero', () => {
      expect(
        toHumanString({
          count: 0,
          value: 'children',
          zero: 'no children',
          one: 'child',
        }),
      ).toBe('no children')
    })

    it('should handle irregular plurals with plural form', () => {
      expect(
        toHumanString({
          count: 2,
          value: 'children',
          zero: 'no children',
          one: 'child',
        }),
      ).toBe('children')
    })

    it('should handle irregular plurals with singular', () => {
      expect(
        toHumanString({
          count: 1,
          value: 'children',
          zero: 'no children',
          one: 'child',
        }),
      ).toBe('child')
    })

    it('should handle empty zero string', () => {
      expect(
        toHumanString({
          count: 0,
          value: 'people',
          zero: '',
          one: 'person',
        }),
      ).toBe('')
    })

    it('should handle empty value string for plural', () => {
      expect(
        toHumanString({
          count: 2,
          value: '',
          zero: 'nobody',
          one: 'person',
        }),
      ).toBe('')
    })
  })

  describe('type safety', () => {
    it('should handle all option variations correctly', () => {
      // These should compile without errors
      const options1: ToHumanStringOptions = { value: 'tests' }
      const options2: ToHumanStringOptions = {
        count: 5,
        value: 'tests',
        one: 'test',
      }
      const options3: ToHumanStringOptions = {
        count: 0,
        value: 'tests',
        zero: 'no tests',
      }
      const options4: ToHumanStringOptions = {
        count: 1,
        value: 'tests',
        zero: 'none',
        one: 'test',
      }

      expect(typeof toHumanString(options1)).toBe('string')
      expect(typeof toHumanString(options2)).toBe('string')
      expect(typeof toHumanString(options3)).toBe('string')
      expect(typeof toHumanString(options4)).toBe('string')
    })
  })

  describe('real-world usage examples', () => {
    it('should handle error count display', () => {
      expect(
        toHumanString({
          count: 0,
          value: 'errors',
          zero: 'no errors',
          one: 'error',
        }),
      ).toBe('no errors')
    })

    it('should handle warning count display', () => {
      expect(
        toHumanString({
          count: 1,
          value: 'warnings',
          zero: 'no warnings',
          one: 'warning',
        }),
      ).toBe('warning')
    })

    it('should handle test count display', () => {
      expect(
        toHumanString({
          count: 3,
          value: 'tests',
          zero: 'no tests',
          one: 'test',
        }),
      ).toBe('tests')
    })

    it('should handle UI selection states', () => {
      expect(
        toHumanString({
          count: 1,
          value: 'files selected',
          one: 'file selected',
        }),
      ).toBe('file selected')
    })

    it('should handle multiple UI selection states', () => {
      expect(
        toHumanString({
          count: 5,
          value: 'files selected',
          one: 'file selected',
        }),
      ).toBe('files selected')
    })

    it('should handle shopping cart states', () => {
      expect(
        toHumanString({
          count: 0,
          value: 'items in cart',
          zero: 'cart is empty',
          one: 'item in cart',
        }),
      ).toBe('cart is empty')
    })
  })
})
