import t from 'tap'
import { BINS, BINS_DIR, isBin } from '../src/bins.ts'

t.type(BINS_DIR, 'string')
t.strictSame(BINS, ['vlix', 'vlr', 'vlrx', 'vlt', 'vlx'])

t.ok(isBin('vlt'))
t.notOk(isBin('vltt'))
