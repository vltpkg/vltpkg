import { ESLintUtils } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/types'

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.com/rule/${name}`,
)

export default createRule({
  name: 'enforce-mockimport-typing',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure t.mockImport uses type assertions.',
      // recommended: 'error',
    },
    schema: [],
    messages: {
      missingTypeAssertion:
        't.mockImport should use a type assertion like <typeof import(...)>',
    },
    fixable: 'code',
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 't' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'mockImport' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          context.report({
            node,
            messageId: 'missingTypeAssertion',
            fix(fixer) {
              const importPath = node.arguments[0].value
              if (typeof importPath === 'string') {
                return fixer.replaceText(
                  node,
                  `t.mockImport<typeof import('${importPath}')>('${importPath}')`,
                )
              }
              return null
            },
          })
        }
      },
    }
  },
})
