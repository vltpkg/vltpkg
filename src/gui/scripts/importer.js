import jsdom from 'jsdom'
const { JSDOM } = jsdom
const dom = new JSDOM('', { url: 'http://localhost:3000' })
global.window = dom.window
global.document = dom.window.document
global.history = dom.window.history
global.window.scrollTo = () => {}
