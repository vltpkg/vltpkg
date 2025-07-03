import t from 'tap'
import { getTokenResponse } from '../src/token-response.ts'

t.strictSame(getTokenResponse({ token: 'hello' }), { token: 'hello' })

t.equal(getTokenResponse({ token: '' }), undefined)
t.equal(getTokenResponse('nope'), undefined)
t.equal(getTokenResponse({}), undefined)
t.equal(getTokenResponse(1234), undefined)
t.equal(getTokenResponse(null), undefined)
t.equal(getTokenResponse(false), undefined)
t.equal(getTokenResponse(true), undefined)
