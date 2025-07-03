import t from 'tap'
import { getWebAuthChallenge } from '../src/web-auth-challenge.ts'

t.strictSame(
  getWebAuthChallenge({ doneUrl: 'asdf', loginUrl: 'asdf' }),
  { doneUrl: 'asdf', authUrl: 'asdf' },
)
t.strictSame(
  getWebAuthChallenge({ doneUrl: 'asdf', authUrl: 'asdf' }),
  { doneUrl: 'asdf', authUrl: 'asdf' },
)
t.equal(getWebAuthChallenge({ doneUrl: '', loginUrl: '' }), undefined)
t.equal(getWebAuthChallenge({ doneUrl: '', authUrl: '' }), undefined)
t.equal(getWebAuthChallenge({ doneUrl: {}, loginUrl: {} }), undefined)
t.equal(getWebAuthChallenge({ doneUrl: {}, authUrl: {} }), undefined)
t.equal(getWebAuthChallenge({ doneUrl: 'asdf' }), undefined)
t.equal(getWebAuthChallenge({ loginUrl: 'asdf' }), undefined)
t.equal(getWebAuthChallenge({ authUrl: 'asdf' }), undefined)
t.equal(getWebAuthChallenge({}), undefined)
t.equal(getWebAuthChallenge(null), undefined)
t.equal(getWebAuthChallenge(false), undefined)
t.equal(getWebAuthChallenge(true), undefined)
