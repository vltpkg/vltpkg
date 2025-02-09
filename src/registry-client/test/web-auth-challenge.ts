import t from 'tap'
import { isWebAuthChallenge } from '../src/web-auth-challenge.ts'

t.equal(
  isWebAuthChallenge({ doneUrl: 'asdf', loginUrl: 'asdf' }),
  true,
)
t.equal(isWebAuthChallenge({ doneUrl: '', loginUrl: '' }), false)
t.equal(isWebAuthChallenge({ doneUrl: {}, loginUrl: {} }), false)
t.equal(isWebAuthChallenge({ doneUrl: 'asdf' }), false)
t.equal(isWebAuthChallenge({ loginUrl: 'asdf' }), false)
t.equal(isWebAuthChallenge({}), false)
t.equal(isWebAuthChallenge(null), false)
t.equal(isWebAuthChallenge(false), false)
t.equal(isWebAuthChallenge(true), false)
