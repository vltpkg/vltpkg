export type ArrayArg = unknown[]
export type ObjectArg = Record<PropertyKey, unknown>
export type Arg = ArrayArg | ObjectArg

const DISALLOWED_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
])

const DIGITS = new Set('0123456789')

const ARRAY_PUSH = Symbol('ARRAY_PUSH')

export const Characters = {
  Escape: '\\',
  Dot: '.',
  Empty: '',
  LeftBracket: '[',
  RightBracket: ']',
} as const

export type Character =
  | (typeof Characters)[keyof typeof Characters]
  | (string & {})

export const Parts = {
  Start: 'start',
  Index: 'index',
  IndexEnd: 'indexEnd',
  Property: 'property',
} as const

export type Part = (typeof Parts)[keyof typeof Parts]

const checkInvalidCharacter = (
  part: Part | Character,
  current: Part | Character,
  msg?: string,
) => {
  if (current === part) {
    if (msg === undefined) {
      switch (current) {
        case Parts.Index:
          msg = 'character in an index'
          break
        case Parts.IndexEnd:
          msg = 'character after an index'
          break
        /* c8 ignore next 3 */
        default:
          msg = ''
          break
      }
    }
    throw new Error(`Invalid ${msg}`.trim())
  }
}

const getPathSegments = (path: string, allowEmptyIndex = false) => {
  const segments = []

  let currentSegment: Character = Characters.Empty
  let currentPart: Part = Parts.Start
  let isIgnoring = false

  for (const character of path.split('') as Character[]) {
    switch (character) {
      case Characters.Escape: {
        checkInvalidCharacter(Parts.Index, currentPart)
        checkInvalidCharacter(Parts.IndexEnd, currentPart)

        if (isIgnoring) currentSegment += character

        currentPart = Parts.Property
        isIgnoring = !isIgnoring
        break
      }

      case Characters.Dot: {
        checkInvalidCharacter(Parts.Index, currentPart)

        if (currentPart === Parts.IndexEnd) {
          currentPart = Parts.Property
          break
        }

        if (isIgnoring) {
          isIgnoring = false
          currentSegment += character
          break
        }

        if (DISALLOWED_KEYS.has(currentSegment)) return []

        segments.push(currentSegment)
        currentSegment = Characters.Empty
        currentPart = Parts.Property
        break
      }

      case Characters.LeftBracket: {
        checkInvalidCharacter(Parts.Index, currentPart)

        if (currentPart === Parts.IndexEnd) {
          currentPart = Parts.Index
          break
        }

        if (isIgnoring) {
          isIgnoring = false
          currentSegment += character
          break
        }

        if (currentPart === Parts.Property) {
          if (DISALLOWED_KEYS.has(currentSegment)) return []

          segments.push(currentSegment)
          currentSegment = Characters.Empty
        }

        currentPart = Parts.Index
        break
      }

      case Characters.RightBracket: {
        if (currentPart === Parts.Index) {
          if (allowEmptyIndex)
            checkInvalidCharacter(
              Characters.Empty,
              currentSegment,
              'empty index',
            )
          segments.push(
            currentSegment === Characters.Empty ?
              ARRAY_PUSH
            : Number.parseInt(currentSegment, 10),
          )
          currentPart = Parts.IndexEnd
          currentSegment = Characters.Empty
          break
        }

        // Falls through
      }

      default: {
        if (!DIGITS.has(character))
          checkInvalidCharacter(Parts.Index, currentPart)
        checkInvalidCharacter(Parts.IndexEnd, currentPart)

        if (currentPart === Parts.Start) currentPart = Parts.Property

        if (isIgnoring) {
          isIgnoring = false
          currentSegment += Characters.Escape
        }

        currentSegment += character
      }
    }
  }

  if (isIgnoring) currentSegment += Characters.Escape

  checkInvalidCharacter(
    Parts.Index,
    currentPart,
    'index was not closed',
  )

  if (currentPart === Parts.Property) {
    if (DISALLOWED_KEYS.has(currentSegment)) return []
    segments.push(currentSegment)
  } else if (currentPart === Parts.Start) {
    segments.push(Characters.Empty)
  }

  return segments
}

const isObject = (value: unknown): value is ObjectArg =>
  value !== null && typeof value === 'object'

const isLast = (arr: ArrayArg, i: number) => i === arr.length - 1

const isStringIndex = (
  object: unknown,
  key: PropertyKey,
): key is string => {
  if (
    typeof key !== 'symbol' &&
    typeof key !== 'number' &&
    Array.isArray(object)
  ) {
    const index = Number.parseInt(key, 10)
    return (
      Number.isInteger(index) &&
      object[index] === object[key as unknown as number]
    )
  }
  return false
}

const assertNotStringIndex = (object: unknown, key: PropertyKey) => {
  if (isStringIndex(object, key)) {
    throw new Error('Cannot use string index')
  }
}

export const get = (
  ogObject: Arg,
  path: string,
  defaultValue?: unknown,
): unknown => {
  let object: unknown = ogObject

  const pathArray = getPathSegments(path, true)
  if (!pathArray.length) {
    return defaultValue
  }

  for (const [index, key] of pathArray.entries()) {
    if (isStringIndex(object, key)) {
      object = isLast(pathArray, index) ? undefined : null
    } else {
      object = (object as ObjectArg)[key]
    }

    if (
      (object === undefined || object === null) &&
      !isLast(pathArray, index)
    ) {
      // `object` is either `undefined` or `null` so we want to stop the loop,
      // and if this is not the last bit of the path, and if it didn't return
      // `undefined` it would return `null` if `object` is `null` but we want
      // `get({foo: null}, 'foo.bar')` to equal `undefined`, or the supplied
      // value, not `null`
      return defaultValue
    }
  }

  return object === undefined ? defaultValue : object
}

export const set = <T extends Arg>(
  object: T,
  path: string,
  value: unknown,
): T => {
  const root = object
  const pathArray = getPathSegments(path)

  for (const [index, key] of pathArray.entries()) {
    assertNotStringIndex(object, key)

    if (isLast(pathArray, index)) {
      if (key === ARRAY_PUSH) {
        ;(object as ArrayArg).push(value)
      } else {
        ;(object as ObjectArg)[key as number] = value
      }
    } else if (!isObject((object as ObjectArg)[key])) {
      const next = pathArray[index + 1]
      ;(object as ObjectArg)[key as number] =
        typeof next === 'number' || next === ARRAY_PUSH ? [] : {}
    }

    object = (object as ObjectArg)[key as number] as T
  }

  return root
}

export const del = (object: Arg, path: string): boolean => {
  const pathArray = getPathSegments(path)

  for (const [index, key] of pathArray.entries()) {
    assertNotStringIndex(object, key)

    if (isLast(pathArray, index)) {
      if (Array.isArray(object)) {
        object.splice(key as number, 1)
      } else {
        delete object[key as number]
      }
      return true
    }

    object = object[key as number] as Arg

    if (!isObject(object)) {
      return false
    }
  }

  return false
}

export const has = (object: Arg, path: string): boolean => {
  const pathArray = getPathSegments(path)

  if (!pathArray.length) {
    return false
  }

  for (const key of pathArray) {
    if (
      !isObject(object) ||
      !(key in object) ||
      isStringIndex(object, key)
    ) {
      return false
    }

    object = object[key] as Arg
  }

  return true
}
