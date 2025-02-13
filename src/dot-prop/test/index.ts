import t from 'tap'
import {
  get as getProperty,
  set as setProperty,
  del as deleteProperty,
  has as hasProperty,
} from '../src/index.ts'

t.test('getProperty', async t => {
  const fixture1: any = { foo: { bar: 1 } }
  fixture1[''] = 'foo'
  t.equal(getProperty(fixture1, ''), 'foo')
  t.equal(getProperty(fixture1, 'foo'), fixture1.foo)
  t.equal(getProperty({ foo: 1 }, 'foo'), 1)
  t.equal(getProperty({ foo: null }, 'foo'), null)
  t.equal(getProperty({ foo: undefined }, 'foo'), undefined)
  t.equal(getProperty({ foo: { bar: true } }, 'foo.bar'), true)
  t.equal(
    getProperty({ foo: { bar: { baz: true } } }, 'foo.bar.baz'),
    true,
  )
  t.equal(
    getProperty({ foo: { bar: { baz: null } } }, 'foo.bar.baz'),
    null,
  )
  t.equal(getProperty({ foo: { bar: 'a' } }, 'foo.fake'), undefined)
  t.equal(
    getProperty({ foo: { bar: 'a' } }, 'foo.fake.fake2'),
    undefined,
  )
  t.equal(
    getProperty(
      { foo: { bar: 'a' } },
      'foo.fake.fake2',
      'some value',
    ),
    'some value',
  )
  t.equal(
    getProperty({ foo: {} }, 'foo.fake', 'some value'),
    'some value',
  )
  t.equal(getProperty({ '\\': true }, '\\'), true)
  t.equal(getProperty({ '\\foo': true }, '\\foo'), true)
  t.equal(getProperty({ '\\foo': true }, '\\\\foo'), true)
  t.equal(getProperty({ 'foo\\': true }, 'foo\\\\'), true)
  t.equal(getProperty({ 'bar\\': true }, 'bar\\'), true)
  t.equal(getProperty({ 'foo\\bar': true }, 'foo\\bar'), true)
  t.equal(getProperty({ '\\': { foo: true } }, '\\\\.foo'), true)
  t.equal(getProperty({ 'bar\\.': true }, 'bar\\\\\\.'), true)
  t.equal(
    getProperty(
      {
        'foo\\': {
          bar: true,
        },
      },
      'foo\\\\.bar',
    ),
    true,
  )
  t.equal(getProperty({ foo: 1 }, 'foo.bar'), undefined)
  t.equal(getProperty({ 'foo\\': true }, 'foo\\'), true)

  const fixture2 = {}
  Object.defineProperty(fixture2, 'foo', {
    value: 'bar',
    enumerable: false,
  })
  t.equal(getProperty(fixture2, 'foo'), 'bar')
  t.equal(
    getProperty({}, 'hasOwnProperty'),
    Object.prototype.hasOwnProperty,
  )

  const f3 = { foo: null }
  t.equal(getProperty(f3, 'foo.bar'), undefined)
  t.equal(getProperty(f3, 'foo.bar', 'some value'), 'some value')

  t.equal(
    getProperty({ 'foo.baz': { bar: true } }, 'foo\\.baz.bar'),
    true,
  )
  t.equal(
    getProperty({ 'fo.ob.az': { bar: true } }, 'fo\\.ob\\.az.bar'),
    true,
  )

  t.equal(getProperty([], 'foo.bar', false), false)

  t.equal(getProperty({ '': { '': { '': true } } }, '..'), true)
  t.equal(getProperty({ '': { '': true } }, '.'), true)
})

t.test('getProperty - with array indexes', async t => {
  t.equal(getProperty([true, false, false], '[0]'), true)
  t.equal(
    getProperty([[false, true, false], false, false], '[0][1]'),
    true,
  )
  t.equal(getProperty([{ foo: [true] }], '[0].foo[0]'), true)
  t.equal(
    getProperty({ foo: [0, { bar: true }] }, 'foo[1].bar'),
    true,
  )

  t.equal(getProperty(['a', 'b', 'c'], '3', false), false)
  t.equal(getProperty([{ foo: [1] }], '[0].bar[0]', false), false)
  t.equal(getProperty([{ foo: [1] }], '[0].foo[1]', false), false)
  t.equal(
    getProperty({ foo: [0, { bar: 2 }] }, 'foo[0].bar', false),
    false,
  )
  t.equal(
    getProperty({ foo: [0, { bar: 2 }] }, 'foo[2].bar', false),
    false,
  )
  t.equal(
    getProperty({ foo: [0, { bar: 2 }] }, 'foo[1].biz', false),
    false,
  )
  t.equal(
    getProperty({ foo: [0, { bar: 2 }] }, 'bar[0].bar', false),
    false,
  )
  t.equal(
    getProperty(
      {
        bar: {
          '[0]': true,
        },
      },
      'bar.\\[0]',
    ),
    true,
  )
  t.equal(
    getProperty(
      {
        bar: {
          '': [true],
        },
      },
      'bar.[0]',
    ),
    true,
  )
  t.throws(
    () =>
      getProperty(
        {
          'foo[5[': true,
        },
        'foo[5[',
      ),
    {
      message: 'Invalid character in an index',
    },
  )
  t.throws(
    () =>
      getProperty(
        {
          'foo[5': {
            bar: true,
          },
        },
        'foo[5.bar',
      ),
    {
      message: 'Invalid character in an index',
    },
  )
  t.equal(
    getProperty(
      {
        'foo[5]': {
          bar: true,
        },
      },
      'foo\\[5].bar',
    ),
    true,
  )
  t.throws(
    () =>
      getProperty(
        {
          'foo[5\\]': {
            bar: true,
          },
        },
        'foo[5\\].bar',
      ),
    {
      message: 'Invalid character in an index',
    },
  )
  t.throws(
    () =>
      getProperty(
        {
          'foo[5': true,
        },
        'foo[5',
      ),
    {
      message: 'Invalid index was not closed',
    },
  )
  t.throws(
    () =>
      getProperty(
        {
          'foo[bar]': true,
        },
        'foo[bar]',
      ),
    {
      message: 'Invalid character in an index',
    },
  )
  t.equal(getProperty({}, 'constructor[0]', false), false)
  t.throws(() => getProperty({}, 'foo[constructor]', false), {
    message: 'Invalid character in an index',
  })

  t.equal(getProperty([], 'foo[0].bar', false), false)
  t.equal(getProperty({ foo: [{ bar: true }] }, 'foo[0].bar'), true)
  t.equal(getProperty({ foo: ['bar'] }, 'foo[1]', false), false)

  t.equal(getProperty([true], '0.1'), undefined)
  t.equal(getProperty([true], '0', 'DEFAULT'), 'DEFAULT')
  t.equal(getProperty([true], '[0]', 'DEFAULT'), true)

  t.equal(getProperty({ foo: [true] }, 'foo.0.a'), undefined)
  t.equal(getProperty({ foo: [true] }, 'foo.0', 'DEFAULT'), 'DEFAULT')
  t.equal(getProperty({ foo: [true] }, 'foo[0]', 'DEFAULT'), true)
  t.equal(
    getProperty(
      {
        foo: {
          0: true,
        },
      },
      'foo.0',
    ),
    true,
  )

  t.equal(
    getProperty(
      [
        {
          '[1]': true,
        },
        false,
        false,
      ],
      '[0].\\[1]',
    ),
    true,
  )

  t.equal(getProperty({ foo: { '[0]': true } }, 'foo.\\[0]'), true)
  t.throws(() => getProperty({ foo: { '[0]': true } }, 'foo.[0\\]'), {
    message: 'Invalid character in an index',
  })
  t.equal(getProperty({ foo: { '\\': [true] } }, 'foo.\\\\[0]'), true)
  t.throws(() => getProperty({ foo: { '[0]': true } }, 'foo.[0\\]'), {
    message: 'Invalid character in an index',
  })

  t.throws(
    () => getProperty({ 'foo[0': { '9]': true } }, 'foo[0.9]'),
    {
      message: 'Invalid character in an index',
    },
  )
  t.throws(() => getProperty({ 'foo[-1]': true }, 'foo[-1]'), {
    message: 'Invalid character in an index',
  })
  t.throws(() => getProperty({ foo: [1] }, 'foo[]'), {
    message: 'Invalid empty index',
  })
  t.throws(() => getProperty({ foo: [1] }, 'foo[0]x'), {
    message: 'Invalid character after an index',
  })
  t.throws(() => getProperty({ foo: [1] }, 'foo[0]\\'), {
    message: 'Invalid character after an index',
  })
})

t.test('setProperty', async t => {
  let fixture1: any = {}

  const o1 = setProperty(fixture1, 'foo', 2)
  t.equal(fixture1.foo, 2)
  t.equal(o1, fixture1)

  fixture1 = { foo: { bar: 1 } }
  setProperty(fixture1, 'foo.bar', 2)
  t.equal(fixture1.foo.bar, 2)

  setProperty(fixture1, 'foo.bar.baz', 3)
  t.equal(fixture1.foo.bar.baz, 3)

  setProperty(fixture1, 'foo.bar', 'test')
  t.equal(fixture1.foo.bar, 'test')

  setProperty(fixture1, 'foo.bar', null)
  t.equal(fixture1.foo.bar, null)

  setProperty(fixture1, 'foo.bar', false)
  t.equal(fixture1.foo.bar, false)

  setProperty(fixture1, 'foo.bar', undefined)
  t.equal(fixture1.foo.bar, undefined)

  setProperty(fixture1, 'foo.fake.fake2', 'fake')
  t.equal(fixture1.foo.fake.fake2, 'fake')

  setProperty(fixture1, 'fn.bar.baz', 2)
  t.equal(fixture1.fn.bar.baz, 2)

  const fixture2: any = { foo: null }
  setProperty(fixture2, 'foo.bar', 2)
  t.equal(fixture2.foo.bar, 2)

  const fixture3: any = {}
  setProperty(fixture3, '', 3)
  t.equal(fixture3[''], 3)

  setProperty(fixture1, 'foo\\.bar.baz', true)
  t.equal(fixture1['foo.bar'].baz, true)

  setProperty(fixture1, 'fo\\.ob\\.ar.baz', true)
  t.equal(fixture1['fo.ob.ar'].baz, true)

  const fixture5: any = []
  setProperty(fixture5, '[1]', true)
  t.equal(fixture5[1], true)

  setProperty(fixture5, '[0].foo[0]', true)
  t.equal(fixture5[0].foo[0], true)

  t.throws(() => setProperty(fixture5, '1', true), {
    message: 'Cannot use string index',
  })

  t.throws(() => setProperty(fixture5, '0.foo.0', true), {
    message: 'Cannot use string index',
  })

  const fixture6: any = {}

  setProperty(fixture6, 'foo[0].bar', true)
  t.equal(fixture6.foo[0].bar, true)
  t.strictSame(fixture6, {
    foo: [
      {
        bar: true,
      },
    ],
  })

  const fixture7 = { foo: ['bar', 'baz'] }
  setProperty(fixture7, 'foo.length', 1)
  t.equal(fixture7.foo.length, 1)
  t.strictSame(fixture7, { foo: ['bar'] })

  const fixture8 = { foo: ['bar', 'baz'] }
  setProperty(fixture8, 'foo[]', 'last')
  t.equal(fixture8.foo.length, 3)
  t.strictSame(fixture8, { foo: ['bar', 'baz', 'last'] })
})

t.test('deleteProperty', async t => {
  const inner = {
    a: 'a',
    b: 'b',
    c: 'c',
  }
  const fixture1: any = {
    foo: {
      bar: {
        baz: inner,
      },
    },
    top: {
      dog: 'sindre',
    },
  }

  t.equal(fixture1.foo.bar.baz.c, 'c')
  t.equal(deleteProperty(fixture1, 'foo.bar.baz.c'), true)
  t.equal(fixture1.foo.bar.baz.c, undefined)

  t.equal(fixture1.top.dog, 'sindre')
  t.equal(deleteProperty(fixture1, 'top'), true)
  t.equal(fixture1.top, undefined)

  setProperty(fixture1, 'foo\\.bar.baz', true)
  t.equal(fixture1['foo.bar'].baz, true)
  t.equal(deleteProperty(fixture1, 'foo\\.bar.baz'), true)
  t.equal(fixture1['foo.bar'].baz, undefined)

  const fixture2: any = {}
  setProperty(fixture2, 'foo.bar\\.baz', true)
  t.equal(fixture2.foo['bar.baz'], true)
  t.equal(deleteProperty(fixture2, 'foo.bar\\.baz'), true)
  t.equal(fixture2.foo['bar.baz'], undefined)

  fixture2.dotted = {
    sub: {
      'dotted.prop': 'foo',
      other: 'prop',
    },
  }
  t.equal(deleteProperty(fixture2, 'dotted.sub.dotted\\.prop'), true)
  t.equal(fixture2.dotted.sub['dotted.prop'], undefined)
  t.equal(fixture2.dotted.sub.other, 'prop')

  const fixture3 = { foo: null }
  t.equal(deleteProperty(fixture3, 'foo.bar'), false)
  t.strictSame(fixture3, { foo: null })

  const fixture4 = [
    {
      top: {
        dog: 'sindre',
      },
    },
  ]

  t.throws(() => deleteProperty(fixture4, '0.top.dog'), {
    message: 'Cannot use string index',
  })
  t.equal(deleteProperty(fixture4, '[0].top.dog'), true)
  t.strictSame(fixture4, [{ top: {} }])

  const fixture5 = {
    foo: [
      {
        bar: ['foo', 'bar'],
      },
    ],
  }

  deleteProperty(fixture5, 'foo[0].bar[0]')

  t.strictSame(fixture5, {
    foo: [
      {
        bar: ['bar'],
      },
    ],
  })

  t.equal(deleteProperty({}, 'constructor'), false)
})

t.test('hasProperty', async t => {
  const fixture1 = { foo: { bar: 1 } }
  t.equal(hasProperty(fixture1, 'foo'), true)
  t.equal(hasProperty({ foo: 1 }, 'foo'), true)
  t.equal(hasProperty({ foo: null }, 'foo'), true)
  t.equal(hasProperty({ foo: undefined }, 'foo'), true)
  t.equal(hasProperty({ foo: { bar: true } }, 'foo.bar'), true)
  t.equal(
    hasProperty({ foo: { bar: { baz: true } } }, 'foo.bar.baz'),
    true,
  )
  t.equal(
    hasProperty({ foo: { bar: { baz: null } } }, 'foo.bar.baz'),
    true,
  )
  t.equal(hasProperty({ foo: { bar: 'a' } }, 'foo.fake.fake2'), false)
  t.equal(hasProperty({ foo: null }, 'foo.bar'), false)
  t.equal(hasProperty({ foo: '' }, 'foo.bar'), false)
  t.equal(hasProperty({ foo: '' }, 'constructor'), false)

  t.equal(
    hasProperty({ 'foo.baz': { bar: true } }, 'foo\\.baz.bar'),
    true,
  )
  t.equal(
    hasProperty({ 'fo.ob.az': { bar: true } }, 'fo\\.ob\\.az.bar'),
    true,
  )

  t.equal(
    hasProperty(
      {
        foo: [{ bar: ['bar', 'bizz'] }],
      },
      'foo[0].bar.1',
    ),
    false,
  )
  t.equal(
    hasProperty(
      {
        foo: [{ bar: ['bar', 'bizz'] }],
      },
      'foo[0].bar.2',
    ),
    false,
  )
  t.equal(
    hasProperty(
      {
        foo: [{ bar: ['bar', 'bizz'] }],
      },
      'foo[1].bar.1',
    ),
    false,
  )
  t.equal(
    hasProperty(
      {
        foo: [
          {
            bar: {
              1: 'bar',
            },
          },
        ],
      },
      'foo[0].bar.1',
    ),
    true,
  )
})

t.test('prevent setting/getting `__proto__`', async t => {
  setProperty({}, '__proto__.unicorn', '🦄')
  t.not(({} as any).unicorn, '🦄')

  t.equal(getProperty({}, '__proto__'), undefined)
})

t.test('return default value if path is invalid', async t => {
  t.equal(getProperty({}, 'constructor', '🦄'), '🦄')
})
