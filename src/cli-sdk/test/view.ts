import t from 'tap'
import { ViewClass, isViewClass } from '../src/view.ts'
import type { ViewOptions } from '../src/view.ts'
import type { LoadedConfig } from '../src/config/index.ts'

t.equal(isViewClass({} as typeof ViewClass<unknown>), false)

// just for coverage, really, you'd never instantiate one of these
const options: ViewOptions = {}
const config: LoadedConfig = {} as LoadedConfig
const vc = new ViewClass<true>(options, config)
t.equal(vc.options, options, 'has options')
t.equal(vc.config, config, 'has config')
t.equal(vc.start(), undefined)
t.equal(vc.done(true, { time: 1 }), undefined)
//@ts-expect-error
vc.done(false, { time: 1 })
//@ts-expect-error
vc.done(true, {})
t.equal(vc.error({}), undefined)

class MyView extends ViewClass {}
t.equal(isViewClass(MyView), true)
