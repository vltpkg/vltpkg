import t from 'tap'
import {
  ViewClass,
  isLazyView,
  isViewClass,
  lazyView,
  loadLazyView,
} from '../src/view.ts'
import type { ViewOptions } from '../src/view.ts'
import type { LoadedConfig } from '../src/config/index.ts'

t.equal(
  isViewClass({} as unknown as typeof ViewClass<unknown>),
  false,
)
function notAView() {}
t.equal(isViewClass(notAView as unknown as typeof ViewClass), false)

// just for coverage, really, you'd never instantiate one of these
const options: ViewOptions = {}
const config: LoadedConfig = {} as LoadedConfig
const vc = new ViewClass<true>(options, config)
t.equal(vc.options, options, 'has options')
t.equal(vc.config, config, 'has config')
t.equal(vc.start(), undefined)
t.equal(await vc.done(true, { time: 1 }), undefined)
//@ts-expect-error
await vc.done(false, { time: 1 })
//@ts-expect-error
await vc.done(true, {})
t.equal(vc.error({}), undefined)

class MyView extends ViewClass {}
t.equal(isViewClass(MyView), true)

class DuckView {
  start() {}
}
t.equal(isViewClass(DuckView as unknown as typeof ViewClass), true)

const loader = async () => MyView
const lazy = lazyView(loader)
t.equal(isLazyView(lazy), true)
t.equal(isLazyView({}), false)
t.equal(isLazyView(MyView), false)
t.equal(await loadLazyView(lazy), MyView)
