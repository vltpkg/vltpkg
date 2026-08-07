import { error } from '@vltpkg/error-cause'
import t from 'tap'
import { isPathSecurityError } from '../src/path-security-error.ts'

t.test('finds the code anywhere in the cause chain', t => {
  t.equal(
    isPathSecurityError(error('x', { code: 'EINVALIDNAME' })),
    true,
  )
  t.equal(
    isPathSecurityError(
      error('wrapped', {
        cause: error('x', { code: 'EINVALIDNAME' }),
      }),
    ),
    true,
    'lower layers re-wrap what they throw',
  )
  t.end()
})

t.test('everything else is not one', t => {
  t.equal(isPathSecurityError(error('x', { code: 'EUSAGE' })), false)
  t.equal(isPathSecurityError(new Error('x')), false)
  t.equal(isPathSecurityError(undefined), false)
  t.equal(isPathSecurityError('EINVALIDNAME'), false)
  t.equal(isPathSecurityError({ code: 1 }), false)
  t.end()
})
