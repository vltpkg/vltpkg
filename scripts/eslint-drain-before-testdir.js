import { ASTUtils, ESLintUtils } from '@typescript-eslint/utils'
import { TSESTree } from '@typescript-eslint/types'

const N = TSESTree.AST_NODE_TYPES
const createRule = ESLintUtils.RuleCreator(name => name)

const unwrap = n => {
  while (
    n?.type === N.TSAsExpression ||
    n?.type === N.TSNonNullExpression ||
    n?.type === N.TSSatisfiesExpression
  ) {
    n = n.expression
  }
  return n
}

const isMethodCall = (n, name) =>
  n?.type === N.CallExpression &&
  n.callee.type === N.MemberExpression &&
  !n.callee.computed &&
  n.callee.property.type === N.Identifier &&
  n.callee.property.name === name

const find = (node, test) => {
  if (typeof node?.type !== 'string') return undefined
  if (test(node)) return node
  for (const [k, v] of Object.entries(node)) {
    if (k === 'parent') continue
    for (const c of Array.isArray(v) ? v : [v]) {
      const r = c && typeof c === 'object' ? find(c, test) : undefined
      if (r) return r
    }
  }
  return undefined
}

const fnOf = n => {
  for (let p = n.parent; p; p = p.parent) {
    if (
      p.type === N.ArrowFunctionExpression ||
      p.type === N.FunctionExpression ||
      p.type === N.FunctionDeclaration
    ) {
      return p
    }
  }
  return undefined
}

const within = (outer, n) =>
  !outer ||
  (outer.range[0] <= n.range[0] && n.range[1] <= outer.range[1])

export default createRule({
  name: 'drain-before-testdir',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a drain hook before the t.testdir() holding a client cache.',
    },
    schema: [],
    messages: {
      missing:
        'Drain this client in a hook registered before its t.testdir() (t.teardown(() => c.drain()), or track(new …) from drainer(t)): later hooks run after tap removes the fixture.',
    },
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context, true)
    if (!services.program) return {}
    const src = context.sourceCode
    const varOf = id =>
      id?.type === N.Identifier ?
        ASTUtils.findVariable(src.getScope(id), id)
      : undefined
    const initOf = id => {
      const d = varOf(id)?.defs[0]?.node
      return (
          d?.type === N.VariableDeclarator &&
            d.id.type === N.Identifier
        ) ?
          d
        : undefined
    }
    const hooks = []
    const clients = []

    // where a value's t.testdir() is made (`at`) and on which Test (`t`)
    const testdirOf = (n, depth = 0) => {
      n = unwrap(n)
      if (!n || depth > 8) return undefined
      const next = c => testdirOf(c, depth + 1)
      switch (n.type) {
        case N.CallExpression:
          if (isMethodCall(n, 'testdir')) {
            return { at: n, t: varOf(unwrap(n.callee.object)) }
          }
          return (
            helperOf(n, depth) ?? n.arguments.map(next).find(Boolean)
          )
        case N.TemplateLiteral:
          return n.expressions.map(next).find(Boolean)
        case N.BinaryExpression:
          return next(n.left) ?? next(n.right)
        case N.Identifier:
          return next(initOf(n)?.init)
        default:
          return undefined
      }
    }

    // same-file helper returning a testdir, e.g. createCache(t)
    const helperOf = (call, depth) => {
      const d = varOf(call.callee)?.defs[0]?.node
      const fn =
        d?.type === N.FunctionDeclaration ? d
        : d?.type === N.VariableDeclarator ? unwrap(d.init)
        : undefined
      if (
        fn?.type !== N.FunctionDeclaration &&
        fn?.type !== N.ArrowFunctionExpression &&
        fn?.type !== N.FunctionExpression
      ) {
        return undefined
      }
      const ret =
        fn.body.type === N.BlockStatement ?
          fn.body.body.find(s => s.type === N.ReturnStatement)
            ?.argument
        : fn.body
      const r = testdirOf(ret, depth + 1)
      // testdir of a param: on the Test the caller passes
      if (!r || r.t?.defs[0]?.node !== fn)
        return r && { at: call, t: r.t }
      const i = fn.params.findIndex(
        p => p.type === N.Identifier && p.name === r.t.name,
      )
      return { at: call, t: varOf(unwrap(call.arguments[i])) }
    }

    // `cache` of an options literal, or of a same-function options var
    const cacheOf = newNode => {
      let arg = unwrap(newNode.arguments[0])
      const d = initOf(arg)
      if (d && fnOf(d) === fnOf(newNode)) arg = unwrap(d.init)
      if (arg?.type !== N.ObjectExpression) return undefined
      return arg.properties.find(
        p =>
          p.type === N.Property &&
          !p.computed &&
          ((p.key.type === N.Identifier && p.key.name === 'cache') ||
            p.key.value === 'cache'),
      )?.value
    }

    return {
      CallExpression(n) {
        const fn = n.arguments[0]
        const each = isMethodCall(n, 'beforeEach')
        if (
          (each ||
            isMethodCall(n, 'teardown') ||
            isMethodCall(n, 'after')) &&
          find(
            fn,
            c => c.type === N.Identifier && /drain/i.test(c.name),
          )
        ) {
          hooks.push({
            n,
            each,
            t: varOf(unwrap(n.callee.object)),
            fn,
          })
        } else if (
          n.callee.type === N.Identifier &&
          n.callee.name === 'drainer'
        ) {
          hooks.push({
            n,
            t: varOf(unwrap(n.arguments[0])),
            pool: true,
          })
        }
      },
      NewExpression(n) {
        const dir = testdirOf(cacheOf(n))
        if (
          !dir ||
          !services.getTypeAtLocation(n).getProperty('drain')
        ) {
          return
        }
        clients.push({ n, dir })
      },
      'Program:exit'() {
        for (const { n, dir } of clients) {
          const { at, t } = dir
          let p = n.parent
          while (
            p.type === N.TSAsExpression ||
            p.type === N.TSNonNullExpression ||
            p.type === N.TSSatisfiesExpression
          ) {
            p = p.parent
          }
          // a named client must be drained by name; others are handed
          // to a tracker, a pool or a helper's caller (a beforeEach
          // draining a named client does not cover them)
          const name =
            (
              p.type === N.VariableDeclarator &&
              p.id.type === N.Identifier
            ) ?
              p.id.name
            : p.type === N.AssignmentExpression ? src.getText(p.left)
            : undefined
          const ok = hooks.some(
            h =>
              h.n.range[1] <= at.range[0] &&
              (h.each ?
                within(fnOf(h.n), at) && h.t !== t
              : !!t && h.t === t) &&
              (name === undefined ?
                !(h.each && find(h.fn, c => isMethodCall(c, 'drain')))
              : !h.pool &&
                !!find(
                  h.fn,
                  c =>
                    isMethodCall(c, 'drain') &&
                    src.getText(unwrap(c.callee.object)) === name,
                )),
          )
          if (!ok) context.report({ node: n, messageId: 'missing' })
        }
      },
    }
  },
})
