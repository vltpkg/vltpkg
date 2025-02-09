import t from 'tap'
import { isTokenResponse } from '../src/token-response.ts'

t.equal(isTokenResponse({ token: 'hello' }), true)

t.equal(isTokenResponse({ token: '' }), false)
t.equal(isTokenResponse('nope'), false)
t.equal(isTokenResponse({}), false)
t.equal(isTokenResponse(1234), false)
t.equal(isTokenResponse(null), false)
t.equal(isTokenResponse(false), false)
t.equal(isTokenResponse(true), false)
